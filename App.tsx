
import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, Files, Cpu, Bug, MessageSquare, X, Plus, ChevronRight, 
  CheckCircle2, BookOpen, Activity, ChevronDown, Copy, Zap, 
  Terminal, User, Code2, ShieldAlert, Unplug, Plug2, Eraser, Hash, LineChart
} from 'lucide-react';
import { FileNode, ChatMessage, TabType, SerialMessage, ArduinoExample, ArduinoBoard } from './types';
import { getCodeAssistance, analyzeCode } from './services/geminiService';

const EXAMPLES: ArduinoExample[] = [
  { name: 'Blink', category: 'Basics', content: `void setup() {\n  pinMode(LED_BUILTIN, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(LED_BUILTIN, HIGH);\n  delay(1000);\n  digitalWrite(LED_BUILTIN, LOW);\n  delay(1000);\n}` },
  { name: 'SerialRead', category: 'Basics', content: `void setup() {\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  if (Serial.available()) {\n    char in = Serial.read();\n    Serial.print("Recebi: ");\n    Serial.println(in);\n  }\n}` }
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
  const [isConnected, setIsConnected] = useState(false);
  
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const activeFile = files[activeFileIndex] || files[0] || { name: 'sketch.ino', content: '' };

  useEffect(() => {
    if (consoleEndRef.current) consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [serialMessages, chatMessages]);

  const syncScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (highlightRef.current) {
      highlightRef.current.scrollTop = e.currentTarget.scrollTop;
      highlightRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const handleRunAnalysis = async () => {
    setAnalysisResult({ status: "Analisando...", summary: "A IA está revisando seu código...", issues: [] });
    const result = await analyzeCode(activeFile.content);
    setAnalysisResult(result);
  };

  const highlightCode = (code: string) => {
    if (!code) return "";
    return code
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\b(void|int|float|char|bool|long|unsigned|const|static|if|else|for|while|return|switch|case|break|byte|word|String)\b/g, '<span class="text-pink-400 font-bold">$1</span>')
      .replace(/\b(setup|loop|pinMode|digitalWrite|digitalRead|analogWrite|analogRead|delay|Serial|println|print|begin|available|read)\b/g, '<span class="text-teal-400 font-bold">$1</span>')
      .replace(/\/\/.*/g, '<span class="text-slate-500 italic">$&</span>')
      .replace(/#\w+/g, '<span class="text-orange-400">$&</span>')
      .replace(/"[^"]*"/g, '<span class="text-green-400">$&</span>')
      .replace(/\b(HIGH|LOW|INPUT|OUTPUT|LED_BUILTIN|true|false)\b/g, '<span class="text-purple-400">$1</span>');
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;
    const userText = inputMessage;
    setInputMessage('');
    setChatMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsAiLoading(true);
    const aiText = await getCodeAssistance(userText, activeFile.content);
    setChatMessages(prev => [...prev, { role: 'assistant', text: aiText }]);
    setIsAiLoading(false);
  };

  return (
    <div className="flex flex-col h-screen bg-[#0b0e14] text-slate-300 font-sans overflow-hidden">
      {/* Header */}
      <header className="h-12 border-b border-white/5 flex items-center justify-between px-4 bg-[#1c1f24] z-30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#008184] rounded flex items-center justify-center">
              <Zap size={14} className="text-white" fill="currentColor" />
            </div>
            <span className="text-xs font-bold text-white uppercase tracking-tight">Arduino Gemini IDE</span>
          </div>
          <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/5">
            <button className="p-1.5 rounded hover:bg-white/5 text-slate-500 transition-colors" title="Verificar"><CheckCircle2 size={16}/></button>
            <button className="p-1.5 rounded hover:bg-white/5 text-slate-500 transition-colors" title="Carregar"><Upload size={16}/></button>
            <div className="w-[1px] h-4 bg-white/10 mx-1" />
            <button className="text-[10px] font-bold px-2 flex items-center gap-1.5 text-slate-400 hover:text-white">
              <Cpu size={14}/> {selectedBoard.name} <ChevronDown size={10}/>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsConnected(!isConnected)} 
            className={`px-3 py-1 text-[10px] font-bold rounded border transition-all ${isConnected ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-teal-500/10 border-teal-500/20 text-teal-400'}`}
          >
            {isConnected ? "DESCONECTAR" : "CONECTAR"}
          </button>
          <div className="w-7 h-7 rounded-full bg-teal-600 flex items-center justify-center text-white text-[10px] font-bold border border-white/10">JH</div>
        </div>
      </header>

      {/* Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Nav */}
        <nav className="w-12 border-r border-white/5 bg-[#1c1f24] flex flex-col items-center py-4 gap-5">
          {[
            { id: 'files', icon: Files },
            { id: 'ai', icon: MessageSquare },
            { id: 'debug', icon: Bug },
            { id: 'creator', icon: User }
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id as TabType)} 
              className={`p-2 rounded-lg transition-all ${activeTab === tab.id ? 'text-teal-400 bg-teal-400/10 shadow-sm' : 'text-slate-600 hover:text-slate-400'}`}
            >
              <tab.icon size={20}/>
            </button>
          ))}
        </nav>

        {/* Info Panel */}
        <aside className="w-64 border-r border-white/5 bg-[#0b0e14] flex flex-col overflow-hidden">
          <div className="p-3 border-b border-white/5 bg-black/20">
            <h2 className="text-[9px] font-black uppercase text-teal-600 tracking-[0.2em]">{activeTab}</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
            {activeTab === 'files' && (
              <div className="space-y-1">
                {files.map((f, i) => (
                  <div key={i} onClick={() => setActiveFileIndex(i)} className={`flex items-center gap-2 p-2 rounded-lg text-xs cursor-pointer ${i === activeFileIndex ? 'bg-teal-500/10 text-teal-400' : 'text-slate-500 hover:bg-white/5'}`}>
                    <Hash size={12} className="opacity-50" /> {f.name}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto space-y-4 mb-3 pr-1">
                  {chatMessages.length === 0 && (
                    <div className="text-center py-10">
                      <MessageSquare size={24} className="mx-auto mb-2 opacity-20 text-teal-400" />
                      <p className="text-[10px] text-slate-600 uppercase font-bold">Assistente Gemini</p>
                    </div>
                  )}
                  {chatMessages.map((m, i) => (
                    <div key={i} className={`p-2.5 rounded-lg text-[10px] leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-[#008184]/20 text-teal-50 text-right ml-4 border border-teal-500/10' : 'bg-slate-800/50 text-slate-200 mr-4 border border-white/5'}`}>
                      {m.text}
                    </div>
                  ))}
                  {isAiLoading && <div className="text-[9px] text-teal-400 animate-pulse font-bold">GEMINI ESTÁ PENSANDO...</div>}
                </div>
                <div className="relative">
                  <textarea 
                    value={inputMessage} 
                    onChange={e => setInputMessage(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                    placeholder="Peça ajuda..." 
                    className="w-full bg-black/40 border border-white/5 rounded-lg p-2.5 text-[10px] focus:outline-none focus:border-teal-500/50 transition-all h-20 resize-none shadow-inner" 
                  />
                  <button onClick={sendMessage} className="absolute right-2 bottom-2 p-1 bg-teal-600 rounded text-white hover:bg-teal-500 transition-colors">
                    <ChevronRight size={14}/>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'debug' && (
              <div className="space-y-4">
                <button onClick={handleRunAnalysis} className="w-full py-2 bg-teal-600 hover:bg-teal-500 text-white rounded text-[10px] font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-teal-900/20">
                  <ShieldAlert size={14}/> IA INSPECT
                </button>
                {analysisResult && (
                  <div className="p-3 bg-black/40 rounded border border-white/5 animate-in fade-in slide-in-from-top-2">
                    <p className="text-[11px] text-slate-300 font-medium leading-relaxed italic">"{analysisResult.summary}"</p>
                    {analysisResult.issues?.map((issue: any, idx: number) => (
                      <div key={idx} className="mt-2 p-2 bg-white/5 rounded border-l-2 border-orange-500">
                        <div className="text-[9px] font-bold text-orange-400 uppercase">{issue.severity}</div>
                        <div className="text-[10px] text-slate-200">{issue.message}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'creator' && (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-gradient-to-tr from-teal-600 to-emerald-400 rounded-2xl mx-auto flex items-center justify-center text-white mb-4 shadow-xl">
                  <User size={32}/>
                </div>
                <h3 className="font-bold text-sm text-white">José Heberto</h3>
                <p className="text-[10px] text-teal-500 uppercase font-black mb-6 tracking-widest">AI & Embedded Dev</p>
                <button onClick={() => window.open('https://instagram.com/josehebertot2', '_blank')} className="w-full py-2.5 bg-[#d62976] hover:bg-[#fa7e1e] transition-all rounded-lg text-[10px] font-bold text-white flex items-center justify-center gap-2 shadow-lg">
                  INSTAGRAM @josehebertot2
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Editor Main */}
        <main className="flex-1 flex flex-col relative bg-[#0d1117]">
          <div className="h-9 flex items-center bg-[#1c1f24] border-b border-white/5">
             <div className="px-5 py-2.5 text-[10px] font-bold text-teal-400 border-t-2 border-teal-500 bg-[#0d1117] relative">
               {activeFile.name}
             </div>
          </div>

          <div className="flex-1 relative flex overflow-hidden">
            <div className="w-10 bg-[#1c1f24]/30 border-r border-white/5 py-4 flex flex-col items-center text-[10px] text-slate-700 font-mono select-none">
               {Array.from({length: 40}).map((_, i) => <div key={i} className="h-[21px]">{i+1}</div>)}
            </div>
            <div className="flex-1 relative">
               <div ref={highlightRef} className="absolute inset-0 p-4 pointer-events-none code-font text-[14px] leading-[21px] whitespace-pre overflow-hidden z-0"
                 dangerouslySetInnerHTML={{ __html: highlightCode(activeFile.content) + '\n\n\n' }} />
               <textarea 
                 value={activeFile.content}
                 onChange={e => { const nf = [...files]; nf[activeFileIndex].content = e.target.value; setFiles(nf); }}
                 onScroll={syncScroll}
                 spellCheck={false}
                 className="absolute inset-0 w-full h-full p-4 bg-transparent text-transparent caret-teal-500 code-font text-[14px] leading-[21px] resize-none focus:outline-none z-10 whitespace-pre overflow-auto selection:bg-teal-500/20"
               />
            </div>
          </div>

          {/* Console Area */}
          <div className={`border-t border-white/5 bg-[#0b0e14] flex flex-col transition-all duration-300 shadow-2xl ${isConsoleOpen ? 'h-60' : 'h-10'}`}>
            <div className="h-10 flex items-center justify-between px-4 bg-[#1c1f24]/80 backdrop-blur-sm">
               <div className="flex gap-1 h-full">
                  {['output', 'serial', 'plotter'].map(m => (
                    <button 
                      key={m} 
                      onClick={() => { setConsoleMode(m as any); setIsConsoleOpen(true); }} 
                      className={`px-4 text-[9px] font-black uppercase tracking-widest border-b-2 transition-all ${consoleMode === m && isConsoleOpen ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                    >
                      {m}
                    </button>
                  ))}
               </div>
               <div className="flex items-center gap-3">
                 <button onClick={() => setSerialMessages([])} className="p-1.5 text-slate-600 hover:text-red-400 transition-colors"><Eraser size={14}/></button>
                 <button onClick={() => setIsConsoleOpen(!isConsoleOpen)} className="text-slate-500 hover:text-white transition-all transform active:scale-90">
                    {isConsoleOpen ? <ChevronDown size={18}/> : <Plus size={18}/>}
                 </button>
               </div>
            </div>
            {isConsoleOpen && (
              <div className="flex-1 overflow-y-auto p-4 code-font text-[12px] bg-black/40 custom-scrollbar">
                {consoleMode === 'plotter' ? (
                  <div className="h-full flex items-center justify-center opacity-20 text-[10px] font-black uppercase tracking-widest">Serial Plotter Ativo</div>
                ) : (
                  <div className="space-y-1">
                    {serialMessages.length === 0 && <span className="opacity-10 text-[10px] font-bold uppercase tracking-widest">Aguardando saída do sistema...</span>}
                    {serialMessages.map((m, i) => (
                      <div key={i} className="flex gap-3 animate-in fade-in slide-in-from-left-1">
                        <span className="text-slate-700 text-[10px] font-mono">[{m.timestamp}]</span>
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

      {/* Footer */}
      <footer className="h-6 bg-[#008184] text-white flex items-center justify-between px-4 text-[9px] font-black uppercase tracking-widest shadow-inner z-40">
         <div className="flex gap-4 items-center">
            <span className={`flex items-center gap-1.5 ${isConnected ? 'text-emerald-300' : 'opacity-40'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-white'}`} />
              {isConnected ? "Hardware Conectado" : "Desconectado"}
            </span>
            <span className="opacity-30">|</span>
            <span className="flex items-center gap-1.5"><Code2 size={10}/> {activeFile.name}</span>
         </div>
         <div className="flex gap-4">
            <span className="bg-black/20 px-1.5 py-0.5 rounded border border-white/10">{selectedBoard.name}</span>
            <span className="opacity-80 flex items-center gap-1"><User size={10}/> J. HEBERTO EDITION</span>
         </div>
      </footer>
    </div>
  );
};

export default App;
