import React from 'react';
import { AgentStatus, AgentType } from '../types';
import { User, Stethoscope, FileText, ClipboardList, Activity } from 'lucide-react';

interface AgentSidebarProps {
  activeAgent: AgentType | null;
}

const agents: Omit<AgentStatus, 'active'>[] = [
  {
    id: AgentType.PATIENT,
    name: "Manajer Pasien",
    description: "Pendaftaran, Janji Temu, Billing",
    icon: "User"
  },
  {
    id: AgentType.MEDICAL,
    name: "Asisten Medis",
    description: "Diagnosis, Riset, Klinis",
    icon: "Stethoscope"
  },
  {
    id: AgentType.DOCUMENT,
    name: "Pembuat Dokumen",
    description: "Laporan, Surat, Formulir",
    icon: "FileText"
  },
  {
    id: AgentType.ADMIN,
    name: "Admin Operasional",
    description: "Kebijakan, Prosedur, Inventaris",
    icon: "ClipboardList"
  }
];

const getIcon = (name: string, className: string) => {
    switch(name) {
        case 'User': return <User className={className} />;
        case 'Stethoscope': return <Stethoscope className={className} />;
        case 'FileText': return <FileText className={className} />;
        case 'ClipboardList': return <ClipboardList className={className} />;
        default: return <Activity className={className} />;
    }
};

export const AgentSidebar: React.FC<AgentSidebarProps> = ({ activeAgent }) => {
  return (
    <div className="hidden md:flex flex-col w-80 bg-white border-r border-slate-200 h-full">
      <div className="p-6 border-b border-slate-100 bg-slate-50">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Sistem Rumah Sakit
        </h2>
        <p className="text-xs text-slate-500 mt-1">Panel Status Sub-Agen</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {agents.map((agent) => {
          const isActive = activeAgent === agent.id;
          return (
            <div 
              key={agent.id}
              className={`
                relative p-4 rounded-xl border transition-all duration-300
                ${isActive 
                  ? 'bg-blue-50 border-blue-400 shadow-md transform scale-102' 
                  : 'bg-white border-slate-200 text-slate-400 opacity-80'}
              `}
            >
              {isActive && (
                <div className="absolute top-3 right-3">
                   <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                  </span>
                </div>
              )}
              
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${isActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                    {getIcon(agent.icon, "w-5 h-5")}
                </div>
                <h3 className={`font-semibold ${isActive ? 'text-blue-900' : 'text-slate-600'}`}>
                    {agent.name}
                </h3>
              </div>
              <p className={`text-sm ${isActive ? 'text-blue-700' : 'text-slate-400'}`}>
                {agent.description}
              </p>
            </div>
          );
        })}
      </div>
      
      <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 text-center">
        Powered by Gemini 2.5 Flash
      </div>
    </div>
  );
};