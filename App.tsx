
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Upload, Files, Cpu, Bug, MessageSquare, X, Plus, ChevronRight, Save, 
  Trash2, CheckCircle2, BookOpen, Library as LibIcon, Activity, 
  ChevronDown, Copy, Zap, RotateCcw, Terminal, User, ExternalLink, 
  Code2, Search, ShieldAlert, Lightbulb, Unplug, Plug2, AlertCircle, Eraser, Hash, LineChart
} from 'lucide-react';
import { FileNode, ChatMessage, TabType, SerialMessage, ArduinoExample, ArduinoBoard } from './types';
import { getCodeAssistance, analyzeCode } from './services/geminiService';

const EXAMPLES: ArduinoExample[] = [
  { name: 'Blink', category: 'Basics', content: `void setup() {\n  pinMode(LED_BUILTIN, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(LED_BUILTIN, HIGH);\n  delay(1000);\n  digitalWrite(LED_BUILTIN, LOW);\n  delay(1000);\n}` },
  { name: 'AnalogRead', category: 'Basics', content: `void setup() {\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  int val = analogRead(A0);\n  Serial.println(val);\n  delay(100);\n}` }
];

const BOARDS: ArduinoBoard[] = [
  { id: 'uno', name: 'Arduino Uno', fqbn: 'arduino:avr:uno' },
  { id: 'nano', name: 'Arduino Nano', fqbn: 'arduino:avr:nano' },
  { id: 'esp32', name: 'ESP32 Dev Module', fqbn: 'esp32:esp32:esp32' }
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('files');
  const [files, setFiles] = useState<FileNode[]>([{ name: 'sketch_mar24a.ino', content: EXAMPLES[0].content, isOpen: true }]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [consoleMode, setConsoleMode] = useState<'output' | 'serial' | 'plotter'>('output');
  const [isConsoleOpen, setIsConsoleOpen] = useState(true);
  const [serialMessages, setSerialMessages] = useState<SerialMessage[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<ArduinoBoard>(BOARDS[0]);
  const [compiling, setCompiling] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const activeFile = files[activeFileIndex] || files[0];

  useEffect(() => {
    if (consoleEndRef.current) consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [serialMessages]);

  const syncScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (highlightRef.current) {
      highlightRef.current.scrollTop = e.currentTarget.scrollTop;
      highlightRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const handleRunAnalysis = async () => {
    setAnalysisResult(null);
    try {
      const result = await analyzeCode(activeFile.content);
      setAnalysisResult(result);
    } catch (e) {
      console.error(e);
    }
  };

  const highlightCode = (code: string) => {
    if (!code) return "";
    return code
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\b(void|int|float|char|bool|long|unsigned|const|static|if|else|for|while|return|switch|case|break)\b/g, '<span class="text-pink-400">$1</span>')
      .replace(/\b(setup|loop|pinMode|digitalWrite|digitalRead|analogWrite|analogRead|delay|Serial|println|print|begin)\b/g, '<span class="text-teal-400 font-bold">$1</span>')
      .replace(/\/\/.*/g, '<span class="text-slate-500 italic">$&</span>')
      .replace(/#\w+/g, '<span class="text-orange-400">$&</span>')
      .replace(/"[^"]*"/g, '<span class="text-green-400">$&</span>')
      .replace(/\b(HIGH|LOW|INPUT|OUTPUT|LED_BUILTIN)\b/g, '<span class="text-purple-400">$1</span>');
  };

  const renderPlotter = () => {
    const data = serialMessages.filter(m => m.value !== undefined).slice(-50);
    if (data.length === 0) return <div className="text-center text-slate-700 py-10 uppercase text-[10px]">Sem dados numéricos</div>;
    const max = Math.max(...data.map(d => d.value!), 1);
    const min = Math.min(...data.map(d => d.value!), 0);
    const range = max - min || 1;
    return (
      <div className="h-full w-full bg-black/20 p-4">
        <svg className="h-full w-full overflow-visible" viewBox={`0 0 ${data.length} 100`} preserveAspectRatio="none">
          <polyline fill="none" stroke="#2dd4bf" strokeWidth="1" points={data.map((d, i) => `${i},${100 - ((d.value! - min) / range) * 100}`).join(' ')} />
        </svg>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-[#0b0e14] text-slate-300 font-sans overflow-hidden">
      {/* Header Toolbar */}
      <header className="h-12 border-b border-white/5 flex items-center justify-between px-4 bg-[#1c1f24] z-30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Zap size={20} className="text-[#008184]" />
            <span className="text-xs font-bold text-white uppercase tracking-tighter">Arduino IDE Pro</span>
          </div>
          <div className="flex items-center gap-1 bg-black/20 p-1 rounded-lg border border-white/5">
            <button onClick={() => setCompiling(true)} className={`p-1.5 rounded ${compiling ? 'text-teal-400' : 'text-slate-500'}`}><CheckCircle2 size={16}/></button>
            <button onClick={() => setUploading(true)} className={`p-1.5 rounded ${uploading ? 'text-green-400' : 'text-slate-500'}`}><Upload size={16}/></button>
            <div className="w-[1px] h-4 bg-white/10 mx-1" />
            <button className="text-[10px] font-bold px-2 flex items-center gap-2 text-slate-400 hover:text-white"><Cpu size={14}/> {selectedBoard.name} <ChevronDown size={10}/></button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsConnected(!isConnected)} className={`px-3 py-1 text-[10px] font-bold rounded-md border ${isConnected ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-teal-500/10 border-teal-500/20 text-teal-500'}`}>
             {isConnected ? "DESCONECTAR" : "CONECTAR"}
          </button>
          <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-[10px] font-bold">JH</div>
        </div>
      </header>

      {/* Main UI */}
      <div className="flex flex-1 overflow-hidden">
        {/* Slim Sidebar Nav */}
        <nav className="w-12 border-r border-white/5 bg-[#1c1f24] flex flex-col items-center py-4 gap-6">
          <button onClick={() => setActiveTab('files')} className={`p-2 rounded-lg transition-all ${activeTab === 'files' ? 'text-teal-400 bg-teal-400/10' : 'text-slate-600'}`}><Files size={20}/></button>
          <button onClick={() => setActiveTab('ai')} className={`p-2 rounded-lg transition-all ${activeTab === 'ai' ? 'text-teal-400 bg-teal-400/10' : 'text-slate-600'}`}><MessageSquare size={20}/></button>
          <button onClick={() => setActiveTab('debug')} className={`p-2 rounded-lg transition-all ${activeTab === 'debug' ? 'text-teal-400 bg-teal-400/10' : 'text-slate-600'}`}><Bug size={20}/></button>
          <button onClick={() => setActiveTab('creator')} className="mt-auto p-2 text-slate-600 hover:text-teal-400"><User size={20}/></button>
        </nav>

        {/* Panel Expansion */}
        <aside className="w-64 border-r border-white/5 bg-[#0b0e14] flex flex-col p-4 overflow-y-auto custom-scrollbar">
          <h2 className="text-[10px] font-black uppercase text-teal-600 mb-4 tracking-widest">{activeTab}</h2>
          
          {activeTab === 'files' && (
            <div className="flex items-center gap-2 p-2 bg-teal-500/5 border border-teal-500/10 rounded-lg text-xs text-teal-400">
               <Code2 size={14}/> {activeFile.name}
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                {chatMessages.map((m, i) => (
                  <div key={i} className={`p-2 rounded-lg text-[10px] ${m.role === 'user' ? 'bg-teal-600/20 text-teal-100 ml-4' : 'bg-slate-800 text-slate-200 mr-4'}`}>
                    {m.text}
                  </div>
                ))}
              </div>
              <div className="relative">
                <textarea value={inputMessage} onChange={e => setInputMessage(e.target.value)} placeholder="Pergunte à IA..." className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-[10px] focus:outline-none h-16 resize-none" />
                <button onClick={async () => {
                  const msg = inputMessage; setInputMessage('');
                  setChatMessages(prev => [...prev, {role: 'user', text: msg}]);
                  setIsAiLoading(true);
                  const res = await getCodeAssistance(msg, activeFile.content);
                  setChatMessages(prev => [...prev, {role: 'assistant', text: res || "Erro"}]);
                  setIsAiLoading(false);
                }} className="absolute right-2 bottom-2 text-teal-500"><ChevronRight size={16}/></button>
              </div>
            </div>
          )}

          {activeTab === 'debug' && (
            <div className="space-y-4">
              <button onClick={handleRunAnalysis} className="w-full py-2 bg-teal-600 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-2">
                <ShieldAlert size={14}/> ANALISAR CÓDIGO
              </button>
              {analysisResult && <div className="text-[10px] p-2 bg-white/5 rounded border border-white/10">{analysisResult.summary}</div>}
            </div>
          )}

          {activeTab === 'creator' && (
             <div className="text-center">
                <div className="w-16 h-16 bg-teal-600/20 rounded-2xl mx-auto flex items-center justify-center text-teal-400 mb-3"><User size={32}/></div>
                <h3 className="font-bold text-sm text-white">José Heberto</h3>
                <p className="text-[10px] text-teal-500 uppercase font-black mb-4">Embedded AI Developer</p>
                <button onClick={() => window.open('https://instagram.com/josehebertot2', '_blank')} className="w-full py-2 bg-gradient-to-r from-purple-600 to-pink-500 rounded-lg text-[10px] font-bold text-white flex items-center justify-center gap-2"><ExternalLink size={12}/> INSTAGRAM</button>
             </div>
          )}
        </aside>

        {/* Editor & Console */}
        <main className="flex-1 flex flex-col relative bg-[#0d1117]">
          {/* File Tabs */}
          <div className="h-9 flex items-center bg-[#1c1f24] border-b border-white/5 px-2">
             <div className="px-4 py-2 text-[10px] font-bold text-teal-400 border-t-2 border-teal-500 bg-[#0d1117] cursor-pointer">{activeFile.name}</div>
          </div>

          {/* Editor Area */}
          <div className="flex-1 relative flex overflow-hidden">
            <div className="w-10 bg-[#1c1f24]/50 border-r border-white/5 py-4 flex flex-col items-center text-[10px] text-slate-600 font-mono select-none">
               {Array.from({length: 40}).map((_, i) => <div key={i} className="h-[21px]">{i+1}</div>)}
            </div>
            <div className="flex-1 relative">
               <div ref={highlightRef} className="absolute inset-0 p-4 pointer-events-none code-font text-sm leading-[21px] whitespace-pre overflow-hidden z-0"
                 dangerouslySetInnerHTML={{ __html: highlightCode(activeFile.content) }} />
               <textarea 
                 value={activeFile.content}
                 onChange={e => { const nf = [...files]; nf[activeFileIndex].content = e.target.value; setFiles(nf); }}
                 onScroll={syncScroll}
                 spellCheck={false}
                 className="absolute inset-0 w-full h-full p-4 bg-transparent text-transparent caret-teal-500 code-font text-sm leading-[21px] resize-none focus:outline-none z-10"
               />
            </div>
          </div>

          {/* Console Section */}
          <div className={`border-t border-white/5 bg-[#0b0e14] transition-all ${isConsoleOpen ? 'h-56' : 'h-10'}`}>
            <div className="h-10 flex items-center justify-between px-4 bg-[#1c1f24]/80">
               <div className="flex gap-4">
                  <button onClick={() => setConsoleMode('output')} className={`text-[9px] font-bold tracking-widest uppercase ${consoleMode === 'output' ? 'text-teal-400' : 'text-slate-500'}`}>Saída</button>
                  <button onClick={() => setConsoleMode('serial')} className={`text-[9px] font-bold tracking-widest uppercase ${consoleMode === 'serial' ? 'text-teal-400' : 'text-slate-500'}`}>Serial</button>
                  <button onClick={() => setConsoleMode('plotter')} className={`text-[9px] font-bold tracking-widest uppercase ${consoleMode === 'plotter' ? 'text-teal-400' : 'text-slate-500'}`}>Plotter</button>
               </div>
               <button onClick={() => setIsConsoleOpen(!isConsoleOpen)} className="text-slate-500 hover:text-white transition-all transform active:scale-90">
                  {isConsoleOpen ? <ChevronDown size={18}/> : <Plus size={18}/>}
               </button>
            </div>
            {isConsoleOpen && (
              <div className="flex-1 h-[calc(100%-40px)] overflow-y-auto p-3 code-font text-xs bg-black/40 custom-scrollbar">
                {consoleMode === 'plotter' ? renderPlotter() : (
                  <div className="flex flex-col gap-1">
                    {serialMessages.length === 0 && <span className="opacity-20 text-[10px]">Aguardando dados...</span>}
                    {serialMessages.map((m, i) => (
                      <div key={i} className="flex gap-3">
                        <span className="text-slate-700">[{m.timestamp}]</span>
                        <span className={m.type === 'in' ? 'text-teal-400' : 'text-slate-400'}>{m.text}</span>
                      </div>
                    ))}
                    <div ref={consoleEndRef} />
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Status Bar */}
      <footer className="h-6 bg-[#008184] text-white flex items-center justify-between px-4 text-[9px] font-black uppercase tracking-widest">
         <div className="flex gap-4 items-center">
            <span>{isConnected ? "Conectado" : "Desconectado"}</span>
            <span className="opacity-50">|</span>
            <span>{activeFile.name}</span>
         </div>
         <div className="flex gap-4">
            <span>Placa: {selectedBoard.name}</span>
            <span className="opacity-50">J. Heberto Edition</span>
         </div>
      </footer>
    </div>
  );
};

export default App;
