
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
  Cpu as BoardIcon,
  Search,
  Download,
  ShieldAlert,
  Lightbulb,
  Play,
  Github,
  Linkedin,
  Instagram,
  Unplug,
  Plug2,
  AlertCircle
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
  { name: 'DallasTemperature', version: '3.9.0', author: 'Miles Burton', description: 'Control library for Maxim Temperature ICs.', header: 'DallasTemperature.h' },
  { name: 'OneWire', version: '2.3.7', author: 'Jim Studt', description: 'Control devices using the Maxim OneWire protocol.', header: 'OneWire.h' },
  { name: 'MPU6050', version: '2.0.0', author: 'Electronic Cats', description: 'Library for the MPU6050 accelerometer and gyroscope.', header: 'MPU6050.h' },
  { name: 'Ultrasonic', version: '3.0.0', author: 'Erick Simões', description: 'Library for HC-SR04 ultrasonic sensor.', header: 'Ultrasonic.h' },
  { name: 'LiquidCrystal I2C', version: '1.1.2', author: 'Frank de Brabander', description: 'Drive I2C LCD displays easily.', header: 'LiquidCrystal_I2C.h' },
  { name: 'Adafruit GFX Library', version: '1.11.5', author: 'Adafruit', description: 'Core graphics library for all displays.', header: 'Adafruit_GFX.h' },
  { name: 'Adafruit SSD1306', version: '2.5.7', author: 'Adafruit', description: 'Library for SSD1306 based monochrome OLEDs.', header: 'Adafruit_SSD1306.h' },
  { name: 'FastLED', version: '3.5.0', author: 'Daniel Garcia', description: 'Advanced library for controlling LEDs (WS2812, etc).', header: 'FastLED.h' },
  { name: 'ArduinoJson', version: '6.21.0', author: 'Benoit Blanchon', description: 'Most popular JSON library for Arduino.', header: 'ArduinoJson.h' },
  { name: 'PubSubClient', version: '2.8', author: 'Nick O\'Leary', description: 'MQTT client for IoT messaging.', header: 'PubSubClient.h' },
  { name: 'Servo', version: '1.1.8', author: 'Arduino', description: 'Control servo motors.', header: 'Servo.h' },
  { name: 'Wire', version: '1.0', author: 'Arduino', description: 'I2C communication.', header: 'Wire.h' },
  { name: 'SPI', version: '1.0', author: 'Arduino', description: 'SPI communication.', header: 'SPI.h' }
];

const BOARDS: ArduinoBoard[] = [
  { id: 'uno', name: 'Arduino Uno', fqbn: 'arduino:avr:uno' },
  { id: 'nano', name: 'Arduino Nano', fqbn: 'arduino:avr:nano' },
  { id: 'mega', name: 'Arduino Mega 2560', fqbn: 'arduino:avr:mega' },
  { id: 'esp32', name: 'ESP32 Dev Module', fqbn: 'esp32:esp32:esp32' },
  { id: 'pico', name: 'Raspberry Pi Pico', fqbn: 'rp2040:rp2040:pico' },
  { id: 'esp8266', name: 'NodeMCU 1.0', fqbn: 'esp8266:esp8266:nodemcuv2' }
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
  const [libSearch, setLibSearch] = useState('');
  
  // Web Serial API State
  const [port, setPort] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [baudRate, setBaudRate] = useState(9600);
  const readerRef = useRef<any>(null);

  // Debug State
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const consoleEndRef = useRef<HTMLDivElement>(null);
  const activeFile = files[activeFileIndex];

  const filteredBoards = useMemo(() => {
    return BOARDS.filter(b => 
      b.name.toLowerCase().includes(boardSearch.toLowerCase()) || 
      b.fqbn.toLowerCase().includes(boardSearch.toLowerCase())
    );
  }, [boardSearch]);

  const filteredLibs = useMemo(() => {
    return LIBRARIES.filter(l => 
      l.name.toLowerCase().includes(libSearch.toLowerCase()) || 
      l.description.toLowerCase().includes(libSearch.toLowerCase()) ||
      l.header.toLowerCase().includes(libSearch.toLowerCase())
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [libSearch]);

  const includeLibrary = (lib: ArduinoLibrary) => {
    const includeStatement = `#include <${lib.header}>\n`;
    if (activeFile.content.includes(includeStatement)) return;
    const newFiles = [...files];
    newFiles[activeFileIndex].content = includeStatement + activeFile.content;
    setFiles(newFiles);
    addConsoleMessage(`Library ${lib.name} included.`, 'out');
  };

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      const result = await analyzeCode(activeFile.content);
      setAnalysisResult(result);
    } catch (err) {
      setAnalysisResult("Falha na análise. Verifique sua conexão.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Web Serial Port Connection
  const connectSerial = async () => {
    if (!('serial' in navigator)) {
      addConsoleMessage("Seu navegador não suporta a Web Serial API. Tente usar o Chrome ou Edge.", "out");
      return;
    }

    try {
      const selectedPort = await (navigator as any).serial.requestPort();
      await selectedPort.open({ baudRate });
      setPort(selectedPort);
      setIsConnected(true);
      addConsoleMessage(`Conectado à porta serial em ${baudRate} baud.`, "out");
      
      readSerial(selectedPort);
    } catch (err: any) {
      addConsoleMessage(`Erro ao conectar: ${err.message}`, "out");
    }
  };

  const disconnectSerial = async () => {
    if (readerRef.current) {
      await readerRef.current.cancel();
    }
    if (port) {
      await port.close();
    }
    setPort(null);
    setIsConnected(false);
    addConsoleMessage("Porta serial desconectada.", "out");
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
          // Dividir por linhas para não sobrecarregar o monitor serial
          decoded.split('\n').forEach(line => {
            if (line.trim()) {
              addConsoleMessage(line, "in");
            }
          });
        }
      } catch (err: any) {
        addConsoleMessage(`Erro de leitura: ${err.message}`, "out");
      } finally {
        reader.releaseLock();
      }
    }
  };

  useEffect(() => {
    if (uploading) {
      const interval = setInterval(() => {
        const val = Math.floor(Math.random() * 1024);
        if (!isConnected) {
          addConsoleMessage(`Simulando Upload: ${val}`, 'in', val);
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, [uploading, isConnected]);

  useEffect(() => {
    if (consoleEndRef.current) consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [serialMessages]);

  const addConsoleMessage = (text: string, type: 'in' | 'out', value?: number) => {
    setSerialMessages(prev => [...prev.slice(-200), {
      timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type,
      text,
      value
    }]);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isAiLoading) return;
    setChatMessages(prev => [...prev, { role: 'user', text: inputMessage }]);
    setInputMessage('');
    setIsAiLoading(true);
    try {
      const response = await getCodeAssistance(inputMessage, activeFile.content);
      if (response) setChatMessages(prev => [...prev, { role: 'assistant', text: response }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', text: "Erro na IA." }]);
    } finally { setIsAiLoading(false); }
  };

  const openJoseProfile = () => {
    addConsoleMessage("Abrindo o Instagram de José Heberto (@josehebertot2)...", "out");
    setTimeout(() => {
      window.open('https://www.instagram.com/josehebertot2/', '_blank');
    }, 500);
  };

  const highlightCode = (code: string) => {
    return code
      .replace(/\b(void|int|float|char|bool|long|unsigned|const|static|if|else|for|while|return|switch|case|break)\b/g, '<span class="text-pink-400">$1</span>')
      .replace(/\b(setup|loop|pinMode|digitalWrite|digitalRead|analogWrite|analogRead|delay|millis|Serial|println|print|begin)\b/g, '<span class="text-cyan-400">$1</span>')
      .replace(/\/\/.*/g, '<span class="text-slate-500">$&</span>')
      .replace(/#\w+/g, '<span class="text-orange-400">$&</span>')
      .replace(/"[^"]*"/g, '<span class="text-green-400">$&</span>')
      .replace(/\b(HIGH|LOW|INPUT|OUTPUT|INPUT_PULLUP)\b/g, '<span class="text-purple-400">$1</span>');
  };

  return (
    <div className="flex flex-col h-screen bg-[#0b0e14] text-slate-300 overflow-hidden font-sans">
      <header className="h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-[#1c1f24] z-20">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#008184] rounded-md flex items-center justify-center text-white shadow-lg"><Zap size={18} fill="white" /></div>
            <div className="flex flex-col">
              <input value={projectName} onChange={e => setProjectName(e.target.value)} className="bg-transparent border-none text-sm font-semibold focus:outline-none focus:text-white w-32" />
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Arduino IDE Web</span>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-[#0b0e14] p-1 rounded-lg border border-slate-800">
            <button onClick={() => { setCompiling(true); setTimeout(() => setCompiling(false), 1000); }} className={`p-2 rounded-md hover:bg-slate-800 transition-all ${compiling ? 'text-cyan-400' : 'text-slate-400'}`} title="Verify"><CheckCircle2 size={18} /></button>
            <button onClick={() => { setUploading(true); setTimeout(() => setUploading(false), 2000); }} className={`p-2 rounded-md hover:bg-slate-800 transition-all ${uploading ? 'text-green-400' : 'text-slate-400'}`} title="Upload"><Upload size={18} /></button>
            <div className="w-[1px] h-6 bg-slate-800 mx-1" />
            
            <div className="flex items-center">
              <button onClick={() => setActiveTab('boards')} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white"><Cpu size={14} />{selectedBoard.name}<ChevronDown size={12} /></button>
              <div className="w-[1px] h-6 bg-slate-800 mx-1" />
              <button 
                onClick={isConnected ? disconnectSerial : connectSerial} 
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold transition-all rounded-md ${isConnected ? 'bg-red-500/10 text-red-500' : 'bg-[#008184]/10 text-[#008184] hover:bg-[#008184] hover:text-white'}`}
                title={isConnected ? "Desconectar Porta COM" : "Conectar Porta COM"}
              >
                {isConnected ? <Unplug size={14} /> : <Plug2 size={14} />}
                {isConnected ? "Desconectar" : "Conectar COM"}
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#0b0e14] rounded-md border border-slate-800 px-2 h-8">
            <select 
              value={baudRate} 
              onChange={e => setBaudRate(Number(e.target.value))}
              className="bg-transparent text-[10px] font-bold text-slate-400 focus:outline-none cursor-pointer"
            >
              {[300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200].map(rate => (
                <option key={rate} value={rate} className="bg-[#1c1f24]">{rate} baud</option>
              ))}
            </select>
          </div>
          <button className="p-2 text-slate-400 hover:text-white"><Share2 size={18} /></button>
          <button className="p-2 text-slate-400 hover:text-white"><Save size={18} /></button>
          <button className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center hover:bg-slate-700 transition-colors"><Settings size={16} /></button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-14 border-r border-slate-800 bg-[#1c1f24] flex flex-col items-center py-6 gap-8">
          {[
            { id: 'files', icon: Files, label: 'Sketchbook' },
            { id: 'ai', icon: MessageSquare, label: 'Gemini AI' },
            { id: 'examples', icon: BookOpen, label: 'Exemplos' },
            { id: 'boards', icon: BoardIcon, label: 'Placas' },
            { id: 'libraries', icon: LibIcon, label: 'Bibliotecas' },
            { id: 'debug', icon: Bug, label: 'Debug' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)} className={`group relative p-2 transition-all rounded-lg ${activeTab === tab.id ? 'bg-[#008184]/20 text-[#008184]' : 'text-slate-500 hover:text-slate-300'}`}>
              <tab.icon size={22} />
              {activeTab === tab.id && <div className="absolute -left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#008184] rounded-r-full" />}
            </button>
          ))}
          <div className="mt-auto pb-4">
             <button onClick={() => setActiveTab('creator')} className={`p-2 transition-all rounded-lg ${activeTab === 'creator' ? 'bg-orange-500/20 text-orange-500' : 'text-slate-500 hover:text-orange-400'}`} title="Criador: José Heberto"><User size={22} /></button>
          </div>
        </aside>

        <aside className="w-72 border-r border-slate-800 bg-[#0b0e14] flex flex-col shadow-2xl">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#1c1f24]/50">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
              {activeTab === 'creator' ? 'Informações' : activeTab}
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {activeTab === 'debug' && (
              <div className="p-4 flex flex-col h-full gap-4">
                <button 
                  onClick={handleRunAnalysis}
                  disabled={isAnalyzing}
                  className="w-full py-3 bg-[#008184] hover:bg-[#009a9d] text-white rounded-lg text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#008184]/20"
                >
                  {isAnalyzing ? <RotateCcw size={14} className="animate-spin" /> : <Play size={14} />}
                  Analisar Código
                </button>

                <div className="space-y-4 mt-2">
                   <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">IA Análise Estática</div>
                   {isAnalyzing && <div className="p-4 bg-[#1c1f24] rounded-lg border border-slate-800 animate-pulse text-[10px] text-[#008184]">Escaneando vulnerabilidades de código...</div>}
                   
                   {analysisResult && (
                     <div className="p-4 bg-[#1c1f24] border border-slate-800 rounded-lg space-y-3">
                       <div className="flex items-start gap-2 text-xs leading-relaxed text-slate-300 whitespace-pre-wrap">
                          {analysisResult}
                       </div>
                     </div>
                   )}

                   <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-6">Pin Watcher (Simulado)</div>
                   <div className="grid grid-cols-2 gap-2">
                     {[13, 12, 11, 10, 'A0', 'A1'].map(pin => (
                       <div key={pin} className="bg-[#1c1f24] p-2 rounded border border-slate-800 flex justify-between items-center">
                         <span className="text-[10px] font-mono text-slate-500">PIN {pin}</span>
                         <div className={`w-2 h-2 rounded-full ${Math.random() > 0.5 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-slate-700'}`} />
                       </div>
                     ))}
                   </div>
                </div>
              </div>
            )}

            {activeTab === 'libraries' && (
              <div className="flex flex-col h-full">
                <div className="p-3 border-b border-slate-800">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={12} />
                    <input type="text" placeholder="Buscar bibliotecas..." value={libSearch} onChange={e => setLibSearch(e.target.value)} className="w-full bg-[#1c1f24] border border-slate-800 rounded-md py-1.5 pl-8 pr-3 text-[11px] focus:outline-none focus:border-[#008184]" />
                  </div>
                </div>
                <div className="p-3 space-y-3 flex-1 overflow-y-auto custom-scrollbar">
                  {filteredLibs.map((lib, idx) => (
                    <div key={idx} className="p-3 bg-[#1c1f24] border border-slate-800 rounded-lg hover:border-slate-600 transition-all group">
                      <div className="flex justify-between items-start mb-1"><span className="text-xs font-bold text-white group-hover:text-[#008184] transition-colors">{lib.name}</span><span className="text-[9px] text-[#008184] bg-[#008184]/10 px-1.5 py-0.5 rounded">v{lib.version}</span></div>
                      <p className="text-[10px] text-slate-400 mb-3 leading-relaxed line-clamp-2">{lib.description}</p>
                      <button onClick={() => includeLibrary(lib)} className="w-full flex items-center justify-center gap-2 py-1.5 bg-[#008184]/10 hover:bg-[#008184] text-[#008184] hover:text-white border border-[#008184]/20 rounded text-[10px] font-bold transition-all"><Download size={12} /> Incluir {lib.header}</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'boards' && (
              <div className="flex flex-col h-full">
                <div className="p-3 border-b border-slate-800">
                  <div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={12} /><input type="text" placeholder="Buscar placa..." value={boardSearch} onChange={e => setBoardSearch(e.target.value)} className="w-full bg-[#1c1f24] border border-slate-800 rounded-md py-1.5 pl-8 pr-3 text-[11px] focus:outline-none focus:border-[#008184]" /></div>
                </div>
                <div className="p-3 space-y-2 flex-1 overflow-y-auto custom-scrollbar">
                  {filteredBoards.map(board => (
                    <div key={board.id} onClick={() => setSelectedBoard(board)} className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedBoard.id === board.id ? 'bg-[#008184]/20 border-[#008184] text-white shadow-lg shadow-[#008184]/10' : 'bg-[#1c1f24] border-slate-800 text-slate-400 hover:border-slate-600'}`}><div className="text-xs font-bold">{board.name}</div><div className="text-[9px] opacity-60 font-mono mt-1">{board.fqbn}</div></div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="flex flex-col h-full bg-[#0b0e14]">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {chatMessages.map((m, i) => (
                    <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[95%] rounded-2xl p-3 text-xs leading-relaxed ${m.role === 'user' ? 'bg-[#008184] text-white' : 'bg-[#1c1f24] text-slate-200 border border-slate-800 shadow-xl'}`}>{m.text}</div>
                    </div>
                  ))}
                  {isAiLoading && <div className="text-[10px] text-[#008184] animate-pulse-teal font-bold uppercase tracking-widest">Processando...</div>}
                </div>
                <div className="p-4 border-t border-slate-800">
                  <div className="relative"><textarea value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} placeholder="Ask AI..." className="w-full bg-[#0b0e14] border border-slate-700 rounded-xl p-3 pr-10 text-xs focus:outline-none focus:border-[#008184] resize-none h-20" /><button onClick={handleSendMessage} className="absolute right-2 bottom-2 p-1.5 bg-[#008184] rounded-lg text-white"><ChevronRight size={16} /></button></div>
                </div>
              </div>
            )}
            
            {activeTab === 'files' && (
              <div className="p-2 space-y-1">
                {files.map((f, i) => (
                  <div key={f.name} onClick={() => setActiveFileIndex(i)} className={`flex items-center gap-3 px-3 py-2 text-xs rounded-md cursor-pointer group transition-colors ${i === activeFileIndex ? 'bg-[#008184]/10 text-[#008184] font-semibold' : 'text-slate-400 hover:bg-slate-800/50'}`}><Files size={14} className={i === activeFileIndex ? 'text-[#008184]' : 'text-slate-600'} />{f.name}</div>
                ))}
              </div>
            )}

            {activeTab === 'examples' && (
              <div className="p-2 space-y-4">
                {['Basics', 'Digital', 'Analog'].map(cat => (
                  <div key={cat}>
                    <div className="px-2 py-1 text-[10px] text-slate-600 font-bold uppercase tracking-wider">{cat}</div>
                    {EXAMPLES.filter(e => e.category === cat).map(ex => (
                      <div key={ex.name} onClick={() => { const newFiles = [...files]; newFiles[activeFileIndex].content = ex.content; setFiles(newFiles); }} className="px-3 py-2 text-xs text-slate-400 hover:bg-slate-800 hover:text-[#008184] rounded-md cursor-pointer transition-all">{ex.name}</div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'creator' && (
              <div className="p-6 flex flex-col items-center text-center">
                <div className="relative group mb-6">
                  <div className="absolute -inset-1 bg-gradient-to-tr from-[#008184] to-orange-500 rounded-2xl blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                  <div className="relative w-24 h-24 bg-[#1c1f24] rounded-2xl flex items-center justify-center text-white shadow-2xl rotate-3 group-hover:rotate-0 transition-transform">
                    <User size={48} className="text-[#008184]" />
                  </div>
                </div>
                
                <h2 className="text-xl font-black text-white mb-2">José Heberto</h2>
                <div className="px-3 py-1 bg-[#008184]/10 text-[#008184] text-[10px] font-bold rounded-full mb-4 border border-[#008184]/20 uppercase tracking-widest">Master Engineer</div>
                
                <p className="text-xs text-slate-500 leading-relaxed mb-6">
                  Desenvolvedor Visionário & Entusiasta de Hardware. Criador desta IDE personalizada para simplificar o desenvolvimento com Arduino. Siga-me no Instagram: <span className="text-[#008184]">@josehebertot2</span>
                </p>

                <div className="w-full space-y-3">
                  <button 
                    onClick={openJoseProfile}
                    className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-pink-600/20 group"
                  >
                    <Instagram size={14} className="group-hover:scale-110 transition-transform" /> 
                    Perfil de José
                  </button>
                  
                  <div className="flex gap-2">
                    <button onClick={() => window.open('https://www.instagram.com/josehebertot2/', '_blank')} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 flex items-center justify-center transition-colors" title="Instagram"><Instagram size={16}/></button>
                    <button onClick={() => window.open('https://linkedin.com', '_blank')} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 flex items-center justify-center transition-colors" title="Linkedin"><Linkedin size={16}/></button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        <main className="flex-1 flex flex-col relative bg-[#0d1117]">
          <div className="flex h-10 border-b border-slate-800 bg-[#1c1f24] px-2">
            {files.map((f, i) => (
              <div key={f.name} onClick={() => setActiveFileIndex(i)} className={`flex items-center gap-3 px-6 text-xs font-medium cursor-pointer relative transition-all ${activeFileIndex === i ? 'bg-[#0d1117] text-[#008184]' : 'text-slate-500 hover:text-slate-300'}`}>
                <div className="flex items-center gap-2"><Files size={12} />{f.name}</div>
                {activeFileIndex === i && <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#008184]" />}
                <X size={10} className="ml-2 opacity-30 hover:opacity-100" />
              </div>
            ))}
          </div>

          <div className="flex-1 relative overflow-hidden flex">
            <div className="w-12 bg-[#1c1f24]/30 border-r border-slate-800/50 flex flex-col items-center py-5 text-[11px] text-slate-600 font-mono select-none">
              {Array.from({ length: 50 }).map((_, i) => <div key={i} className="h-[21px]">{i + 1}</div>)}
            </div>
            <div className="flex-1 relative">
              <div className="absolute inset-0 p-5 pointer-events-none code-font text-[14px] leading-[21px] whitespace-pre-wrap overflow-hidden" dangerouslySetInnerHTML={{ __html: highlightCode(activeFile.content) + '\n' }} />
              <textarea value={activeFile.content} onChange={e => { const newFiles = [...files]; newFiles[activeFileIndex].content = e.target.value; setFiles(newFiles); }} spellCheck={false} className="absolute inset-0 w-full h-full p-5 bg-transparent text-transparent caret-white code-font text-[14px] leading-[21px] resize-none focus:outline-none z-10 whitespace-pre-wrap overflow-y-auto" />
            </div>
          </div>

          <div className={`border-t border-slate-800 bg-[#0b0e14] flex flex-col transition-all ${isConsoleOpen ? 'h-52' : 'h-10'}`}>
            <div className="flex items-center justify-between px-4 h-10 bg-[#1c1f24] border-b border-slate-800">
              <div className="flex gap-1 h-full">
                {['output', 'serial', 'plotter'].map(m => (
                  <button key={m} onClick={() => { setConsoleMode(m as any); setIsConsoleOpen(true); }} className={`px-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all ${consoleMode === m && isConsoleOpen ? 'border-[#008184] text-[#008184]' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>{m}</button>
                ))}
              </div>
              <button onClick={() => setIsConsoleOpen(!isConsoleOpen)} className="text-slate-500 hover:text-white">{isConsoleOpen ? <ChevronDown size={16} /> : <Plus size={16} />}</button>
            </div>
            {isConsoleOpen && (
              <div className="flex-1 overflow-y-auto p-4 code-font text-[12px] bg-black/20">
                {serialMessages.slice(-200).map((m, i) => (
                  <div key={i} className="flex gap-4 opacity-70"><span className="text-slate-600">[{m.timestamp}]</span><span className={m.type === 'in' ? 'text-[#008184]' : 'text-slate-300'}>{m.text}</span></div>
                ))}
                <div ref={consoleEndRef} />
              </div>
            )}
          </div>
        </main>
      </div>

      <footer className="h-7 bg-[#008184] text-white px-4 flex items-center justify-between text-[10px] font-bold tracking-wider">
        <div className="flex items-center gap-4 uppercase">
          <span className={`flex items-center gap-1.5 ${isConnected ? 'text-white' : 'text-red-200 opacity-80'}`}>
            {isConnected ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
            {isConnected ? "Porta COM Conectada" : "Hardware Desconectado"}
          </span>
          <span className="opacity-50">|</span>
          <span>José Heberto Edition</span>
        </div>
        <div className="flex items-center gap-4 uppercase">
          <span>Board: {selectedBoard.name}</span>
          <span className="bg-white/20 px-2 py-0.5 rounded">
            {isConnected ? `CONECTADO: ${baudRate}bps` : "NÃO CONECTADO"}
          </span>
        </div>
      </footer>
    </div>
  );
};

export default App;
