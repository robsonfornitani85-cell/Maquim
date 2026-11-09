import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { InstallationForm } from './components/InstallationForm';
import { SpreadsheetViewerModal } from './components/SpreadsheetViewerModal';
import { HistoryModal } from './components/HistoryModal';
import { ChecklistModal } from './components/ChecklistModal';
import {
  getNovosEquipamentos,
  getLocaisDistribuicao,
  getEquipamentosAnteriores,
  getOrdensServico,
  saveOrdemServico,
  getTecnicoPadrao,
  saveTecnicoPadrao,
  resetAllDataToDefault,
  updateLocalOrdemServico,
  updateLocalOrdemServicoRetirada,
} from './data/mockDatabase';
import {
  NovoEquipamento,
  LocalDistribuicao,
  EquipamentoAnterior,
  OrdemServico,
} from './types';
import { PlusCircle, LayoutDashboard, FileSpreadsheet, History, ShieldCheck } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'form' | 'dashboard'>('form');
  const [selectedGati, setSelectedGati] = useState<string | undefined>();

  // Modais
  const [isSpreadsheetOpen, setIsSpreadsheetOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);

  // Dados carregados do LocalStorage ou banco padrão
  const [novosEquipamentos, setNovosEquipamentos] = useState<NovoEquipamento[]>([]);
  const [locaisDistribuicao, setLocaisDistribuicao] = useState<LocalDistribuicao[]>([]);
  const [equipamentosAnteriores, setEquipamentosAnteriores] = useState<EquipamentoAnterior[]>([]);
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [tecnicoNome, setTecnicoNome] = useState<string>('');

  // Carrega os dados na inicialização
  const refreshData = () => {
    setNovosEquipamentos(getNovosEquipamentos());
    setLocaisDistribuicao(getLocaisDistribuicao());
    setEquipamentosAnteriores(getEquipamentosAnteriores());
    setOrdens(getOrdensServico());
    setTecnicoNome(getTecnicoPadrao());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleUpdateTecnico = (nome: string) => {
    setTecnicoNome(nome);
    saveTecnicoPadrao(nome);
  };

  const handleSaveOS = (novaOS: OrdemServico) => {
    saveOrdemServico(novaOS);
    refreshData();
  };

  const handleUpdateLocalOS = (gati: string, numeroOS: string) => {
    updateLocalOrdemServico(gati, numeroOS);
    refreshData();
  };

  const handleStartInstallationFromLocation = (gati?: string) => {
    setSelectedGati(gati);
    setCurrentView('form');
  };

  const totalNovos = novosEquipamentos.length;
  const instaladosNovos = novosEquipamentos.filter((e) => e.status === 'instalado').length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        currentView={currentView}
        onChangeView={(view) => {
          setSelectedGati(undefined);
          setCurrentView(view);
        }}
        onOpenSpreadsheet={() => setIsSpreadsheetOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenChecklist={() => setIsChecklistOpen(true)}
        totalNovos={totalNovos}
        instaladosNovos={instaladosNovos}
        tecnicoNome={tecnicoNome}
        onUpdateTecnico={handleUpdateTecnico}
      />

      {/* Quick Mobile Bar */}
      <div className="sm:hidden bg-[#0B1B3D] border-b border-blue-900/60 px-4 py-2 flex items-center justify-between text-xs text-slate-300">
        <button
          onClick={() => {
            setSelectedGati(undefined);
            setCurrentView('form');
          }}
          className={`flex items-center gap-1 py-1 px-2.5 rounded-lg ${
            currentView === 'form' ? 'bg-[#0D52BD] text-white font-bold' : ''
          }`}
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Formulário
        </button>

        <button
          onClick={() => setCurrentView('dashboard')}
          className={`flex items-center gap-1 py-1 px-2.5 rounded-lg ${
            currentView === 'dashboard' ? 'bg-[#0D52BD] text-white font-bold' : ''
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          Visão Geral
        </button>

        <button
          onClick={() => setIsSpreadsheetOpen(true)}
          className="flex items-center gap-1 py-1 px-2.5 rounded-lg text-emerald-400"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          Planilhas
        </button>

        <button
          onClick={() => setIsHistoryOpen(true)}
          className="flex items-center gap-1 py-1 px-2.5 rounded-lg text-blue-400"
        >
          <History className="w-3.5 h-3.5" />
          Histórico
        </button>

        <button
          onClick={() => setIsChecklistOpen(true)}
          className="flex items-center gap-1 py-1 px-2 rounded-lg text-amber-300 font-bold"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Guia
        </button>
      </div>

      {/* Main View Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-6">
        {currentView === 'form' ? (
          <InstallationForm
            novosEquipamentos={novosEquipamentos}
            locaisDistribuicao={locaisDistribuicao}
            equipamentosAnteriores={equipamentosAnteriores}
            tecnicoPadrao={tecnicoNome}
            onSaveOS={handleSaveOS}
            preSelectedGati={selectedGati}
          />
        ) : (
          <Dashboard
            novosEquipamentos={novosEquipamentos}
            locaisDistribuicao={locaisDistribuicao}
            equipamentosAnteriores={equipamentosAnteriores}
            ordens={ordens}
            onStartInstallation={handleStartInstallationFromLocation}
            onOpenSpreadsheet={() => setIsSpreadsheetOpen(true)}
            onOpenHistory={() => setIsHistoryOpen(true)}
          />
        )}
      </main>

      {/* Modais Compartilhados */}
      <SpreadsheetViewerModal
        isOpen={isSpreadsheetOpen}
        onClose={() => setIsSpreadsheetOpen(false)}
        novosEquipamentos={novosEquipamentos}
        locaisDistribuicao={locaisDistribuicao}
        equipamentosAnteriores={equipamentosAnteriores}
        onSelectLocalParaInstalar={handleStartInstallationFromLocation}
        onUpdateOS={handleUpdateLocalOS}
        onUpdateOSRetirada={(gati, osRet) => {
          updateLocalOrdemServicoRetirada(gati, osRet);
          refreshData();
        }}
        onResetData={() => {
          resetAllDataToDefault();
          refreshData();
        }}
        onRefreshData={refreshData}
      />

      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        ordens={ordens}
      />

      <ChecklistModal
        isOpen={isChecklistOpen}
        onClose={() => setIsChecklistOpen(false)}
      />
    </div>
  );
}
