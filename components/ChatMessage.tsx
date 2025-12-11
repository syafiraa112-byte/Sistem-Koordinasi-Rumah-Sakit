import React from 'react';
import { Message, Sender, AgentType } from '../types';
import { Bot, User, ArrowRight, CheckCircle2 } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
}

const formatToolName = (name: string) => {
    switch(name) {
        case AgentType.PATIENT: return "Manajer Informasi Pasien";
        case AgentType.MEDICAL: return "Asisten Informasi Medis";
        case AgentType.DOCUMENT: return "Pembuat Dokumen";
        case AgentType.ADMIN: return "Penangan Tugas Admin";
        default: return name;
    }
};

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.sender === Sender.USER;
  const isRouting = message.sender === Sender.COORDINATOR && message.routingEvent;
  const isSubAgent = message.sender === Sender.SUB_AGENT;

  if (isRouting && message.routingEvent) {
      return (
        <div className="flex justify-start mb-6 w-full animate-fade-in-up">
            <div className="flex gap-4 max-w-[85%]">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0 border border-purple-200">
                    <Bot className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-purple-700 ml-1">Koordinator Sistem</span>
                    <div className="bg-white border border-purple-100 rounded-xl rounded-tl-none shadow-sm overflow-hidden">
                        <div className="bg-purple-50 px-4 py-2 border-b border-purple-100 flex items-center gap-2">
                            <ArrowRight className="w-4 h-4 text-purple-500" />
                            <span className="text-sm font-medium text-purple-800">Merutekan Permintaan</span>
                        </div>
                        <div className="p-4 space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">Target Agen:</span>
                                <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                                    {formatToolName(message.routingEvent.toolName)}
                                </span>
                            </div>
                            <div className="bg-slate-50 rounded p-3 text-xs font-mono text-slate-600 border border-slate-100">
                                {JSON.stringify(message.routingEvent.args, null, 2)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )
  }

  if (isSubAgent) {
    return (
        <div className="flex justify-start mb-6 w-full animate-fade-in-up">
            <div className="flex gap-4 max-w-[85%]">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0 border border-green-200">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-green-700 ml-1">Respon Sistem</span>
                    <div className="bg-white border border-green-100 rounded-xl rounded-tl-none p-4 shadow-sm text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                        {message.text}
                    </div>
                </div>
            </div>
        </div>
    )
  }

  return (
    <div className={`flex mb-6 w-full ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      <div className={`flex gap-4 max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 
            ${isUser ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
          {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
        </div>
        
        <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
            <span className="text-xs text-slate-400 mx-1">
                {isUser ? 'Anda' : 'Koordinator'}
            </span>
            <div className={`
                px-4 py-3 rounded-2xl shadow-sm text-sm leading-relaxed
                ${isUser 
                    ? 'bg-blue-600 text-white rounded-tr-none' 
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'}
            `}>
                {message.text}
            </div>
        </div>
      </div>
    </div>
  );
};