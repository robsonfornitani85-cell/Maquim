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
import { anularInstalacao, PASSWORD_PROTECTION } from '../data/mockDatabase';

interface SpreadsheetViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  novosEquipamentos: NovoEquipamento[];
  locaisDistribuicao: LocalDistribuicao[];
  equipamentosAnteriores: EquipamentoAnterior[];
  onSelectLocalParaInstalar: (gati: string) => void;
  onUpdateOS?: (gati: string, numeroOS: string) => void;
  onUpdateOSRetirada?: (gati: string, numeroOSRetirada: string) => void;
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
  const [secretariaFilter, setSecretariaFilter] = useState('todas');
  const [osFilter, setOsFilter] = useState<'todas' | 'com_os' | 'sem_os'>('todas');
  const [resetFeedback, setResetFeedback] = useState(false);
  const [importFeedback, setImportFeedback] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados para modal de desbloqueio / anulação por senha 223622
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
        if (gati) {
          if (osInst && onUpdateOS) onUpdateOS(gati, osInst);
          if (osRet && onUpdateOSRetirada) onUpdateOSRetirada(gati, osRet);
          count++;
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

  const handleConfirmAnular = () => {
    if (!targetGati) return;
    if (passwordInput.trim() !== PASSWORD_PROTECTION) {
      setPasswordError(`Senha incorreta! A senha mestra de proteção é ${PASSWORD_PROTECTION}.`);
      return;
    }

    const res = anularInstalacao(targetGati.gatiInstalacao, passwordInput);
    if (res.success) {
      setAnularSuccessMsg(res.message);
      onRefreshData?.();
      onResetData?.();
      setTimeout(() => {
        setAnularModalOpen(false);
        setTargetGati(null);
        setAnularSuccessMsg('');
      }, 1500);
    } else {
      setPasswordError(res.message);
    }
  };

  // Secretarias únicas para filtro
  const secretarias = Array.from(
    new Set(locaisDistribuicao.map((l) => l.secretaria).filter(Boolean))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl max-w-5xl w-full h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
            {activeTab === 'locais' && (
              <>
                <select
                  value={secretariaFilter}
                  onChange={(e) => setSecretariaFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden"
                >
                  <option value="todas">Todas as Secretarias</option>
                  {secretarias.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                <select
                  value={osFilter}
                  onChange={(e) => setOsFilter(e.target.value as any)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden"
                >
                  <option value="todas">Status OS (Todas)</option>
                  <option value="sem_os">Sem OS (Em branco)</option>
                  <option value="com_os">Com OS Lançada</option>
                </select>
              </>
            )}

            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrar por qualquer termo..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Conteúdo da Tabela */}
        <div className="flex-1 overflow-auto p-4 bg-slate-50/50">
          {/* ABA 1: DISTRIBUIÇÃO LORENA */}
          {activeTab === 'locais' && (
            <div className="space-y-3">
              <div className="px-4 py-2.5 bg-blue-50/80 border border-blue-200/80 rounded-xl text-xs text-blue-950 flex flex-wrap items-center justify-between gap-2 shadow-xs">
                <div>
                  <span className="font-bold">Lançamento de Ordens de Serviço em Tempo Real:</span>
                  <span className="text-slate-600 ml-1">
                    Digite ou altere o número da OS de cada endereço diretamente na coluna abaixo. O dado é salvo instantaneamente e carregado no formulário do técnico.
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                  {locaisDistribuicao.filter(l => l.ordemServico && l.ordemServico.trim()).length} de {locaisDistribuicao.length} com OS
                </span>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                      <th className="p-3">GATi</th>
                      <th className="p-3">Nº OS Instalação</th>
                      <th className="p-3">Nº OS Retirada</th>
                      <th className="p-3">Secretaria</th>
                      <th className="p-3">Cliente / Unidade</th>
                      <th className="p-3">Endereço & Bairro</th>
                      <th className="p-3">Modelo Previsto</th>
                      <th className="p-3">Status & Proteção</th>
                      <th className="p-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {locaisDistribuicao
                      .filter((l) => {
                        if (secretariaFilter !== 'todas' && l.secretaria !== secretariaFilter) return false;
                        if (osFilter === 'sem_os' && l.ordemServico && l.ordemServico.trim()) return false;
                        if (osFilter === 'com_os' && (!l.ordemServico || !l.ordemServico.trim())) return false;
                        if (!search) return true;
                        const s = search.toLowerCase();
                        return (
                          l.gatiInstalacao.includes(s) ||
                          (l.ordemServico && l.ordemServico.toLowerCase().includes(s)) ||
                          (l.ordemServicoRetirada && l.ordemServicoRetirada.toLowerCase().includes(s)) ||
                          l.clienteInstalacao.toLowerCase().includes(s) ||
                          l.endereco.toLowerCase().includes(s) ||
                          l.bairro.toLowerCase().includes(s) ||
                          l.responsavelLocal.toLowerCase().includes(s)
                        );
                      })
                      .map((local) => (
                        <tr key={local.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-mono font-bold text-blue-700">{local.gatiInstalacao}</td>
                          <td className="p-3">
                            <input
                              type="text"
                              value={local.ordemServico || ''}
                              placeholder="Lançar OS Inst..."
                              onChange={(e) => onUpdateOS?.(local.gatiInstalacao, e.target.value)}
                              className={`w-28 px-2 py-1 text-xs font-mono font-bold rounded-lg border transition-all ${
                                local.ordemServico && local.ordemServico.trim()
                                  ? 'bg-blue-50/80 border-blue-300 text-blue-900 shadow-xs'
                                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300 focus:bg-white focus:border-blue-500'
                              }`}
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              value={local.ordemServicoRetirada || ''}
                              placeholder="Lançar OS Ret..."
                              onChange={(e) => onUpdateOSRetirada?.(local.gatiInstalacao, e.target.value)}
                              className={`w-28 px-2 py-1 text-xs font-mono font-bold rounded-lg border transition-all ${
                                local.ordemServicoRetirada && local.ordemServicoRetirada.trim()
                                  ? 'bg-amber-50/80 border-amber-300 text-amber-900 shadow-xs'
                                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300 focus:bg-white focus:border-amber-500'
                              }`}
                            />
                          </td>
                          <td className="p-3 font-semibold text-slate-800">{local.secretaria}</td>
                          <td className="p-3">
                            <p className="font-bold text-slate-900">{local.clienteInstalacao}</p>
                            <p className="text-[11px] text-slate-500">Resp: {local.responsavelLocal}</p>
                          </td>
                          <td className="p-3">
                            <p className="text-slate-800">{local.endereco}</p>
                            <p className="text-[11px] text-slate-500">{local.bairro}</p>
                          </td>
                          <td className="p-3 font-mono font-medium">
                            {local.modeloPrevisto} ({local.tipoEquipamento})
                          </td>
                          <td className="p-3">
                            {local.status === 'instalado' ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Instalado (#{local.patrimonioInstalado})
                                </span>
                                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                                  <Lock className="w-3 h-3 text-emerald-700" />
                                  <span>Bloqueado (223622)</span>
                                </div>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                <Clock className="w-3 h-3" />
                                Pendente
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            {local.status === 'instalado' ? (
                              <button
                                type="button"
                                onClick={() => handleOpenAnularModal(local)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold text-[11px] rounded-lg transition-colors shadow-xs"
                                title="Anular preenchimento de teste e liberar patrimônio para a van com senha 223622"
                              >
                                <Unlock className="w-3 h-3" />
                                Anular / Desbloquear
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectLocalParaInstalar(local.gatiInstalacao);
                                  onClose();
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[11px] rounded-lg transition-colors shadow-xs"
                              >
                                Instalar Aqui
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ABA 2: NOVOS PATRIMÔNIOS */}
          {activeTab === 'novos' && (
            <div className="space-y-3">
              <div className="px-4 py-2.5 bg-blue-50/80 border border-blue-200/80 rounded-xl text-xs text-blue-950 flex flex-wrap items-center justify-between gap-2 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                  <span className="font-bold">234 Equipamentos Novos Vinculados com Nº de OS Oficial</span>
                </div>
                <span className="text-blue-700 font-medium text-[11px]">
                  Ao escanear ou selecionar o patrimônio na van, a OS correspondente é preenchida automaticamente no formulário.
                </span>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                      <th className="p-3">Patrimônio</th>
                      <th className="p-3">Nº Ordem de Serviço (OS)</th>
                      <th className="p-3">Nº de Série</th>
                      <th className="p-3">Modelo</th>
                      <th className="p-3">Tipo</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Destino / GATi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {novosEquipamentos
                      .filter((e) => {
                        if (!search) return true;
                        const s = search.toLowerCase();
                        return (
                          e.patrimonio.includes(s) ||
                          e.numeroSerie.toLowerCase().includes(s) ||
                          e.modelo.toLowerCase().includes(s) ||
                          (e.ordemServico && e.ordemServico.toLowerCase().includes(s))
                        );
                      })
                      .map((item) => (
                        <tr key={item.patrimonio} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-mono font-bold text-blue-700">#{item.patrimonio}</td>
                          <td className="p-3 font-mono font-bold">
                            {item.ordemServico ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                #{item.ordemServico}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Pendente</span>
                            )}
                          </td>
                          <td className="p-3 font-mono text-slate-800">{item.numeroSerie}</td>
                          <td className="p-3 font-bold text-slate-800">{item.modelo}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.tipo === 'Color'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {item.tipo}
                            </span>
                          </td>
                          <td className="p-3">
                            {item.status === 'instalado' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3 h-3" /> Instalado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                Disponível na Van
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-mono text-slate-600">
                            {item.gatiInstalacao ? `GATi: ${item.gatiInstalacao}` : '—'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ABA 3: RETIRADAS CONTRATO ANTERIOR */}
          {activeTab === 'retiradas' && (
            <div className="space-y-3">
              <div className="px-4 py-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-950 flex flex-wrap items-center justify-between gap-2 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
                  <span className="font-bold">260 Equipamentos Anteriores • 170 com OS de Retirada Oficial Vinculada</span>
                </div>
                <span className="text-amber-800 font-medium text-[11px]">
                  Ao selecionar o GATi ou patrimônio anterior, a OS de retirada correspondente é preenchida automaticamente.
                </span>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                      <th className="p-3">Patrimônio</th>
                      <th className="p-3">Nº OS Retirada</th>
                      <th className="p-3">Nº de Série</th>
                      <th className="p-3">Modelo</th>
                      <th className="p-3">Cliente / Local</th>
                      <th className="p-3">Contadores Retirada</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {equipamentosAnteriores
                      .filter((r) => {
                        if (!search) return true;
                        const s = search.toLowerCase();
                        return (
                          r.patrimonio.includes(s) ||
                          r.numeroSerie.toLowerCase().includes(s) ||
                          (r.ordemServicoRetirada && r.ordemServicoRetirada.toLowerCase().includes(s)) ||
                          r.clienteInstalacao.toLowerCase().includes(s) ||
                          r.localizacao.toLowerCase().includes(s)
                        );
                      })
                      .map((item) => (
                        <tr key={item.patrimonio} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-mono font-bold text-amber-700">#{item.patrimonio}</td>
                          <td className="p-3 font-mono font-bold">
                            {item.ordemServicoRetirada ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
                                #{item.ordemServicoRetirada}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Pendente</span>
                            )}
                          </td>
                          <td className="p-3 font-mono text-slate-800">{item.numeroSerie}</td>
                          <td className="p-3 font-bold text-slate-800">
                            <p>{item.modelo}</p>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                              item.tipoEquipamento === 'Color' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {item.tipoEquipamento || 'Mono'}
                            </span>
                          </td>
                          <td className="p-3">
                            <p className="font-semibold text-slate-800">{item.clienteInstalacao}</p>
                            <p className="text-[11px] text-slate-500">{item.localizacao}</p>
                          </td>
                          <td className="p-3 font-mono text-xs">
                            {item.status === 'retirado' ? (
                              <div className="space-y-0.5">
                                {item.dataRetirada && (
                                  <p className="text-[10px] text-emerald-800 font-bold">Data: {item.dataRetirada}</p>
                                )}
                                {item.contadorMono && (
                                  <p className="text-[11px] text-slate-700">Mono: <strong>{item.contadorMono}</strong></p>
                                )}
                                {item.contadorColor && (
                                  <p className="text-[11px] text-purple-700">Color: <strong>{item.contadorColor}</strong></p>
                                )}
                                {item.contadorFinal && (
                                  <p className="text-[10px] text-slate-500">Total: {item.contadorFinal}</p>
                                )}
                                {item.caboEnergiaRetirado && (
                                  <p className="text-[10px] text-slate-600">Cabo Energia: Sim • Bandeja: Sim</p>
                                )}
                                {item.descricaoAvarias && (
                                  <p className="text-[10px] text-slate-600 font-semibold">{item.descricaoAvarias}</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="p-3">
                            {item.status === 'retirado' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3 h-3" /> Retirado {item.dataRetirada ? `(${item.dataRetirada})` : ''}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                A Retirar
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-white text-xs text-slate-500">
          <span>
            Maquim Contratos: sincronizado com as planilhas oficiais de Lorena. Proteção com senha <strong>223622</strong>.
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

      {/* Modal de Desbloqueio e Anulação de Teste com Senha 223622 */}
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
              <p>
                <strong>Patrimônio Instalado:</strong> #{targetGati.patrimonioInstalado}
              </p>
              <p className="text-[11px] text-amber-800 pt-1">
                Ao confirmar, o preenchimento será completamente anulado, o patrimônio novo voltará a ficar <strong>disponível na van</strong> para nova instalação e as células serão desbloqueadas.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Digite a Senha de Desbloqueio (223622) *
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setPasswordError('');
                }}
                placeholder="Digite a senha 223622..."
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
