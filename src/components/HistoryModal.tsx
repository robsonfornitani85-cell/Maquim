import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FileText,
  X,
  Download,
  Mail,
  Share2,
  Calendar,
  CheckCircle2,
  Search,
  WifiOff,
  Info,
  MapPin,
  Upload,
  Ban,
  ExternalLink,
  Printer,
  PlusCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { LocalDistribuicao, NovoEquipamento, OrdemServico } from '../types';
import {
  downloadOSPDF,
  downloadAllOSPDFs,
  downloadOSInstalacaoPDF,
  downloadOSRetiradaPDF,
  getOSFilename,
} from '../utils/pdfGenerator';
import { openMailClient, openWhatsAppShare, MAQUIM_EMAIL_DESTINATARIO } from '../utils/emailDispatcher';
import { exportOrdensToExcel } from '../utils/excelManager';
import { normalizeSearch } from '../utils/validation';
import { importarPDFs } from '../utils/pdfImporter';
import {
  restaurarOrdens,
  anularOrdemPorId,
  anularInstalacao,
  verifyProtectionPassword,
} from '../data/mockDatabase';
import { loadOrdemAttachments } from '../firebase/firestoreService';
import { FIREBASE_CONSOLE_URL } from '../firebase/config';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  ordens: OrdemServico[];
  locaisDistribuicao?: LocalDistribuicao[];
  novosEquipamentos?: NovoEquipamento[];
  online?: boolean;
  isAdmin?: boolean;
  canAnnul?: boolean;
  isAnonymous?: boolean;
  onSignInAdmin?: () => void;
  onUpdateOS?: (os: OrdemServico) => Promise<void> | void;
  onSaveRestoredOS?: (os: OrdemServico) => Promise<void> | void;
  onAnnulFirestoreOS?: (os: OrdemServico) => Promise<void> | void;
  onAnnulSpreadsheetLocal?: (local: LocalDistribuicao, patrimonioLiberado?: string) => Promise<void> | void;
  onRefresh?: () => void;
}

/** Hidrata anexos da nuvem sob demanda e baixa os PDFs. */
async function baixarPDFs(os: OrdemServico, tipo: 'todos' | 'instalacao' | 'retirada') {
  if (os.pdfsOriginais && os.pdfsOriginais.length) {
    os.pdfsOriginais.forEach(({ nome, blob }) => {
      const ehRetirada = os.numeroOSRetirada ? nome.includes(os.numeroOSRetirada) : false;
      if (tipo === 'instalacao' && ehRetirada) return;
      if (tipo === 'retirada' && !ehRetirada) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nome;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    });
    return;
  }

  let osCompleta = os;
  if (!os.assinaturaClienteBase64 && !os.fotoRelatorioContadorBase64 && !os.fotoAvariaBase64) {
    try {
      const attachments = await loadOrdemAttachments(os.id);
      if (attachments.assinaturaClienteBase64 || attachments.fotoRelatorioContadorBase64 || attachments.fotoAvariaBase64) {
        osCompleta = { ...os, ...attachments };
      }
    } catch {
      // prossegue com os metadados salvos caso esteja offline sem cache de anexo
    }
  }

  if (tipo === 'instalacao') downloadOSInstalacaoPDF(osCompleta);
  else if (tipo === 'retirada') downloadOSRetiradaPDF(osCompleta);
  else if (osCompleta.substituiAnterior) downloadAllOSPDFs(osCompleta);
  else downloadOSPDF(osCompleta);
}

const formatData = (d?: string) => {
  if (!d) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d.trim());
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d;
};

const formatDataCurta = (d?: string) => {
  const full = formatData(d);
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(full);
  return m ? `${m[1]}/${m[2]}/${m[3].slice(2)}` : full;
};

const normalizeToYMD = (d?: string): string => {
  if (!d) return '';
  const s = d.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br4 = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s);
  if (br4) return `${br4[3]}-${br4[2]}-${br4[1]}`;
  const br2 = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(s);
  if (br2) return `20${br2[3]}-${br2[2]}-${br2[1]}`;
  return '';
};

const getTodayLocalYMD = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  ordens,
  locaisDistribuicao = [],
  novosEquipamentos = [],
  online = true,
  isAdmin = false,
  canAnnul = false,
  isAnonymous = false,
  onSignInAdmin,
  onUpdateOS,
  onSaveRestoredOS,
  onAnnulFirestoreOS,
  onAnnulSpreadsheetLocal,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [dataFiltro, setDataFiltro] = useState('');
  const [filtro, setFiltro] = useState<'todas' | 'planilha' | 'anuladas'>('todas');
  const [aviso, setAviso] = useState('');
  const [importando, setImportando] = useState(false);
  const inputPDFRef = useRef<HTMLInputElement>(null);
  const [osParaAnular, setOsParaAnular] = useState<OrdemServico | null>(null);
  const [localParaAnular, setLocalParaAnular] = useState<LocalDistribuicao | null>(null);
  const [inserindoLocalId, setInserindoLocalId] = useState<string | null>(null);

  const [erroAnulacao, setErroAnulacao] = useState('');
  const [senhaAnulacao, setSenhaAnulacao] = useState('');
  const [anulando, setAnulando] = useState(false);
  // Sempre abre o Histórico completo: sem busca ou filtro esquecidos da última vez
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setDataFiltro('');
      setFiltro('todas');
      setAviso('');
      setOsParaAnular(null);
      setLocalParaAnular(null);
      setInserindoLocalId(null);
    }
  }, [isOpen]);

  const ativas = ordens.filter((o) => !o.anulada);
  const anuladas = ordens.filter((o) => o.anulada);

  const handleImportarPDFs = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivos = Array.from(e.target.files || []);
    e.target.value = '';
    if (!arquivos.length) return;
    setImportando(true);
    setAviso('Lendo os PDFs e enviando para o banco em nuvem...');
    try {
      const { ordens: lidas, ignorados } = await importarPDFs(arquivos);
      const { restauradas, jaExistiam } = await restaurarOrdens(lidas, ordens);
      for (const rest of restauradas) {
        await onSaveRestoredOS?.(rest);
      }
      onRefresh?.();
      const partes = [`${restauradas.length} OS(s) reincluída(s) no Histórico e sincronizada(s) na nuvem.`];
      if (restauradas.length) partes.push(restauradas.map((o) => `OS ${o.numeroOS || 's/n'} (Patr. ${o.patrimonio})`).join(', ') + '.');
      if (jaExistiam.length) partes.push(`${jaExistiam.length} rejeitada(s) por já existirem no app/banco de dados.`);
      if (ignorados.length) partes.push(`Arquivos que não são OS do app: ${ignorados.join(', ')}.`);
      setAviso(partes.join(' '));
      setFiltro('todas');
    } catch (err) {
      console.error(err);
      setAviso('Não foi possível ler os PDFs selecionados.');
    } finally {
      setImportando(false);
    }
  };
  const handleConfirmarAnulacao = async () => {
    if (!osParaAnular && !localParaAnular) return;
    setErroAnulacao('');
    if (!canAnnul) {
      setErroAnulacao('Seu usuário não tem permissão para anular Ordens de Serviço.');
      return;
    }
    if (!senhaAnulacao.trim()) {
      setErroAnulacao('Digite a senha de autorização.');
      return;
    }
    setAnulando(true);
    try {
      const ok = await verifyProtectionPassword(senhaAnulacao);
      if (!ok) {
        setErroAnulacao('Senha de autorização incorreta.');
        setAnulando(false);
        return;
      }

      if (osParaAnular) {
        const res = await anularOrdemPorId(osParaAnular.id, senhaAnulacao);
        if (!res.success) {
          setErroAnulacao(res.message);
          setAnulando(false);
          return;
        }

        await onAnnulFirestoreOS?.(osParaAnular);

        onRefresh?.();
        setAviso(`Instalação do Patrimônio #${osParaAnular.patrimonio} (OS ${osParaAnular.numeroOS || 's/n'}) anulada na nuvem. Equipamento liberado para novo uso.`);
        setOsParaAnular(null);
        setSenhaAnulacao('');
      } else if (localParaAnular) {
        const res = await anularInstalacao(localParaAnular.id, senhaAnulacao);
        if (!res.success) {
          setErroAnulacao(res.message);
          setAnulando(false);
          return;
        }

        await onAnnulSpreadsheetLocal?.(localParaAnular, res.patrimonioLiberado);

        onRefresh?.();
        const patShown = res.patrimonioLiberado || localParaAnular.patrimonioInstalado || 's/n';
        setAviso(`Instalação do GATi ${localParaAnular.gatiInstalacao} (Patr. #${patShown}) anulada na nuvem e liberada na planilha.`);
        setLocalParaAnular(null);
        setSenhaAnulacao('');
        setFiltro('todas');
      }
    } catch (err: any) {
      setErroAnulacao(err.message || 'Erro ao processar anulação.');
    } finally {
      setAnulando(false);
    }
  };

  const handleInserirPlanilhaNoHistorico = async (l: LocalDistribuicao) => {
    if (!isAdmin) {
      setAviso('Entre com a conta Administrador (botão "Entrar Admin (Google)") para inserir este registro da planilha no Histórico.');
      return;
    }
    const pat = (l.patrimonioInstalado || '').trim();
    const equip = pat ? novosEquipamentos.find((n) => n.patrimonio.trim() === pat) : undefined;
    const safeLocId = l.id.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 60) || 'local';
    const novaOS: OrdemServico = {
      id: `os-planilha-${safeLocId}-${Date.now().toString().slice(-6)}`,
      numeroOS: (l.ordemServico || equip?.ordemServico || equip?.osId || '').trim(),
      numeroOSRetirada: l.ordemServicoRetirada?.trim() || undefined,
      dataRegistro: new Date().toISOString(),
      dataInstalacao: (l.dataInstalacao || equip?.dataInstalacao || getTodayLocalYMD()).trim(),
      tecnicoNome: 'Admin (Planilha)',
      localId: l.id,
      gatiInstalacao: (l.gatiInstalacao || '00000').trim(),
      gatiFaturamento: l.gatiFaturamento?.trim() || undefined,
      secretaria: l.secretaria || '',
      clienteInstalacao: (l.clienteInstalacao || 'Lorena').trim(),
      endereco: l.endereco || '',
      bairro: l.bairro || '',
      setor: l.setor || undefined,
      patrimonio: pat || 'SEM-PATRIMONIO',
      numeroSerie: (l.serieInstalada || equip?.numeroSerie || '').trim(),
      modelo: (equip?.modelo || l.modeloPrevisto || '').trim(),
      tipoConexao: 'Via Rede',
      conferenciaERS: true,
      substituiAnterior: false,
      responsavelNome: (l.responsavelLocal || 'Responsável Local').trim(),
      responsavelCPF: '',
      observacoes: 'OS inserida no Histórico pelo Administrador a partir de registro pendente na planilha.',
      enviadoEmail: true,
      emailDestinatario: MAQUIM_EMAIL_DESTINATARIO,
    };

    setInserindoLocalId(l.id);
    setAviso('');
    try {
      await onUpdateOS?.(novaOS);
      setFiltro('todas');
      setAviso(
        `Registro do GATi ${l.gatiInstalacao} (Patr. #${novaOS.patrimonio}) inserido no Histórico com sucesso! Agora você pode conferir ou anular diretamente na lista.`
      );
    } catch (err: any) {
      setAviso(err?.message || 'Não foi possível inserir esta instalação no Histórico.');
    } finally {
      setInserindoLocalId(null);
    }
  };
  
  const filtered = useMemo(() => {
    const s = normalizeSearch(search);
    return ordens.filter((o) => {
      if (filtro === 'todas') {
        if (o.anulada) return false;
      } else if (filtro === 'anuladas') {
        if (!o.anulada) return false;
      }
      if (dataFiltro) {
        const ymd = normalizeToYMD(o.dataInstalacao || o.dataRegistro);
        if (ymd !== dataFiltro) return false;
      }
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
        formatDataCurta(o.dataInstalacao),
      ];
      return campos.some((c) => normalizeSearch(c || '').includes(s));
    });
  }, [ordens, search, dataFiltro, filtro]);

  // Instalações marcadas na planilha que não têm OS salva NESTE aparelho
  // (feitas em outro celular, ou já vindas preenchidas na planilha original)
  const semOSTodas = useMemo(() => {
    return locaisDistribuicao.filter((l) => {
      if (l.status !== 'instalado') return false;
      const temOS = ordens.some(
        (o) => !o.anulada && (o.localId === l.id || (o.gatiInstalacao === l.gatiInstalacao && o.patrimonio === l.patrimonioInstalado))
      );
      return !temOS;
    });
  }, [locaisDistribuicao, ordens]);

  const semOSNesteAparelho = useMemo(() => {
    const s = normalizeSearch(search);
    return semOSTodas.filter((l) => {
      if (dataFiltro) {
        const ymd = normalizeToYMD(l.dataInstalacao);
        if (ymd !== dataFiltro) return false;
      }
      if (!s) return true;
      return [
        l.gatiInstalacao,
        l.clienteInstalacao,
        l.setor,
        l.patrimonioInstalado,
        l.serieInstalada,
        l.ordemServico,
        formatData(l.dataInstalacao),
        formatDataCurta(l.dataInstalacao),
      ].some((c) => normalizeSearch(c || '').includes(s));
    });
  }, [semOSTodas, search, dataFiltro]);

  useEffect(() => {
    if (filtro === 'planilha' && semOSTodas.length === 0) {
      setFiltro('todas');
    }
  }, [filtro, semOSTodas.length]);

  const totalGeralInstalados = ativas.length + semOSTodas.length;
  const totalInstaladosFiltrados =
    filtro === 'todas'
      ? filtered.length + semOSNesteAparelho.length
      : filtro === 'planilha'
        ? semOSNesteAparelho.length
        : filtered.length;
  const temFiltroAtivo = Boolean(dataFiltro || search.trim());

  if (!isOpen) return null;

  const hydrateAttachmentsIfNeeded = async (os: OrdemServico): Promise<OrdemServico> => {
    if (os.assinaturaClienteBase64 || os.fotoRelatorioContadorBase64 || os.fotoAvariaBase64) {
      return os;
    }
    try {
      const attachments = await loadOrdemAttachments(os.id);
      if (attachments.assinaturaClienteBase64 || attachments.fotoRelatorioContadorBase64 || attachments.fotoAvariaBase64) {
        return { ...os, ...attachments };
      }
    } catch {
      // ignora se estiver offline sem cache de anexo
    }
    return os;
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
              <h2 className="text-base sm:text-lg font-bold text-slate-800">Histórico de OSs ({ativas.length})</h2>
              <p className="text-xs text-slate-500">Sincronizado na nuvem Firebase e salvo neste aparelho com PDFs</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && (
              <a
                href={FIREBASE_CONSOLE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-800 text-xs font-bold rounded-xl transition-all shadow-xs"
                title="Abrir painel do banco de dados Firebase Firestore"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Banco Firebase
              </a>
            )}
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
        <div className="p-3 sm:p-4 border-b border-slate-100 bg-white space-y-2.5">
          {/* Totalizador dinâmico de equipamentos instalados */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Printer className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-black text-emerald-950 leading-tight">
                  {filtro === 'anuladas' ? (
                    <>
                      {totalInstaladosFiltrados}{' '}
                      {totalInstaladosFiltrados === 1 ? 'instalação anulada' : 'instalações anuladas'}
                      {dataFiltro ? ` em ${formatData(dataFiltro)}` : ''}
                    </>
                  ) : (
                    <>
                      {totalInstaladosFiltrados}{' '}
                      {totalInstaladosFiltrados === 1 ? 'equipamento instalado' : 'equipamentos instalados'}
                      {dataFiltro ? ` em ${formatData(dataFiltro)}` : ''}
                    </>
                  )}
                </p>
                <p className="text-[11px] font-medium text-emerald-800">
                  {temFiltroAtivo && filtro === 'todas'
                    ? `Filtro ativo • Total geral acumulado: ${totalGeralInstalados} instalados`
                    : `${ativas.length} com OS no histórico${semOSTodas.length > 0 ? ` + ${semOSTodas.length} na planilha` : ''}`}
                </p>
              </div>
            </div>
            {temFiltroAtivo && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setDataFiltro('');
                }}
                className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-[11px] font-bold transition-colors"
              >
                Ver todos ({totalGeralInstalados})
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="search"
                enterKeyHint="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por OS, patrimônio, data (13/11/26), local..."
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <div className="relative flex-1 sm:flex-initial">
                <input
                  type="date"
                  value={dataFiltro}
                  onChange={(e) => setDataFiltro(e.target.value)}
                  aria-label="Filtrar por data da instalação"
                  className="w-full sm:w-auto px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="button"
                onClick={() => setDataFiltro(getTodayLocalYMD())}
                className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                  dataFiltro === getTodayLocalYMD()
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                }`}
              >
                Hoje
              </button>
              {dataFiltro && (
                <button
                  type="button"
                  onClick={() => setDataFiltro('')}
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200"
                  title="Limpar filtro de data"
                  aria-label="Limpar filtro de data"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setFiltro('todas')}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold border whitespace-nowrap ${filtro === 'todas' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}
            >
              Todas ({ativas.length})
            </button>
            {semOSTodas.length > 0 && (
              <button
                type="button"
                onClick={() => setFiltro('planilha')}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold border whitespace-nowrap ${filtro === 'planilha' ? 'bg-amber-600 text-white border-amber-600' : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'}`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Só planilha ({semOSTodas.length})
              </button>
            )}
            <button
              type="button"
              onClick={() => setFiltro('anuladas')}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold border whitespace-nowrap ${filtro === 'anuladas' ? 'bg-slate-600 text-white border-slate-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
            >
              Anuladas ({anuladas.length})
            </button>
          </div>
          <input ref={inputPDFRef} type="file" accept="application/pdf,.pdf" multiple className="hidden" onChange={handleImportarPDFs} />
          <button
            type="button"
            onClick={() => inputPDFRef.current?.click()}
            disabled={importando}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-dashed border-blue-400 bg-blue-50 text-blue-900 text-xs font-bold disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {importando ? 'Lendo PDFs...' : 'Restaurar OSs a partir dos PDFs (pasta Downloads)'}
          </button>
          {aviso && (
            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold">{aviso}</div>
          )}
          {isAnonymous && onSignInAdmin && (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs flex flex-wrap items-center justify-between gap-2">
              <span>
                Modo Técnico: vendo suas OSs e bloqueios da equipe. Para ver <strong>todas as OSs de todos os técnicos</strong> ou abrir o Firebase Console:
              </span>
              <button
                type="button"
                onClick={onSignInAdmin}
                className="px-3 py-1.5 bg-[#0D52BD] hover:bg-[#0B1B3D] text-white font-bold rounded-lg text-[11px] shrink-0"
              >
                Entrar Admin (Google)
              </button>
            </div>
          )}
          {!online && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800 text-white text-xs">
              <WifiOff className="w-4 h-4 text-amber-300 shrink-0" />
              Sem internet: você pode baixar os PDFs; a sincronização com o Firebase acontece quando a conexão voltar.
            </div>
          )}
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-auto p-3 sm:p-4 bg-slate-50/50 space-y-3">
          {((filtro === 'planilha' && semOSNesteAparelho.length === 0) ||
            (filtro !== 'planilha' && filtered.length === 0 && (filtro === 'anuladas' || semOSNesteAparelho.length === 0))) && (
            <div className="text-center py-10 text-slate-500 text-sm space-y-2">
              <FileText className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
              <p>
                {filtro === 'todas' && ativas.length === 0
                  ? 'Nenhuma OS foi registrada ainda.'
                  : 'Nenhuma instalação encontrada com esse filtro.'}
              </p>
            </div>
          )}

          {filtro !== 'planilha' && filtered.map((os) => (
            <div
              key={os.id}
              className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
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
                  {os.anulada && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 flex items-center gap-1">
                      <Ban className="w-3 h-3" /> Anulada {os.dataAnulacao ? `em ${os.dataAnulacao}` : ''}
                    </span>
                  )}
                  {(os.restauradaDePDF || os.restauradaPDF) && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">Restaurada do PDF</span>
                  )}
                  {!os.anulada && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Concluída
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
                {os.substituiAnterior ? (
                  <>
                    <button
                      type="button"
                      onClick={() => baixarPDFs(os, 'todos')}
                      className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      2 PDFs
                    </button>
                    <button
                      type="button"
                      onClick={() => baixarPDFs(os, 'instalacao')}
                      className="p-2 text-slate-700 hover:text-blue-700 hover:bg-blue-50 rounded-xl border border-slate-200"
                      title={`Baixar PDF Instalação (${getOSFilename(os, 'instalacao')})`}
                    >
                      <span className="text-[10px] font-bold font-mono">Inst</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => baixarPDFs(os, 'retirada')}
                      className="p-2 text-slate-700 hover:text-amber-700 hover:bg-amber-50 rounded-xl border border-slate-200"
                      title={`Baixar PDF Retirada (${getOSFilename(os, 'retirada')})`}
                    >
                      <span className="text-[10px] font-bold font-mono">Ret</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => baixarPDFs(os, 'todos')}
                    className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-bold text-slate-700 hover:text-blue-700 hover:bg-blue-50 rounded-xl border border-slate-200"
                    title={`Baixar ${getOSFilename(os, 'instalacao')}`}
                  >
                    <Download className="w-4 h-4" /> PDF
                  </button>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={async () => {
                      const osCompleta = await hydrateAttachmentsIfNeeded(os);
                      openMailClient(osCompleta);
                    }}
                    className="p-2 text-slate-700 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl border border-slate-200"
                    title={`Enviar por e-mail (${MAQUIM_EMAIL_DESTINATARIO})`}
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
                {!os.anulada && canAnnul && (
                  <button
                    type="button"
                    onClick={() => { setOsParaAnular(os); setSenhaAnulacao(''); setErroAnulacao(''); }}
                    className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200"
                    title="Anular instalação e voltar patrimônio para disponível"
                  >
                    <Ban className="w-3.5 h-3.5" /> Anular
                  </button>
                )}
              </div>
            </div>
          ))}

          {(filtro === 'todas' || filtro === 'planilha') && semOSNesteAparelho.length > 0 && (
            <div className={filtro === 'todas' ? 'pt-2' : ''}>
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 mb-2">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  <strong>{semOSNesteAparelho.length} instalação(ões) marcadas na planilha sem OS correspondente neste Histórico</strong>.{' '}
                  {canAnnul ? (
                    <>
                      Você pode clicar em <strong>"Inserir no Histórico"</strong> para gerar a OS na lista ou clicar diretamente em{' '}
                      <strong>"Anular"</strong> caso esteja incorreta.
                    </>
                  ) : isAdmin ? (
                    <>
                      Você pode clicar em <strong>"Inserir no Histórico"</strong> para gerar a OS na lista.
                    </>
                  ) : (
                    <>
                      Os locais e patrimônios já estão bloqueados em tempo real para evitar duplicidade. Entre como <strong>Admin (Google)</strong> caso precise gerenciar.
                    </>
                  )}
                </span>
              </div>
              <div className="space-y-2">
                {semOSNesteAparelho.map((l) => (
                  <div
                    key={l.id}
                    className="bg-white rounded-2xl p-4 border border-amber-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                          Só na Planilha
                        </span>
                        {l.ordemServico && (
                          <span className="font-mono font-bold text-blue-700 text-sm">
                            OS Inst: #{l.ordemServico}
                          </span>
                        )}
                        <span className="font-mono font-bold text-slate-700 text-xs">
                          GATi {l.gatiInstalacao}
                        </span>
                        {l.dataInstalacao && (
                          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {formatData(l.dataInstalacao)}
                          </span>
                        )}
                      </div>

                      <p className="font-bold text-slate-900 text-sm">{l.clienteInstalacao}</p>
                      {l.setor && (
                        <p className="text-xs font-bold text-indigo-800 uppercase flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {l.setor}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-slate-600">
                        <span className="bg-emerald-50 text-emerald-900 border border-emerald-200 px-2 py-0.5 rounded-md font-mono font-bold">
                          Patr: #{l.patrimonioInstalado || 'Não informado'}
                        </span>
                        {l.serieInstalada && (
                          <span className="bg-slate-100 px-2 py-0.5 rounded-md font-mono">
                            Série: {l.serieInstalada}
                          </span>
                        )}
                        <span className="bg-slate-100 px-2 py-0.5 rounded-md font-mono">
                          Modelo: {l.modeloPrevisto}
                        </span>
                        {l.secretaria && <span>{l.secretaria}</span>}
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="flex flex-wrap items-center gap-1.5 md:justify-end shrink-0">
                        <button
                          type="button"
                          onClick={() => handleInserirPlanilhaNoHistorico(l)}
                          disabled={inserindoLocalId === l.id}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition-colors"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          {inserindoLocalId === l.id ? 'Inserindo...' : 'Inserir no Histórico'}
                        </button>
                        {canAnnul && (
                          <button
                            type="button"
                            onClick={() => {
                              setOsParaAnular(null);
                              setLocalParaAnular(l);
                              setSenhaAnulacao('');
                              setErroAnulacao('');
                            }}
                            className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200"
                            title="Anular instalação da planilha e liberar patrimônio"
                          >
                            <Ban className="w-3.5 h-3.5" /> Anular
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {(osParaAnular || localParaAnular) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Confirmar Anulação</h3>
            <p className="text-sm text-slate-600">
              {osParaAnular
                ? `Digite a senha de autorização para anular a instalação do Patrimônio #${osParaAnular.patrimonio} (OS ${osParaAnular.numeroOS || 's/n'}).`
                : `Digite a senha de autorização para anular a instalação do GATi ${localParaAnular?.gatiInstalacao} (Patrimônio #${localParaAnular?.patrimonioInstalado || 's/n'}).`}
            </p>
            {erroAnulacao && (
              <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
                {erroAnulacao}
              </p>
            )}
            <input
              type="password"
              value={senhaAnulacao}
              onChange={(e) => setSenhaAnulacao(e.target.value)}
              placeholder="Senha de autorização"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={anulando}
                onClick={() => {
                  setOsParaAnular(null);
                  setLocalParaAnular(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={anulando}
                onClick={handleConfirmarAnulacao}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-50"
              >
                {anulando ? 'Anulando...' : 'Confirmar Anulação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
