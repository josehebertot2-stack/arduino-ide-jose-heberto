
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Upload, Files, Cpu, Bug, MessageSquare, X, Plus, ChevronRight, Save, 
  CheckCircle2, BookOpen, Activity, ChevronDown, Copy, Zap, 
  Terminal, User, Code2, ShieldAlert, Unplug, Plug2, Eraser, Hash, LineChart,
  Search, ExternalLink, Settings, Lightbulb
} from 'lucide-react';
import { FileNode, ChatMessage, TabType, SerialMessage, ArduinoExample, ArduinoBoard } from './types';
import { getCodeAssistance, analyzeCode } from './services/geminiService';

const EXAMPLES: ArduinoExample[] = [
  { name: 'Blink', category: 'Basics', content: `// Arduino Blink Sketch\nvoid setup() {\n  pinMode(LED_BUILTIN, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(LED_BUILTIN, HIGH);\n  delay(1000);\n  digitalWrite(LED_BUILTIN, LOW);\n  delay(1000);\n}` },
  { name: 'AnalogReadSerial', category: 'Basics', content: `void setup() {\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  int sensorValue = analogRead(A0);\n  Serial.println(sensorValue);\n  delay(100);\n}` },
  { name: 'Fade', category: 'Analog', content: `int led = 9;\nint brightness = 0;\nint fadeAmount = 5;\n\nvoid setup() {\n  pinMode(led, OUTPUT);\n}\n\nvoid loop() {\n  analogWrite(led, brightness);\n  brightness = brightness + fadeAmount;\n  if (brightness <= 0 || brightness >= 255) {\n    fadeAmount = -fadeAmount;\n  }\n  delay(30);\n}` }
];

const BOARDS: ArduinoBoard[] = [
  { id: 'uno', name: 'Arduino Uno', fqbn: 'arduino:avr:uno' },
  { id: 'nano', name: 'Arduino Nano', fqbn: 'arduino:avr:nano' },
  { id: 'mega', name: 'Arduino Mega 2560', fqbn: 'arduino:avr:mega' },
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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const consoleEndRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeFile = useMemo(() => files[activeFileIndex] || files[0], [files, activeFileIndex]);

  useEffect(() => {
    if (consoleEndRef.current) consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [serialMessages, chatMessages]);

  const syncScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (highlightRef.current) {
      highlightRef.current.scrollTop = e.currentTarget.scrollTop;
      highlightRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const handleVerify = () => {
    setConsoleMode('output');
    setIsConsoleOpen(true);
    setSerialMessages(prev => [...prev, {
      timestamp: new Date().toLocaleTimeString(),
      type: 'out',
      text: `Compilando sketch para ${selectedBoard.name}...`
    }]);
    setTimeout(() => {
      setSerialMessages(prev => [...prev, {
        timestamp: new Date().toLocaleTimeString(),
        type: 'out',
        text: "Sketch compilado com sucesso! Memória usada: 444 bytes (1%)."
      }]);
    }, 1500);
  };

  const handleUpload = () => {
    if (!isConnected) {
      alert("Por favor, conecte uma placa primeiro!");
      return;
    }
    setConsoleMode('output');
    setIsConsoleOpen(true);
    setSerialMessages(prev => [...prev, {
      timestamp: new Date().toLocaleTimeString(),
      type: 'out',
      text: "Carregando..."
    }]);
    setTimeout(() => {
      setSerialMessages(prev => [...prev, {
        timestamp: new Date().toLocaleTimeString(),
        type: 'out',
        text: "Upload concluído!"
      }]);
    }, 2000);
  };

  const handleRunAnalysis = async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setActiveTab('debug');
    try {
      const result = await analyzeCode(activeFile.content);
      setAnalysisResult(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isAiLoading) return;
    const userText = inputMessage;
    setInputMessage('');
    setChatMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsAiLoading(true);
    try {
      const aiText = await getCodeAssistance(userText, activeFile.content);
      setChatMessages(prev => [...prev, { role: 'assistant', text: aiText || "Ocorreu um erro ao gerar resposta." }]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const highlightCode = (code: string) => {
    if (!code) return "";
    return code
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\b(void|int|float|char|bool|long|unsigned|const|static|if|else|for|while|return|switch|case|break|byte|word|String)\b/g, '<span class="text-pink-400 font-bold">$1</span>')
      .replace(/\b(setup|loop|pinMode|digitalWrite|digitalRead|analogWrite|analogRead|delay|Serial|println|print|begin|available|read|write|peek|flush|millis|micros)\b/g, '<span class="text-teal-400 font-bold">$1</span>')
      .replace(/\/\/.*/g, '<span class="text-slate-500 italic">$&</span>')
      .replace(/\/\*[\s\S]*?\*\//g, '<span class="text-slate-500 italic">$&</span>')
      .replace(/#\w+/g, '<span class="text-orange-400">$&</span>')
      .replace(/"[^"]*"/g, '<span class="text-green-400">$&</span>')
      .replace(/\b(HIGH|LOW|INPUT|OUTPUT|INPUT_PULLUP|LED_BUILTIN|true|false)\b/g, '<span class="text-purple-400">$1</span>');
  };

  const renderPlotter = () => {
    const data = serialMessages.filter(m => m.value !== undefined).slice(-100);
    if (data.length === 0) return (
      <div className="h-full flex items-center justify-center text-slate-700 text-[10px] font-black uppercase tracking-widest">
        Nenhum dado numérico Serial encontrado
      </div>
    );
    const max = Math.max(...data.map(d => d.value!), 1);
    const min = Math.min(...data.map(d => d.value!), 0);
    const range = max - min || 1;
    return (
      <div className="h-full w-full bg-black/20 p-4 relative">
        <svg className="h-full w-full overflow-visible" viewBox={`0 0 ${data.length} 100`} preserveAspectRatio="none">
          <polyline fill="none" stroke="#2dd4bf" strokeWidth="1" points={data.map((d, i) => `${i},${100 - ((d.value! - min) / range) * 100}`).join(' ')} />
        </svg>
      </div>
    );
  };

  const handleAddFile = () => {
    const name = prompt("Nome do arquivo:", "novo_sketch.ino");
    if (name) {
      setFiles(prev => [...prev, { name: name.endsWith('.ino') ? name : name + '.ino', content: '// Novo Sketch', isOpen: true }]);
      setActiveFileIndex(files.length);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0b0e14] text-slate-300 font-sans overflow-hidden">
      {/* Header Toolbar */}
      <header className="h-12 border-b border-white/5 flex items-center justify-between px-4 bg-[#1c1f24] z-30 shadow-md">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#008184] rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(0,129,132,0.3)]">
              <Zap size={16} className="text-white" fill="currentColor" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-white leading-none uppercase tracking-tighter">Arduino IDE</span>
              <span className="text-[8px] text-teal-600 font-black uppercase tracking-widest">Gemini AI Edition</span>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/5">
            <button onClick={handleVerify} className="p-2 rounded hover:bg-white/5 text-slate-500 hover:text-teal-400 transition-colors" title="Verificar">
              <CheckCircle2 size={16}/>
            </button>
            <button onClick={handleUpload} className="p-2 rounded hover:bg-white/5 text-slate-500 hover:text-green-400 transition-colors" title="Carregar">
              <Upload size={16}/>
            </button>
            <div className="w-[1px] h-4 bg-white/10 mx-1" />
            <div className="relative group">
              <button className="text-[10px] font-bold px-3 py-1.5 flex items-center gap-2 text-slate-400 hover:text-white hover:bg-white/5 rounded transition-all">
                <Cpu size={14}/> {selectedBoard.name} <ChevronDown size={10}/>
              </button>
              <div className="absolute top-full left-0 mt-1 w-48 bg-[#1c1f24] border border-white/10 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                {BOARDS.map(board => (
                  <div key={board.id} onClick={() => setSelectedBoard(board)} className="px-4 py-2 text-[10px] font-bold hover:bg-teal-500/10 hover:text-teal-400 cursor-pointer transition-colors">
                    {board.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsConnected(!isConnected)} 
            className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded border transition-all transform active:scale-95 ${isConnected ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-teal-500/10 border-teal-500/20 text-teal-400 hover:bg-teal-500/20'}`}
          >
            {isConnected ? "Desconectar" : "Conectar Placa"}
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white text-[10px] font-bold border border-white/10 shadow-lg">JH</div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Nav */}
        <nav className="w-12 border-r border-white/5 bg-[#1c1f24] flex flex-col items-center py-5 gap-5 shadow-2xl z-20">
          {[
            { id: 'files', icon: Files, label: 'Arquivos' },
            { id: 'ai', icon: MessageSquare, label: 'Chat IA' },
            { id: 'examples', icon: BookOpen, label: 'Exemplos' },
            { id: 'debug', icon: Bug, label: 'Debug' },
            { id: 'creator', icon: User, label: 'Criador' }
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id as TabType)} 
              title={tab.label}
              className={`p-2.5 rounded-xl transition-all duration-300 transform ${activeTab === tab.id ? 'text-teal-400 bg-teal-400/10 shadow-[0_0_10px_rgba(45,212,191,0.2)] scale-110' : 'text-slate-600 hover:text-slate-400 hover:bg-white/5'}`}
            >
              <tab.icon size={22}/>
            </button>
          ))}
        </nav>

        {/* Aside Explorer Panel */}
        <aside className="w-64 border-r border-white/5 bg-[#0b0e14]/95 flex flex-col overflow-hidden z-10">
          <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
            <h2 className="text-[10px] font-black uppercase text-teal-600 tracking-[0.2em]">{activeTab}</h2>
            {activeTab === 'files' && <Plus size={14} className="text-slate-600 hover:text-teal-400 cursor-pointer" onClick={handleAddFile} />}
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
            {activeTab === 'files' && (
              <div className="space-y-1">
                {files.map((f, i) => (
                  <div key={i} onClick={() => setActiveFileIndex(i)} className={`group flex items-center justify-between p-2.5 rounded-lg text-xs cursor-pointer transition-all ${i === activeFileIndex ? 'bg-teal-500/10 text-teal-400' : 'text-slate-500 hover:bg-white/5'}`}>
                    <div className="flex items-center gap-2">
                      <Code2 size={14} className="opacity-50" />
                      <span className="font-medium">{f.name}</span>
                    </div>
                    {files.length > 1 && (
                      <X size={12} className="opacity-0 group-hover:opacity-100 hover:text-red-400" onClick={(e) => {
                        e.stopPropagation();
                        setFiles(prev => prev.filter((_, idx) => idx !== i));
                        if (activeFileIndex >= i) setActiveFileIndex(Math.max(0, activeFileIndex - 1));
                      }} />
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
                  {chatMessages.length === 0 && (
                    <div className="text-center py-12 flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-teal-500/10 rounded-full flex items-center justify-center text-teal-400 animate-pulse">
                        <MessageSquare size={24} />
                      </div>
                      <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest leading-relaxed">Assistente Especialista<br/>Pronto para Codar</p>
                    </div>
                  )}
                  {chatMessages.map((m, i) => (
                    <div key={i} className={`p-3 rounded-2xl text-[11px] leading-relaxed shadow-lg border ${m.role === 'user' ? 'bg-[#008184] text-teal-50 ml-4 border-teal-500/20' : 'bg-[#1c1f24] text-slate-200 mr-4 border-white/5'}`}>
                      {m.text}
                    </div>
                  ))}
                  {isAiLoading && <div className="text-[9px] text-teal-400 animate-pulse font-black px-2 flex items-center gap-2"><div className="w-1 h-1 bg-teal-400 rounded-full animate-bounce"/> GEMINI ESTÁ PENSANDO...</div>}
                </div>
                <div className="relative group">
                  <textarea 
                    value={inputMessage} 
                    onChange={e => setInputMessage(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                    placeholder="Descreva seu projeto..." 
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-3.5 pr-10 text-[11px] focus:outline-none focus:border-teal-500/50 transition-all h-24 resize-none shadow-2xl custom-scrollbar" 
                  />
                  <button onClick={sendMessage} className="absolute right-3 bottom-3 p-1.5 bg-teal-600 rounded-lg text-white hover:bg-teal-500 transition-all transform active:scale-90">
                    <ChevronRight size={16}/>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'examples' && (
              <div className="space-y-4">
                {['Basics', 'Analog', 'Digital', 'Communication'].map(cat => (
                  <div key={cat}>
                    <div className="text-[9px] font-black uppercase text-slate-600 mb-2 px-2 tracking-widest">{cat}</div>
                    <div className="space-y-1">
                      {EXAMPLES.filter(e => e.category === cat || (!e.category && cat === 'Basics')).map(ex => (
                        <div key={ex.name} onClick={() => {
                          setFiles(prev => [...prev, { name: `${ex.name}.ino`, content: ex.content, isOpen: true }]);
                          setActiveFileIndex(files.length);
                        }} className="p-2.5 rounded-lg text-[11px] text-slate-400 hover:bg-teal-500/10 hover:text-teal-400 cursor-pointer transition-all flex items-center gap-2">
                          <BookOpen size={12} className="opacity-50" /> {ex.name}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'debug' && (
              <div className="space-y-5">
                <button onClick={handleRunAnalysis} disabled={isAnalyzing} className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-teal-900/30">
                  <ShieldAlert size={16}/> {isAnalyzing ? 'Processando...' : 'IA Inspect'}
                </button>
                {analysisResult && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-2 h-2 rounded-full ${analysisResult.status === 'Ok' ? 'bg-green-500' : 'bg-orange-500'} animate-pulse`} />
                        <span className="text-[10px] font-black uppercase text-white tracking-widest">{analysisResult.status}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed italic">"{analysisResult.summary}"</p>
                    </div>
                    <div className="space-y-2">
                      {analysisResult.issues?.map((issue: any, idx: number) => (
                        <div key={idx} className={`p-3 rounded-xl border-l-4 ${issue.severity === 'critical' ? 'bg-red-500/10 border-red-500' : 'bg-orange-500/10 border-orange-500'} backdrop-blur-sm`}>
                          <div className="text-[9px] font-black uppercase mb-1 flex justify-between items-center">
                            <span className={issue.severity === 'critical' ? 'text-red-400' : 'text-orange-400'}>{issue.severity}</span>
                            <span className="text-slate-600">Linha {issue.line || '?'}</span>
                          </div>
                          <div className="text-[11px] text-slate-200 font-medium leading-relaxed">{issue.message}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'creator' && (
              <div className="text-center py-8">
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 bg-teal-500 rounded-3xl rotate-6 animate-pulse opacity-20" />
                  <div className="absolute inset-0 bg-emerald-500 rounded-3xl -rotate-3 opacity-10" />
                  <div className="relative w-full h-full bg-gradient-to-tr from-teal-600 to-emerald-400 rounded-3xl flex items-center justify-center text-white shadow-2xl border border-white/20">
                    <User size={48}/>
                  </div>
                </div>
                <h3 className="font-black text-lg text-white tracking-tight">José Heberto</h3>
                <p className="text-[10px] text-teal-500 uppercase font-black mb-8 tracking-[0.2em] opacity-80">Embedded Systems & AI</p>
                <div className="space-y-3 px-2">
                  <button onClick={() => window.open('https://instagram.com/josehebertot2', '_blank')} className="w-full py-3 bg-[#d62976] hover:bg-[#fa7e1e] transition-all duration-500 rounded-xl text-[10px] font-black text-white flex items-center justify-center gap-3 shadow-xl group">
                    <ExternalLink size={16} className="group-hover:rotate-12 transition-transform"/> @josehebertot2
                  </button>
                  <div className="pt-8 opacity-20 text-[9px] font-black uppercase tracking-widest text-slate-500">Arduino IDE Gemini v1.0</div>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Editor & Content Section */}
        <main className="flex-1 flex flex-col relative bg-[#0d1117] shadow-inner">
          {/* Tabs Container */}
          <div className="h-10 flex items-center bg-[#1c1f24] border-b border-white/5 px-2 gap-1 overflow-x-auto custom-scrollbar no-scrollbar">
            {files.map((f, i) => (
              <div key={i} onClick={() => setActiveFileIndex(i)} className={`h-full flex items-center px-6 text-[10px] font-bold cursor-pointer transition-all relative whitespace-nowrap group ${activeFileIndex === i ? 'bg-[#0d1117] text-teal-400 border-t-2 border-teal-500' : 'text-slate-600 hover:text-slate-400 hover:bg-white/5'}`}>
                {f.name}
              </div>
            ))}
          </div>

          {/* Editor Core */}
          <div className="flex-1 relative flex overflow-hidden">
            {/* Line Numbers */}
            <div className="w-12 bg-[#1c1f24]/40 border-r border-white/5 py-5 flex flex-col items-center text-[11px] text-slate-700 font-mono select-none overflow-hidden">
               {Array.from({length: 100}).map((_, i) => (
                 <div key={i} className={`h-[21px] flex items-center transition-colors ${i + 1 === 1 ? 'text-teal-800' : ''}`}>{i + 1}</div>
               ))}
            </div>

            {/* Code Mirror Clone */}
            <div className="flex-1 relative">
               <div ref={highlightRef} className="absolute inset-0 p-5 pointer-events-none code-font text-[14px] leading-[21px] whitespace-pre overflow-hidden z-0"
                 dangerouslySetInnerHTML={{ __html: highlightCode(activeFile.content) + '\n\n\n' }} />
               <textarea 
                 ref={textareaRef}
                 value={activeFile.content}
                 onChange={e => { const nf = [...files]; nf[activeFileIndex].content = e.target.value; setFiles(nf); }}
                 onScroll={syncScroll}
                 spellCheck={false}
                 className="absolute inset-0 w-full h-full p-5 bg-transparent text-transparent caret-teal-500 code-font text-[14px] leading-[21px] resize-none focus:outline-none z-10 whitespace-pre overflow-auto selection:bg-teal-500/20"
               />
            </div>
          </div>

          {/* Console / Monitor Area */}
          <div className={`border-t border-white/5 bg-[#0b0e14] flex flex-col transition-all duration-500 ease-in-out shadow-2xl ${isConsoleOpen ? 'h-64' : 'h-10'}`}>
            <div className="h-10 flex items-center justify-between px-4 bg-[#1c1f24]/80 backdrop-blur-lg border-b border-white/5">
               <div className="flex gap-1 h-full">
                  {['output', 'serial', 'plotter'].map(m => (
                    <button 
                      key={m} 
                      onClick={() => { setConsoleMode(m as any); setIsConsoleOpen(true); }} 
                      className={`px-5 text-[10px] font-black uppercase tracking-[0.15em] border-b-2 transition-all ${consoleMode === m && isConsoleOpen ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-600 hover:text-slate-300'}`}
                    >
                      {m}
                    </button>
                  ))}
               </div>
               <div className="flex items-center gap-3">
                 <button onClick={() => setSerialMessages([])} className="p-1.5 text-slate-600 hover:text-red-400 transition-colors" title="Limpar Console"><Eraser size={14}/></button>
                 <button onClick={() => setIsConsoleOpen(!isConsoleOpen)} className="text-slate-500 hover:text-white transition-all transform active:scale-90">
                    {isConsoleOpen ? <ChevronDown size={18}/> : <Plus size={18}/>}
                 </button>
               </div>
            </div>
            {isConsoleOpen && (
              <div className="flex-1 overflow-y-auto p-5 code-font text-[12px] bg-black/40 custom-scrollbar">
                {consoleMode === 'plotter' ? renderPlotter() : (
                  <div className="space-y-1.5">
                    {serialMessages.length === 0 && <span className="opacity-10 text-[10px] font-black uppercase tracking-[0.2em]">Monitor pronto. Aguardando saída do sistema...</span>}
                    {serialMessages.map((m, i) => (
                      <div key={i} className="flex gap-4 animate-in fade-in slide-in-from-left-2 duration-300">
                        <span className="text-slate-800 text-[10px] font-black">[{m.timestamp}]</span>
                        <span className={`${m.type === 'in' ? 'text-teal-400' : 'text-slate-500'} font-medium`}>{m.text}</span>
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

      {/* Footer Status Bar */}
      <footer className="h-7 bg-[#008184] text-white flex items-center justify-between px-4 text-[9px] font-black uppercase tracking-[0.15em] shadow-inner z-40">
         <div className="flex gap-6 items-center">
            <span className={`flex items-center gap-2 transition-all ${isConnected ? 'text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'opacity-40'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-white'}`} />
              {isConnected ? "Conectado à Porta USB" : "Nenhum Hardware Detectado"}
            </span>
            <span className="opacity-20">|</span>
            <span className="flex items-center gap-2 opacity-80"><Hash size={12}/> {activeFile.name}</span>
         </div>
         <div className="flex gap-6 items-center">
            <span className="bg-black/20 px-2 py-0.5 rounded border border-white/10 flex items-center gap-2"><Cpu size={12}/> {selectedBoard.name}</span>
            <span className="opacity-60 flex items-center gap-2"><User size={12}/> J. HEBERTO PRO EDITION</span>
         </div>
      </footer>
    </div>
  );
};

export default App;
