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
import { PlusCircle, LayoutDashboard, FileSpreadsheet, History, ShieldCheck, WifiOff, MailWarning } from 'lucide-react';
import { useMobileKeyboard, useOnlineStatus } from './hooks/useMobileKeyboard';
import { requestPersistentStorage } from './data/osStore';

export default function App() {
  const [currentView, setCurrentView] = useState<'form' | 'dashboard'>('form');
  const [selectedLocalId, setSelectedLocalId] = useState<string | undefined>();
  const [formKey, setFormKey] = useState(0);
  const online = useOnlineStatus();
  useMobileKeyboard();

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
    getOrdensServico()
      .then(setOrdens)
      .catch((e) => console.error('Erro ao carregar OSs:', e));
    setTecnicoNome(getTecnicoPadrao());
  };

  useEffect(() => {
    refreshData();
    // Evita que o Android/iOS apague os dados do app quando faltar espaço
    requestPersistentStorage();
  }, []);

  const handleUpdateTecnico = (nome: string) => {
    setTecnicoNome(nome);
    saveTecnicoPadrao(nome);
  };

  const handleSaveOS = async (novaOS: OrdemServico) => {
    try {
      await saveOrdemServico(novaOS);
    } finally {
      refreshData();
    }
  };

  const handleUpdateLocalOS = (localId: string, numeroOS: string) => {
    updateLocalOrdemServico(localId, numeroOS);
    refreshData();
  };

  const handleStartInstallationFromLocation = (localId?: string) => {
    setSelectedLocalId(localId);
    setFormKey((k) => k + 1);
    setCurrentView('form');
  };

  const enviosPendentes = ordens.filter((o) => !o.enviadoEmail).length;

  const totalNovos = novosEquipamentos.length;
  const instaladosNovos = novosEquipamentos.filter((e) => e.status === 'instalado').length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        currentView={currentView}
        onChangeView={(view) => {
          setSelectedLocalId(undefined);
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
            setSelectedLocalId(undefined);
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

      {/* Avisos de conexão e de envios pendentes */}
      {(!online || enviosPendentes > 0) && (
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-3 space-y-2">
          {!online && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-800 text-white text-xs">
              <WifiOff className="w-4 h-4 shrink-0 mt-0.5 text-amber-300" />
              <span>
                <strong>Sem internet.</strong> Pode continuar trabalhando normalmente: os dados, fotos,
                assinaturas e PDFs ficam salvos neste aparelho. Envie os e-mails quando a conexão voltar.
              </span>
            </div>
          )}
          {enviosPendentes > 0 && (
            <button
              type="button"
              onClick={() => setIsHistoryOpen(true)}
              className="w-full flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs text-left"
            >
              <MailWarning className="w-4 h-4 shrink-0 text-amber-700" />
              <span className="flex-1">
                <strong>{enviosPendentes} OS{enviosPendentes > 1 ? 's' : ''} com e-mail pendente.</strong>{' '}
                {online ? 'Toque aqui para enviar agora pelo Histórico.' : 'Envie quando a internet voltar.'}
              </span>
            </button>
          )}
        </div>
      )}

      {/* Main View Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-6 pb-[var(--kb-height,0px)]">
        {currentView === 'form' ? (
          <InstallationForm
            key={formKey}
            online={online}
            novosEquipamentos={novosEquipamentos}
            locaisDistribuicao={locaisDistribuicao}
            equipamentosAnteriores={equipamentosAnteriores}
            tecnicoPadrao={tecnicoNome}
            onSaveOS={handleSaveOS}
            preSelectedLocalId={selectedLocalId}
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
        onUpdateOSRetirada={(localId, osRet) => {
          updateLocalOrdemServicoRetirada(localId, osRet);
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
        locaisDistribuicao={locaisDistribuicao}
        online={online}
        onUpdateOS={handleSaveOS}
      />

      <ChecklistModal
        isOpen={isChecklistOpen}
        onClose={() => setIsChecklistOpen(false)}
      />
    </div>
  );
}
