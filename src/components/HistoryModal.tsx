import React, { useMemo, useState } from 'react';
import {
  FileText,
  X,
  Download,
  Mail,
  Share2,
  Calendar,
  CheckCircle2,
  Search,
  Send,
  WifiOff,
  Info,
  MapPin,
} from 'lucide-react';
import { LocalDistribuicao, OrdemServico } from '../types';
import {
  downloadOSPDF,
  downloadAllOSPDFs,
  downloadOSInstalacaoPDF,
  downloadOSRetiradaPDF,
  getOSFilename,
} from '../utils/pdfGenerator';
import { openMailClient, openWhatsAppShare, shareOSWithPDFAttachment, MAQUIM_EMAIL_DESTINATARIO } from '../utils/emailDispatcher';
import { exportOrdensToExcel } from '../utils/excelManager';
import { normalizeSearch } from '../utils/validation';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  ordens: OrdemServico[];
  locaisDistribuicao?: LocalDistribuicao[];
  online?: boolean;
  onUpdateOS?: (os: OrdemServico) => Promise<void> | void;
}

const formatData = (d?: string) => {
  if (!d) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d;
};

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  ordens,
  locaisDistribuicao = [],
  online = true,
  onUpdateOS,
}) => {
  const [search, setSearch] = useState('');
  const [filtro, setFiltro] = useState<'todas' | 'pendentes'>('todas');
  const [enviandoId, setEnviandoId] = useState<string | null>(null);
  const [aviso, setAviso] = useState('');

  const pendentes = ordens.filter((o) => !o.enviadoEmail).length;

  const filtered = useMemo(() => {
    const s = normalizeSearch(search);
    return ordens.filter((o) => {
      if (filtro === 'pendentes' && o.enviadoEmail) return false;
      if (!s) return true;
      const campos = [
        o.numeroOS,
        o.numeroOSRetirada,
        o.patrimonio,
        o.patrimonioAnterior,
        o.numeroSerie,
        o.numeroSerieAnterior,
        o.gatiInstalacao,
        o.clienteInstalacao,
        o.setor,
        o.bairro,
        o.secretaria,
        o.responsavelNome,
        o.tecnicoNome,
        formatData(o.dataInstalacao),
      ];
      return campos.some((c) => normalizeSearch(c || '').includes(s));
    });
  }, [ordens, search, filtro]);

  // Instalações marcadas na planilha que não têm OS salva NESTE aparelho
  // (feitas em outro celular, ou já vindas preenchidas na planilha original)
  const semOSNesteAparelho = useMemo(() => {
    const s = normalizeSearch(search);
    return locaisDistribuicao.filter((l) => {
      if (l.status !== 'instalado') return false;
      const temOS = ordens.some(
        (o) => o.localId === l.id || (o.gatiInstalacao === l.gatiInstalacao && o.patrimonio === l.patrimonioInstalado)
      );
      if (temOS) return false;
      if (!s) return true;
      return [l.gatiInstalacao, l.clienteInstalacao, l.setor, l.patrimonioInstalado, l.ordemServico].some((c) =>
        normalizeSearch(c || '').includes(s)
      );
    });
  }, [locaisDistribuicao, ordens, search]);

  if (!isOpen) return null;

  const handleEnviarAgora = async (os: OrdemServico) => {
    if (!online) {
      setAviso('Sem internet no momento. Tente de novo quando a conexão voltar.');
      return;
    }
    setEnviandoId(os.id);
    setAviso('');
    try {
      const r = await shareOSWithPDFAttachment(os);
      if (r.success) {
        await onUpdateOS?.({
          ...os,
          enviadoEmail: true,
          envioPendenteOffline: false,
          dataEnvioEmail: new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
        });
        setAviso(
          r.method === 'native-share'
            ? `PDF anexado no app de e-mail. O destinatário ${MAQUIM_EMAIL_DESTINATARIO} foi copiado: cole no campo "Para" e envie.`
            : r.message || 'E-mail aberto. Anexe os PDFs baixados e envie.'
        );
      } else if (r.message) {
        setAviso(r.message);
      }
    } catch {
      setAviso('Não foi possível abrir o envio. Baixe os PDFs e envie manualmente.');
    } finally {
      setEnviandoId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs sm:p-4">
      <div className="bg-white sm:rounded-3xl max-w-4xl w-full h-[100dvh] sm:h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-800">Histórico de OSs ({ordens.length})</h2>
              <p className="text-xs text-slate-500">Salvas neste aparelho, com PDFs prontos para reenviar</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {ordens.length > 0 && (
              <button
                type="button"
                onClick={() => exportOrdensToExcel(ordens)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-500 text-slate-700 text-xs font-semibold rounded-xl transition-all shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                Exportar Excel
              </button>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-200/60 transition-colors" aria-label="Fechar">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Busca e filtros */}
        <div className="p-3 sm:p-4 border-b border-slate-100 bg-white space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="search"
              enterKeyHint="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por OS, patrimônio, GATi, local, localização, responsável..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setFiltro('todas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${filtro === 'todas' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}
            >
              Todas ({ordens.length})
            </button>
            <button
              type="button"
              onClick={() => setFiltro('pendentes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${filtro === 'pendentes' ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-white text-amber-800 border-amber-300'}`}
            >
              E-mail pendente ({pendentes})
            </button>
          </div>
          {aviso && (
            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold">{aviso}</div>
          )}
          {!online && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800 text-white text-xs">
              <WifiOff className="w-4 h-4 text-amber-300 shrink-0" />
              Sem internet: você pode baixar os PDFs; o envio fica para quando a conexão voltar.
            </div>
          )}
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-auto p-3 sm:p-4 bg-slate-50/50 space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-10 text-slate-500 text-sm space-y-2">
              <FileText className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
              <p>
                {ordens.length === 0
                  ? 'Nenhuma OS foi registrada neste aparelho ainda.'
                  : 'Nenhuma OS encontrada com esse filtro.'}
              </p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                O histórico mostra as OSs feitas <strong>neste celular/navegador</strong>. Instalações feitas em outro aparelho
                aparecem abaixo, vindas da planilha.
              </p>
            </div>
          )}

          {filtered.map((os) => (
            <div
              key={os.id}
              className={`bg-white rounded-2xl p-4 border shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                os.enviadoEmail ? 'border-slate-200' : 'border-amber-300'
              }`}
            >
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold text-blue-700 text-sm">
                    {os.numeroOS ? `OS Inst: #${os.numeroOS}` : `Patr #${os.patrimonio}`}
                  </span>
                  {os.substituiAnterior && (
                    <span className="font-mono font-bold text-amber-700 text-sm bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                      {os.numeroOSRetirada ? `OS Ret: #${os.numeroOSRetirada}` : `Retirada #${os.patrimonioAnterior}`}
                    </span>
                  )}
                  <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {formatData(os.dataInstalacao)}
                  </span>
                  {os.enviadoEmail ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> E-mail enviado
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 flex items-center gap-1 border border-amber-300">
                      <Mail className="w-3 h-3 text-amber-600" /> E-mail pendente
                    </span>
                  )}
                </div>

                <p className="font-bold text-slate-900 text-sm">
                  {os.clienteInstalacao} (GATi: {os.gatiInstalacao})
                </p>
                {os.setor && (
                  <p className="text-xs font-bold text-indigo-800 uppercase flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {os.setor}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-slate-600">
                  <span className="bg-slate-100 px-2 py-0.5 rounded-md font-mono">
                    Novo: #{os.patrimonio} ({os.modelo})
                  </span>
                  {os.substituiAnterior && (
                    <span className="bg-amber-50 text-amber-900 px-2 py-0.5 rounded-md font-mono">
                      Retirado: #{os.patrimonioAnterior} ({os.modeloAnterior})
                    </span>
                  )}
                  <span>
                    Validado por: <strong>{os.responsavelNome}</strong>
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 md:justify-end shrink-0">
                {!os.enviadoEmail && (
                  <button
                    type="button"
                    onClick={() => handleEnviarAgora(os)}
                    disabled={enviandoId === os.id}
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl shadow-xs disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {enviandoId === os.id ? 'Abrindo...' : 'Enviar agora'}
                  </button>
                )}
                {os.substituiAnterior ? (
                  <>
                    <button
                      type="button"
                      onClick={() => downloadAllOSPDFs(os)}
                      className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      2 PDFs
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadOSInstalacaoPDF(os)}
                      className="p-2 text-slate-700 hover:text-blue-700 hover:bg-blue-50 rounded-xl border border-slate-200"
                      title={`Baixar PDF Instalação (${getOSFilename(os, 'instalacao')})`}
                    >
                      <span className="text-[10px] font-bold font-mono">Inst</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadOSRetiradaPDF(os)}
                      className="p-2 text-slate-700 hover:text-amber-700 hover:bg-amber-50 rounded-xl border border-slate-200"
                      title={`Baixar PDF Retirada (${getOSFilename(os, 'retirada')})`}
                    >
                      <span className="text-[10px] font-bold font-mono">Ret</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => downloadOSPDF(os)}
                    className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-bold text-slate-700 hover:text-blue-700 hover:bg-blue-50 rounded-xl border border-slate-200"
                    title={`Baixar ${getOSFilename(os, 'instalacao')}`}
                  >
                    <Download className="w-4 h-4" /> PDF
                  </button>
                )}
                {os.enviadoEmail && (
                  <button
                    type="button"
                    onClick={() => openMailClient(os)}
                    className="p-2 text-slate-700 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl border border-slate-200"
                    title={`Reenviar por e-mail (${MAQUIM_EMAIL_DESTINATARIO})`}
                  >
                    <Mail className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openWhatsAppShare(os)}
                  className="p-2 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl border border-slate-200"
                  title="Compartilhar via WhatsApp"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {filtro === 'todas' && semOSNesteAparelho.length > 0 && (
            <div className="pt-2">
              <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700 mb-2">
                <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <span>
                  <strong>{semOSNesteAparelho.length} instalação(ões) registradas na planilha</strong> sem OS salva neste aparelho
                  (feitas em outro celular ou já vindas da planilha). Os PDFs delas ficam no aparelho onde foram feitas.
                </span>
              </div>
              <div className="space-y-1.5">
                {semOSNesteAparelho.map((l) => (
                  <div key={l.id} className="bg-white rounded-xl px-3 py-2 border border-slate-200 text-xs flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-mono font-bold text-slate-700">GATi {l.gatiInstalacao}</span>
                    <span className="font-semibold text-slate-900">{l.clienteInstalacao}</span>
                    {l.setor && <span className="font-bold text-indigo-800 uppercase">{l.setor}</span>}
                    {l.patrimonioInstalado && <span className="font-mono text-emerald-700">Patr #{l.patrimonioInstalado}</span>}
                    {l.dataInstalacao && <span className="text-slate-500">{formatData(l.dataInstalacao)}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
