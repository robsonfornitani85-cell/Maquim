import React, { useState } from 'react';
import {
  Printer,
  MapPin,
  RotateCcw,
  CheckCircle2,
  Clock,
  FileText,
  Search,
  PlusCircle,
  Download,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import {
  NovoEquipamento,
  LocalDistribuicao,
  EquipamentoAnterior,
  OrdemServico,
} from '../types';
import { exportDistribuicaoToExcel } from '../utils/excelManager';

interface DashboardProps {
  novosEquipamentos: NovoEquipamento[];
  locaisDistribuicao: LocalDistribuicao[];
  equipamentosAnteriores: EquipamentoAnterior[];
  ordens: OrdemServico[];
  onStartInstallation: (localId?: string) => void;
  onOpenSpreadsheet: () => void;
  onOpenHistory: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  novosEquipamentos,
  locaisDistribuicao,
  equipamentosAnteriores,
  ordens,
  onStartInstallation,
  onOpenSpreadsheet,
  onOpenHistory,
}) => {
  const [filterSecretaria, setFilterSecretaria] = useState('todas');
  const [search, setSearch] = useState('');

  const totalNovos = novosEquipamentos.length;
  const instaladosNovos = novosEquipamentos.filter((e) => e.status === 'instalado').length;
  const naVan = totalNovos - instaladosNovos;

  const totalLocais = locaisDistribuicao.length;
  const locaisConcluidos = locaisDistribuicao.filter((l) => l.status === 'instalado').length;
  const locaisPendentes = totalLocais - locaisConcluidos;

  const totalRetiradas = equipamentosAnteriores.length;
  const retiradosConcluidos = equipamentosAnteriores.filter((r) => r.status === 'retirado').length;

  const secretarias = Array.from(
    new Set(locaisDistribuicao.map((l) => l.secretaria).filter(Boolean))
  );

  const filteredLocais = locaisDistribuicao.filter((l) => {
    if (filterSecretaria !== 'todas' && l.secretaria !== filterSecretaria) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      l.gatiInstalacao.includes(s) ||
      l.clienteInstalacao.toLowerCase().includes(s) ||
      l.bairro.toLowerCase().includes(s) ||
      (l.setor || '').toLowerCase().includes(s) ||
      l.responsavelLocal.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Hero Banner Boas-Vindas */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30 uppercase tracking-wider mb-3">
            Implantação de Contrato Ativa
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
            Outsourcing Lorena: 234 Impressoras
          </h1>
          <p className="text-sm text-blue-100/90 leading-relaxed mb-6">
            Processo ágil para o técnico registrar instalações, amarrar os patrimônios aos endereços e
            realizar a retirada dos equipamentos do contrato encerrado com geração automática de Ordem de
            Serviço para contratos2@maquim.com.br.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onStartInstallation()}
              className="inline-flex items-center gap-2 px-5 py-3 bg-white hover:bg-blue-50 text-blue-900 font-bold rounded-xl shadow-md transition-all text-sm group"
            >
              <PlusCircle className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
              Iniciar Nova Instalação
            </button>
            <button
              type="button"
              onClick={onOpenSpreadsheet}
              className="inline-flex items-center gap-2 px-4 py-3 bg-blue-950/60 hover:bg-blue-900/80 border border-blue-400/30 text-white font-semibold rounded-xl transition-all text-sm"
            >
              Consultar 3 Planilhas
            </button>
          </div>
        </div>

        {/* Círculo decorativo */}
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
      </div>

      {/* Grid de Métricas Principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: 234 Equipamentos */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Equipamentos Novos</span>
            <Printer className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{instaladosNovos}</span>
            <span className="text-xs text-slate-400 font-medium">/ {totalNovos}</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex justify-between">
            <span>Na Van: <strong>{naVan}</strong></span>
            <span className="text-blue-600 font-bold">
              {Math.round((instaladosNovos / totalNovos) * 100)}%
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full"
              style={{ width: `${(instaladosNovos / totalNovos) * 100}%` }}
            />
          </div>
        </div>

        {/* Card 2: Locais de Lorena */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Locais Atendidos</span>
            <MapPin className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{locaisConcluidos}</span>
            <span className="text-xs text-slate-400 font-medium">/ {totalLocais}</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex justify-between">
            <span>Pendentes: <strong>{locaisPendentes}</strong></span>
            <span className="text-emerald-600 font-bold">
              {Math.round((locaisConcluidos / totalLocais) * 100)}%
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full"
              style={{ width: `${(locaisConcluidos / totalLocais) * 100}%` }}
            />
          </div>
        </div>

        {/* Card 3: Retiradas */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Retiradas Antigas</span>
            <RotateCcw className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{retiradosConcluidos}</span>
            <span className="text-xs text-slate-400 font-medium">/ {totalRetiradas}</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex justify-between">
            <span>A retirar: <strong>{totalRetiradas - retiradosConcluidos}</strong></span>
            <span className="text-amber-600 font-bold">
              {Math.round((retiradosConcluidos / totalRetiradas) * 100)}%
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-amber-600 h-full rounded-full"
              style={{ width: `${(retiradosConcluidos / totalRetiradas) * 100}%` }}
            />
          </div>
        </div>

        {/* Card 4: Ordens de Serviço */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Ordens de Serviço</span>
            <FileText className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{ordens.length}</span>
            <span className="text-xs text-emerald-600 font-semibold">emitidas</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex justify-between items-center">
            <span>
              E-mails enviados: <strong className="text-emerald-700">{ordens.filter((o) => o.enviadoEmail).length}</strong>/{ordens.length}
            </span>
            <button
              onClick={onOpenHistory}
              className="text-blue-600 hover:underline font-semibold"
            >
              Ver histórico
            </button>
          </div>
        </div>
      </div>

      {/* Seção: Locais para Instalação (Lista Rápida com Filtro) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Locais de Lorena para Atendimento</h2>
            <p className="text-xs text-slate-500">
              Clique em qualquer endereço para carregar o formulário já pré-preenchido
            </p>
          </div>

          <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
            <select
              value={filterSecretaria}
              onChange={(e) => setFilterSecretaria(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden"
            >
              <option value="todas">Todas as Secretarias</option>
              {secretarias.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar endereço, cliente ou GATi..."
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="button"
              onClick={() => exportDistribuicaoToExcel(locaisDistribuicao)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
              title="Baixar planilha Excel atualizada"
            >
              <Download className="w-3.5 h-3.5" />
              Excel
            </button>
          </div>
        </div>

        {/* Lista de Cards de Locais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-1">
          {filteredLocais.map((local) => (
            <div
              key={local.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                local.status === 'instalado'
                  ? 'bg-emerald-50/40 border-emerald-200'
                  : 'bg-white hover:bg-blue-50/40 border-slate-200 hover:border-blue-300 shadow-2xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/50">
                      GATi: {local.gatiInstalacao}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                      {local.secretaria}
                    </span>
                  </div>

                  {local.status === 'instalado' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Instalado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700">
                      <Clock className="w-3.5 h-3.5" />
                      Pendente
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-slate-900 text-sm">{local.clienteInstalacao}</h3>
                {local.setor && local.setor.trim() && (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-black uppercase tracking-wide text-indigo-900 bg-indigo-100 border border-indigo-300 px-2 py-0.5 rounded-md">
                    <MapPin className="w-3.5 h-3.5 text-indigo-700" />
                    Localização: {local.setor}
                  </p>
                )}
                <p className="text-xs text-slate-600 mt-1 flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    {local.endereco} - <strong>{local.bairro}</strong>
                  </span>
                </p>
                <p className="text-[11px] text-slate-500 mt-1 pl-4.5">
                  Resp. Local: <strong>{local.responsavelLocal}</strong>
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-mono">
                  Previsto: {local.modeloPrevisto}
                </span>

                <button
                  type="button"
                  onClick={() => onStartInstallation(local.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    local.status === 'instalado'
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                  }`}
                >
                  {local.status === 'instalado' ? 'Revisar / Atualizar' : 'Instalar Agora'}
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
