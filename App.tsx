import React, { useState, useRef, useEffect } from 'react';
import { sendMessageToCoordinator } from './services/geminiService';
import { Message, Sender, AgentType } from './types';
import { AgentSidebar } from './components/AgentSidebar';
import { ChatMessage } from './components/ChatMessage';
import { Send, Sparkles, AlertCircle, Bot } from 'lucide-react';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeAgent, setActiveAgent] = useState<AgentType | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Simulate sub-agent processing and response
  const handleSimulatedAgentResponse = (toolName: string, args: any) => {
      let responseText = "";
      
      switch(toolName) {
        case AgentType.PATIENT:
            responseText = `[Sub-Agen Pasien] Saya telah menerima kueri Anda: "${args.query}". \n\nMemeriksa basis data pasien... \n✅ Data ditemukan. Silakan lanjutkan ke loket pendaftaran 3 atau gunakan aplikasi mobile untuk detail janji temu.`;
            break;
        case AgentType.MEDICAL:
             responseText = `[Sub-Agen Medis] Menganalisis kueri medis: "${args.query}". \n\nBerdasarkan protokol klinis terbaru dan pencarian literatur: Gejala yang disebutkan memerlukan pemeriksaan fisik lebih lanjut. \n⚠️ Disclaimer: Ini adalah informasi awal, bukan diagnosis resmi dokter.`;
             break;
        case AgentType.DOCUMENT:
            responseText = `[Sub-Agen Dokumen] Membuat dokumen tipe: ${args.document_type}. \n\nMengisi konten dengan: "${args.content_details}"... \n📄 Dokumen telah dibuat dan siap untuk ditinjau/dicetak.`;
            break;
        case AgentType.ADMIN:
            responseText = `[Sub-Agen Admin] Mencari kebijakan terkait: "${args.query}". \n\nMerujuk pada Bab 4 Prosedur Operasional Standar (SOP). Kebijakan ini berlaku mulai jam 08:00 - 16:00 pada hari kerja.`;
            break;
        default:
            responseText = "Permintaan telah diproses oleh sistem.";
      }

      setTimeout(() => {
          setMessages(prev => [...prev, {
              id: Date.now().toString(),
              sender: Sender.SUB_AGENT,
              text: responseText
          }]);
          setActiveAgent(null); // Reset active state after "processing"
          setIsLoading(false);
      }, 2000); // 2 second delay to simulate work
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: Sender.USER,
      text: input,
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await sendMessageToCoordinator(userMsg.text!);

      // Check if Coordinator routed to a tool
      if (response.functionCalls && response.functionCalls.length > 0) {
          const call = response.functionCalls[0];
          const toolName = call.name;
          
          // Show Routing Message
          const routingMsg: Message = {
              id: Date.now().toString() + '_route',
              sender: Sender.COORDINATOR,
              routingEvent: {
                  toolName: toolName,
                  args: call.args,
                  timestamp: Date.now()
              }
          };
          setMessages(prev => [...prev, routingMsg]);
          
          // Set Sidebar Active State
          setActiveAgent(toolName as AgentType);

          // Simulate the Sub-Agent doing work
          handleSimulatedAgentResponse(toolName, call.args);

      } else if (response.text) {
          // Fallback if the model didn't route (should be rare with strict prompt)
          const fallbackMsg: Message = {
              id: Date.now().toString() + '_fallback',
              sender: Sender.SYSTEM,
              text: response.text
          };
           setMessages(prev => [...prev, fallbackMsg]);
           setIsLoading(false);
      } else {
          // No response content
           setIsLoading(false);
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: Sender.SYSTEM,
          text: "Maaf, terjadi kesalahan pada koneksi server API.",
          isError: true
      }]);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full bg-slate-50">
      {/* Sidebar - Desktop Only */}
      <AgentSidebar activeAgent={activeAgent} />

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full relative">
        {/* Mobile Header */}
        <div className="md:hidden p-4 bg-white border-b border-slate-200 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h1 className="font-bold text-slate-800">Sistem Koordinator</h1>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-hide">
            <div className="max-w-3xl mx-auto">
                {messages.length === 0 && (
                    <div className="text-center mt-20 opacity-60">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 inline-block mb-4">
                            <Sparkles className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                            <h2 className="text-lg font-semibold text-slate-700">Selamat Datang di Koordinator Rumah Sakit</h2>
                            <p className="text-slate-500 max-w-sm mx-auto mt-2 text-sm">
                                Saya akan membantu merutekan permintaan Anda ke departemen yang tepat. Coba tanyakan tentang pendaftaran pasien, gejala medis, atau pembuatan dokumen.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center text-xs text-slate-500">
                            <span className="bg-slate-200 px-3 py-1 rounded-full">"Buat surat cuti sakit..."</span>
                            <span className="bg-slate-200 px-3 py-1 rounded-full">"Sakit perut sebelah kanan..."</span>
                            <span className="bg-slate-200 px-3 py-1 rounded-full">"Jam operasional apotek..."</span>
                        </div>
                    </div>
                )}
                
                {messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} />
                ))}
                
                {isLoading && activeAgent === null && (
                     <div className="flex justify-start mb-6 w-full animate-pulse">
                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                                <Bot className="w-5 h-5 text-slate-500" />
                            </div>
                            <div className="flex items-center text-sm text-slate-400 italic">
                                Menganalisis permintaan...
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-200">
            <div className="max-w-3xl mx-auto">
                <form onSubmit={handleSubmit} className="relative flex items-center">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ketik permintaan Anda di sini..."
                        className="w-full pl-6 pr-14 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-slate-800 placeholder:text-slate-400 shadow-inner"
                        disabled={isLoading}
                    />
                    <button 
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="absolute right-2 p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors shadow-lg shadow-blue-500/20"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </form>
                {!process.env.API_KEY && (
                    <div className="mt-2 text-center flex items-center justify-center gap-2 text-xs text-red-500 bg-red-50 p-2 rounded">
                        <AlertCircle className="w-4 h-4" />
                        Peringatan: API_KEY tidak terdeteksi. Aplikasi ini memerlukan kunci API Gemini.
                    </div>
                )}
            </div>
        </div>
      </main>
    </div>
  );
};

export default App;