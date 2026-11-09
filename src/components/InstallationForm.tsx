import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  MapPin,
  Wifi,
  Network,
  Usb,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Send,
  Download,
  Camera,
  ScanBarcode,
  Search,
  UserCheck,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Share2,
  Calendar,
  Layers,
  ChevronDown,
  Lock,
  Paperclip,
  Mail,
  Copy,
  ExternalLink,
  Check,
  Plus,
  X,
  GraduationCap,
  Eye,
  Image as ImageIcon,
  Sparkles,
  WifiOff,
  Clock,
} from 'lucide-react';
import {
  NovoEquipamento,
  LocalDistribuicao,
  EquipamentoAnterior,
  OrdemServico,
  TipoConexao,
} from '../types';
import {
  formatCPF,
  isValidCPF,
  isValidIPv4,
  normalizeSearch,
  validateOSForm,
} from '../utils/validation';
import { SignaturePad } from './SignaturePad';
import { CameraCaptureModal } from './CameraCaptureModal';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { IPKeypadInput } from './IPKeypadInput';
import { compressMobilePhoto } from '../utils/imageCompressor';
import {
  downloadOSPDF,
  downloadAllOSPDFs,
  downloadOSInstalacaoPDF,
  downloadOSRetiradaPDF,
  getOSFilename,
  getEmailSubject,
} from '../utils/pdfGenerator';
import {
  updateLocalOrdemServico,
  updateLocalOrdemServicoRetirada,
  updateRetiradaOrdemServico,
} from '../data/mockDatabase';
import {
  openMailClient,
  openOutlookClassic,
  openOutlookOffice365Web,
  openOutlookLiveWeb,
  openGmailWeb,
  copyEmailContent,
  openWhatsAppShare,
  shareOSWithPDFAttachment,
  MAQUIM_EMAIL_DESTINATARIO,
} from '../utils/emailDispatcher';

interface InstallationFormProps {
  novosEquipamentos: NovoEquipamento[];
  locaisDistribuicao: LocalDistribuicao[];
  equipamentosAnteriores: EquipamentoAnterior[];
  tecnicoPadrao: string;
  onSaveOS: (os: OrdemServico) => Promise<void> | void;
  onCancel?: () => void;
  preSelectedLocalId?: string;
  online?: boolean;
}

export const InstallationForm: React.FC<InstallationFormProps> = ({
  novosEquipamentos,
  locaisDistribuicao,
  equipamentosAnteriores,
  tecnicoPadrao,
  onSaveOS,
  onCancel,
  preSelectedLocalId,
  online = true,
}) => {
  // Step indicator: 1 = Equipamento & Local, 2 = Instalação Técnica, 3 = Retirada, 4 = Validação Cliente, 5 = Sucesso/PDF
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Modais auxiliares
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false);

  // Formulário - Novo Equipamento
  const [patrimonio, setPatrimonio] = useState('');
  const [numeroSerie, setNumeroSerie] = useState('');
  const [modelo, setModelo] = useState('');

  // Formulário - Local de Instalação (GATi)
  const [gatiInstalacao, setGatiInstalacao] = useState('');
  const [selectedLocalId, setSelectedLocalId] = useState('');
  const [gatiFaturamento, setGatiFaturamento] = useState('');
  const [ordemServico, setOrdemServico] = useState('');
  const [clienteInstalacao, setClienteInstalacao] = useState('');
  const [secretaria, setSecretaria] = useState('');
  const [endereco, setEndereco] = useState('');
  const [bairro, setBairro] = useState('');
  const [setor, setSetor] = useState('');
  const [responsavelLocalCadastrado, setResponsavelLocalCadastrado] = useState('');

  // Formulário - Detalhes da Instalação (Sem pré-seleção: técnico deve clicar em cada opção)
  const [dataInstalacao, setDataInstalacao] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [tipoConexao, setTipoConexao] = useState<TipoConexao | null>(null);
  const [enderecoIP, setEnderecoIP] = useState('');
  const [scanSMB, setScanSMB] = useState<boolean | null>(null);
  const [abbyFineReader, setAbbyFineReader] = useState<boolean | null>(null);
  const [conectadoWifiERS, setConectadoWifiERS] = useState<boolean | null>(null);
  const [justificativaWifiERS, setJustificativaWifiERS] = useState('');
  const [scanEpsonScan2, setScanEpsonScan2] = useState<boolean | null>(null);
  const [ocrComponente, setOcrComponente] = useState<boolean | null>(null);
  const [conferenciaERS, setConferenciaERS] = useState<boolean | null>(null);
  const [justificativaERS, setJustificativaERS] = useState('');

  // Formulário - Retirada do Contrato Anterior (Sem pré-seleção)
  const [substituiAnterior, setSubstituiAnterior] = useState<boolean | null>(null);
  const [ordemServicoRetirada, setOrdemServicoRetirada] = useState('');
  const [tipoEquipamentoAnterior, setTipoEquipamentoAnterior] = useState<'Mono' | 'Color'>('Color');
  const [contadorMono, setContadorMono] = useState('');
  const [contadorColor, setContadorColor] = useState('');
  const [patrimonioAnterior, setPatrimonioAnterior] = useState('');
  const [numeroSerieAnterior, setNumeroSerieAnterior] = useState('');
  const [modeloAnterior, setModeloAnterior] = useState('');
  const [localizacaoAnterior, setLocalizacaoAnterior] = useState('');
  const [contadorPaginasFinal, setContadorPaginasFinal] = useState('');
  const [fotoRelatorioContadorBase64, setFotoRelatorioContadorBase64] = useState<string | undefined>();
  const [cameraMode, setCameraMode] = useState<'avaria' | 'relatorio'>('avaria');
  const [equipamentoRetirado, setEquipamentoRetirado] = useState<boolean | null>(null);
  const [justificativaEquipRetirado, setJustificativaEquipRetirado] = useState('');
  const [caboEnergiaRetirado, setCaboEnergiaRetirado] = useState<boolean | null>(null);
  const [justificativaCaboEnergia, setJustificativaCaboEnergia] = useState('');
  const [bandejaSaidaRetirada, setBandejaSaidaRetirada] = useState<boolean | null>(null);
  const [justificativaBandejaSaida, setJustificativaBandejaSaida] = useState('');
  const [avariasEncontradas, setAvariasEncontradas] = useState<boolean | null>(null);
  const [descricaoAvarias, setDescricaoAvarias] = useState('');
  const [fotoAvariaBase64, setFotoAvariaBase64] = useState<string | undefined>();

  // Formulário - Validação do Responsável do Local
  const [responsavelNome, setResponsavelNome] = useState('');
  const [responsavelCPF, setResponsavelCPF] = useState('');
  const [assinaturaClienteBase64, setAssinaturaClienteBase64] = useState<string | undefined>();
  const [tecnicoNome, setTecnicoNome] = useState(tecnicoPadrao || '');
  const [observacoes, setObservacoes] = useState('');

  // Formulário - Usuários Treinados no Local (Instruções de Uso e Pré-Manutenção)
  const [usuariosTreinados, setUsuariosTreinados] = useState<string[]>([]);
  const [novoUsuarioInput, setNovoUsuarioInput] = useState('');

  const handleAddUsuario = () => {
    const trimmed = novoUsuarioInput.trim();
    if (!trimmed) return;
    if (trimmed.split(/\s+/).length < 2) {
      alert('Por favor, informe ao menos o nome e um sobrenome do usuário.');
      return;
    }
    if (!usuariosTreinados.includes(trimmed)) {
      setUsuariosTreinados([...usuariosTreinados, trimmed]);
    }
    setNovoUsuarioInput('');
  };

  const handleRemoveUsuario = (indexToRemove: number) => {
    setUsuariosTreinados(usuariosTreinados.filter((_, idx) => idx !== indexToRemove));
  };

  // Referências para captura direta de fotos na câmera móvel (sem risco de fechamento acidental)
  const fileRelatorioRef = useRef<HTMLInputElement>(null);
  const fileAvariaRef = useRef<HTMLInputElement>(null);
  const [compressingPhoto, setCompressingPhoto] = useState(false);
  const [previewModalImg, setPreviewModalImg] = useState<{ src: string; title: string } | null>(null);

  // Persistência automática em LocalStorage (Rascunho anti-fechamento do navegador mobile)
  const DRAFT_STORAGE_KEY = 'maquim_installation_draft_v6';
  const [draftRestored, setDraftRestored] = useState(false);


  // Captura e compressão direta da foto do relatório impresso
  const handleRelatorioFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setCompressingPhoto(true);
      const compressed = await compressMobilePhoto(file, 900, 0.8);
      setFotoRelatorioContadorBase64(compressed);
    } catch (err) {
      console.error('Erro ao processar foto do relatório:', err);
    } finally {
      setCompressingPhoto(false);
      if (e.target) e.target.value = '';
    }
  };

  // Captura e compressão direta da foto da avaria
  const handleAvariaFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setCompressingPhoto(true);
      const compressed = await compressMobilePhoto(file, 900, 0.8);
      setFotoAvariaBase64(compressed);
    } catch (err) {
      console.error('Erro ao processar foto da avaria:', err);
    } finally {
      setCompressingPhoto(false);
      if (e.target) e.target.value = '';
    }
  };

  // Restauração de Rascunho ao inicializar o componente (caso o Android/iOS reinicie a aba após a câmera)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!saved) return;
      const data = JSON.parse(saved);
      if (data && typeof data === 'object') {
        // Etapa 5 = OS já salva: não há o que restaurar (a OS está no Histórico)
        if (data.currentStep === 5) {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
          return;
        }
        if (data.currentStep && data.currentStep >= 1 && data.currentStep <= 4) {
          setCurrentStep(data.currentStep);
        }
        if (data.patrimonio) setPatrimonio(data.patrimonio);
        if (data.numeroSerie) setNumeroSerie(data.numeroSerie);
        if (data.modelo) setModelo(data.modelo);
        if (data.gatiInstalacao) setGatiInstalacao(data.gatiInstalacao);
        if (data.selectedLocalId) setSelectedLocalId(data.selectedLocalId);
        if (data.gatiFaturamento) setGatiFaturamento(data.gatiFaturamento);
        if (data.ordemServico) setOrdemServico(data.ordemServico);
        if (data.clienteInstalacao) setClienteInstalacao(data.clienteInstalacao);
        if (data.secretaria) setSecretaria(data.secretaria);
        if (data.endereco) setEndereco(data.endereco);
        if (data.bairro) setBairro(data.bairro);
        if (data.setor) setSetor(data.setor);
        if (data.responsavelLocalCadastrado) setResponsavelLocalCadastrado(data.responsavelLocalCadastrado);
        if (data.dataInstalacao) setDataInstalacao(data.dataInstalacao);
        if (data.tipoConexao !== undefined) setTipoConexao(data.tipoConexao);
        if (data.enderecoIP) setEnderecoIP(data.enderecoIP);
        if (data.scanSMB !== undefined) setScanSMB(data.scanSMB);
        if (data.abbyFineReader !== undefined) setAbbyFineReader(data.abbyFineReader);
        if (data.conectadoWifiERS !== undefined) setConectadoWifiERS(data.conectadoWifiERS);
        if (data.justificativaWifiERS) setJustificativaWifiERS(data.justificativaWifiERS);
        if (data.scanEpsonScan2 !== undefined) setScanEpsonScan2(data.scanEpsonScan2);
        if (data.ocrComponente !== undefined) setOcrComponente(data.ocrComponente);
        if (data.conferenciaERS !== undefined) setConferenciaERS(data.conferenciaERS);
        if (data.justificativaERS) setJustificativaERS(data.justificativaERS);
        if (data.substituiAnterior !== undefined) setSubstituiAnterior(data.substituiAnterior);
        if (data.ordemServicoRetirada) setOrdemServicoRetirada(data.ordemServicoRetirada);
        if (data.tipoEquipamentoAnterior) setTipoEquipamentoAnterior(data.tipoEquipamentoAnterior);
        if (data.contadorMono) setContadorMono(data.contadorMono);
        if (data.contadorColor) setContadorColor(data.contadorColor);
        if (data.patrimonioAnterior) setPatrimonioAnterior(data.patrimonioAnterior);
        if (data.numeroSerieAnterior) setNumeroSerieAnterior(data.numeroSerieAnterior);
        if (data.modeloAnterior) setModeloAnterior(data.modeloAnterior);
        if (data.localizacaoAnterior) setLocalizacaoAnterior(data.localizacaoAnterior);
        if (data.contadorPaginasFinal) setContadorPaginasFinal(data.contadorPaginasFinal);
        if (data.fotoRelatorioContadorBase64) setFotoRelatorioContadorBase64(data.fotoRelatorioContadorBase64);
        if (data.equipamentoRetirado !== undefined) setEquipamentoRetirado(data.equipamentoRetirado);
        if (data.justificativaEquipRetirado) setJustificativaEquipRetirado(data.justificativaEquipRetirado);
        if (data.caboEnergiaRetirado !== undefined) setCaboEnergiaRetirado(data.caboEnergiaRetirado);
        if (data.justificativaCaboEnergia) setJustificativaCaboEnergia(data.justificativaCaboEnergia);
        if (data.bandejaSaidaRetirada !== undefined) setBandejaSaidaRetirada(data.bandejaSaidaRetirada);
        if (data.justificativaBandejaSaida) setJustificativaBandejaSaida(data.justificativaBandejaSaida);
        if (data.avariasEncontradas !== undefined) setAvariasEncontradas(data.avariasEncontradas);
        if (data.descricaoAvarias) setDescricaoAvarias(data.descricaoAvarias);
        if (data.fotoAvariaBase64) setFotoAvariaBase64(data.fotoAvariaBase64);
        if (data.responsavelNome) setResponsavelNome(data.responsavelNome);
        if (data.responsavelCPF) setResponsavelCPF(data.responsavelCPF);
        if (data.assinaturaClienteBase64) setAssinaturaClienteBase64(data.assinaturaClienteBase64);
        if (data.tecnicoNome) setTecnicoNome(data.tecnicoNome);
        if (data.observacoes) setObservacoes(data.observacoes);
        if (Array.isArray(data.usuariosTreinados) && data.usuariosTreinados.length > 0) {
          setUsuariosTreinados(data.usuariosTreinados);
        }
        setDraftRestored(true);
      }
    } catch (err) {
      console.warn('Falha ao restaurar rascunho de instalação:', err);
    }
  }, []);

  // Salvamento contínuo em LocalStorage
  useEffect(() => {
    if (!patrimonio && !gatiInstalacao && currentStep === 1) return;
    if (currentStep === 5) return; // OS já salva no Histórico: rascunho não é mais necessário
    const draftData = {
      currentStep,
      patrimonio,
      numeroSerie,
      modelo,
      gatiInstalacao,
      selectedLocalId,
      gatiFaturamento,
      ordemServico,
      clienteInstalacao,
      secretaria,
      endereco,
      bairro,
      setor,
      responsavelLocalCadastrado,
      dataInstalacao,
      tipoConexao,
      enderecoIP,
      scanSMB,
      abbyFineReader,
      conectadoWifiERS,
      justificativaWifiERS,
      scanEpsonScan2,
      ocrComponente,
      conferenciaERS,
      justificativaERS,
      substituiAnterior,
      ordemServicoRetirada,
      tipoEquipamentoAnterior,
      contadorMono,
      contadorColor,
      patrimonioAnterior,
      numeroSerieAnterior,
      modeloAnterior,
      localizacaoAnterior,
      contadorPaginasFinal,
      fotoRelatorioContadorBase64,
      equipamentoRetirado,
      justificativaEquipRetirado,
      caboEnergiaRetirado,
      justificativaCaboEnergia,
      bandejaSaidaRetirada,
      justificativaBandejaSaida,
      avariasEncontradas,
      descricaoAvarias,
      fotoAvariaBase64,
      responsavelNome,
      responsavelCPF,
      assinaturaClienteBase64,
      tecnicoNome,
      observacoes,
      usuariosTreinados,
      updatedAt: Date.now(),
    };
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
    } catch {
      try {
        const lightDraft = {
          ...draftData,
          fotoRelatorioContadorBase64: undefined,
          fotoAvariaBase64: undefined,
          assinaturaClienteBase64: undefined,
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(lightDraft));
      } catch {
        // quota exceeded
      }
    }
  }, [
    currentStep,
    patrimonio,
    numeroSerie,
    modelo,
    gatiInstalacao,
    selectedLocalId,
    gatiFaturamento,
    ordemServico,
    clienteInstalacao,
    secretaria,
    endereco,
    bairro,
    setor,
    responsavelLocalCadastrado,
    dataInstalacao,
    tipoConexao,
    enderecoIP,
    scanSMB,
    abbyFineReader,
    conectadoWifiERS,
    justificativaWifiERS,
    scanEpsonScan2,
    ocrComponente,
    conferenciaERS,
    justificativaERS,
    substituiAnterior,
    ordemServicoRetirada,
    tipoEquipamentoAnterior,
    contadorMono,
    contadorColor,
    patrimonioAnterior,
    numeroSerieAnterior,
    modeloAnterior,
    localizacaoAnterior,
    contadorPaginasFinal,
    fotoRelatorioContadorBase64,
    equipamentoRetirado,
    justificativaEquipRetirado,
    caboEnergiaRetirado,
    justificativaCaboEnergia,
    bandejaSaidaRetirada,
    justificativaBandejaSaida,
    avariasEncontradas,
    descricaoAvarias,
    fotoAvariaBase64,
    responsavelNome,
    responsavelCPF,
    assinaturaClienteBase64,
    tecnicoNome,
    observacoes,
    usuariosTreinados,
  ]);

  // Estados de Validação e Feedback
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedOS, setSavedOS] = useState<OrdemServico | null>(null);
  const [emailEnviadoConfirmado, setEmailEnviadoConfirmado] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{
    sending: boolean;
    message?: string;
    type?: 'success' | 'info' | 'error';
  }>({ sending: false });
  const [copiedFeedback, setCopiedFeedback] = useState(false);

  // Helper para carimbar o envio do e-mail na Ordem de Serviço e liberar a próxima instalação
  const markEmailAsSent = (targetOS?: OrdemServico) => {
    const osToUpdate = targetOS || savedOS;
    if (!osToUpdate) return;
    const nowStr = new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    });
    const updatedOS: OrdemServico = {
      ...osToUpdate,
      enviadoEmail: true,
      dataEnvioEmail: nowStr,
    };
    setSavedOS(updatedOS);
    setEmailEnviadoConfirmado(true);
    onSaveOS(updatedOS);
  };

  const handleCopyEmail = async () => {
    if (!savedOS) return;
    const ok = await copyEmailContent(savedOS);
    if (ok) {
      setCopiedFeedback(true);
      setTimeout(() => setCopiedFeedback(false), 3000);
    }
  };

  // Efeito ao selecionar ou mudar o Patrimônio Novo: auto-completa Série, Modelo e Nº da OS vinculada
  const handleSelectPatrimonio = (pat: string) => {
    setPatrimonio(pat);
    const clean = pat.trim();
    if (!clean) {
      setNumeroSerie('');
      setModelo('');
      return;
    }
    const item = novosEquipamentos.find(
      (e) =>
        e.patrimonio.trim() === clean ||
        e.numeroSerie.trim().toLowerCase() === clean.toLowerCase()
    );
    if (item) {
      setPatrimonio(item.patrimonio);
      setNumeroSerie(item.numeroSerie);
      setModelo(item.modelo);
      // Nº da OS de instalação vem do vínculo patrimônio → OS (não é digitado pelo técnico)
      setOrdemServico(item.ordemServico ? item.ordemServico.trim() : '');
    } else {
      setNumeroSerie('');
      setModelo('');
      setOrdemServico('');
    }
  };

  // Todas as linhas da planilha com este GATi (um mesmo prédio pode ter várias localizações)
  const locaisDoGati = React.useMemo(() => {
    const g = gatiInstalacao.trim();
    if (!g) return [] as LocalDistribuicao[];
    return locaisDistribuicao.filter((l) => l.gatiInstalacao.trim() === g);
  }, [gatiInstalacao, locaisDistribuicao]);

  const localSelecionado = React.useMemo(
    () => locaisDistribuicao.find((l) => l.id === selectedLocalId),
    [locaisDistribuicao, selectedLocalId]
  );

  // Equipamentos do contrato anterior instalados neste GATi (com a localização de cada um)
  const anterioresDoGati = React.useMemo(() => {
    const g = gatiInstalacao.trim();
    if (!g) return [] as EquipamentoAnterior[];
    const seen = new Set<string>();
    return equipamentosAnteriores.filter((r) => {
      if (r.gatiInstalacao.trim() !== g || seen.has(r.patrimonio)) return false;
      seen.add(r.patrimonio);
      return true;
    });
  }, [gatiInstalacao, equipamentosAnteriores]);

  const normLoc = (v?: string) => normalizeSearch(v || '').replace(/[^a-z0-9]/g, '');
  const anteriorDaLocalizacao = (loc?: string) => {
    const n = normLoc(loc);
    if (!n) return undefined;
    return (
      anterioresDoGati.find((r) => normLoc(r.localizacao) === n) ||
      anterioresDoGati.find((r) => {
        const rn = normLoc(r.localizacao);
        return rn && (rn.includes(n) || n.includes(rn));
      })
    );
  };

  const selectLocal = (local: LocalDistribuicao) => {
    setSelectedLocalId(local.id);
    setGatiInstalacao(local.gatiInstalacao);
    setClienteInstalacao(local.clienteInstalacao);
    setGatiFaturamento(local.gatiFaturamento || '');
    setSecretaria(local.secretaria);
    setEndereco(local.endereco);
    setBairro(local.bairro);
    setSetor(local.setor || '');
    setResponsavelLocalCadastrado(local.responsavelLocal);
    if (local.ordemServicoRetirada) {
      setOrdemServicoRetirada(local.ordemServicoRetirada.trim());
    }
    setErrors((prev) => {
      const { localizacao, ...rest } = prev;
      return rest;
    });
  };

  // Ao digitar o GATi: preenche os dados do prédio. Se houver uma única localização, já seleciona.
  const handleSelectGATi = (gati: string) => {
    setGatiInstalacao(gati);
    setSelectedLocalId('');
    const clean = gati.trim();
    const matches = clean ? locaisDistribuicao.filter((l) => l.gatiInstalacao.trim() === clean) : [];
    if (matches.length === 0) {
      setClienteInstalacao('');
      setSecretaria('');
      setEndereco('');
      setBairro('');
      setSetor('');
      setResponsavelLocalCadastrado('');
      return;
    }
    const pendentes = matches.filter((l) => l.status !== 'instalado');
    if (matches.length === 1 || pendentes.length === 1) {
      selectLocal(pendentes[0] || matches[0]);
      return;
    }
    const first = matches[0];
    setClienteInstalacao(first.clienteInstalacao);
    setGatiFaturamento(first.gatiFaturamento || '');
    setSecretaria(first.secretaria);
    setEndereco(first.endereco);
    setBairro(first.bairro);
    setSetor('');
    setResponsavelLocalCadastrado(first.responsavelLocal);
  };

  // Inicializa o local pré-selecionado (botão "Instalar aqui" da planilha / visão geral)
  useEffect(() => {
    if (!preSelectedLocalId) return;
    const local = locaisDistribuicao.find((l) => l.id === preSelectedLocalId);
    if (local) selectLocal(local);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preSelectedLocalId, locaisDistribuicao.length]);

  // OS vinculadas (somente leitura para o técnico)
  const equipamentoNovoSelecionado = novosEquipamentos.find((e) => e.patrimonio === patrimonio.trim());
  const osInstalacaoVinculada =
    (equipamentoNovoSelecionado?.ordemServico || '').trim() ||
    ordemServico.trim() ||
    (localSelecionado?.ordemServico || '').trim();
  const equipamentoAnteriorSelecionado = equipamentosAnteriores.find(
    (r) => r.patrimonio === patrimonioAnterior.trim()
  );
  const osRetiradaVinculada =
    (equipamentoAnteriorSelecionado?.ordemServicoRetirada || '').trim() ||
    ordemServicoRetirada.trim() ||
    (localSelecionado?.ordemServicoRetirada || '').trim();

  // Sugestões para o teclado de IP
  const ipSugerido = (equipamentoAnteriorSelecionado?.conectividadeIp || anteriorDaLocalizacao(setor)?.conectividadeIp || '').trim();
  const prefixosIP = React.useMemo(() => {
    const count: Record<string, number> = {};
    anterioresDoGati.forEach((r) => {
      const ip = (r.conectividadeIp || '').trim();
      if (isValidIPv4(ip)) {
        const pre = ip.split('.').slice(0, 3).join('.');
        count[pre] = (count[pre] || 0) + 1;
      }
    });
    const lista = Object.entries(count).sort((a, b) => b[1] - a[1]).map(([p]) => p);
    return (lista.length ? lista : ['192.168.15', '192.168.1', '192.168.0']).slice(0, 3);
  }, [anterioresDoGati]);

  // Efeito ao selecionar Patrimônio Anterior: auto-completa Série e Modelo anteriores
  const handleSelectPatrimonioAnterior = (patAnt: string) => {
    setPatrimonioAnterior(patAnt);
    const clean = patAnt.trim();
    if (!clean) {
      setNumeroSerieAnterior('');
      setModeloAnterior('');
      setLocalizacaoAnterior('');
      return;
    }
    const ret = equipamentosAnteriores.find(
      (r) =>
        r.patrimonio.trim() === clean ||
        r.numeroSerie.trim().toLowerCase() === clean.toLowerCase()
    );
    if (ret) {
      setPatrimonioAnterior(ret.patrimonio);
      setNumeroSerieAnterior(ret.numeroSerie);
      setModeloAnterior(ret.modelo);
      setLocalizacaoAnterior(ret.localizacao || '');
      setOrdemServicoRetirada((ret.ordemServicoRetirada || localSelecionado?.ordemServicoRetirada || '').trim());
      // Detecção inteligente de equipamento Color vs Mono
      const modelUpper = (ret.modelo || '').toUpperCase();
      const isColor =
        ret.tipoEquipamento === 'Color' ||
        modelUpper.includes('5790') ||
        modelUpper.includes('COLOR') ||
        modelUpper.includes('C579') ||
        modelUpper.includes('L6270') ||
        modelUpper.includes('L3250') ||
        modelUpper.includes('L4260') ||
        modelUpper.includes('L5290') ||
        modelUpper.includes('WF-C');
      setTipoEquipamentoAnterior(isColor ? 'Color' : 'Mono');
    }
  };

  // Validação ao avançar etapas
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!patrimonio.trim()) {
        newErrors.patrimonio = 'Informe ou selecione o patrimônio da impressora nova.';
      }
      if (!numeroSerie.trim()) {
        newErrors.numeroSerie = 'Número de série não preenchido.';
      }
      if (!gatiInstalacao.trim()) {
        newErrors.gatiInstalacao = 'Informe o código GATi do local de instalação.';
      }
      if (!clienteInstalacao.trim()) {
        newErrors.clienteInstalacao = 'Nome da unidade/cliente de instalação não informado.';
      }
      if (locaisDoGati.length > 1 && !selectedLocalId) {
        newErrors.localizacao = 'Este local tem várias localizações. Toque na localização onde o equipamento está sendo instalado.';
      }
    } else if (step === 2) {
      if (!tipoConexao) {
        newErrors.tipoConexao = 'Selecione se foi instalado Via Rede, Via WI-FI ou Via USB.';
      } else if (tipoConexao === 'Via Rede' || tipoConexao === 'Via WI-FI') {
        if (!enderecoIP.trim()) {
          newErrors.enderecoIP = 'Informe o endereço IP do equipamento.';
        } else if (!isValidIPv4(enderecoIP)) {
          newErrors.enderecoIP = 'Formato de IP inválido. Exemplo: 192.168.15.50';
        }
        if (scanSMB === null) {
          newErrors.scanSMB = 'Informe se a digitalização via SMB (pasta PC) foi configurada (SIM ou NÃO).';
        }
        if (abbyFineReader === null) {
          newErrors.abbyFineReader = 'Informe se o Abby Fine Reader foi instalado (SIM ou NÃO).';
        }
      } else if (tipoConexao === 'Via USB para IMPRESSÃO') {
        if (conectadoWifiERS === null) {
          newErrors.conectadoWifiERS = 'Informe se o equipamento foi conectado via Wi-Fi para o ERS (SIM ou NÃO).';
        } else if (conectadoWifiERS === false && !justificativaWifiERS.trim()) {
          newErrors.justificativaWifiERS = 'Justifique por que o equipamento não foi conectado via Wi-Fi para o ERS.';
        }
        if (scanEpsonScan2 === null) {
          newErrors.scanEpsonScan2 = 'Informe se a digitalização via Epson Scan 2 foi configurada (SIM ou NÃO).';
        }
        if (ocrComponente === null) {
          newErrors.ocrComponente = 'Informe se o OCR componente foi instalado (SIM ou NÃO).';
        }
      }

      if (conferenciaERS === null) {
        newErrors.conferenciaERS = 'Informe se o equipamento foi incluído no ERS / conferência realizada (SIM ou NÃO).';
      } else if (conferenciaERS === false && !justificativaERS.trim()) {
        newErrors.justificativaERS = 'Justifique por que o equipamento não foi incluído ou conferido no ERS.';
      }
    } else if (step === 3) {
      if (substituiAnterior === null) {
        newErrors.substituiAnterior = 'Informe se este equipamento substituiu equipamento do contrato anterior (SIM ou NÃO).';
      } else if (substituiAnterior === true) {
        if (!patrimonioAnterior.trim()) {
          newErrors.patrimonioAnterior = 'Informe o patrimônio do equipamento a ser retirado.';
        }

        // Validação de contadores: Mono e Color para coloridas, ou Mono para monocromáticas
        if (tipoEquipamentoAnterior === 'Color') {
          if (!contadorMono.trim()) {
            newErrors.contadorMono = 'Informe o contador de páginas Total Mono (P&B).';
          }
          if (!contadorColor.trim()) {
            newErrors.contadorColor = 'Informe o contador de páginas Total Color.';
          }
        } else {
          if (!contadorMono.trim() && !contadorPaginasFinal.trim()) {
            newErrors.contadorMono = 'Informe o contador de páginas final (Mono).';
          }
        }

        if (equipamentoRetirado === null) {
          newErrors.equipamentoRetirado = 'Informe se o equipamento foi retirado (SIM ou NÃO).';
        } else if (equipamentoRetirado === false && !justificativaEquipRetirado.trim()) {
          newErrors.justificativaEquipRetirado = 'Justifique por que o equipamento não foi retirado.';
        }
        if (caboEnergiaRetirado === null) {
          newErrors.caboEnergiaRetirado = 'Informe se o cabo de energia foi retirado (SIM ou NÃO).';
        } else if (caboEnergiaRetirado === false && !justificativaCaboEnergia.trim()) {
          newErrors.justificativaCaboEnergia = 'Justifique por que o cabo de energia não foi retirado.';
        }
        if (bandejaSaidaRetirada === null) {
          newErrors.bandejaSaidaRetirada = 'Informe se a bandeja de saída de papéis foi retirada (SIM ou NÃO).';
        } else if (bandejaSaidaRetirada === false && !justificativaBandejaSaida.trim()) {
          newErrors.justificativaBandejaSaida = 'Justifique por que a bandeja de papéis não foi retirada.';
        }
        if (avariasEncontradas === null) {
          newErrors.avariasEncontradas = 'Informe se foram encontradas avarias no equipamento (SIM ou NÃO).';
        } else if (avariasEncontradas === true && !descricaoAvarias.trim()) {
          newErrors.descricaoAvarias = 'Descreva a(s) avaria(s) encontrada(s) no equipamento.';
        }
      }
    } else if (step === 4) {
      if (!responsavelNome.trim()) {
        newErrors.responsavelNome = 'Informe o nome e sobrenome do responsável que acompanhou e validou o serviço.';
      } else if (responsavelNome.trim().split(/\s+/).length < 2) {
        newErrors.responsavelNome = 'Informe nome e sobrenome completos.';
      }

      if (!responsavelCPF.trim()) {
        newErrors.responsavelCPF = 'Informe o CPF do responsável que acompanhou e validou o serviço.';
      } else if (!isValidCPF(responsavelCPF)) {
        newErrors.responsavelCPF = 'CPF inválido. Confira os 11 dígitos.';
      }

      if (!tecnicoNome.trim()) {
        newErrors.tecnicoNome = 'Nome do técnico responsável é obrigatório.';
      }
    }

    setErrors(newErrors);
    const ok = Object.keys(newErrors).length === 0;
    if (!ok) {
      // Leva o técnico direto ao primeiro campo com problema
      setTimeout(() => {
        const el = document.querySelector('[data-erro="true"], .text-red-500');
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }
    return ok;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState('');

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Submissão Final do Formulário
  const handleSubmit = async () => {
    if (!validateStep(4) || salvando) return;

    // Números de OS sempre vindos do vínculo da planilha (patrimônio → OS)
    const osNumber = osInstalacaoVinculada;
    const osRetNumber = osRetiradaVinculada;

    // Formatação dos contadores
    let totalContadorFinal = contadorPaginasFinal.trim();
    if (substituiAnterior) {
      if (tipoEquipamentoAnterior === 'Color') {
        const numMono = parseInt(contadorMono.replace(/\D/g, ''), 10) || 0;
        const numColor = parseInt(contadorColor.replace(/\D/g, ''), 10) || 0;
        const total = numMono + numColor;
        totalContadorFinal = `${total.toLocaleString('pt-BR')} (Mono: ${contadorMono.trim()} | Color: ${contadorColor.trim()})`;
      } else {
        totalContadorFinal = contadorMono.trim() || contadorPaginasFinal.trim();
      }
    }

    const novaOS: OrdemServico = {
      id: `os-${Date.now()}`,
      numeroOS: osNumber,
      numeroOSRetirada: substituiAnterior && osRetNumber ? osRetNumber : undefined,
      dataRegistro: new Date().toISOString(),
      dataInstalacao,
      tecnicoNome,
      localId: selectedLocalId || undefined,
      gatiInstalacao,
      gatiFaturamento,
      secretaria,
      clienteInstalacao,
      endereco,
      bairro,
      setor,
      patrimonio,
      numeroSerie,
      modelo,
      tipoConexao: (tipoConexao as TipoConexao) || 'Via Rede',
      enderecoIP: tipoConexao !== 'Via USB para IMPRESSÃO' ? enderecoIP : undefined,
      scanSMB: tipoConexao !== 'Via USB para IMPRESSÃO' ? (scanSMB ?? undefined) : undefined,
      abbyFineReader: tipoConexao !== 'Via USB para IMPRESSÃO' ? (abbyFineReader ?? undefined) : undefined,
      conectadoWifiERS: tipoConexao === 'Via USB para IMPRESSÃO' ? (conectadoWifiERS ?? undefined) : undefined,
      justificativaWifiERS: tipoConexao === 'Via USB para IMPRESSÃO' && !conectadoWifiERS ? justificativaWifiERS : undefined,
      scanEpsonScan2: tipoConexao === 'Via USB para IMPRESSÃO' ? (scanEpsonScan2 ?? undefined) : undefined,
      ocrComponente: tipoConexao === 'Via USB para IMPRESSÃO' ? (ocrComponente ?? undefined) : undefined,
      conferenciaERS: Boolean(conferenciaERS),
      justificativaERS: !conferenciaERS ? justificativaERS : undefined,
      substituiAnterior: Boolean(substituiAnterior),
      patrimonioAnterior: substituiAnterior ? patrimonioAnterior : undefined,
      numeroSerieAnterior: substituiAnterior ? numeroSerieAnterior : undefined,
      modeloAnterior: substituiAnterior ? modeloAnterior : undefined,
      tipoEquipamentoAnterior: substituiAnterior ? tipoEquipamentoAnterior : undefined,
      contadorMono: substituiAnterior ? (contadorMono.trim() || undefined) : undefined,
      contadorColor: substituiAnterior && tipoEquipamentoAnterior === 'Color' ? (contadorColor.trim() || undefined) : undefined,
      contadorPaginasFinal: substituiAnterior ? totalContadorFinal : undefined,
      fotoRelatorioContadorBase64: substituiAnterior ? fotoRelatorioContadorBase64 : undefined,
      equipamentoRetirado: substituiAnterior ? (equipamentoRetirado ?? undefined) : undefined,
      justificativaEquipRetirado: substituiAnterior && !equipamentoRetirado ? justificativaEquipRetirado : undefined,
      caboEnergiaRetirado: substituiAnterior ? (caboEnergiaRetirado ?? undefined) : undefined,
      justificativaCaboEnergia: substituiAnterior && !caboEnergiaRetirado ? justificativaCaboEnergia : undefined,
      bandejaSaidaRetirada: substituiAnterior ? (bandejaSaidaRetirada ?? undefined) : undefined,
      justificativaBandejaSaida: substituiAnterior && !bandejaSaidaRetirada ? justificativaBandejaSaida : undefined,
      avariasEncontradas: substituiAnterior ? (avariasEncontradas ?? undefined) : undefined,
      descricaoAvarias: substituiAnterior && avariasEncontradas ? descricaoAvarias : undefined,
      fotoAvariaBase64: substituiAnterior && avariasEncontradas ? fotoAvariaBase64 : undefined,
      responsavelNome,
      responsavelCPF,
      assinaturaClienteBase64,
      usuariosTreinados: usuariosTreinados.length > 0 ? usuariosTreinados : undefined,
      observacoes,
      enviadoEmail: false,
      emailDestinatario: MAQUIM_EMAIL_DESTINATARIO,
    };

    // Atualiza número da OS na linha exata da planilha (GATi + localização)
    if (osNumber && selectedLocalId) {
      updateLocalOrdemServico(selectedLocalId, osNumber);
    }
    if (substituiAnterior) {
      if (osRetNumber && selectedLocalId) {
        updateLocalOrdemServicoRetirada(selectedLocalId, osRetNumber);
      }
      if (osRetNumber && patrimonioAnterior) {
        updateRetiradaOrdemServico(patrimonioAnterior, osRetNumber);
      }
    }

    // Grava no aparelho ANTES de seguir: só avança se a OS ficou salva
    setSalvando(true);
    setErroSalvar('');
    try {
      await onSaveOS(novaOS);
    } catch (err) {
      console.error('Falha ao salvar OS:', err);
      setErroSalvar('Não foi possível salvar a OS neste aparelho. Verifique o espaço livre do celular e tente novamente. Nada foi perdido: os dados continuam no formulário.');
      setSalvando(false);
      return;
    }
    setSalvando(false);
    setSavedOS(novaOS);
    setEmailEnviadoConfirmado(false);

    // Limpa o rascunho temporário do armazenamento local
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // ignora
    }
    setDraftRestored(false);

    // Baixa automaticamente os arquivos de OS para a memória / pasta Downloads:
    // Se houver retirada, baixa ambos os PDFs (Instalação e Retirada) sequencialmente
    if (novaOS.substituiAnterior) {
      downloadAllOSPDFs(novaOS);
    } else {
      downloadOSPDF(novaOS);
    }

    // Avança para a Etapa 5 (Envio Obrigatório de E-mail)
    setCurrentStep(5);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // O envio é feito pelo botão "Disparar e-mail" (o celular só permite anexar PDFs
    // no compartilhamento quando parte de um toque do usuário).
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setEmailStatus({
        sending: false,
        type: 'info',
        message: 'Sem internet agora. A OS e os PDFs estão salvos neste aparelho. Toque em "Sem internet: enviar depois" para liberar a próxima instalação.',
      });
    }
  };

  // Sem internet: libera a próxima instalação e deixa o e-mail pendente (aparece no aviso e no Histórico)
  const handleEnviarDepois = () => {
    if (!savedOS) return;
    const updated: OrdemServico = { ...savedOS, envioPendenteOffline: true };
    setSavedOS(updated);
    onSaveOS(updated);
    setEmailEnviadoConfirmado(true);
    setEmailStatus({
      sending: false,
      type: 'info',
      message: 'OS guardada como "e-mail pendente". Quando tiver internet, abra o Histórico e toque em "Enviar agora".',
    });
  };

  // Helper para resetar e iniciar novo atendimento (todos os campos desmarcados / nulos)
  const handleStartNew = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // ignora
    }
    setDraftRestored(false);
    setPatrimonio('');
    setNumeroSerie('');
    setModelo('');
    setGatiInstalacao('');
    setSelectedLocalId('');
    setOrdemServico('');
    setClienteInstalacao('');
    setSecretaria('');
    setEndereco('');
    setBairro('');
    setSetor('');
    setResponsavelLocalCadastrado('');
    setResponsavelNome('');
    setResponsavelCPF('');
    setAssinaturaClienteBase64(undefined);
    setTecnicoNome(tecnicoPadrao || '');
    setUsuariosTreinados([]);
    setNovoUsuarioInput('');
    setTipoConexao(null);
    setEnderecoIP('');
    setScanSMB(null);
    setAbbyFineReader(null);
    setConectadoWifiERS(null);
    setJustificativaWifiERS('');
    setScanEpsonScan2(null);
    setOcrComponente(null);
    setConferenciaERS(null);
    setJustificativaERS('');
    setSubstituiAnterior(null);
    setOrdemServicoRetirada('');
    setTipoEquipamentoAnterior('Color');
    setContadorMono('');
    setContadorColor('');
    setPatrimonioAnterior('');
    setNumeroSerieAnterior('');
    setModeloAnterior('');
    setLocalizacaoAnterior('');
    setContadorPaginasFinal('');
    setFotoRelatorioContadorBase64(undefined);
    setEquipamentoRetirado(null);
    setJustificativaEquipRetirado('');
    setCaboEnergiaRetirado(null);
    setJustificativaCaboEnergia('');
    setBandejaSaidaRetirada(null);
    setJustificativaBandejaSaida('');
    setAvariasEncontradas(null);
    setFotoAvariaBase64(undefined);
    setDescricaoAvarias('');
    setSavedOS(null);
    setEmailEnviadoConfirmado(false);
    setEmailStatus({ sending: false });
    setErrors({});
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Envio de e-mail com anexo real do PDF e carimbo de obrigatoriedade
  const handleSendEmailWithAttachment = async (targetOS?: OrdemServico) => {
    const osToShare = targetOS || savedOS;
    if (!osToShare) return;
    setEmailStatus({ sending: true, message: `Preparando os PDFs para enviar a ${MAQUIM_EMAIL_DESTINATARIO}...` });
    try {
      const result = await shareOSWithPDFAttachment(osToShare);
      if (!result.success) {
        setEmailStatus({
          sending: false,
          type: 'info',
          message: result.message || 'Envio cancelado. Toque novamente em "Disparar e-mail" quando quiser.',
        });
        return;
      }
      markEmailAsSent(osToShare);
      if (result.method === 'native-share') {
        setEmailStatus({
          sending: false,
          type: 'success',
          message: `PDF anexado no seu app de e-mail. O destinatário ${MAQUIM_EMAIL_DESTINATARIO} foi COPIADO: no campo "Para", toque e segure e escolha "Colar". Depois toque em Enviar.`,
        });
      } else {
        setEmailStatus({
          sending: false,
          type: 'info',
          message:
            result.message ||
            `Arquivo(s) [${result.filenames.join(', ')}] baixado(s)! E-mail aberto para contratos2@maquim.com.br. Basta anexar os arquivos.`,
        });
      }
    } catch (err: any) {
      setEmailStatus({
        sending: false,
        type: 'error',
        message: 'Não foi possível disparar o compartilhamento automático. Baixe os PDFs e anexe manualmente.',
      });
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-16">
      {/* Barra de Progresso das 5 Etapas Oficiais */}
      <div className="barra-etapas-fixa bg-white rounded-2xl p-4 shadow-xs border border-slate-200 mb-6 sticky top-2 z-20 backdrop-blur-md bg-white/95">
        <div className="flex items-center justify-between text-xs font-semibold mb-2">
          <span
            className={`flex items-center gap-1.5 ${
              currentStep >= 1 ? 'text-[#0D52BD] font-bold' : 'text-slate-400'
            }`}
          >
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] bg-blue-100 text-[#0D52BD]">
              1
            </span>
            <span className="hidden sm:inline">Equipamento & Local</span>
            <span className="sm:hidden">Local</span>
          </span>

          <span
            className={`flex items-center gap-1.5 ${
              currentStep >= 2 ? 'text-[#0D52BD] font-bold' : 'text-slate-400'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                currentStep >= 2 ? 'bg-blue-100 text-[#0D52BD]' : 'bg-slate-100 text-slate-500'
              }`}
            >
              2
            </span>
            <span className="hidden sm:inline">Instalação</span>
            <span className="sm:hidden">Instal</span>
          </span>

          <span
            className={`flex items-center gap-1.5 ${
              currentStep >= 3 ? 'text-[#0D52BD] font-bold' : 'text-slate-400'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                currentStep >= 3 ? 'bg-blue-100 text-[#0D52BD]' : 'bg-slate-100 text-slate-500'
              }`}
            >
              3
            </span>
            <span className="hidden sm:inline">Retirada</span>
            <span className="sm:hidden">Retir</span>
          </span>

          <span
            className={`flex items-center gap-1.5 ${
              currentStep >= 4 ? 'text-[#0D52BD] font-bold' : 'text-slate-400'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                currentStep >= 4 ? 'bg-blue-100 text-[#0D52BD]' : 'bg-slate-100 text-slate-500'
              }`}
            >
              4
            </span>
            <span className="hidden sm:inline">Assinatura</span>
            <span className="sm:hidden">Assin</span>
          </span>

          <span
            className={`flex items-center gap-1.5 ${
              currentStep === 5
                ? emailEnviadoConfirmado
                  ? 'text-emerald-700 font-bold'
                  : 'text-amber-700 font-bold'
                : 'text-slate-400'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                currentStep === 5
                  ? emailEnviadoConfirmado
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-900 ring-2 ring-amber-400 animate-pulse'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              5
            </span>
            <span className="hidden sm:inline">Envio Obrigatório</span>
            <span className="sm:hidden">Envio</span>
          </span>
        </div>

        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ease-out ${
              currentStep === 5 && emailEnviadoConfirmado ? 'bg-emerald-600' : 'bg-[#0D52BD]'
            }`}
            style={{ width: `${((currentStep - 1) / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* ETAPA 1: EQUIPAMENTO & LOCAL */}
      {currentStep === 1 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Card: Novo Equipamento */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">1. Novo Equipamento a Instalar</h2>
                  <p className="text-xs text-slate-500">
                    Selecione pelo patrimônio (série e modelo preenchem automaticamente)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsBarcodeOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200/60 transition-colors"
              >
                <ScanBarcode className="w-4 h-4" />
                Bipar Barcode
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nº do Patrimônio *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    enterKeyHint="next"
                    autoComplete="off"
                    value={patrimonio}
                    onChange={(e) => handleSelectPatrimonio(e.target.value)}
                    placeholder="Ex: 8478 ou 8250"
                    list="patrimonios-list"
                    className={`campo-obrigatorio w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl font-mono text-base focus:outline-hidden focus:ring-2 focus:ring-blue-500 ${
                      errors.patrimonio ? 'border-red-500 bg-red-50/30' : 'border-slate-200'
                    }`}
                  />
                  <datalist id="patrimonios-list">
                    {novosEquipamentos
                      .filter((e) => e.status === 'disponivel')
                      .map((e) => (
                        <option key={e.patrimonio} value={e.patrimonio}>
                          {e.modelo} - Série: {e.numeroSerie} {e.ordemServico ? `(OS: ${e.ordemServico})` : ''} ({e.tipo})
                        </option>
                      ))}
                  </datalist>
                </div>
                {errors.patrimonio && (
                  <p className="text-red-500 text-xs mt-1">{errors.patrimonio}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Modelo do Equipamento
                </label>
                <input
                  type="text"
                  value={modelo}
                  readOnly
                  placeholder="Automático (ex: WFC5890)"
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Número de Série
                </label>
                <input
                  type="text"
                  value={numeroSerie}
                  readOnly
                  placeholder="Automático (ex: XBJZ043714)"
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl font-mono text-sm font-semibold text-slate-700 cursor-not-allowed"
                />
                {errors.numeroSerie && (
                  <p className="text-red-500 text-xs mt-1">{errors.numeroSerie}</p>
                )}
              </div>
            </div>

            {patrimonio && modelo && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Equipamento validado: <strong>{modelo}</strong> (Série: <span className="font-mono">{numeroSerie}</span>).
                  </span>
                </div>
                {osInstalacaoVinculada ? (
                  <span className="self-start sm:self-center font-mono font-bold bg-[#0D52BD] text-white px-2.5 py-0.5 rounded-full shadow-xs">
                    OS: #{osInstalacaoVinculada}
                  </span>
                ) : (
                  <span className="self-start sm:self-center font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full">
                    Sem OS vinculada na planilha
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Card: Local de Instalação (GATi) */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 mb-5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">2. Local de Instalação (Município de Lorena)</h2>
                <p className="text-xs text-slate-500">
                  Insira o código GATi Instalação para auto-completar os dados do endereço
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  GATi Instalação (Código) *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  enterKeyHint="done"
                  autoComplete="off"
                  value={gatiInstalacao}
                  onChange={(e) => handleSelectGATi(e.target.value)}
                  placeholder="Ex: 47513, 29119, 32736"
                  list="gati-list"
                  className={`campo-obrigatorio w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl font-mono text-base focus:outline-hidden focus:ring-2 focus:ring-blue-500 ${
                    errors.gatiInstalacao ? 'border-red-500 bg-red-50/30' : 'border-slate-200'
                  }`}
                />
                <datalist id="gati-list">
                  {Array.from(new Map(locaisDistribuicao.map((l) => [l.gatiInstalacao, l])).values()).map((l) => (
                    <option key={l.id} value={l.gatiInstalacao}>
                      {l.gatiInstalacao} - {l.clienteInstalacao} ({l.secretaria})
                    </option>
                  ))}
                </datalist>
                {errors.gatiInstalacao && (
                  <p className="text-red-500 text-xs mt-1">{errors.gatiInstalacao}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Nº da OS de Instalação</span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                    <Lock className="w-3 h-3 text-slate-400" /> Automático
                  </span>
                </label>
                <div
                  className={`w-full px-3.5 py-2.5 border rounded-xl text-sm font-mono font-bold ${
                    osInstalacaoVinculada
                      ? 'bg-blue-50 border-blue-200 text-blue-900'
                      : 'bg-slate-100 border-slate-200 text-slate-400'
                  }`}
                >
                  {osInstalacaoVinculada ? `#${osInstalacaoVinculada}` : patrimonio ? 'Sem OS vinculada' : 'Vem do patrimônio'}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {osInstalacaoVinculada
                    ? `Vinculada ao patrimônio #${patrimonio}. Não precisa digitar.`
                    : patrimonio
                    ? 'Este patrimônio ainda não tem OS na planilha; o escritório lança depois.'
                    : 'Preenchida sozinha ao escolher o patrimônio.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Secretaria</span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                    <Lock className="w-3 h-3 text-slate-400" /> Bloqueado
                  </span>
                </label>
                <input
                  type="text"
                  value={secretaria}
                  readOnly
                  tabIndex={-1}
                  placeholder="Preenchido via GATi"
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 cursor-not-allowed select-none"
                />
              </div>
            </div>

            {/* LOCALIZAÇÕES deste GATi: onde cada equipamento deve ser instalado */}
            {locaisDoGati.length > 0 && (
              <div
                data-erro={errors.localizacao ? 'true' : undefined}
                className={`mb-5 rounded-2xl border-2 p-3 ${
                  errors.localizacao
                    ? 'border-red-500 bg-red-50/40'
                    : locaisDoGati.length > 1 && !selectedLocalId
                    ? 'border-amber-400 bg-amber-50/60'
                    : 'border-indigo-300 bg-indigo-50/50'
                }`}
              >
                <div className="flex items-start gap-2 mb-2.5">
                  <MapPin className="w-5 h-5 text-indigo-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-black text-indigo-950 uppercase tracking-wide">
                      {locaisDoGati.length > 1
                        ? `Localizações neste local (${locaisDoGati.length})`
                        : 'Localização de instalação'}
                    </p>
                    <p className="text-[11px] text-indigo-900/80">
                      {locaisDoGati.length > 1
                        ? 'Toque na localização onde este equipamento está sendo instalado.'
                        : 'Local onde o equipamento deve ser instalado.'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {locaisDoGati.map((loc) => {
                    const ativo = loc.id === selectedLocalId;
                    const instalado = loc.status === 'instalado';
                    const antigo = anteriorDaLocalizacao(loc.setor);
                    const tipoDiferente =
                      equipamentoNovoSelecionado && loc.tipoEquipamento && equipamentoNovoSelecionado.tipo !== loc.tipoEquipamento;
                    return (
                      <button
                        key={loc.id}
                        type="button"
                        disabled={instalado}
                        onClick={() => selectLocal(loc)}
                        className={`w-full text-left p-3 rounded-xl border-2 flex items-start gap-3 transition-all ${
                          ativo
                            ? 'border-indigo-600 bg-white ring-4 ring-indigo-500/20 shadow-sm'
                            : instalado
                            ? 'border-emerald-200 bg-emerald-50/60 opacity-70'
                            : 'border-slate-200 bg-white hover:border-indigo-300'
                        }`}
                      >
                        <span
                          className={`mt-0.5 w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                            ativo ? 'border-indigo-600 bg-indigo-600' : instalado ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                          }`}
                        >
                          {(ativo || instalado) && <Check className="w-3 h-3 text-white" />}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-base font-black text-slate-900 uppercase leading-tight">
                            {loc.setor && loc.setor.trim() ? loc.setor : loc.clienteInstalacao}
                          </span>
                          <span className="flex flex-wrap gap-1.5 mt-1 text-[11px]">
                            <span
                              className={`px-1.5 py-0.5 rounded font-bold ${
                                loc.tipoEquipamento === 'Color' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {loc.modeloPrevisto} ({loc.tipoEquipamento})
                            </span>
                            {instalado ? (
                              <span className="px-1.5 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800">
                                Já instalado{loc.patrimonioInstalado ? ` #${loc.patrimonioInstalado}` : ''}
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded font-bold bg-amber-100 text-amber-800">Pendente</span>
                            )}
                            {antigo && (
                              <span className="px-1.5 py-0.5 rounded font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                                Retirar: #{antigo.patrimonio}
                                {antigo.conectividadeIp ? ` · IP ${antigo.conectividadeIp}` : ''}
                              </span>
                            )}
                          </span>
                          {ativo && tipoDiferente && (
                            <span className="block mt-1 text-[11px] font-bold text-rose-700">
                              Atenção: previsto {loc.tipoEquipamento}, mas o patrimônio #{patrimonio} é {equipamentoNovoSelecionado?.tipo}.
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {errors.localizacao && <p className="text-red-600 text-xs mt-2 font-bold">{errors.localizacao}</p>}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Cliente / Local de Instalação *</span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                    <Lock className="w-3 h-3 text-slate-400" /> Bloqueado
                  </span>
                </label>
                <input
                  type="text"
                  value={clienteInstalacao}
                  readOnly
                  tabIndex={-1}
                  placeholder="Preenchido automaticamente ao selecionar o GATi"
                  className={`w-full px-3.5 py-2.5 bg-slate-100 border rounded-xl text-sm font-semibold text-slate-700 cursor-not-allowed select-none ${
                    errors.clienteInstalacao ? 'border-red-500 bg-red-50/30' : 'border-slate-200'
                  }`}
                />
                {errors.clienteInstalacao && (
                  <p className="text-red-500 text-xs mt-1">{errors.clienteInstalacao}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Endereço Completo do Local</span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                      <Lock className="w-3 h-3 text-slate-400" /> Bloqueado
                    </span>
                  </label>
                  <input
                    type="text"
                    value={endereco}
                    readOnly
                    tabIndex={-1}
                    placeholder="Preenchido via GATi"
                    className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 cursor-not-allowed select-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Bairro</span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                      <Lock className="w-3 h-3 text-slate-400" /> Bloqueado
                    </span>
                  </label>
                  <input
                    type="text"
                    value={bairro}
                    readOnly
                    tabIndex={-1}
                    placeholder="Preenchido via GATi"
                    className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 cursor-not-allowed select-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Localização / Setor (ajuste se necessário)
                  </label>
                  <input
                    type="text"
                    enterKeyHint="done"
                    value={setor}
                    onChange={(e) => setSetor(e.target.value)}
                    placeholder="Ex: Gabinete, Recepção, Secretaria"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base text-slate-800"
                  />
                </div>

                {responsavelLocalCadastrado && (
                  <div>
                    <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Contato cadastrado na planilha
                    </span>
                    <p className="px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-700">
                      {responsavelLocalCadastrado}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Só para referência. Quem acompanhar o serviço preenche nome, CPF e assina na etapa 4.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm transition-all"
            >
              Avançar para Instalação Técnica
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 2: DETALHES TÉCNICOS DA INSTALAÇÃO */}
      {currentStep === 2 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 mb-5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Network className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">2. Configuração e Conectividade</h2>
                <p className="text-xs text-slate-500">
                  Data, tipo de conexão, endereço IP, digitalização e softwares
                </p>
              </div>
            </div>

            {/* Data da Instalação */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Data da Instalação *
              </label>
              <div className="relative max-w-xs">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="date"
                  value={dataInstalacao}
                  onChange={(e) => setDataInstalacao(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Instalado via? */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Instalado via? *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setTipoConexao('Via Rede')}
                  className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all ${
                    tipoConexao === 'Via Rede'
                      ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      tipoConexao === 'Via Rede' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Network className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Via Rede</p>
                    <p className="text-[11px] text-slate-500">Cabo Ethernet / RJ45</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTipoConexao('Via WI-FI')}
                  className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all ${
                    tipoConexao === 'Via WI-FI'
                      ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      tipoConexao === 'Via WI-FI' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Wifi className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Via WI-FI</p>
                    <p className="text-[11px] text-slate-500">Rede sem fio local</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTipoConexao('Via USB para IMPRESSÃO')}
                  className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all ${
                    tipoConexao === 'Via USB para IMPRESSÃO'
                      ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      tipoConexao === 'Via USB para IMPRESSÃO'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Usb className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Via USB</p>
                    <p className="text-[11px] text-slate-500">Para impressão local</p>
                  </div>
                </button>
              </div>
              {errors.tipoConexao && (
                <p className="text-red-500 text-xs mt-2 font-medium">{errors.tipoConexao}</p>
              )}
            </div>

            {/* Condicionais para REDE ou WI-FI */}
            {(tipoConexao === 'Via Rede' || tipoConexao === 'Via WI-FI') && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Endereço IP do Equipamento *
                  </label>
                  <IPKeypadInput
                    value={enderecoIP}
                    onChange={setEnderecoIP}
                    error={errors.enderecoIP}
                    suggestedIP={ipSugerido}
                    prefixSuggestions={prefixosIP}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <p className="text-xs font-bold text-slate-800 mb-2">
                      Digitalização via SMB (pasta PC)? *
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setScanSMB(true)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                          scanSMB === true
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        SIM
                      </button>
                      <button
                        type="button"
                        onClick={() => setScanSMB(false)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                          scanSMB === false
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        NÃO
                      </button>
                    </div>
                    {errors.scanSMB && (
                      <p className="text-red-500 text-[11px] mt-1.5 font-medium">{errors.scanSMB}</p>
                    )}
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <p className="text-xs font-bold text-slate-800 mb-2">
                      Abby Fine Reader instalado (PDF pesquisável/PDF-A)? *
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setAbbyFineReader(true)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                          abbyFineReader === true
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        SIM
                      </button>
                      <button
                        type="button"
                        onClick={() => setAbbyFineReader(false)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                          abbyFineReader === false
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        NÃO
                      </button>
                    </div>
                    {errors.abbyFineReader && (
                      <p className="text-red-500 text-[11px] mt-1.5 font-medium">{errors.abbyFineReader}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Condicionais para USB */}
            {tipoConexao === 'Via USB para IMPRESSÃO' && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 mb-6">
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-800 mb-2">
                    Conectado via WI-FI para monitoramento pelo ERS (via ES)? *
                  </p>
                  <div className="flex gap-2 max-w-xs mb-2">
                    <button
                      type="button"
                      onClick={() => setConectadoWifiERS(true)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                        conectadoWifiERS === true
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      SIM
                    </button>
                    <button
                      type="button"
                      onClick={() => setConectadoWifiERS(false)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                        conectadoWifiERS === false
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      NÃO
                    </button>
                  </div>
                  {errors.conectadoWifiERS && (
                    <p className="text-red-500 text-[11px] mt-1.5 font-medium">{errors.conectadoWifiERS}</p>
                  )}

                  {conectadoWifiERS === false && (
                    <div className="mt-2 animate-in fade-in">
                      <label className="block text-xs font-semibold text-rose-700 mb-1">
                        Por que não está conectado ao Wi-Fi para o ERS? Justifique por texto *
                      </label>
                      <textarea
                        rows={2}
                        value={justificativaWifiERS}
                        onChange={(e) => setJustificativaWifiERS(e.target.value)}
                        placeholder="Ex: Localidade sem sinal de Wi-Fi disponível ou rede protegida sem credenciais providenciadas..."
                        className="w-full p-2.5 bg-rose-50/40 border border-rose-300 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                      />
                      {errors.justificativaWifiERS && (
                        <p className="text-red-500 text-xs mt-1">{errors.justificativaWifiERS}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <p className="text-xs font-bold text-slate-800 mb-2">
                      Digitalização via Epson Scan 2 (pasta PC)? *
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setScanEpsonScan2(true)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                          scanEpsonScan2 === true
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        SIM
                      </button>
                      <button
                        type="button"
                        onClick={() => setScanEpsonScan2(false)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                          scanEpsonScan2 === false
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        NÃO
                      </button>
                    </div>
                    {errors.scanEpsonScan2 && (
                      <p className="text-red-500 text-[11px] mt-1.5 font-medium">{errors.scanEpsonScan2}</p>
                    )}
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <p className="text-xs font-bold text-slate-800 mb-2">
                      OCR componente instalado (PDF pesquisável e PDF-A)? *
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setOcrComponente(true)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                          ocrComponente === true
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        SIM
                      </button>
                      <button
                        type="button"
                        onClick={() => setOcrComponente(false)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                          ocrComponente === false
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        NÃO
                      </button>
                    </div>
                    {errors.ocrComponente && (
                      <p className="text-red-500 text-[11px] mt-1.5 font-medium">{errors.ocrComponente}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Auditoria ERS Universal */}
            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-200/70">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                    Auditoria no Sistema ERS
                  </h3>
                </div>
                <a
                  href="https://www.remote-services.epson.com/devices/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 underline"
                  title="Abrir portal de dispositivos ERS Epson"
                >
                  Consultar no ERS
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-xs font-bold text-slate-800 mb-2">
                Equipamento incluído no ERS? Conferência realizada? *
              </p>
              <div className="flex gap-2 max-w-xs mb-2">
                <button
                  type="button"
                  onClick={() => setConferenciaERS(true)}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                    conferenciaERS === true
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  SIM
                </button>
                <button
                  type="button"
                  onClick={() => setConferenciaERS(false)}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                    conferenciaERS === false
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  NÃO
                </button>
              </div>
              {errors.conferenciaERS && (
                <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.conferenciaERS}</p>
              )}

              {conferenciaERS === false && (
                <div className="mt-2 animate-in fade-in">
                  <label className="block text-xs font-semibold text-rose-700 mb-1">
                    Se não, por que? Justifique por extenso *
                  </label>
                  <textarea
                    rows={2}
                    value={justificativaERS}
                    onChange={(e) => setJustificativaERS(e.target.value)}
                    placeholder="Descreva detalhadamente o motivo da não conferência no ERS..."
                    className="w-full p-2.5 bg-white border border-rose-300 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  />
                  {errors.justificativaERS && (
                    <p className="text-red-500 text-xs mt-1">{errors.justificativaERS}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={handlePrev}
              className="inline-flex items-center gap-2 px-5 py-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm transition-all"
            >
              Avançar para Retirada de Equipamento
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 3: RETIRADA DO CONTRATO ANTERIOR */}
      {currentStep === 3 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 mb-5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  3. Retirada de Equipamento do Contrato Anterior
                </h2>
                <p className="text-xs text-slate-500">
                  Conferência do equipamento antigo a ser substituído e devolvido à Maquim
                </p>
              </div>
            </div>

            {/* Pergunta chave: Substituiu anterior? */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 mb-6">
              <p className="text-sm font-bold text-slate-800 mb-3">
                Este equipamento substituiu equipamento de nosso contrato anterior? *
              </p>
              <div className="flex gap-3 max-w-sm">
                <button
                  type="button"
                  onClick={() => setSubstituiAnterior(true)}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-xl border transition-all ${
                    substituiAnterior === true
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  SIM (Houve Substituição)
                </button>
                <button
                  type="button"
                  onClick={() => setSubstituiAnterior(false)}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-xl border transition-all ${
                    substituiAnterior === false
                      ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  NÃO (Instalação Nova)
                </button>
              </div>
              {errors.substituiAnterior && (
                <p className="text-red-500 text-xs mt-2 font-medium">{errors.substituiAnterior}</p>
              )}
            </div>

            {/* Se SIM: Perguntas e busca do equipamento anterior */}
            {substituiAnterior && (
              <div className="space-y-5 animate-in fade-in">
                {/* Bloco 1: Nº da OS de Retirada & Busca do Patrimônio Anterior */}
                <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-300 space-y-3.5 shadow-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                    <span className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                      Identificação da Retirada (Contrato Anterior)
                    </span>
                    <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                      Banco de Retirada Sincronizado
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* Nº da OS de Retirada: vem do vínculo do patrimônio retirado */}
                    <div>
                      <span className="block text-xs font-semibold text-amber-900 uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span>Nº da OS de Retirada</span>
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 font-medium normal-case">
                          <Lock className="w-3 h-3" /> Automático
                        </span>
                      </span>
                      <div
                        className={`w-full px-3.5 py-2.5 border rounded-xl font-mono text-sm font-bold ${
                          osRetiradaVinculada ? 'bg-white border-amber-300 text-amber-950' : 'bg-slate-100 border-slate-200 text-slate-400'
                        }`}
                      >
                        {osRetiradaVinculada ? `#${osRetiradaVinculada}` : patrimonioAnterior ? 'Sem OS vinculada' : 'Vem do patrimônio retirado'}
                      </div>
                      <p className="text-[10px] text-amber-800 mt-1">
                        {osRetiradaVinculada
                          ? 'Vinculada ao patrimônio retirado. Não precisa digitar.'
                          : patrimonioAnterior
                          ? 'Este patrimônio ainda não tem OS de retirada na planilha; o escritório lança depois.'
                          : 'Preenchida sozinha ao escolher o patrimônio retirado.'}
                      </p>
                    </div>

                    {/* Busca do Patrimônio Anterior */}
                    <div>
                      <label className="block text-xs font-semibold text-amber-900 uppercase tracking-wider mb-1">
                        Patrimônio Anterior a ser Retirado *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="numeric"
                          enterKeyHint="done"
                          autoComplete="off"
                          value={patrimonioAnterior}
                          onChange={(e) => handleSelectPatrimonioAnterior(e.target.value)}
                          placeholder="Buscar patrimônio anterior (ex: 4423, 4583, 7424...)"
                          list="patrimonios-anteriores-list"
                          className={`campo-obrigatorio w-full px-3.5 py-2.5 bg-white border rounded-xl font-mono text-base font-bold focus:outline-hidden focus:ring-2 focus:ring-amber-500 ${
                            errors.patrimonioAnterior ? 'border-red-500 bg-red-50/20' : 'border-amber-300'
                          }`}
                        />
                        <datalist id="patrimonios-anteriores-list">
                          {equipamentosAnteriores.map((ret, idx) => (
                            <option key={`${ret.patrimonio}-${idx}`} value={ret.patrimonio}>
                              {ret.patrimonio} - {ret.modelo} ({ret.clienteInstalacao} - {ret.localizacao})
                            </option>
                          ))}
                        </datalist>
                      </div>
                      {errors.patrimonioAnterior && (
                        <p className="text-red-500 text-xs mt-1">{errors.patrimonioAnterior}</p>
                      )}
                    </div>
                  </div>

                  {/* Equipamentos do contrato anterior neste local: toque para escolher */}
                  {anterioresDoGati.length > 0 && (
                    <div>
                      <p className="text-[11px] font-bold text-amber-950 uppercase tracking-wider mb-1.5">
                        Equipamentos a retirar neste local ({anterioresDoGati.length})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {[...anterioresDoGati]
                          .sort((a, b) => {
                            const alvo = anteriorDaLocalizacao(setor)?.patrimonio;
                            return (b.patrimonio === alvo ? 1 : 0) - (a.patrimonio === alvo ? 1 : 0);
                          })
                          .map((r) => {
                            const ativo = r.patrimonio === patrimonioAnterior;
                            const sugerido = r.patrimonio === anteriorDaLocalizacao(setor)?.patrimonio;
                            const retirado = r.status === 'retirado';
                            return (
                              <button
                                key={r.patrimonio}
                                type="button"
                                onClick={() => handleSelectPatrimonioAnterior(r.patrimonio)}
                                className={`px-2.5 py-1.5 rounded-lg border text-left text-xs ${
                                  ativo
                                    ? 'bg-amber-600 border-amber-600 text-white'
                                    : sugerido
                                    ? 'bg-white border-amber-500 ring-2 ring-amber-400/40 text-amber-950'
                                    : 'bg-white border-amber-200 text-slate-700'
                                } ${retirado && !ativo ? 'opacity-50' : ''}`}
                              >
                                <span className="font-mono font-bold">#{r.patrimonio}</span>{' '}
                                <span className="font-semibold uppercase">{r.localizacao || '—'}</span>
                                {sugerido && !ativo && <span className="ml-1 text-[10px] font-bold text-amber-700">(esta localização)</span>}
                                {retirado && <span className="ml-1 text-[10px]">(já retirado)</span>}
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Dados retornados automaticamente */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 uppercase">
                        Nº de Série Anterior (Planilha):
                      </span>
                      <input
                        type="text"
                        value={numeroSerieAnterior}
                        readOnly
                        placeholder="Retorno automático (ex: X3B7007461)"
                        className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 uppercase">
                        Modelo Anterior:
                      </span>
                      <input
                        type="text"
                        value={modeloAnterior}
                        readOnly
                        placeholder="Retorno automático (ex: WFC5790 / WFM5799)"
                        className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                      />
                    </div>
                  </div>
                </div>

                {/* Bloco 2: Seletor Mono/Color e Contadores de Páginas no Ato da Retirada */}
                <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-300 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-amber-200">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-xs">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                          Contador(es) de Páginas no Ato da Retirada *
                        </h4>
                        <p className="text-[11px] text-amber-800">
                          {tipoEquipamentoAnterior === 'Color'
                            ? 'Equipamento colorido: informe o contador Mono (P&B) e o contador Color separadamente'
                            : 'Equipamento monocromático: informe o contador total de páginas'}
                        </p>
                      </div>
                    </div>

                    {/* Seletor Manual / Automático Mono vs Color */}
                    <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-amber-300">
                      <button
                        type="button"
                        onClick={() => setTipoEquipamentoAnterior('Mono')}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                          tipoEquipamentoAnterior === 'Mono'
                            ? 'bg-slate-800 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Monocromático (Mono)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTipoEquipamentoAnterior('Color')}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                          tipoEquipamentoAnterior === 'Color'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Colorido (Color)
                      </button>
                    </div>
                  </div>

                  {/* Campos de Contadores conforme o Tipo */}
                  {tipoEquipamentoAnterior === 'Color' ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {/* Contador Mono */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider mb-1">
                            Contador Total Mono (P&B) *
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            value={contadorMono}
                            onChange={(e) => setContadorMono(e.target.value)}
                            placeholder="Ex: 48.350"
                            className={`w-full px-3.5 py-2.5 bg-white border rounded-xl font-mono text-sm font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500 ${
                              errors.contadorMono ? 'border-red-500 bg-red-50/20' : 'border-amber-300'
                            }`}
                          />
                          {errors.contadorMono && (
                            <p className="text-red-500 text-xs mt-1">{errors.contadorMono}</p>
                          )}
                        </div>

                        {/* Contador Color */}
                        <div>
                          <label className="block text-xs font-semibold text-purple-900 uppercase tracking-wider mb-1">
                            Contador Total Color *
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            value={contadorColor}
                            onChange={(e) => setContadorColor(e.target.value)}
                            placeholder="Ex: 6.470"
                            className={`w-full px-3.5 py-2.5 bg-white border rounded-xl font-mono text-sm font-bold text-purple-950 focus:outline-hidden focus:ring-2 focus:ring-purple-500 ${
                              errors.contadorColor ? 'border-red-500 bg-red-50/20' : 'border-amber-300'
                            }`}
                          />
                          {errors.contadorColor && (
                            <p className="text-red-500 text-xs mt-1">{errors.contadorColor}</p>
                          )}
                        </div>
                      </div>

                      {/* Resumo e Cálculo do Total Geral */}
                      {(contadorMono || contadorColor) && (
                        <div className="p-3 bg-white rounded-xl border border-amber-200 flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-600 font-sans font-semibold">Total Geral Calculado:</span>
                          <span className="font-bold text-amber-950">
                            {(
                              (parseInt(contadorMono.replace(/\D/g, ''), 10) || 0) +
                              (parseInt(contadorColor.replace(/\D/g, ''), 10) || 0)
                            ).toLocaleString('pt-BR')}{' '}
                            páginas (Mono: {contadorMono || '0'} | Color: {contadorColor || '0'})
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-amber-950 uppercase tracking-wider mb-1.5">
                        Contador de Páginas Final (Mono) *
                      </label>
                      <input
                        type="text"
                            inputMode="numeric"
                            autoComplete="off"
                        value={contadorMono || contadorPaginasFinal}
                        onChange={(e) => {
                          setContadorMono(e.target.value);
                          setContadorPaginasFinal(e.target.value);
                        }}
                        placeholder="Ex: 54.820 páginas"
                        className={`w-full px-3.5 py-2.5 bg-white border rounded-xl font-mono text-sm font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500 ${
                          errors.contadorMono || errors.contadorPaginasFinal
                            ? 'border-red-500 bg-red-50/30'
                            : 'border-amber-300'
                        }`}
                      />
                      {(errors.contadorMono || errors.contadorPaginasFinal) && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors.contadorMono || errors.contadorPaginasFinal}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Foto do Relatório Impresso */}
                  <div className="pt-2 border-t border-amber-200">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-amber-950 uppercase tracking-wider">
                        Foto do Relatório Impresso do Equipamento Retirado
                      </label>
                      {fotoRelatorioContadorBase64 && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          ✓ Anexado à OS
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setCameraMode('relatorio');
                        setIsCameraOpen(true);
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                      {fotoRelatorioContadorBase64 ? 'Alterar Foto do Relatório' : 'Tirar Foto do Relatório Impresso'}
                    </button>

                    {fotoRelatorioContadorBase64 ? (
                      <div className="relative mt-2 rounded-xl overflow-hidden border border-amber-300 bg-slate-900 aspect-16/9 flex items-center justify-center shadow-inner">
                        <img
                          src={fotoRelatorioContadorBase64}
                          alt="Foto do relatório impresso de contadores"
                          className="max-h-full max-w-full object-contain"
                        />
                        <div className="absolute top-2 right-2 flex gap-1">
                          <button
                            type="button"
                            onClick={() => setFotoRelatorioContadorBase64(undefined)}
                            className="px-2 py-1 bg-red-600/90 hover:bg-red-700 text-white text-[10px] font-bold rounded-md shadow-xs"
                          >
                            Remover
                          </button>
                        </div>
                        <span className="absolute bottom-1 left-2 px-2 py-0.5 bg-black/75 text-amber-300 text-[10px] font-mono rounded">
                          Será inserido em alta definição na Página 2 dos PDFs gerados
                        </span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-amber-800/80 mt-1">
                        Imprima a folha de contadores na impressora anterior antes de embalá-la e fotografe o papel para comprovação contratual.
                      </p>
                    )}
                  </div>
                </div>

                {/* Perguntas da Retirada com Justificativas */}
                <div className="space-y-4 pt-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Checklist de Retirada do Equipamento
                  </h3>

                  {/* 1. Equipamento retirado? */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-xs font-bold text-slate-800 mb-2">
                      1. Equipamento retirado? *
                    </p>
                    <div className="flex gap-2 max-w-xs mb-2">
                      <button
                        type="button"
                        onClick={() => setEquipamentoRetirado(true)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                          equipamentoRetirado === true
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        SIM
                      </button>
                      <button
                        type="button"
                        onClick={() => setEquipamentoRetirado(false)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                          equipamentoRetirado === false
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        NÃO
                      </button>
                    </div>
                    {errors.equipamentoRetirado && (
                      <p className="text-red-500 text-[11px] mt-1 font-medium">{errors.equipamentoRetirado}</p>
                    )}
                    {equipamentoRetirado === false && (
                      <div className="mt-2">
                        <label className="block text-xs font-semibold text-rose-700 mb-1">
                          Se não, justifique por extenso *
                        </label>
                        <input
                          type="text"
                          value={justificativaEquipRetirado}
                          onChange={(e) => setJustificativaEquipRetirado(e.target.value)}
                          placeholder="Ex: Sala trancada no momento da visita, equipamento não localizado pelo responsável..."
                          className="w-full p-2 bg-white border border-rose-300 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                        />
                        {errors.justificativaEquipRetirado && (
                          <p className="text-red-500 text-xs mt-1">{errors.justificativaEquipRetirado}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 2. Cabo de energia retirado? */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-xs font-bold text-slate-800 mb-2">
                      2. Cabo de energia retirado? *
                    </p>
                    <div className="flex gap-2 max-w-xs mb-2">
                      <button
                        type="button"
                        onClick={() => setCaboEnergiaRetirado(true)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                          caboEnergiaRetirado === true
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        SIM
                      </button>
                      <button
                        type="button"
                        onClick={() => setCaboEnergiaRetirado(false)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                          caboEnergiaRetirado === false
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        NÃO
                      </button>
                    </div>
                    {errors.caboEnergiaRetirado && (
                      <p className="text-red-500 text-[11px] mt-1 font-medium">{errors.caboEnergiaRetirado}</p>
                    )}
                    {caboEnergiaRetirado === false && (
                      <div className="mt-2">
                        <label className="block text-xs font-semibold text-rose-700 mb-1">
                          Se não, justifique por extenso *
                        </label>
                        <input
                          type="text"
                          value={justificativaCaboEnergia}
                          onChange={(e) => setJustificativaCaboEnergia(e.target.value)}
                          placeholder="Ex: Cabo embutido em canaleta de difícil acesso, cliente solicitou manter..."
                          className="w-full p-2 bg-white border border-rose-300 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                        />
                        {errors.justificativaCaboEnergia && (
                          <p className="text-red-500 text-xs mt-1">{errors.justificativaCaboEnergia}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 3. Bandeja de saída de papeis retirada? */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-xs font-bold text-slate-800 mb-2">
                      3. Bandeja de saída de papéis retirada? *
                    </p>
                    <div className="flex gap-2 max-w-xs mb-2">
                      <button
                        type="button"
                        onClick={() => setBandejaSaidaRetirada(true)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                          bandejaSaidaRetirada === true
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        SIM
                      </button>
                      <button
                        type="button"
                        onClick={() => setBandejaSaidaRetirada(false)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                          bandejaSaidaRetirada === false
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        NÃO
                      </button>
                    </div>
                    {errors.bandejaSaidaRetirada && (
                      <p className="text-red-500 text-[11px] mt-1 font-medium">{errors.bandejaSaidaRetirada}</p>
                    )}
                    {bandejaSaidaRetirada === false && (
                      <div className="mt-2">
                        <label className="block text-xs font-semibold text-rose-700 mb-1">
                          Se não, justifique por extenso *
                        </label>
                        <input
                          type="text"
                          value={justificativaBandejaSaida}
                          onChange={(e) => setJustificativaBandejaSaida(e.target.value)}
                          placeholder="Ex: Peça ausente no local, quebrada anteriormente..."
                          className="w-full p-2 bg-white border border-rose-300 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                        />
                        {errors.justificativaBandejaSaida && (
                          <p className="text-red-500 text-xs mt-1">{errors.justificativaBandejaSaida}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 4. Avaria(s) encontrada(s)? */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-xs font-bold text-slate-800 mb-2">
                      4. Avaria(s) encontrada(s) no equipamento? *
                    </p>
                    <div className="flex gap-2 max-w-xs mb-2">
                      <button
                        type="button"
                        onClick={() => setAvariasEncontradas(true)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                          avariasEncontradas === true
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        SIM (Possui Avarias)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAvariasEncontradas(false)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                          avariasEncontradas === false
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        NÃO (Perfeitas Condições)
                      </button>
                    </div>
                    {errors.avariasEncontradas && (
                      <p className="text-red-500 text-[11px] mt-1 font-medium">{errors.avariasEncontradas}</p>
                    )}

                    {avariasEncontradas && (
                      <div className="mt-3 p-3 bg-white rounded-xl border border-rose-200 space-y-3 animate-in fade-in">
                        <div>
                          <label className="block text-xs font-semibold text-rose-800 mb-1">
                            Descreva qual avaria encontrada: *
                          </label>
                          <textarea
                            rows={2}
                            value={descricaoAvarias}
                            onChange={(e) => setDescricaoAvarias(e.target.value)}
                            placeholder="Ex: Tampa quebrada, visor LCD trincado, marcas de queda lateral, tracionador danificado..."
                            className="w-full p-2.5 bg-rose-50/30 border border-rose-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                          />
                          {errors.descricaoAvarias && (
                            <p className="text-red-500 text-xs mt-1">{errors.descricaoAvarias}</p>
                          )}
                        </div>

                        {/* Foto da Avaria */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-slate-700">
                              Registro Fotográfico da Avaria:
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setCameraMode('avaria');
                                setIsCameraOpen(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-semibold rounded-lg transition-colors"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              {fotoAvariaBase64 ? 'Alterar Foto' : 'Tirar Foto Agora'}
                            </button>
                          </div>

                          {fotoAvariaBase64 ? (
                            <div className="relative rounded-xl overflow-hidden border border-slate-200 max-w-xs aspect-4/3 bg-slate-900">
                              <img
                                src={fotoAvariaBase64}
                                alt="Foto da avaria"
                                className="w-full h-full object-contain"
                              />
                              <span className="absolute bottom-1 right-1 px-2 py-0.5 bg-black/70 text-white text-[10px] rounded-md backdrop-blur-xs">
                                Foto anexada à OS
                              </span>
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-500 italic">
                              Recomendado registrar por foto para comprovação e inclusão no PDF da Ordem de Serviço.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={handlePrev}
              className="inline-flex items-center gap-2 px-5 py-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm transition-all"
            >
              Avançar para Assinatura do Cliente
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 4: VALIDAÇÃO DO CLIENTE & ASSINATURA */}
      {currentStep === 4 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 mb-5">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  4. Validação do Responsável do Local (Lorena)
                </h2>
                <p className="text-xs text-slate-500">
                  Confirmação do cliente de que a instalação e/ou retirada foram executadas com sucesso
                </p>
              </div>
            </div>

            {/* Resumo do Atendimento */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 mb-6 text-xs text-slate-700 space-y-1">
              <p className="font-bold text-slate-900 text-sm mb-1.5">Resumo da Ordem de Serviço:</p>
              <p>
                <strong>Local:</strong> {clienteInstalacao} (GATi: {gatiInstalacao}) - {bairro}
              </p>
              {setor && (
                <p>
                  <strong>Localização:</strong> <span className="font-bold uppercase text-indigo-900">{setor}</span>
                </p>
              )}
              <p>
                <strong>Equipamento Instalado:</strong> {modelo} | Patrimônio: #{patrimonio} | Série:{' '}
                {numeroSerie}
              </p>
              <p>
                <strong>Conexão:</strong> {tipoConexao}{' '}
                {enderecoIP ? `(IP: ${enderecoIP})` : ''}
              </p>
              {substituiAnterior && (
                <p>
                  <strong>Equipamento Retirado:</strong> #{patrimonioAnterior} ({modeloAnterior}) |
                  Série: {numeroSerieAnterior}
                </p>
              )}
            </div>

            {/* Usuários Treinados no Local (Instruções de Uso e Pré-Manutenção) */}
            <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl mb-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Instruções de Uso & Pré-Manutenção aos Usuários
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Informe o nome e um sobrenome de cada usuário do local que recebeu as orientações
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  {usuariosTreinados.length} {usuariosTreinados.length === 1 ? 'usuário registrado' : 'usuários registrados'}
                </span>
              </div>

              {/* Input para adicionar nome e sobrenome */}
              <div className="flex gap-2">
                <input
                  type="text"
                  autoCapitalize="words"
                  enterKeyHint="done"
                  data-enter-action="custom"
                  value={novoUsuarioInput}
                  onChange={(e) => setNovoUsuarioInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddUsuario();
                    }
                  }}
                  placeholder="Nome e Sobrenome do usuário treinado (Ex: Maria Silva)"
                  className="flex-1 min-w-0 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddUsuario}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Adicionar</span>
                  <span className="sm:hidden">Add</span>
                </button>
              </div>

              {/* Tags dos usuários cadastrados */}
              {usuariosTreinados.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {usuariosTreinados.map((nome, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-blue-200 text-blue-900 rounded-lg text-xs font-semibold shadow-2xs"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                      {nome}
                      <button
                        type="button"
                        onClick={() => handleRemoveUsuario(index)}
                        className="text-slate-400 hover:text-red-600 p-0.5 rounded transition-colors"
                        title="Remover usuário"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">
                  Nenhum usuário adicionado ainda. Digite o nome e sobrenome e clique em Adicionar.
                </p>
              )}
            </div>

            {/* Responsável que acompanhou e validou o serviço (sempre em branco para preenchimento no local) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div>
                <label htmlFor="responsavelNome" className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1.5 leading-snug">
                  NOME E SOBRENOME DO RESPONSÁVEL QUE ACOMPANHOU E VALIDOU O SERVIÇO *
                </label>
                <input
                  id="responsavelNome"
                  type="text"
                  autoComplete="off"
                  autoCapitalize="words"
                  enterKeyHint="next"
                  value={responsavelNome}
                  onChange={(e) => setResponsavelNome(e.target.value)}
                  placeholder="Nome e sobrenome"
                  className={`campo-obrigatorio w-full px-3.5 py-3 bg-slate-50 border rounded-xl text-base font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500 ${
                    errors.responsavelNome ? 'border-red-500 bg-red-50/30' : 'border-slate-200'
                  }`}
                />
                {errors.responsavelNome && (
                  <p className="text-red-500 text-xs mt-1">{errors.responsavelNome}</p>
                )}
              </div>

              <div>
                <label htmlFor="responsavelCPF" className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1.5 leading-snug">
                  CPF DO RESPONSÁVEL QUE ACOMPANHOU E VALIDOU O SERVIÇO *
                </label>
                <input
                  id="responsavelCPF"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  enterKeyHint="done"
                  value={responsavelCPF}
                  onChange={(e) => setResponsavelCPF(formatCPF(e.target.value))}
                  placeholder="Só os números: 000.000.000-00"
                  maxLength={14}
                  className={`campo-obrigatorio w-full px-3.5 py-3 bg-slate-50 border rounded-xl font-mono text-lg tracking-wider focus:outline-hidden focus:ring-2 focus:ring-blue-500 ${
                    errors.responsavelCPF ? 'border-red-500 bg-red-50/30' : 'border-slate-200'
                  }`}
                />
                {errors.responsavelCPF ? (
                  <p className="text-red-500 text-xs mt-1">{errors.responsavelCPF}</p>
                ) : (
                  <p className="text-[11px] text-slate-500 mt-1">Digite só os números; os pontos e o traço entram sozinhos.</p>
                )}
              </div>
            </div>

            {/* Assinatura Digital Touchscreen */}
            <div className="mb-6">
              <SignaturePad
                label="Assinatura do responsável que acompanhou e validou o serviço"
                initialSignature={assinaturaClienteBase64}
                onSave={(sig) => setAssinaturaClienteBase64(sig)}
                onClear={() => setAssinaturaClienteBase64(undefined)}
              />
            </div>

            {/* Técnico Responsável */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pt-4 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Técnico Responsável Maquim *
                </label>
                <input
                  type="text"
                  value={tecnicoNome}
                  onChange={(e) => setTecnicoNome(e.target.value)}
                  placeholder="Digite seu nome e sobrenome"
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 ${
                    errors.tecnicoNome ? 'border-red-500 bg-red-50/30' : 'border-slate-200'
                  }`}
                />
                {errors.tecnicoNome && (
                  <p className="text-red-500 text-xs mt-1">{errors.tecnicoNome}</p>
                )}

                {/* Legenda com link do ERS */}
                <div className="mt-2 p-2.5 bg-blue-50 border border-blue-200/80 rounded-xl text-[11px] text-blue-950 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-blue-900">
                    <ExternalLink className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                    <span>Conferência de Comunicação no ERS Epson:</span>
                  </div>
                  <p className="text-slate-600 leading-tight">
                    Consulte se o equipamento está comunicando em rede no ato da instalação acessando:
                  </p>
                  <a
                    href="https://www.remote-services.epson.com/devices/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-blue-700 hover:text-blue-900 underline break-all"
                  >
                    https://www.remote-services.epson.com/devices/
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  E-mail de Destino da Ordem de Serviço
                </label>
                <input
                  type="text"
                  value={MAQUIM_EMAIL_DESTINATARIO}
                  readOnly
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl font-mono text-xs text-slate-600 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Observações adicionais */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Observações Adicionais (opcional)
              </label>
              <textarea
                rows={2}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Alguma ressalva ou observação técnica relevante sobre este local..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={handlePrev}
              className="inline-flex items-center gap-2 px-5 py-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={salvando}
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#0D52BD] hover:bg-[#0B1B3D] disabled:opacity-60 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all text-sm"
            >
              <Mail className="w-5 h-5 text-blue-200" />
              {salvando ? 'Salvando no aparelho...' : 'Salvar OS e gerar PDFs →'}
            </button>
          </div>
          {erroSalvar && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-300 text-red-800 text-xs font-semibold">{erroSalvar}</div>
          )}
        </div>
      )}

      {/* ETAPA 5: ENVIO OBRIGATÓRIO POR E-MAIL À CONTRATOS MAQUIM */}
      {currentStep === 5 && savedOS && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-md border border-slate-200 text-center animate-in zoom-in-95 duration-200 space-y-6">
          {/* Banner de Status Obrigatório (Pendente vs Concluído) */}
          {savedOS.envioPendenteOffline && !savedOS.enviadoEmail ? (
            <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-2xl text-left flex items-start gap-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Clock className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-200 px-2.5 py-0.5 rounded-full">
                  OS salva · e-mail pendente
                </span>
                <h3 className="text-base font-bold text-amber-950 mt-1">Próxima instalação liberada</h3>
                <p className="text-xs text-amber-900 mt-0.5 leading-relaxed">
                  A OS, a assinatura e os PDFs estão guardados neste aparelho. Quando tiver internet, envie para{' '}
                  {MAQUIM_EMAIL_DESTINATARIO} pelo Histórico (botão "Enviar agora").
                </p>
              </div>
            </div>
          ) : emailEnviadoConfirmado ? (
            <div className="p-4 bg-emerald-50 border-2 border-emerald-500 rounded-2xl text-left flex items-start gap-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-200 px-2.5 py-0.5 rounded-full">
                    ✓ Etapa 5 Concluída
                  </span>
                  <span className="text-xs text-emerald-700 font-semibold">
                    Registrado às {savedOS.dataEnvioEmail || 'Agora'}
                  </span>
                </div>
                <h3 className="text-base font-bold text-emerald-950 mt-1">
                  E-mail com PDFs Físicos Disparado para {MAQUIM_EMAIL_DESTINATARIO}
                </h3>
                <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                  Os arquivos da Ordem de Serviço foram anexados e o atendimento foi homologado com sucesso. A próxima instalação está liberada!
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-2xl text-left flex items-start gap-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs animate-bounce">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-200 px-2.5 py-0.5 rounded-full animate-pulse">
                    ⚠️ Etapa 5 Obrigatória Pendente
                  </span>
                  <span className="text-xs text-amber-800 font-bold">
                    Destino: {MAQUIM_EMAIL_DESTINATARIO}
                  </span>
                </div>
                <h3 className="text-base font-bold text-amber-950 mt-1">
                  Disparo Obrigatório dos PDFs por E-mail
                </h3>
                <p className="text-xs text-amber-900 mt-0.5 leading-relaxed">
                  Conforme diretriz operacional, a instalação só é considerada concluída e a van liberada para o próximo atendimento após o disparo do e-mail com os PDFs anexos.
                </p>
              </div>
            </div>
          )}

          <div>
            <h2 className="text-2xl font-black text-slate-900">
              {savedOS.numeroOS ? `Ordem de Serviço #${savedOS.numeroOS}` : 'Ordem de Serviço Gerada (OS a definir na planilha)'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Assunto Oficial: <span className="font-semibold text-slate-700">{getEmailSubject(savedOS)}</span>
            </p>
          </div>

          {/* Checklist das 4 Exigências da Implantação */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left max-w-lg mx-auto space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Checklist de Conformidade do Atendimento
            </span>
            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-200/60">
              <span className="text-slate-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                1. Equipamento novo e GATi vinculados na planilha
              </span>
              <span className="text-[10px] font-bold text-emerald-700 font-mono">OK</span>
            </div>
            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-200/60">
              <span className="text-slate-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                2. Contadores e foto do relatório impresso arquivados
              </span>
              <span className="text-[10px] font-bold text-emerald-700 font-mono">OK</span>
            </div>
            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-200/60">
              <span className="text-slate-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                3. Assinatura do cliente com CPF carimbada nos PDFs
              </span>
              <span className="text-[10px] font-bold text-emerald-700 font-mono">OK</span>
            </div>
            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-slate-900 font-bold flex items-center gap-2">
                {emailEnviadoConfirmado ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
                )}
                4. Envio obrigatório dos PDFs para {MAQUIM_EMAIL_DESTINATARIO}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  emailEnviadoConfirmado
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}
              >
                {savedOS.envioPendenteOffline && !savedOS.enviadoEmail ? 'PENDENTE' : emailEnviadoConfirmado ? 'ENVIADO' : 'OBRIGATÓRIO'}
              </span>
            </div>
          </div>

          {/* Cards dos PDFs Gerados Conforme Regras Oficiais */}
          {savedOS.substituiAnterior ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto text-left">
              {/* PDF 1: Instalação */}
              <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase text-blue-900 bg-blue-100 px-2 py-0.5 rounded-full">
                      PDF 1 • Instalação
                    </span>
                    <span className="text-[10px] text-blue-700 font-mono">
                      {savedOS.numeroOS ? `OS #${savedOS.numeroOS}` : `Patr #${savedOS.patrimonio}`}
                    </span>
                  </div>
                  <p className="font-mono font-bold text-xs text-blue-950 truncate" title={getOSFilename(savedOS, 'instalacao')}>
                    {getOSFilename(savedOS, 'instalacao')}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Inicia com dados da impressora nova instalada e finaliza com a retirada.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => downloadOSInstalacaoPDF(savedOS)}
                  className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  Baixar PDF Instalação
                </button>
              </div>

              {/* PDF 2: Retirada */}
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full">
                      PDF 2 • Retirada
                    </span>
                    <span className="text-[10px] text-amber-800 font-mono">
                      {savedOS.numeroOSRetirada ? `OS #${savedOS.numeroOSRetirada}` : `Patr #${savedOS.patrimonioAnterior}`}
                    </span>
                  </div>
                  <p className="font-mono font-bold text-xs text-amber-950 truncate" title={getOSFilename(savedOS, 'retirada')}>
                    {getOSFilename(savedOS, 'retirada')}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Inicia com dados da retirada (contadores Mono/Color) e finaliza com a instalada.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => downloadOSRetiradaPDF(savedOS)}
                  className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  Baixar PDF Retirada
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-blue-50/80 rounded-2xl border border-blue-200 max-w-md mx-auto text-center">
              <p className="text-xs font-mono font-bold text-blue-900">
                Arquivo: {getOSFilename(savedOS, 'instalacao')}
              </p>
            </div>
          )}

          {/* Cartão de Resumo */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 max-w-md mx-auto text-left text-xs space-y-2">
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">Unidade:</span>
              <span className="font-bold text-slate-800 text-right">{savedOS.clienteInstalacao}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">GATi Instalação:</span>
              <span className="font-mono font-bold text-slate-800">{savedOS.gatiInstalacao}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">Patrimônio Novo:</span>
              <span className="font-mono font-bold text-blue-700">
                #{savedOS.patrimonio} ({savedOS.modelo})
              </span>
            </div>
            {savedOS.substituiAnterior && (
              <>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Equipamento Retirado:</span>
                  <span className="font-mono font-bold text-amber-700">
                    #{savedOS.patrimonioAnterior} ({savedOS.modeloAnterior})
                  </span>
                </div>
                {savedOS.numeroOSRetirada && (
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Nº OS de Retirada:</span>
                    <span className="font-mono font-bold text-amber-900">
                      #{savedOS.numeroOSRetirada}
                    </span>
                  </div>
                )}
                {savedOS.contadorPaginasFinal && (
                  <div className="flex justify-between border-b border-slate-200 pb-2 bg-amber-50/60 -mx-2 px-2 py-1 rounded">
                    <span className="text-amber-900 font-semibold">Contador(es) na Retirada:</span>
                    <span className="font-mono font-bold text-amber-950">
                      {savedOS.contadorPaginasFinal}
                    </span>
                  </div>
                )}
                {savedOS.fotoRelatorioContadorBase64 && (
                  <div className="flex justify-between border-b border-slate-200 pb-2 text-emerald-700 font-semibold">
                    <span>Foto do Relatório Impresso:</span>
                    <span>✓ Anexada na Página 2 dos PDFs</span>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">Validado por (Cliente):</span>
              <span className="font-semibold text-slate-800">
                {savedOS.responsavelNome} (CPF: {savedOS.responsavelCPF})
              </span>
            </div>
            {savedOS.usuariosTreinados && savedOS.usuariosTreinados.length > 0 && (
              <div className="flex justify-between border-b border-slate-200 pb-2 bg-blue-50/60 -mx-2 px-2 py-1 rounded">
                <span className="text-blue-900 font-semibold">Usuários Treinados:</span>
                <span className="font-semibold text-blue-950 text-right">
                  {savedOS.usuariosTreinados.join(', ')}
                </span>
              </div>
            )}
            <div className="flex justify-between pt-1">
              <span className="text-slate-500">Técnico da Instalação:</span>
              <span className="font-semibold text-slate-800">
                {savedOS.tecnicoNome || 'Técnico Maquim'}
              </span>
            </div>
          </div>

          {/* Botão de Disparo Principal Obrigatório */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2 max-w-md mx-auto">
            {savedOS.substituiAnterior ? (
              <button
                type="button"
                onClick={() => downloadAllOSPDFs(savedOS)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-300 transition-all text-xs"
              >
                <Download className="w-4 h-4" />
                Baixar 2 PDFs
              </button>
            ) : (
              <button
                type="button"
                onClick={() => downloadOSPDF(savedOS)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-300 transition-all text-xs"
              >
                <Download className="w-4 h-4" />
                Baixar PDF
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSendEmailWithAttachment(savedOS)}
              disabled={emailStatus.sending}
              className={`flex-2 inline-flex items-center justify-center gap-2 px-6 py-3.5 font-bold rounded-xl shadow-md transition-all text-xs disabled:opacity-50 ${
                emailEnviadoConfirmado
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  : 'bg-[#0D52BD] hover:bg-[#0B1B3D] text-white ring-4 ring-blue-500/20 animate-pulse'
              }`}
            >
              <Paperclip className="w-4 h-4 text-blue-200" />
              {emailStatus.sending
                ? 'Disparando E-mail...'
                : emailEnviadoConfirmado
                ? '✓ E-mail Já Disparado (Clique para Reenviar)'
                : savedOS.substituiAnterior
                ? '📧 DISPARAR E-MAIL OBRIGATÓRIO (2 PDFs ANEXOS)'
                : '📧 DISPARAR E-MAIL OBRIGATÓRIO (COM PDF)'}
            </button>
          </div>

          {/* Opções de Disparo por Aplicativo de E-mail */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 max-w-md mx-auto text-left space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-[#0D52BD]" />
                Selecione seu Cliente de E-mail
              </span>
              <span className="text-[10px] text-slate-500 font-mono font-bold">
                {MAQUIM_EMAIL_DESTINATARIO}
              </span>
            </div>

            <p className="text-[11px] text-slate-600">
              Acione diretamente seu aplicativo instalado no computador ou navegador web:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Botão Outlook Classic (Desktop PC) */}
              <button
                type="button"
                onClick={() => {
                  openOutlookClassic(savedOS);
                  markEmailAsSent(savedOS);
                  setEmailStatus({
                    sending: false,
                    type: 'info',
                    message: 'Outlook Classic acionado no Windows! Os PDFs foram salvos na pasta Downloads. O e-mail foi aberto com destinatário e dados preenchidos. Basta anexar os arquivos.',
                  });
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#0B1B3D] hover:bg-[#0F224A] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                title="Abrir o Microsoft Outlook Classic instalado no seu PC com Windows"
              >
                <Mail className="w-3.5 h-3.5 text-blue-400" />
                Outlook Classic (PC)
              </button>

              {/* Botão Outlook Web (Office 365) */}
              <button
                type="button"
                onClick={() => {
                  openOutlookOffice365Web(savedOS);
                  markEmailAsSent(savedOS);
                  setEmailStatus({
                    sending: false,
                    type: 'info',
                    message: 'Outlook Web aberto em nova aba! Os PDFs foram salvos na pasta Downloads para anexo.',
                  });
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#0D52BD] hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                title="Abrir no Outlook Web / Office 365"
              >
                <ExternalLink className="w-3.5 h-3.5 text-blue-200" />
                Outlook Web (365)
              </button>

              {/* Botão Gmail Web */}
              <button
                type="button"
                onClick={() => {
                  openGmailWeb(savedOS);
                  markEmailAsSent(savedOS);
                  setEmailStatus({
                    sending: false,
                    type: 'info',
                    message: 'Gmail Web aberto em nova aba! Os PDFs foram salvos na pasta Downloads para anexo.',
                  });
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition-colors"
                title="Abrir no Gmail Web"
              >
                <ExternalLink className="w-3.5 h-3.5 text-red-500" />
                Gmail Web
              </button>

              {/* Botão Copiar Dados */}
              <button
                type="button"
                onClick={handleCopyEmail}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition-colors"
                title="Copiar assunto e texto do e-mail para a área de transferência"
              >
                {copiedFeedback ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    Copiar Dados
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Controle de Confirmação Manual do Envio */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 max-w-md mx-auto text-left">
            <div>
              <p className="text-xs font-bold text-slate-800">
                Confirmação de Envio do E-mail
              </p>
              <p className="text-[11px] text-slate-500">
                {emailEnviadoConfirmado
                  ? `✓ Confirmado e registrado às ${savedOS.dataEnvioEmail || 'Agora'}`
                  : 'Necessário para certificar a entrega e desbloquear o próximo atendimento'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!emailEnviadoConfirmado) {
                  markEmailAsSent(savedOS);
                } else {
                  setEmailEnviadoConfirmado(false);
                }
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                emailEnviadoConfirmado
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
              }`}
            >
              {emailEnviadoConfirmado ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Envio Confirmado ✓
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Confirmar Envio Manual
                </>
              )}
            </button>
          </div>

          {/* Card Esclarecedor de Anexos: Celular Real vs Computador */}
          <div className="bg-amber-50/90 rounded-2xl p-4 border border-amber-300 max-w-md mx-auto text-left text-xs space-y-2.5 shadow-xs">
            <div className="flex items-center gap-2 text-amber-950 font-bold">
              <Paperclip className="w-4 h-4 text-amber-700" />
              <span>Garantia de Envio dos Anexos</span>
            </div>

            <div className="space-y-2 text-[11px] text-amber-900 leading-relaxed">
              <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200">
                <p className="font-bold text-amber-950 flex items-center gap-1.5 mb-1">
                  <span>📱 No Celular Real dos Técnicos (Android / iPhone):</span>
                </p>
                <p className="text-slate-700">
                  Ao clicar em <strong>"Disparar E-mail Obrigatório"</strong> no celular real, o Android/iOS abre o menu nativo de compartilhamento com os arquivos PDF <strong>já anexados automaticamente</strong> no aplicativo do Gmail ou Outlook.
                </p>
              </div>

              <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200">
                <p className="font-bold text-amber-950 flex items-center gap-1.5 mb-1">
                  <span>💻 No Computador (PC / Windows / Emulador):</span>
                </p>
                <p className="text-slate-700">
                  Por norma mundial de segurança de navegadores (RFC 6068), nenhum site pode injetar arquivos sozinho no Outlook de computador. Por isso, os PDFs foram <strong>baixados automaticamente na sua pasta Downloads</strong>. Basta clicar no clipe 📎 do seu Outlook e anexar os arquivos baixados.
                </p>
              </div>

              <div className="pt-1 flex items-center justify-between text-[10px] text-emerald-800 font-semibold">
                <span>✓ Dados, fotos e assinaturas salvos com segurança no sistema</span>
              </div>
            </div>
          </div>

          {/* Sem internet: não bloquear o técnico */}
          {!emailEnviadoConfirmado && (
            <div className={`rounded-2xl p-4 border max-w-md mx-auto text-left text-xs space-y-2 ${online ? 'bg-slate-50 border-slate-200' : 'bg-slate-800 border-slate-700 text-white'}`}>
              <div className="flex items-center gap-2 font-bold">
                <WifiOff className={`w-4 h-4 ${online ? 'text-slate-500' : 'text-amber-300'}`} />
                {online ? 'Está sem internet no local?' : 'Você está sem internet agora'}
              </div>
              <p className={online ? 'text-slate-600' : 'text-slate-200'}>
                A OS, as fotos, a assinatura e os PDFs já estão salvos neste aparelho. Libere a próxima instalação e
                envie o e-mail depois pelo Histórico, quando tiver conexão.
              </p>
              <button
                type="button"
                onClick={handleEnviarDepois}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl"
              >
                <Clock className="w-4 h-4" />
                Sem internet: enviar depois
              </button>
            </div>
          )}
          {savedOS.envioPendenteOffline && !savedOS.enviadoEmail && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold max-w-md mx-auto text-left">
              E-mail pendente: esta OS aparece no aviso amarelo do topo e no Histórico até ser enviada.
            </div>
          )}

          {/* Feedback de envio de e-mail / anexo */}
          {emailStatus.message && (
            <div
              className={`p-3.5 rounded-2xl text-xs max-w-md mx-auto text-left flex items-start gap-2.5 border ${
                emailStatus.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : emailStatus.type === 'error'
                  ? 'bg-red-50 text-red-900 border-red-200'
                  : 'bg-blue-50 text-blue-900 border-blue-200'
              }`}
            >
              <Paperclip className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
              <div>
                <p className="font-bold">{emailStatus.message}</p>
                <p className="mt-1 text-[11px] text-slate-600 font-mono">
                  Destinatário: {MAQUIM_EMAIL_DESTINATARIO}
                </p>
              </div>
            </div>
          )}

          {/* Ações Finais: WhatsApp & Iniciar Próxima Instalação (Bloqueada se não enviada) */}
          <div className="pt-4 border-t border-slate-200 max-w-md mx-auto space-y-3">
            {!emailEnviadoConfirmado && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2 text-left">
                <Lock className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  A próxima instalação está <strong>bloqueada</strong>. Dispare o e-mail ou confirme o envio para liberar o formulário.
                </span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => openWhatsAppShare(savedOS)}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5"
              >
                <Share2 className="w-4 h-4" />
                Compartilhar via WhatsApp
              </button>

              {emailEnviadoConfirmado ? (
                <button
                  type="button"
                  onClick={handleStartNew}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all text-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Iniciar Próxima Instalação →
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full sm:w-auto cursor-not-allowed opacity-50 inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-200 border border-slate-300 text-slate-500 font-bold rounded-xl text-xs"
                  title="Envio obrigatório de e-mail pendente"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  Próxima Instalação Bloqueada
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modais */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(img) => {
          if (cameraMode === 'relatorio') {
            setFotoRelatorioContadorBase64(img);
          } else {
            setFotoAvariaBase64(img);
          }
        }}
        title={
          cameraMode === 'relatorio'
            ? 'Foto do Relatório de Contadores Impresso'
            : 'Registrar Foto de Avaria'
        }
        subtitle={
          cameraMode === 'relatorio'
            ? 'Tire uma foto nítida e legível da folha de contadores impressa na máquina retirada'
            : 'Tire uma foto nítida da avaria encontrada no equipamento'
        }
      />

      <BarcodeScannerModal
        isOpen={isBarcodeOpen}
        onClose={() => setIsBarcodeOpen(false)}
        onSelectPatrimonio={handleSelectPatrimonio}
        disponiveis={novosEquipamentos}
      />
    </div>
  );
};
