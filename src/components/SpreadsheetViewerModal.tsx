import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  X,
  Search,
  Download,
  Upload,
  Printer,
  MapPin,
  RotateCcw,
  CheckCircle2,
  Clock,
  Filter,
  Lock,
  Unlock,
  AlertTriangle,
  KeyRound,
} from 'lucide-react';
import { NovoEquipamento, LocalDistribuicao, EquipamentoAnterior } from '../types';
import { exportDistribuicaoToExcel, exportNovosEquipamentosToExcel, exportRetiradasToExcel, parseUploadedExcel } from '../utils/excelManager';
import { anularInstalacao } from '../data/mockDatabase';
import { DataTable, DataColumn } from './DataTable';
import { normalizeSearch } from '../utils/validation';

interface SpreadsheetViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  novosEquipamentos: NovoEquipamento[];
  locaisDistribuicao: LocalDistribuicao[];
  equipamentosAnteriores: EquipamentoAnterior[];
  onSelectLocalParaInstalar: (localId: string) => void;
  onUpdateOS?: (localId: string, numeroOS: string) => void;
  onUpdateOSRetirada?: (localId: string, numeroOSRetirada: string) => void;
  onResetData?: () => void;
  onRefreshData?: () => void;
}

export const SpreadsheetViewerModal: React.FC<SpreadsheetViewerModalProps> = ({
  isOpen,
  onClose,
  novosEquipamentos,
  locaisDistribuicao,
  equipamentosAnteriores,
  onSelectLocalParaInstalar,
  onUpdateOS,
  onUpdateOSRetirada,
  onResetData,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'locais' | 'novos' | 'retiradas'>('locais');
  const [search, setSearch] = useState('');
  const [resetFeedback, setResetFeedback] = useState(false);
  const [importFeedback, setImportFeedback] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados para modal de desbloqueio / anulação por senha
  const [anularModalOpen, setAnularModalOpen] = useState(false);
  const [targetGati, setTargetGati] = useState<LocalDistribuicao | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [anularSuccessMsg, setAnularSuccessMsg] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await parseUploadedExcel(file);
      let count = 0;
      data.forEach((row: any) => {
        const gati = String(row['GATi Instalação'] || row['GATi'] || row['Gati'] || '').trim();
        const osInst = String(row['Nº OS Instalação'] || row['Nº Ordem de Serviço'] || row['Nº OS'] || row['OS'] || '').trim();
        const osRet = String(row['Nº OS Retirada'] || row['OS Retirada'] || row['OS Ret'] || '').trim();
        const id = String(row['ID'] || row['Id'] || '').trim();
        const setorRow = String(row['Localização'] || row['Setor'] || '').trim().toUpperCase();
        if (gati || id) {
          const alvos = locaisDistribuicao.filter((l) =>
            id ? l.id === id : l.gatiInstalacao === gati && (!setorRow || (l.setor || '').trim().toUpperCase() === setorRow)
          );
          alvos.forEach((l) => {
            if (osInst && onUpdateOS) onUpdateOS(l.id, osInst);
            if (osRet && onUpdateOSRetirada) onUpdateOSRetirada(l.id, osRet);
          });
          if (alvos.length) count++;
        }
      });
      setImportFeedback(`✓ ${count} locais atualizados com sucesso a partir da planilha!`);
      onRefreshData?.();
      setTimeout(() => setImportFeedback(''), 4000);
    } catch (err) {
      setImportFeedback('Erro ao processar planilha Excel.');
      setTimeout(() => setImportFeedback(''), 4000);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  const handleReset = () => {
    if (
      !window.confirm(
        'Recarregar as planilhas originais? As marcações de instalado/retirado feitas neste aparelho voltam ao estado original. As OSs do Histórico (com PDFs) são mantidas.'
      )
    )
      return;
    if (onResetData) {
      onResetData();
      setResetFeedback(true);
      setTimeout(() => setResetFeedback(false), 3000);
    }
  };

  const handleOpenAnularModal = (local: LocalDistribuicao) => {
    setTargetGati(local);
    setPasswordInput('');
    setPasswordError('');
    setAnularModalOpen(true);
  };

  const handleConfirmAnular = async () => {
    if (!targetGati) return;

    const res = await anularInstalacao(targetGati.id, passwordInput);
    if (res.success) {
      setAnularSuccessMsg(res.message);
      // Atualiza a tela SEM recarregar as planilhas (antes isso apagava todo o histórico de OSs)
      onRefreshData?.();
      setTimeout(() => {
        setAnularModalOpen(false);
        setTargetGati(null);
        setAnularSuccessMsg('');
      }, 1500);
    } else {
      setPasswordError(res.message);
    }
  };

  const busca = normalizeSearch(search);
  const bate = (...vals: (string | undefined)[]) => !busca || vals.some((v) => normalizeSearch(v || '').includes(busca));

  const locaisFiltrados = locaisDistribuicao.filter((l) =>
    bate(l.gatiInstalacao, l.ordemServico, l.ordemServicoRetirada, l.clienteInstalacao, l.setor, l.endereco, l.bairro, l.responsavelLocal, l.secretaria, l.patrimonioInstalado)
  );
  const novosFiltrados = novosEquipamentos.filter((e) => bate(e.patrimonio, e.numeroSerie, e.modelo, e.ordemServico, e.gatiInstalacao));
  const retiradasFiltradas = equipamentosAnteriores.filter((r) =>
    bate(r.patrimonio, r.numeroSerie, r.ordemServicoRetirada, r.clienteInstalacao, r.localizacao, r.modelo, r.conectividadeIp)
  );

  const colunasLocais: DataColumn<LocalDistribuicao>[] = [
    { key: 'gati', label: 'GATi', value: (l) => l.gatiInstalacao, className: 'font-mono font-bold text-blue-700' },
    {
      key: 'localizacao',
      label: 'Localização',
      value: (l) => l.setor || '',
      render: (l) =>
        l.setor ? <span className="font-black uppercase text-indigo-900 bg-indigo-50 px-1.5 py-0.5 rounded">{l.setor}</span> : <span className="text-slate-300">—</span>,
    },
    {
      key: 'osInst',
      label: 'Nº OS Instalação',
      value: (l) => l.ordemServico || '',
      render: (local) => (
        <input
          type="text"
          inputMode="numeric"
          value={local.ordemServico || ''}
          placeholder="Lançar OS Inst..."
          onChange={(e) => onUpdateOS?.(local.id, e.target.value)}
          className={`w-28 px-2 py-1 text-xs font-mono font-bold rounded-lg border transition-all ${
            local.ordemServico && local.ordemServico.trim()
              ? 'bg-blue-50/80 border-blue-300 text-blue-900 shadow-xs'
              : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300 focus:bg-white focus:border-blue-500'
          }`}
        />
      ),
    },
    {
      key: 'osRet',
      label: 'Nº OS Retirada',
      value: (l) => l.ordemServicoRetirada || '',
      render: (local) => (
        <input
          type="text"
          inputMode="numeric"
          value={local.ordemServicoRetirada || ''}
          placeholder="Lançar OS Ret..."
          onChange={(e) => onUpdateOSRetirada?.(local.id, e.target.value)}
          className={`w-28 px-2 py-1 text-xs font-mono font-bold rounded-lg border transition-all ${
            local.ordemServicoRetirada && local.ordemServicoRetirada.trim()
              ? 'bg-amber-50/80 border-amber-300 text-amber-900 shadow-xs'
              : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300 focus:bg-white focus:border-amber-500'
          }`}
        />
      ),
    },
    { key: 'secretaria', label: 'Secretaria', value: (l) => l.secretaria, filter: 'select', className: 'font-semibold text-slate-800' },
    {
      key: 'cliente',
      label: 'Cliente / Unidade',
      value: (l) => l.clienteInstalacao,
      render: (l) => (
        <>
          <p className="font-bold text-slate-900">{l.clienteInstalacao}</p>
          <p className="text-[11px] text-slate-500">Resp: {l.responsavelLocal}</p>
        </>
      ),
    },
    {
      key: 'endereco',
      label: 'Endereço & Bairro',
      value: (l) => `${l.endereco} ${l.bairro}`,
      render: (l) => (
        <>
          <p className="text-slate-800">{l.endereco}</p>
          <p className="text-[11px] text-slate-500">{l.bairro}</p>
        </>
      ),
    },
    { key: 'modelo', label: 'Modelo Previsto', value: (l) => `${l.modeloPrevisto} (${l.tipoEquipamento})`, filter: 'select', className: 'font-mono font-medium' },
    {
      key: 'status',
      label: 'Status',
      value: (l) => (l.status === 'instalado' ? 'Instalado' : 'Pendente'),
      filter: 'select',
      render: (local) =>
        local.status === 'instalado' ? (
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
              <CheckCircle2 className="w-3 h-3" />
              Instalado (#{local.patrimonioInstalado})
            </span>
            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
              <Lock className="w-3 h-3 text-emerald-700" />
              <span>Bloqueado</span>
            </div>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
            <Clock className="w-3 h-3" />
            Pendente
          </span>
        ),
    },
    {
      key: 'acao',
      label: 'Ação',
      sortable: false,
      filter: false,
      className: 'text-right',
      render: (local) =>
        local.status === 'instalado' ? (
          <button
            type="button"
            onClick={() => handleOpenAnularModal(local)}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold text-[11px] rounded-lg transition-colors shadow-xs whitespace-nowrap"
          >
            <Unlock className="w-3 h-3" />
            Anular / Desbloquear
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              onSelectLocalParaInstalar(local.id);
              onClose();
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[11px] rounded-lg transition-colors shadow-xs whitespace-nowrap"
          >
            Instalar Aqui
          </button>
        ),
    },
  ];

  const colunasNovos: DataColumn<NovoEquipamento>[] = [
    { key: 'pat', label: 'Patrimônio', value: (e) => e.patrimonio, render: (e) => <span className="font-mono font-bold text-blue-700">#{e.patrimonio}</span> },
    {
      key: 'os',
      label: 'Nº OS',
      value: (e) => e.ordemServico || '',
      render: (item) =>
        item.ordemServico ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200">
            #{item.ordemServico}
          </span>
        ) : (
          <span className="text-slate-400 italic text-[11px]">Pendente</span>
        ),
    },
    { key: 'serie', label: 'Nº de Série', value: (e) => e.numeroSerie, className: 'font-mono text-slate-800' },
    { key: 'modelo', label: 'Modelo', value: (e) => e.modelo, filter: 'select', className: 'font-bold text-slate-800' },
    {
      key: 'tipo',
      label: 'Tipo',
      value: (e) => e.tipo,
      filter: 'select',
      render: (item) => (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.tipo === 'Color' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
          {item.tipo}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      value: (e) => (e.status === 'instalado' ? 'Instalado' : 'Disponível na van'),
      filter: 'select',
      render: (item) =>
        item.status === 'instalado' ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3" /> Instalado
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
            Disponível na Van
          </span>
        ),
    },
    { key: 'gati', label: 'Destino / GATi', value: (e) => e.gatiInstalacao || '', className: 'font-mono text-slate-600' },
  ];

  const colunasRetiradas: DataColumn<EquipamentoAnterior>[] = [
    { key: 'pat', label: 'Patrimônio', value: (r) => r.patrimonio, render: (r) => <span className="font-mono font-bold text-amber-700">#{r.patrimonio}</span> },
    {
      key: 'os',
      label: 'Nº OS Retirada',
      value: (r) => r.ordemServicoRetirada || '',
      render: (item) =>
        item.ordemServicoRetirada ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-amber-50 text-amber-900 border border-amber-200">
            #{item.ordemServicoRetirada}
          </span>
        ) : (
          <span className="text-slate-400 italic text-[11px]">Pendente</span>
        ),
    },
    { key: 'serie', label: 'Nº de Série', value: (r) => r.numeroSerie, className: 'font-mono text-slate-800' },
    { key: 'modelo', label: 'Modelo', value: (r) => r.modelo, filter: 'select', className: 'font-bold text-slate-800' },
    { key: 'tipo', label: 'Tipo', value: (r) => r.tipoEquipamento || 'Mono', filter: 'select' },
    { key: 'gati', label: 'GATi', value: (r) => r.gatiInstalacao, className: 'font-mono' },
    { key: 'cliente', label: 'Cliente', value: (r) => r.clienteInstalacao, className: 'font-semibold text-slate-800' },
    {
      key: 'localizacao',
      label: 'Localização',
      value: (r) => r.localizacao,
      render: (r) => <span className="font-black uppercase text-indigo-900">{r.localizacao}</span>,
    },
    { key: 'ip', label: 'IP', value: (r) => r.conectividadeIp, className: 'font-mono' },
    {
      key: 'contadores',
      label: 'Contadores Retirada',
      filter: false,
      sortable: false,
      render: (item) =>
        item.status === 'retirado' ? (
          <div className="space-y-0.5 font-mono">
            {item.dataRetirada && <p className="text-[10px] text-emerald-800 font-bold">Data: {item.dataRetirada}</p>}
            {item.contadorMono && <p className="text-[11px] text-slate-700">Mono: <strong>{item.contadorMono}</strong></p>}
            {item.contadorColor && <p className="text-[11px] text-purple-700">Color: <strong>{item.contadorColor}</strong></p>}
            {item.contadorFinal && <p className="text-[10px] text-slate-500">Total: {item.contadorFinal}</p>}
          </div>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      key: 'status',
      label: 'Status',
      value: (r) => (r.status === 'retirado' ? 'Retirado' : r.status === 'nao_retirado' ? 'Não retirado' : 'A retirar'),
      filter: 'select',
      render: (item) =>
        item.status === 'retirado' ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 whitespace-nowrap">
            <CheckCircle2 className="w-3 h-3" /> Retirado {item.dataRetirada ? `(${item.dataRetirada})` : ''}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 whitespace-nowrap">
            {item.status === 'nao_retirado' ? 'Não retirado' : 'A Retirar'}
          </span>
        ),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs sm:p-4">
      <div className="bg-white sm:rounded-3xl max-w-6xl w-full h-[100dvh] sm:h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-800">
                  Planilhas & Banco de Dados do Contrato
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Base Oficial 100% Real
                </span>
              </div>
              <p className="text-xs text-slate-500">
                234 equipamentos novos • 234 locais em Lorena • 260 itens a retirar
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-800 text-xs font-semibold rounded-xl transition-all shadow-xs"
              title="Importar planilha Excel baixada do OneDrive para atualizar as OSs em lote"
            >
              <Upload className="w-3.5 h-3.5 text-blue-600" />
              Importar Excel (.xlsx)
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-500 hover:text-blue-700 text-xs font-semibold rounded-xl transition-all shadow-xs"
              title="Restaurar dados originais das planilhas do OneDrive"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {resetFeedback ? 'Restaurado com Sucesso!' : 'Recarregar Planilhas Originais'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (activeTab === 'novos') {
                  exportNovosEquipamentosToExcel(novosEquipamentos);
                } else if (activeTab === 'retiradas') {
                  exportRetiradasToExcel(equipamentosAnteriores);
                } else {
                  exportDistribuicaoToExcel(locaisDistribuicao);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
              title="Baixar planilha Excel atualizada"
            >
              <Download className="w-3.5 h-3.5" />
              {activeTab === 'novos'
                ? 'Exportar Novos + OS (.xlsx)'
                : activeTab === 'retiradas'
                ? 'Exportar Retiradas + OS (.xlsx)'
                : 'Exportar Distribuição (.xlsx)'}
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {importFeedback && (
          <div className="px-5 py-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-900 font-semibold text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{importFeedback}</span>
          </div>
        )}

        {/* Abas e Filtros */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white">
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => setActiveTab('locais')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'locais'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              Distribuição Lorena ({locaisDistribuicao.length})
            </button>
            <button
              onClick={() => setActiveTab('novos')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'novos'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Printer className="w-3.5 h-3.5 text-indigo-600" />
              234 Novos Patrimônios
            </button>
            <button
              onClick={() => setActiveTab('retiradas')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'retiradas'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
              Retiradas Contrato Anterior ({equipamentosAnteriores.length})
            </button>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative min-w-[220px] flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar em todas as colunas..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Conteúdo da Tabela: toque no título da coluna para ordenar; use a linha de filtros para filtrar por coluna */}
        <div className="flex-1 overflow-auto p-3 sm:p-4 bg-slate-50/50">
          {activeTab === 'locais' && (
            <DataTable
              rows={locaisFiltrados}
              columns={colunasLocais}
              rowKey={(l) => l.id}
              rowClassName={(l) => (l.status === 'instalado' ? 'bg-emerald-50/30' : '')}
            />
          )}
          {activeTab === 'novos' && (
            <DataTable rows={novosFiltrados} columns={colunasNovos} rowKey={(e, i) => `${e.patrimonio}-${i}`} />
          )}
          {activeTab === 'retiradas' && (
            <DataTable rows={retiradasFiltradas} columns={colunasRetiradas} rowKey={(r, i) => `${r.patrimonio}-${i}`} />
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-white text-xs text-slate-500">
          <span>
            Maquim Contratos: sincronizado com as planilhas oficiais de Lorena. Instalações concluídas ficam protegidas por senha.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
          >
            Fechar Visualizador
          </button>
        </div>
      </div>

      {/* Modal de Desbloqueio e Anulação (senha conhecida só pelo responsável) */}
      {anularModalOpen && targetGati && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Desbloqueio & Anulação de Teste
                </h3>
                <p className="text-xs text-slate-500">
                  Proteção por senha mestra de contrato
                </p>
              </div>
            </div>

            <div className="bg-amber-50 rounded-2xl p-3.5 border border-amber-200 text-xs text-amber-950 space-y-1">
              <p>
                <strong>GATi:</strong> {targetGati.gatiInstalacao} — {targetGati.clienteInstalacao}
              </p>
              {targetGati.setor && (
                <p>
                  <strong>Localização:</strong> {targetGati.setor}
                </p>
              )}
              <p>
                <strong>Patrimônio Instalado:</strong> #{targetGati.patrimonioInstalado}
              </p>
              <p className="text-[11px] text-amber-800 pt-1">
                Ao confirmar, só esta localização volta para pendente e o patrimônio #{targetGati.patrimonioInstalado} volta a ficar <strong>disponível na van</strong>. A OS dela não é apagada: continua no Histórico marcada como <strong>Anulada</strong>, com os PDFs. As outras OSs não são afetadas.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Senha de anulação *
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setPasswordError('');
                }}
                placeholder="Digite a senha"
                autoFocus
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              {passwordError && (
                <p className="text-red-500 text-xs mt-1 font-semibold">{passwordError}</p>
              )}
              {anularSuccessMsg && (
                <p className="text-emerald-600 text-xs mt-1 font-bold">{anularSuccessMsg}</p>
              )}
            </div>

            <div className="flex gap-2 pt-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setAnularModalOpen(false);
                  setTargetGati(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAnular}
                className="px-5 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Unlock className="w-3.5 h-3.5" />
                Desbloquear e Anular
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
