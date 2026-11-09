import React from 'react';
import {
  Printer,
  FileSpreadsheet,
  History,
  PlusCircle,
  User,
  ShieldCheck,
  Lock,
} from 'lucide-react';

interface HeaderProps {
  currentView: 'form' | 'dashboard';
  onChangeView: (view: 'form' | 'dashboard') => void;
  onOpenSpreadsheet: () => void;
  onOpenHistory: () => void;
  onOpenChecklist: () => void;
  totalNovos: number;
  instaladosNovos: number;
  tecnicoNome: string;
  onUpdateTecnico: (novoNome: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onChangeView,
  onOpenSpreadsheet,
  onOpenHistory,
  onOpenChecklist,
  totalNovos,
  instaladosNovos,
  tecnicoNome,
  onUpdateTecnico,
}) => {
  const percent = Math.round((instaladosNovos / totalNovos) * 100) || 0;

  return (
    <header className="bg-[#0B1B3D] text-white border-b border-[#0F224A] shadow-md sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Título Maquim */}
          <div
            onClick={() => onChangeView('form')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#0D52BD] group-hover:bg-blue-600 transition-colors flex items-center justify-center shadow-md shadow-blue-900/40">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg tracking-tight text-white">MAQUIM</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  Lorena / SP
                </span>
              </div>
              <p className="text-[11px] text-blue-200/70 -mt-0.5 font-medium">
                Implantação 234 Impressoras & Retirada de Contrato
              </p>
            </div>
          </div>

          {/* Medidor de Progresso da Implantação */}
          <div className="hidden lg:flex items-center gap-3 bg-[#0F224A]/90 px-3.5 py-1.5 rounded-2xl border border-blue-900/60">
            <div className="text-right">
              <p className="text-[10px] font-semibold text-blue-200/70 uppercase tracking-wider">
                Progresso do Contrato
              </p>
              <p className="text-xs font-bold text-white">
                {instaladosNovos} de {totalNovos} instalados ({percent}%)
              </p>
            </div>
            <div className="w-20 bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#0D52BD] h-full rounded-full transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          {/* Navegação e Ações Rápidas */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChangeView('form')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all ${
                currentView === 'form'
                  ? 'bg-[#0D52BD] text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Nova Instalação</span>
            </button>

            <button
              type="button"
              onClick={onOpenSpreadsheet}
              className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 rounded-xl flex items-center gap-1.5 transition-colors"
              title="Abrir dados das planilhas e gerenciar OSs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Planilhas</span>
            </button>

            <button
              type="button"
              onClick={onOpenHistory}
              className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 rounded-xl flex items-center gap-1.5 transition-colors"
              title="Ver histórico de Ordens de Serviço"
            >
              <History className="w-4 h-4 text-blue-400" />
              <span className="hidden sm:inline">Histórico OS</span>
            </button>

            <button
              type="button"
              onClick={onOpenChecklist}
              className="px-2.5 py-1.5 text-xs font-bold text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 rounded-xl flex items-center gap-1.5 transition-colors border border-amber-400/20"
              title="Ver orientações práticas para evitar bugs na van amanhã"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span className="hidden md:inline">Guia Anti-Bug</span>
            </button>

            {/* Perfil Técnico */}
            <div className="pl-2 border-l border-blue-900/60 flex items-center gap-1.5">
              <div className="w-8 h-8 rounded-full bg-blue-950 text-blue-200 flex items-center justify-center border border-blue-800">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={tecnicoNome}
                onChange={(e) => onUpdateTecnico(e.target.value)}
                placeholder="Técnico"
                title="Clique para editar o nome do técnico"
                className="w-24 sm:w-28 bg-transparent text-xs text-slate-200 font-medium focus:text-white focus:bg-blue-950 px-1 py-0.5 rounded-sm border-b border-transparent focus:border-blue-400 focus:outline-hidden"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
