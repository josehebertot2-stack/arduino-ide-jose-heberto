
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Upload, 
  Files, 
  Cpu, 
  Bug, 
  MessageSquare, 
  X, 
  Plus, 
  ChevronRight, 
  Save, 
  Share2, 
  Settings,
  Trash2,
  CheckCircle2,
  BookOpen,
  Library as LibIcon,
  Activity,
  ChevronDown,
  Copy,
  Zap,
  RotateCcw,
  Terminal,
  User,
  ExternalLink,
  Code2,
  Search,
  Download,
  ShieldAlert,
  Lightbulb,
  Play,
  Unplug,
  Plug2,
  AlertCircle,
  Eraser,
  Hash,
  LineChart
} from 'lucide-react';
import { FileNode, ChatMessage, TabType, SerialMessage, ArduinoExample, ArduinoBoard, ArduinoLibrary } from './types';
import { getCodeAssistance, analyzeCode } from './services/geminiService';

const EXAMPLES: ArduinoExample[] = [
  { name: 'Blink', category: 'Basics', content: `void setup() {\n  pinMode(LED_BUILTIN, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(LED_BUILTIN, HIGH);\n  delay(1000);\n  digitalWrite(LED_BUILTIN, LOW);\n  delay(1000);\n}` },
  { name: 'AnalogReadSerial', category: 'Basics', content: `void setup() {\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  int sensorValue = analogRead(A0);\n  Serial.println(sensorValue);\n  delay(100);\n}` },
  { name: 'Fade', category: 'Basics', content: `int led = 9;\nint brightness = 0;\nint fadeAmount = 5;\n\nvoid setup() {\n  pinMode(led, OUTPUT);\n}\n\nvoid loop() {\n  analogWrite(led, brightness);\n  brightness = brightness + fadeAmount;\n  if (brightness <= 0 || brightness >= 255) {\n    fadeAmount = -fadeAmount;\n  }\n  delay(30);\n}` }
];

const LIBRARIES: ArduinoLibrary[] = [
  { name: 'DHT sensor library', version: '1.4.4', author: 'Adafruit', description: 'Arduino library for DHT11, DHT22, etc.', header: 'DHT.h' },
  { name: 'Adafruit Unified Sensor', version: '1.1.9', author: 'Adafruit', description: 'Common sensor abstraction layer.', header: 'Adafruit_Sensor.h' },
  { name: 'LiquidCrystal I2C', version: '1.1.2', author: 'Frank de Brabander', description: 'Drive I2C LCD displays easily.', header: 'LiquidCrystal_I2C.h' },
  { name: 'FastLED', version: '3.5.0', author: 'Daniel Garcia', description: 'Advanced library for controlling LEDs (WS2812, etc).', header: 'FastLED.h' },
  { name: 'ArduinoJson', version: '6.21.0', author: 'Benoit Blanchon', description: 'Most popular JSON library for Arduino.', header: 'ArduinoJson.h' },
  { name: 'Servo', version: '1.1.8', author: 'Arduino', description: 'Control servo motors.', header: 'Servo.h' }
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
  const [compiling, setCompiling] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [projectName, setProjectName] = useState('sketch_mar24a');
  const [boardSearch, setBoardSearch] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  
  const [port, setPort] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [baudRate, setBaudRate] = useState(9600);
  const readerRef = useRef<any>(null);

  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const consoleEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const activeFile = files[activeFileIndex];

  const filteredBoards = useMemo(() => {
    return BOARDS.filter(b => b.name.toLowerCase().includes(boardSearch.toLowerCase()));
  }, [boardSearch]);

  useEffect(() => {
    if (autoScroll && consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [serialMessages, autoScroll]);

  const handleEditorScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (highlightRef.current) {
      highlightRef.current.scrollTop = e.currentTarget.scrollTop;
      highlightRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const addConsoleMessage = (text: string, type: 'in' | 'out') => {
    const numericValue = parseFloat(text);
    setSerialMessages(prev => [...prev.slice(-499), {
      timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type,
      text,
      value: isNaN(numericValue) ? undefined : numericValue
    }]);
  };

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      const result = await analyzeCode(activeFile.content);
      setAnalysisResult(result);
      addConsoleMessage(`Análise de IA concluída: ${result.summary}`, 'out');
    } catch (err) {
      setAnalysisResult({ status: "Erro", summary: "Falha na conexão com o servidor de IA.", issues: [] });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const connectSerial = async () => {
    if (!('serial' in navigator)) {
      alert("Navegador não suportado para Web Serial.");
      return;
    }
    try {
      const selectedPort = await (navigator as any).serial.requestPort();
      await selectedPort.open({ baudRate });
      setPort(selectedPort);
      setIsConnected(true);
      addConsoleMessage(`Porta serial aberta em ${baudRate} baud.`, "out");
      readSerial(selectedPort);
    } catch (err: any) {
      addConsoleMessage(`Erro de conexão: ${err.message}`, "out");
    }
  };

  const disconnectSerial = async () => {
    if (readerRef.current) await readerRef.current.cancel();
    if (port) await port.close();
    setPort(null);
    setIsConnected(false);
    addConsoleMessage("Porta serial fechada.", "out");
  };

  const readSerial = async (serialPort: any) => {
    while (serialPort.readable) {
      const reader = serialPort.readable.getReader();
      readerRef.current = reader;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const decoded = new TextDecoder().decode(value);
          decoded.split('\n').forEach(line => {
            if (line.trim()) addConsoleMessage(line, "in");
          });
        }
      } catch (err: any) {
        if (!err.message.includes("closed")) addConsoleMessage(`Erro de leitura: ${err.message}`, "out");
      } finally {
        reader.releaseLock();
      }
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isAiLoading) return;
    const userMsg = inputMessage;
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInputMessage('');
    setIsAiLoading(true);
    try {
      const response = await getCodeAssistance(userMsg, activeFile.content);
      if (response) setChatMessages(prev => [...prev, { role: 'assistant', text: response }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', text: "Erro ao contatar Gemini. Verifique sua API_KEY nas configurações." }]);
    } finally { setIsAiLoading(false); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addConsoleMessage("Código copiado!", "out");
  };

  const highlightCode = (code: string) => {
    return code
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\b(void|int|float|char|bool|long|unsigned|const|static|if|else|for|while|return|switch|case|break|byte|word|String|boolean)\b/g, '<span class="text-pink-400 font-semibold">$1</span>')
      .replace(/\b(setup|loop|pinMode|digitalWrite|digitalRead|analogWrite|analogRead|delay|delayMicroseconds|millis|micros|Serial|println|print|begin|available|read|write|peek|flush|parseInt|parseFloat)\b/g, '<span class="text-teal-400 font-bold">$1</span>')
      .replace(/\/\/.*/g, '<span class="text-slate-500 italic">$&</span>')
      .replace(/\/\*[\s\S]*?\*\//g, '<span class="text-slate-500 italic">$&</span>')
      .replace(/#\w+/g, '<span class="text-orange-400 font-mono">$&</span>')
      .replace(/"[^"]*"/g, '<span class="text-green-400">$&</span>')
      .replace(/'[^']*'/g, '<span class="text-green-400">$&</span>')
      .replace(/\b(0x[0-9a-fA-F]+|0b[01]+|\d+)\b/g, '<span class="text-yellow-400">$1</span>')
      .replace(/\b(HIGH|LOW|INPUT|OUTPUT|INPUT_PULLUP|LED_BUILTIN|true|false)\b/g, '<span class="text-purple-400">$1</span>');
  };

  const renderPlotter = () => {
    const dataPoints = serialMessages.filter(m => m.value !== undefined).slice(-100);
    if (dataPoints.length === 0) return (
      <div className="h-full flex items-center justify-center text-slate-700 text-[10px] font-black uppercase tracking-widest">
        Envie valores numéricos via Serial para visualizar o gráfico
      </div>
    );

    const values = dataPoints.map(p => p.value!);
    const maxVal = Math.max(...values, 1);
    const minVal = Math.min(...values, 0);
    const range = maxVal - minVal || 1;

    return (
      <div className="h-full w-full relative px-10 py-4 bg-black/20 overflow-hidden">
        <div className="absolute left-2 top-0 bottom-0 border-r border-white/5 flex flex-col justify-between py-4 text-[9px] font-mono text-slate-500">
          <span>{maxVal.toFixed(1)}</span>
          <span>{((maxVal + minVal) / 2).toFixed(1)}</span>
          <span>{minVal.toFixed(1)}</span>
        </div>
        <svg className="h-full w-full overflow-visible" preserveAspectRatio="none" viewBox={`0 0 ${dataPoints.length - 1} 100`}>
          <path
            d={dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${i} ${100 - ((p.value! - minVal) / range) * 100}`).join(' ')}
            fill="none"
            stroke="#2dd4bf"
            strokeWidth="0.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-[0_0_8px_rgba(45,212,191,0.5)]"
          />
        </svg>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-[#0b0e14] text-slate-300 font-sans select-none overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-white/5 flex items-center justify-between px-4 bg-[#1c1f24] z-30 shadow-md">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#008184] rounded-lg flex items-center justify-center text-white shadow-[0_0_15px_rgba(0,129,132,0.3)] animate-pulse-teal">
              <Zap size={18} fill="currentColor" />
            </div>
            <div className="flex flex-col">
              <input value={projectName} onChange={e => setProjectName(e.target.value)} className="bg-transparent border-none text-sm font-bold text-white focus:outline-none w-40 hover:bg-white/5 rounded px-1" />
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-1">
                Arduino Gemini IDE <span className="w-1 h-1 bg-teal-500 rounded-full"></span> PRO
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5 backdrop-blur-sm">
            <button onClick={() => { setCompiling(true); setTimeout(() => setCompiling(false), 1500); }} className={`p-2 rounded-lg transition-all ${compiling ? 'text-teal-400 bg-teal-400/10' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`} title="Verificar"><CheckCircle2 size={18} /></button>
            <button onClick={() => { setUploading(true); setTimeout(() => setUploading(false), 2000); }} className={`p-2 rounded-lg transition-all ${uploading ? 'text-green-400 bg-green-400/10' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`} title="Upload"><Upload size={18} /></button>
            <div className="w-[1px] h-5 bg-white/10 mx-1" />
            <div className="flex items-center pr-1">
              <button onClick={() => setActiveTab('boards')} className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white group">
                <Cpu size={14} className="group-hover:text-teal-400 transition-colors" />
                {selectedBoard.name}
                <ChevronDown size={12} className="opacity-50" />
              </button>
              <div className="w-[1px] h-5 bg-white/10 mx-1" />
              <button onClick={isConnected ? disconnectSerial : connectSerial} className={`flex items-center gap-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-tighter transition-all rounded-lg ${isConnected ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-[#008184]/10 text-[#008184] hover:bg-[#008184] hover:text-white'}`}>
                {isConnected ? <Unplug size={12} /> : <Plug2 size={12} />}
                {isConnected ? "Desconectar" : "Conectar Hardware"}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-black/40 rounded-lg border border-white/5 px-3 py-1.5 flex items-center gap-2">
            <Activity size={12} className="text-teal-400" />
            <select value={baudRate} onChange={e => setBaudRate(Number(e.target.value))} className="bg-transparent text-[10px] font-bold text-slate-300 focus:outline-none cursor-pointer">
              {[9600, 19200, 38400, 57600, 115200].map(rate => (
                <option key={rate} value={rate} className="bg-[#1c1f24]">{rate} baud</option>
              ))}
            </select>
          </div>
          <button className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-all"><Share2 size={18} /></button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white font-bold text-xs cursor-pointer hover:scale-105 transition-transform shadow-lg border border-white/10">JH</div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar Nav */}
        <nav className="w-14 border-r border-white/5 bg-[#1c1f24] flex flex-col items-center py-6 gap-6 shadow-xl z-20">
          {[
            { id: 'files', icon: Files, label: 'Sketch' },
            { id: 'ai', icon: MessageSquare, label: 'Gemini Chat' },
            { id: 'examples', icon: BookOpen, label: 'Exemplos' },
            { id: 'boards', icon: Cpu, label: 'Placas' },
            { id: 'libraries', icon: LibIcon, label: 'Bibliotecas' },
            { id: 'debug', icon: Bug, label: 'IA Inspect' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)} className={`group relative p-2.5 transition-all rounded-xl ${activeTab === tab.id ? 'bg-[#008184] text-white shadow-[0_0_15px_rgba(0,129,132,0.4)]' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>
              <tab.icon size={22} />
              <div className="absolute left-16 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-bold z-50 border border-white/10">{tab.label}</div>
            </button>
          ))}
          <button onClick={() => setActiveTab('creator')} className={`mt-auto p-2.5 rounded-xl transition-all ${activeTab === 'creator' ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]' : 'text-slate-500 hover:text-orange-400'}`}><User size={22} /></button>
        </nav>

        {/* Panel Expansion */}
        <aside className="w-72 border-r border-white/5 bg-[#0b0e14]/95 backdrop-blur-md flex flex-col z-10 shadow-2xl overflow-hidden">
          <div className="p-4 border-b border-white/5 flex justify-between items-center bg-black/20">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-teal-500/80">
              {activeTab === 'creator' ? 'José Heberto' : activeTab === 'ai' ? 'Gemini AI Assistant' : activeTab}
            </span>
            {activeTab === 'ai' && chatMessages.length > 0 && (
              <button onClick={() => setChatMessages([])} className="p-1 hover:text-red-400 transition-colors" title="Limpar conversa"><Trash2 size={12} /></button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
            {activeTab === 'files' && (
              <div className="space-y-1">
                {files.map((f, i) => (
                  <div key={f.name} onClick={() => setActiveFileIndex(i)} className={`flex items-center gap-3 px-3 py-2.5 text-xs rounded-lg cursor-pointer group transition-all ${i === activeFileIndex ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-inner' : 'text-slate-400 hover:bg-white/5 border border-transparent'}`}>
                    <Code2 size={14} /> {f.name}
                  </div>
                ))}
                <button className="w-full mt-2 py-2 flex items-center justify-center gap-2 text-[10px] font-bold uppercase text-slate-500 hover:text-teal-400 border border-dashed border-white/10 rounded-lg hover:border-teal-400/30 transition-all"><Plus size={12} /> Novo Arquivo</button>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="flex flex-col h-full bg-[#0b0e14]">
                <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1 scroll-smooth">
                  {chatMessages.length === 0 && (
                    <div className="p-4 text-center mt-10 animate-in fade-in zoom-in-95 duration-700">
                      <div className="w-14 h-14 bg-teal-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-teal-400 shadow-xl border border-teal-500/10"><MessageSquare size={28} /></div>
                      <h3 className="text-white text-sm font-bold mb-2">Como posso ajudar?</h3>
                      <p className="text-[11px] text-slate-500 leading-relaxed px-4 italic">"Peça para escrever um código, explicar um erro ou sugerir melhorias no seu sketch."</p>
                    </div>
                  )}
                  {chatMessages.map((m, i) => (
                    <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                      <div className={`group relative max-w-[95%] rounded-2xl p-3 text-[11px] leading-relaxed shadow-lg ${m.role === 'user' ? 'bg-[#008184] text-white rounded-br-none' : 'bg-[#1c1f24] text-slate-200 border border-white/5 rounded-bl-none'}`}>
                        {m.role === 'assistant' && (
                          <button onClick={() => copyToClipboard(m.text)} className="absolute top-2 right-2 p-1.5 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:text-teal-400 hover:bg-black/60">
                            <Copy size={12} />
                          </button>
                        )}
                        <div className="whitespace-pre-wrap">{m.text}</div>
                      </div>
                    </div>
                  ))}
                  {isAiLoading && (
                    <div className="flex gap-2 items-center text-[10px] text-teal-400 animate-pulse font-black uppercase px-2">
                       <div className="flex gap-1">
                          <span className="w-1 h-1 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                          <span className="w-1 h-1 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                          <span className="w-1 h-1 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                       </div>
                       Gemini está digitando...
                    </div>
                  )}
                </div>
                <div className="relative mt-auto pb-2">
                  <textarea value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())} placeholder="Descreva sua ideia..." className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 pr-12 text-[11px] focus:outline-none focus:border-teal-500 transition-all h-24 resize-none placeholder:text-slate-600 shadow-inner" />
                  <button onClick={handleSendMessage} disabled={isAiLoading || !inputMessage.trim()} className="absolute right-3 bottom-5 p-2 bg-teal-500 rounded-xl text-white hover:bg-teal-400 disabled:opacity-30 disabled:hover:bg-teal-500 transition-all shadow-lg active:scale-95"><ChevronRight size={18} /></button>
                </div>
              </div>
            )}

            {activeTab === 'debug' && (
              <div className="space-y-4">
                <button onClick={handleRunAnalysis} disabled={isAnalyzing} className="w-full py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl shadow-teal-500/20 active:scale-95">
                  {isAnalyzing ? <RotateCcw size={14} className="animate-spin" /> : <ShieldAlert size={14} />}
                  Analisar com IA
                </button>

                {analysisResult && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                    <div className={`p-4 rounded-xl border ${analysisResult.issues.length > 0 ? 'bg-orange-500/10 border-orange-500/20' : 'bg-green-500/10 border-green-500/20 shadow-lg shadow-green-500/5'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        {analysisResult.issues.length > 0 ? <AlertCircle size={14} className="text-orange-500" /> : <CheckCircle2 size={14} className="text-green-500" />}
                        <span className="text-[10px] font-black uppercase tracking-widest">{analysisResult.status}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed italic">"{analysisResult.summary}"</p>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[10px] font-black text-slate-600 uppercase px-1 tracking-tighter">Problemas Identificados:</span>
                      {analysisResult.issues.length === 0 ? (
                        <div className="text-[11px] text-slate-500 p-2 italic text-center">Nenhum erro de sintaxe detectado.</div>
                      ) : (
                        analysisResult.issues.map((issue: any, idx: number) => (
                          <div key={idx} className="p-3 bg-[#1c1f24] border border-white/5 rounded-xl flex items-start gap-3 hover:border-white/10 transition-colors group">
                            <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${issue.severity === 'critical' ? 'bg-red-500' : issue.severity === 'warning' ? 'bg-orange-500' : 'bg-blue-400'}`} />
                            <div className="flex-1">
                              <div className="text-[11px] text-slate-200 font-medium">{issue.message}</div>
                              {issue.line && <div className="text-[9px] text-slate-600 mt-1 font-mono font-bold group-hover:text-teal-500 transition-colors">LINHA {issue.line}</div>}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'examples' && (
               <div className="space-y-4">
                 <div className="relative group">
                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-teal-400 transition-colors" />
                    <input placeholder="Filtrar exemplos..." className="w-full bg-black/40 border border-white/5 rounded-lg py-2 pl-8 pr-3 text-[10px] focus:outline-none focus:border-teal-500 transition-all" />
                 </div>
                 {EXAMPLES.map(ex => (
                   <div key={ex.name} onClick={() => { const nf = [...files]; nf[activeFileIndex].content = ex.content; setFiles(nf); addConsoleMessage(`Exemplo '${ex.name}' carregado.`, 'out'); }} className="p-3 bg-white/5 hover:bg-teal-500/10 hover:border-teal-500/20 border border-transparent rounded-xl cursor-pointer transition-all group">
                     <div className="text-xs font-bold group-hover:text-teal-400 transition-colors">{ex.name}</div>
                     <div className="text-[9px] text-slate-600 mt-1 uppercase font-black tracking-widest">{ex.category}</div>
                   </div>
                 ))}
               </div>
            )}

            {activeTab === 'boards' && (
              <div className="space-y-2">
                <input placeholder="Buscar placa..." value={boardSearch} onChange={e => setBoardSearch(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-lg py-2 px-3 text-[10px] focus:outline-none mb-2 focus:border-teal-500 transition-all" />
                {filteredBoards.map(board => (
                  <div key={board.id} onClick={() => setSelectedBoard(board)} className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedBoard.id === board.id ? 'bg-teal-500/10 border-teal-500/30 shadow-lg shadow-teal-500/5' : 'bg-white/5 border-transparent hover:bg-white/10'}`}>
                    <div className={`text-xs font-bold ${selectedBoard.id === board.id ? 'text-teal-400' : 'text-slate-300'}`}>{board.name}</div>
                    <div className="text-[9px] text-slate-600 mt-1 uppercase font-mono tracking-tighter">{board.fqbn}</div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'creator' && (
              <div className="p-6 flex flex-col items-center text-center animate-in zoom-in-95 duration-500">
                <div className="relative mb-6">
                  <div className="absolute -inset-3 bg-gradient-to-tr from-teal-500 to-emerald-400 rounded-3xl blur-lg opacity-20 animate-pulse"></div>
                  <div className="relative w-28 h-28 bg-[#1c1f24] border border-white/10 rounded-3xl flex items-center justify-center text-white shadow-2xl overflow-hidden group">
                     <User size={56} className="text-teal-400 group-hover:scale-110 transition-transform duration-500" />
                  </div>
                </div>
                <h2 className="text-xl font-black text-white mb-1 tracking-tight">José Heberto</h2>
                <div className="text-teal-400 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Embedded AI Architect</div>
                <p className="text-[11px] text-slate-500 leading-relaxed mb-8 italic px-2">"A tecnologia é o pincel, a eletrônica é a tinta e a IA é a inspiração para criar o impossível."</p>
                <div className="w-full space-y-2.5">
                  <button onClick={() => window.open('https://instagram.com/josehebertot2', '_blank')} className="w-full py-3.5 bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-xl flex items-center justify-center gap-2"><ExternalLink size={14}/> Instagram @josehebertot2</button>
                  <button className="w-full py-3 bg-white/5 hover:bg-white/10 text-slate-400 text-[9px] font-black uppercase tracking-widest rounded-2xl border border-white/5 transition-all active:scale-95">Download Portfolio.ino</button>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Editor Main */}
        <main className="flex-1 flex flex-col relative bg-[#0d1117] z-0 shadow-inner">
          <div className="flex h-10 border-b border-white/5 bg-[#1c1f24] px-1 overflow-x-auto custom-scrollbar">
            {files.map((f, i) => (
              <div key={f.name} onClick={() => setActiveFileIndex(i)} className={`flex items-center gap-3 px-6 text-[11px] font-bold cursor-pointer relative transition-all border-r border-white/5 whitespace-nowrap ${activeFileIndex === i ? 'bg-[#0d1117] text-teal-400' : 'text-slate-600 hover:text-slate-300 hover:bg-black/20'}`}>
                <Hash size={10} className="opacity-30" /> {f.name}
                {activeFileIndex === i && <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.6)]" />}
                {files.length > 1 && <X size={10} className="ml-2 hover:bg-red-500/20 rounded-full p-0.5 opacity-20 hover:opacity-100 transition-opacity" />}
              </div>
            ))}
            <button className="px-4 text-slate-700 hover:text-teal-500 transition-colors"><Plus size={16} /></button>
          </div>

          <div className="flex-1 relative overflow-hidden flex">
            {/* Line Numbers */}
            <div className="w-12 bg-[#1c1f24]/20 border-r border-white/5 flex flex-col items-center py-5 text-[11px] text-slate-700 font-mono select-none">
              {Array.from({ length: 100 }).map((_, i) => <div key={i} className="h-[21px]">{i + 1}</div>)}
            </div>
            
            {/* Editor Area */}
            <div className="flex-1 relative group overflow-hidden">
              <div ref={highlightRef} className="absolute inset-0 p-5 pointer-events-none code-font text-[14px] leading-[21px] whitespace-pre overflow-hidden z-0" 
                dangerouslySetInnerHTML={{ __html: highlightCode(activeFile.content) + '\n\n\n' }} />
              
              <textarea 
                ref={textareaRef}
                value={activeFile.content} 
                onChange={e => { const nf = [...files]; nf[activeFileIndex].content = e.target.value; setFiles(nf); }} 
                onScroll={handleEditorScroll}
                spellCheck={false} 
                className="absolute inset-0 w-full h-full p-5 bg-transparent text-transparent caret-teal-500 code-font text-[14px] leading-[21px] resize-none focus:outline-none z-10 whitespace-pre overflow-y-auto overflow-x-auto selection:bg-teal-500/20" 
              />
            </div>
          </div>

          {/* Console / Bottom Panel */}
          <div className={`border-t border-white/5 bg-[#0b0e14] flex flex-col transition-all duration-300 shadow-2xl z-20 ${isConsoleOpen ? 'h-72' : 'h-10'}`}>
            <div className="flex items-center justify-between px-4 h-10 bg-[#1c1f24]/80 backdrop-blur-sm border-b border-white/5">
              <div className="flex gap-2 h-full">
                <button onClick={() => { setConsoleMode('output'); setIsConsoleOpen(true); }} className={`px-4 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] border-b-2 transition-all ${consoleMode === 'output' && isConsoleOpen ? 'border-teal-500 text-teal-400 bg-teal-500/5' : 'border-transparent text-slate-600 hover:text-slate-300'}`}>
                  <Terminal size={12}/> Saída
                </button>
                <button onClick={() => { setConsoleMode('serial'); setIsConsoleOpen(true); }} className={`px-4 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] border-b-2 transition-all ${consoleMode === 'serial' && isConsoleOpen ? 'border-teal-500 text-teal-400 bg-teal-500/5' : 'border-transparent text-slate-600 hover:text-slate-300'}`}>
                  <Activity size={12}/> Monitor Serial
                </button>
                <button onClick={() => { setConsoleMode('plotter'); setIsConsoleOpen(true); }} className={`px-4 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] border-b-2 transition-all ${consoleMode === 'plotter' && isConsoleOpen ? 'border-teal-500 text-teal-400 bg-teal-500/5' : 'border-transparent text-slate-600 hover:text-slate-300'}`}>
                  <LineChart size={12}/> Plotter
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setSerialMessages([])} className="p-1.5 text-slate-600 hover:text-red-400 transition-all active:scale-90" title="Limpar Monitor"><Eraser size={14} /></button>
                <div className="w-[1px] h-4 bg-white/10" />
                <button onClick={() => setAutoScroll(!autoScroll)} className={`text-[8px] font-black uppercase px-2 py-1 rounded border transition-all ${autoScroll ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : 'bg-white/5 text-slate-600 border-white/10'}`}>Scroll</button>
                <button onClick={() => setIsConsoleOpen(!isConsoleOpen)} className="text-slate-600 hover:text-white transition-all transform active:scale-95">{isConsoleOpen ? <ChevronDown size={18} /> : <Plus size={18} />}</button>
              </div>
            </div>
            
            {isConsoleOpen && (
              <div className="flex-1 overflow-y-auto p-4 code-font text-[12px] bg-black/40 custom-scrollbar">
                {consoleMode === 'plotter' ? (
                  renderPlotter()
                ) : (
                  <>
                    {serialMessages.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center opacity-10">
                        <Terminal size={48} className="mb-3" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Aguardando comunicação...</span>
                      </div>
                    )}
                    {serialMessages.map((m, i) => (
                      <div key={i} className="flex gap-4 py-1 border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors items-start">
                        <span className="text-slate-700 text-[10px] min-w-[75px] select-none font-mono">[{m.timestamp}]</span>
                        <span className={`${m.type === 'in' ? 'text-teal-400' : 'text-slate-400 font-bold'} break-all flex-1`}>
                          {m.type === 'out' && <span className="text-[9px] mr-2 text-slate-700 opacity-80 font-black uppercase tracking-widest border border-white/5 px-1 rounded">System</span>}
                          {m.text}
                        </span>
                      </div>
                    ))}
                  </>
                )}
                <div ref={consoleEndRef} />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* StatusBar */}
      <footer className="h-7 bg-[#008184] text-white px-4 flex items-center justify-between text-[10px] font-black tracking-widest uppercase shadow-2xl z-40">
        <div className="flex items-center gap-5">
          <span className={`flex items-center gap-2 ${isConnected ? 'text-white' : 'text-slate-200/40 animate-pulse'}`}>
            {isConnected ? <CheckCircle2 size={12} fill="currentColor" className="text-emerald-300" /> : <AlertCircle size={12} />}
            {isConnected ? "Hardware Ativo" : "Aguardando Hardware"}
          </span>
          <span className="w-[1px] h-3 bg-white/20" />
          <span className="flex items-center gap-2">
             <Code2 size={12} className="opacity-70" /> {projectName}.ino
          </span>
        </div>
        <div className="flex items-center gap-5">
          <span className="bg-white/10 px-2 py-0.5 rounded-md flex items-center gap-2 border border-white/10 shadow-sm">
            <Cpu size={10} className="text-teal-200" /> Placa: {selectedBoard.name}
          </span>
          <span className="bg-black/20 px-2 py-0.5 rounded-md text-teal-100 border border-white/5 font-mono">
            {isConnected ? `${baudRate} BPS` : "OFF"}
          </span>
          <span className="flex items-center gap-1.5 opacity-80 group cursor-help" title="Versão customizada para José Heberto">
            <User size={10} className="group-hover:text-orange-300 transition-colors" /> J. Heberto Ed.
          </span>
        </div>
      </footer>
    </div>
  );
};

export default App;
