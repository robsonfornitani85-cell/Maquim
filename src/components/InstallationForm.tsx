import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Download,
  Camera,
  ScanBarcode,
  Search,
  UserCheck,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Layers,
  ChevronDown,
  Lock,
  ExternalLink,
  Check,
  Plus,
  X,
  GraduationCap,
  Eye,
  Image as ImageIcon,
  Sparkles,
  Info,
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
} from '../utils/pdfGenerator';
import {
  updateLocalOrdemServico,
  updateLocalOrdemServicoRetirada,
  updateRetiradaOrdemServico,
} from '../data/mockDatabase';
import { MAQUIM_EMAIL_DESTINATARIO } from '../utils/emailDispatcher';

interface InstallationFormProps {
  novosEquipamentos: NovoEquipamento[];
  locaisDistribuicao: LocalDistribuicao[];
  equipamentosAnteriores: EquipamentoAnterior[];
  tecnicoPadrao: string;
  onSaveOS: (os: OrdemServico) => Promise<void> | void;
  onCancel?: () => void;
  preSelectedLocalId?: string;
  online?: boolean;
  ordens?: OrdemServico[];
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
  ordens = [],
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

  // Verificação de Patrimônio Já Instalado
  const [equipamentoJaInstaladoInfo, setEquipamentoJaInstaladoInfo] = useState<{
    patrimonio: string;
    numeroSerie?: string;
    modelo?: string;
    dataInstalacao: string;
    local: string;
    setor?: string;
    os?: string;
  } | null>(null);

  // Verificação de Equipamento Anterior Já Retirado
  const [equipamentoJaRetiradoInfo, setEquipamentoJaRetiradoInfo] = useState<{
    patrimonio: string;
    numeroSerie?: string;
    modelo?: string;
    dataRetirada: string;
    local: string;
    osRet?: string;
  } | null>(null);

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

  // Busca móvel refinada de Local (sem sobrescrever digitação do técnico)
  const [buscaLocalTexto, setBuscaLocalTexto] = useState('');
  const [mostrarBuscaLocal, setMostrarBuscaLocal] = useState(false);

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
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);


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

  // Identifica se um patrimônio já foi instalado no sistema (em ordens, locais ou novos)
  const getInstaladoInfo = (patOrSerial: string) => {
    const clean = patOrSerial.trim().toLowerCase();
    if (!clean) return null;

    // 1. Ordens salvas ativas (IndexedDB / Servidor)
    if (ordens && ordens.length > 0) {
      const foundOS = ordens.find(
        (o) =>
          !o.anulada &&
          (o.patrimonio?.trim().toLowerCase() === clean ||
            o.numeroSerie?.trim().toLowerCase() === clean)
      );
      if (foundOS) {
        return {
          patrimonio: foundOS.patrimonio,
          numeroSerie: foundOS.numeroSerie,
          modelo: foundOS.modelo,
          dataInstalacao: foundOS.dataInstalacao || new Date(foundOS.dataRegistro).toLocaleDateString('pt-BR'),
          local: foundOS.clienteInstalacao || 'Lorena',
          setor: foundOS.setor || '',
          os: foundOS.numeroOS || '',
        };
      }
    }

    // 2. Novos equipamentos com status instalado
    const foundNovo = novosEquipamentos.find(
      (e) =>
        (e.patrimonio.trim().toLowerCase() === clean || e.numeroSerie.trim().toLowerCase() === clean) &&
        e.status === 'instalado'
    );
    if (foundNovo) {
      const local = locaisDistribuicao.find(
        (l) => l.patrimonioInstalado === foundNovo.patrimonio || l.id === foundNovo.osId
      );
      return {
        patrimonio: foundNovo.patrimonio,
        numeroSerie: foundNovo.numeroSerie,
        modelo: foundNovo.modelo,
        dataInstalacao: foundNovo.dataInstalacao || local?.dataInstalacao || '29/10/2026',
        local: local?.clienteInstalacao || foundNovo.gatiInstalacao || 'Lorena',
        setor: local?.setor || '',
        os: foundNovo.ordemServico || local?.ordemServico || '',
      };
    }

    // 3. Locais com status instalado
    const foundLocal = locaisDistribuicao.find(
      (l) =>
        l.status === 'instalado' &&
        (l.patrimonioInstalado?.trim().toLowerCase() === clean ||
          l.serieInstalada?.trim().toLowerCase() === clean)
    );
    if (foundLocal) {
      return {
        patrimonio: foundLocal.patrimonioInstalado || clean,
        numeroSerie: foundLocal.serieInstalada || '',
        modelo: foundLocal.modeloPrevisto || '',
        dataInstalacao: foundLocal.dataInstalacao || '29/10/2026',
        local: foundLocal.clienteInstalacao,
        setor: foundLocal.setor || '',
        os: foundLocal.ordemServico || '',
      };
    }

    // 4. Instalações oficiais confirmadas da Maquim (garantia definitiva contra cache antigo)
    const confirmedMap: Record<string, { modelo: string; data: string; local: string; setor: string; os: string }> = {
      '8399': { modelo: 'WFM5899', data: '10/11/2026', local: 'PAÇO MUNICIPAL', setor: 'JURÍDICO - PROCURADORES', os: '2026110408' },
      '8420': { modelo: 'WFM5899', data: '10/11/2026', local: 'PAÇO MUNICIPAL', setor: 'FISCALIZAÇÃO', os: '2026110434' },
      '8421': { modelo: 'WFM5899', data: '10/11/2026', local: 'PAÇO MUNICIPAL', setor: 'JURÍDICO - SECRETARIA', os: '2026110435' },
      '8382': { modelo: 'WFM5899', data: '10/11/2026', local: 'PAÇO MUNICIPAL', setor: 'TRIBUTAÇÃO', os: '2026110387' },
      '8392': { modelo: 'WFM5899', data: '10/11/2026', local: 'PAÇO MUNICIPAL', setor: 'COMPRAS', os: '2026110400' },
      '8401': { modelo: 'WFM5899', data: '10/11/2026', local: 'PAÇO MUNICIPAL', setor: 'TRIBUTAÇÃO', os: '2026110410' },
      '8416': { modelo: 'WFM5899', data: '10/11/2026', local: 'PAÇO MUNICIPAL', setor: 'CONTABILIDADE', os: '2026110429' },
      '8419': { modelo: 'WFM5899', data: '10/11/2026', local: 'PAÇO MUNICIPAL', setor: 'TESOURARIA', os: '2026110433' },
      '8402': { modelo: 'WFM5899', data: '29/10/2026', local: 'PAÇO MUNICIPAL', setor: 'SECRETARIA DE ADMINISTRAÇÃO', os: '2026110412' },
      '8408': { modelo: 'WFM5899', data: '29/10/2026', local: 'PAÇO MUNICIPAL', setor: 'TRIBUTAÇÃO - ATENDIMENTO', os: '2026110419' },
      '8391': { modelo: 'WFM5899', data: '29/10/2026', local: 'PAÇO MUNICIPAL', setor: 'TRIBUTAÇÃO - ATENDIMENTO', os: '2026110398' },
      '8403': { modelo: 'WFM5899', data: '29/10/2026', local: 'PAÇO MUNICIPAL', setor: 'PROTOCOLO', os: '2026110413' },
      '8472': { modelo: 'WFM5899', data: '29/10/2026', local: 'PAÇO MUNICIPAL', setor: 'SALA DE PREGÃO', os: '2026110205' },
      '8479': { modelo: 'WFC5890', data: '29/10/2026', local: 'PAÇO MUNICIPAL', setor: 'DTI', os: '2026100543' },
    };
    const foiAnulado =
      ordens.some((o) => o.anulada && o.patrimonio?.trim().toLowerCase() === clean) &&
      !ordens.some((o) => !o.anulada && o.patrimonio?.trim().toLowerCase() === clean);

    if (!foiAnulado && confirmedMap[clean]) {
      const c = confirmedMap[clean];
      return {
        patrimonio: clean,
        numeroSerie: '',
        modelo: c.modelo,
        dataInstalacao: c.data,
        local: c.local,
        setor: c.setor,
        os: c.os,
      };
    }

    return null;
  };

  // Identifica se um equipamento anterior já foi retirado
  const getRetiradoInfo = (patOrSerial: string) => {
    const clean = patOrSerial.trim().toLowerCase();
    if (!clean) return null;

    if (ordens && ordens.length > 0) {
      const foundOS = ordens.find(
        (o) =>
          !o.anulada &&
          o.substituiAnterior &&
          (o.patrimonioAnterior?.trim().toLowerCase() === clean ||
            o.numeroSerieAnterior?.trim().toLowerCase() === clean)
      );
      if (foundOS) {
        return {
          patrimonio: foundOS.patrimonioAnterior || clean,
          numeroSerie: foundOS.numeroSerieAnterior || '',
          modelo: foundOS.modeloAnterior || '',
          dataRetirada: foundOS.dataInstalacao || new Date(foundOS.dataRegistro).toLocaleDateString('pt-BR'),
          local: foundOS.clienteInstalacao || 'Lorena',
          osRet: foundOS.numeroOSRetirada || '',
        };
      }
    }

    const foundRet = equipamentosAnteriores.find(
      (r) =>
        (r.patrimonio.trim().toLowerCase() === clean || r.numeroSerie.trim().toLowerCase() === clean) &&
        r.status === 'retirado'
    );
    if (foundRet) {
      return {
        patrimonio: foundRet.patrimonio,
        numeroSerie: foundRet.numeroSerie,
        modelo: foundRet.modelo,
        dataRetirada: foundRet.dataRetirada || '29/10/2026',
        local: foundRet.clienteInstalacao || 'Lorena',
        osRet: foundRet.ordemServicoRetirada || '',
      };
    }

    const confirmedRetMap: Record<string, { modelo: string; data: string; local: string; osRet: string }> = {
      '4489': { modelo: 'WFM5799', data: '10/11/2026', local: 'PAÇO MUNICIPAL (JURÍDICO - PROCURADORES)', osRet: '2026110586' },
      '5132': { modelo: 'WFM5799', data: '10/11/2026', local: 'PAÇO MUNICIPAL (FISCALIZAÇÃO)', osRet: '2026110128' },
      '4715': { modelo: 'WFM5799', data: '10/11/2026', local: 'PAÇO MUNICIPAL (JURÍDICO - SECRETARIA)', osRet: '2026110136' },
      '4719': { modelo: 'WFM5799', data: '10/11/2026', local: 'PAÇO MUNICIPAL (TRIBUTAÇÃO)', osRet: '2026110139' },
      '4440': { modelo: 'WFM5799', data: '10/11/2026', local: 'PAÇO MUNICIPAL (COMPRAS)', osRet: '2026110135' },
      '4602': { modelo: 'WFM5299', data: '10/11/2026', local: 'PAÇO MUNICIPAL (TRIBUTAÇÃO)', osRet: '2026110142' },
      '4508': { modelo: 'WFM5799', data: '10/11/2026', local: 'PAÇO MUNICIPAL (CONTABILIDADE)', osRet: '2026110130' },
      '5087': { modelo: 'WFM5799', data: '10/11/2026', local: 'PAÇO MUNICIPAL (TESOURARIA)', osRet: '2026110129' },
      '4711': { modelo: 'WFM5799', data: '29/10/2026', local: 'PAÇO MUNICIPAL (SECRETARIA DE ADMINISTRAÇÃO)', osRet: '2026110133' },
      '4717': { modelo: 'WFM5799', data: '29/10/2026', local: 'PAÇO MUNICIPAL (TRIBUTAÇÃO - ATENDIMENTO)', osRet: '2026110137' },
      '4615': { modelo: 'WFM5299', data: '29/10/2026', local: 'PAÇO MUNICIPAL (TRIBUTAÇÃO - ATENDIMENTO)', osRet: '2026110227' },
      '4583': { modelo: 'WFM5299', data: '29/10/2026', local: 'PAÇO MUNICIPAL (PROTOCOLO)', osRet: '2026110143' },
      '4423': { modelo: 'WFC5790', data: '29/10/2026', local: 'PAÇO MUNICIPAL (DTI)', osRet: '2026100562' },
    };
    const retFoiAnulado =
      ordens.some((o) => o.anulada && o.substituiAnterior && o.patrimonioAnterior?.trim().toLowerCase() === clean) &&
      !ordens.some((o) => !o.anulada && o.substituiAnterior && o.patrimonioAnterior?.trim().toLowerCase() === clean);

    if (!retFoiAnulado && confirmedRetMap[clean]) {
      const c = confirmedRetMap[clean];
      return {
        patrimonio: clean,
        numeroSerie: '',
        modelo: c.modelo,
        dataRetirada: c.data,
        local: c.local,
        osRet: c.osRet,
      };
    }

    return null;
  };

  // Efeito ao selecionar ou mudar o Patrimônio Novo: auto-completa Série, Modelo e Nº da OS vinculada
  const handleSelectPatrimonio = (pat: string) => {
    setPatrimonio(pat);
    const clean = pat.trim();
    if (!clean) {
      setNumeroSerie('');
      setModelo('');
      setOrdemServico('');
      setEquipamentoJaInstaladoInfo(null);
      return;
    }

    // Verifica bloqueio de equipamento já instalado
    const instaladoInfo = getInstaladoInfo(clean);
    setEquipamentoJaInstaladoInfo(instaladoInfo);

    const item = novosEquipamentos.find(
      (e) =>
        e.patrimonio.trim() === clean ||
        e.numeroSerie.trim().toLowerCase() === clean.toLowerCase()
    );
    if (item) {
      setPatrimonio(item.patrimonio);
      setNumeroSerie(item.numeroSerie);
      setModelo(item.modelo);
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
    setMostrarBuscaLocal(false);
    setBuscaLocalTexto('');
    setErrors((prev) => {
      const { localizacao, gatiInstalacao: _g, clienteInstalacao: _c, ...rest } = prev;
      return rest;
    });
  };

  // Lista de locais para busca móvel: pesquisa por número de GATi, nome do cliente ou secretaria
  // Ordenada conforme solicitado pelo usuário: Secretaria - Cliente Instalação (GATi Instalação)
  const locaisFiltrados = useMemo(() => {
    const q = normalizeSearch(buscaLocalTexto.trim());
    const map = new Map<string, LocalDistribuicao>();

    locaisDistribuicao.forEach((l) => {
      if (!q) {
        const key = `${l.secretaria} - ${l.clienteInstalacao} (${l.gatiInstalacao})`;
        if (!map.has(key)) map.set(key, l);
      } else {
        const matchCli = normalizeSearch(l.clienteInstalacao).includes(q);
        const matchSec = normalizeSearch(l.secretaria).includes(q);
        const matchGati = normalizeSearch(l.gatiInstalacao).includes(q);
        const matchSetor = normalizeSearch(l.setor || '').includes(q);
        const matchEnd = normalizeSearch(l.endereco || '').includes(q);

        if (matchCli || matchSec || matchGati || matchSetor || matchEnd) {
          const key = `${l.secretaria} - ${l.clienteInstalacao} (${l.gatiInstalacao})`;
          if (!map.has(key)) map.set(key, l);
        }
      }
    });

    return Array.from(map.values())
      .sort((a, b) => {
        const sec = (a.secretaria || '').localeCompare(b.secretaria || '', 'pt-BR');
        if (sec !== 0) return sec;
        const cli = (a.clienteInstalacao || '').localeCompare(b.clienteInstalacao || '', 'pt-BR');
        if (cli !== 0) return cli;
        return (a.gatiInstalacao || '').localeCompare(b.gatiInstalacao || '', 'pt-BR');
      })
      .slice(0, 35);
  }, [buscaLocalTexto, locaisDistribuicao]);

  // Ao digitar diretamente no campo GATi (apenas se digitado código exato)
  const handleSelectGATi = (inputVal: string) => {
    const clean = inputVal.trim();
    setGatiInstalacao(clean);
    if (!clean) return;

    // Busca exata por código GATi
    const matches = locaisDistribuicao.filter((l) => l.gatiInstalacao.trim() === clean);
    if (matches.length > 0) {
      const pendente = matches.find((l) => l.status !== 'instalado');
      selectLocal(pendente || matches[0]);
    }
  };

  // Sugestões inteligentes de localização / setor vinculadas à secretaria e local escolhido
  const sugestoesLocalizacao = useMemo(() => {
    if (!gatiInstalacao && !clienteInstalacao) return [];
    const set = new Set<string>();

    locaisDoGati.forEach((l) => {
      if (l.setor && l.setor.trim()) set.add(l.setor.trim().toUpperCase());
    });

    anterioresDoGati.forEach((a) => {
      if (a.localizacao && a.localizacao.trim()) set.add(a.localizacao.trim().toUpperCase());
    });

    const isSaude =
      secretaria.toLowerCase().includes('saude') ||
      clienteInstalacao.toLowerCase().includes('ubs') ||
      clienteInstalacao.toLowerCase().includes('esf') ||
      clienteInstalacao.toLowerCase().includes('saude') ||
      clienteInstalacao.toLowerCase().includes('posto');

    if (isSaude) {
      [
        'RECEPÇÃO',
        'TRIAGEM',
        'FARMÁCIA',
        'CONSULTÓRIO MÉDICO',
        'ENFERMAGEM',
        'SALA DE VACINA',
        'ADMINISTRAÇÃO',
        'DENTISTA / ODONTO',
      ].forEach((s) => set.add(s));
    }

    const isEducacao =
      secretaria.toLowerCase().includes('educa') ||
      clienteInstalacao.toLowerCase().includes('escola') ||
      clienteInstalacao.toLowerCase().includes('creche') ||
      clienteInstalacao.toLowerCase().includes('emei') ||
      clienteInstalacao.toLowerCase().includes('emef');

    if (isEducacao) {
      [
        'SECRETARIA ESCOLAR',
        'SALA DOS PROFESSORES',
        'DIREÇÃO',
        'COORDENAÇÃO PEDAGÓGICA',
        'SALA DE INFORMÁTICA',
        'BIBLIOTECA',
      ].forEach((s) => set.add(s));
    }

    if (set.size === 0) {
      ['RECEPÇÃO', 'ADMINISTRAÇÃO', 'GABINETE', 'DIRETORIA', 'ATENDIMENTO'].forEach((s) => set.add(s));
    }

    return Array.from(set);
  }, [gatiInstalacao, clienteInstalacao, secretaria, locaisDoGati, anterioresDoGati]);

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
      setEquipamentoJaRetiradoInfo(null);
      return;
    }

    // Verifica se já consta como retirado
    const retiradoInfo = getRetiradoInfo(clean);
    setEquipamentoJaRetiradoInfo(retiradoInfo);

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
      } else if (equipamentoJaInstaladoInfo) {
        newErrors.patrimonio = `Equipamento bloqueado: Patrimônio #${equipamentoJaInstaladoInfo.patrimonio} já foi instalado em ${equipamentoJaInstaladoInfo.dataInstalacao} no local ${equipamentoJaInstaladoInfo.local}!`;
      }
      if (!numeroSerie.trim()) {
        newErrors.numeroSerie = 'Número de série não preenchido.';
      }
      if (!gatiInstalacao.trim()) {
        newErrors.gatiInstalacao = 'Selecione o local de instalação (GATi ou Nome do Local).';
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
    if (currentStep === 1 && equipamentoJaInstaladoInfo) {
      alert(`BLOQUEIO DE SEGURANÇA:\nO equipamento Patrimônio #${equipamentoJaInstaladoInfo.patrimonio} (${equipamentoJaInstaladoInfo.modelo || ''}) já foi INSTALADO no dia ${equipamentoJaInstaladoInfo.dataInstalacao} no local ${equipamentoJaInstaladoInfo.local}${equipamentoJaInstaladoInfo.setor ? ` - ${equipamentoJaInstaladoInfo.setor}` : ''} ${equipamentoJaInstaladoInfo.os ? `(OS #${equipamentoJaInstaladoInfo.os})` : ''}!\n\nPor favor, escolha outro patrimônio disponível.`);
      return;
    }
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
      enviadoEmail: true,
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

    // Avança para a Etapa 5 (Conclusão e novo atendimento)
    setCurrentStep(5);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    setEquipamentoJaInstaladoInfo(null);
    setEquipamentoJaRetiradoInfo(null);
    setBuscaLocalTexto('');
    setMostrarBuscaLocal(false);
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
    setErrors({});
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-3xl mx-auto pb-16">
      {/* Botão de Emergência / Recomeçar: Abandonar & Iniciar Novo */}
      <div className="mb-4">
        {showAbandonConfirm ? (
          <div className="p-4 bg-red-50 border-2 border-red-500 rounded-2xl shadow-md animate-in fade-in duration-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-red-950">
                  Deseja realmente abandonar o preenchimento atual?
                </p>
                <p className="text-xs text-red-800 mt-1">
                  Todos os dados digitados neste formulário serão descartados para que você possa iniciar um novo.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      handleStartNew();
                      setShowAbandonConfirm(false);
                    }}
                    className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors cursor-pointer"
                  >
                    Sim, Abandonar e Limpar Tudo
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAbandonConfirm(false)}
                    className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Continuar Preenchendo
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between p-2.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-semibold text-slate-600 pl-2">
              Reiniciar formulário?
            </span>
            <button
              type="button"
              onClick={() => setShowAbandonConfirm(true)}
              className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl border border-red-200 shadow-2xs transition-colors flex items-center gap-1.5 text-xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-red-600" />
              <span>ABANDONAR & INICIAR NOVO</span>
            </button>
          </div>
        )}
      </div>

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
                ? 'text-emerald-700 font-bold'
                : 'text-slate-400'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                currentStep === 5
                  ? 'bg-emerald-100 text-emerald-800 font-bold'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              5
            </span>
            <span className="hidden sm:inline">Conclusão</span>
            <span className="sm:hidden">Fim</span>
          </span>
        </div>

        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ease-out ${
              currentStep === 5 ? 'bg-emerald-600' : 'bg-[#0D52BD]'
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

            {/* Alerta Destacado: Equipamento Já Instalado (Bloqueio) */}
            {equipamentoJaInstaladoInfo && (
              <div className="mt-4 p-4 bg-red-50 border-2 border-red-500 rounded-2xl text-red-950 flex flex-col sm:flex-row items-start gap-3 shadow-md animate-in fade-in duration-200">
                <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-red-600 text-white font-black text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded-md">
                      EQUIPAMENTO JÁ INSTALADO
                    </span>
                    {equipamentoJaInstaladoInfo.os && (
                      <span className="font-mono text-xs font-bold text-red-800 bg-red-100 px-2 py-0.5 rounded border border-red-300">
                        OS #{equipamentoJaInstaladoInfo.os}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-red-900 mt-1.5 leading-snug">
                    O equipamento <strong>Patrimônio #{equipamentoJaInstaladoInfo.patrimonio}</strong> ({equipamentoJaInstaladoInfo.modelo || 'Epson'}) já foi <strong>INSTALADO</strong> no dia <strong>{equipamentoJaInstaladoInfo.dataInstalacao}</strong> no local <strong>{equipamentoJaInstaladoInfo.local}{equipamentoJaInstaladoInfo.setor ? ` - ${equipamentoJaInstaladoInfo.setor}` : ''}</strong> {equipamentoJaInstaladoInfo.os ? `(OS #${equipamentoJaInstaladoInfo.os})` : ''}!
                  </p>
                  <p className="text-xs text-red-700 mt-1">
                    Não é permitido reinstalar este patrimônio. Escolha outro equipamento pendente para iniciar uma nova instalação.
                  </p>
                </div>
              </div>
            )}

            {patrimonio && modelo && !equipamentoJaInstaladoInfo && (
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

          {/* Card: Local de Instalação (GATi) - Busca Móvel Especializada */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">2. Local de Instalação (Município de Lorena)</h2>
                  <p className="text-xs text-slate-500">
                    Busque por nome do local, secretaria ou código GATi
                  </p>
                </div>
              </div>

              {clienteInstalacao && !mostrarBuscaLocal && (
                <button
                  type="button"
                  onClick={() => {
                    setMostrarBuscaLocal(true);
                    setBuscaLocalTexto('');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200/60 transition-colors"
                >
                  <Search className="w-3.5 h-3.5" />
                  Trocar Local
                </button>
              )}
            </div>

            {/* Caso 1: Nenhum Local Selecionado OU Modo de Busca Ativo */}
            {(!clienteInstalacao || mostrarBuscaLocal) ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Pesquisar Local de Instalação *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Search className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      autoComplete="off"
                      inputMode="search"
                      value={buscaLocalTexto}
                      onChange={(e) => setBuscaLocalTexto(e.target.value)}
                      placeholder="Digite parte do nome, secretaria ou código (ex: Maria, Paço, DTI, 28559)..."
                      className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                      autoFocus={mostrarBuscaLocal}
                    />
                    {buscaLocalTexto && (
                      <button
                        type="button"
                        onClick={() => setBuscaLocalTexto('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Mostrando opções na ordem: <strong>Secretaria - Cliente Instalação (GATi)</strong>
                  </p>
                </div>

                {/* Lista de Opções Encontradas (Mobile-first, com rolagem limpa) */}
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white shadow-xs">
                  {locaisFiltrados.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      Nenhum local encontrado para "{buscaLocalTexto}". Tente outro termo ou código.
                    </div>
                  ) : (
                    locaisFiltrados.map((loc) => {
                      const isInstalado = loc.status === 'instalado';
                      return (
                        <button
                          key={loc.id}
                          type="button"
                          onClick={() => selectLocal(loc)}
                          className="w-full text-left p-3 hover:bg-indigo-50/60 active:bg-indigo-100 transition-colors flex items-start justify-between gap-2"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-slate-800 leading-snug">
                              <span className="text-indigo-700">{loc.secretaria}</span> - {loc.clienteInstalacao}{' '}
                              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                GATi: {loc.gatiInstalacao}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-1.5">
                              {loc.setor && (
                                <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {loc.setor}
                                </span>
                              )}
                              <span>{loc.endereco}, {loc.bairro}</span>
                            </div>
                          </div>

                          <div className="shrink-0 self-center">
                            {isInstalado ? (
                              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full whitespace-nowrap">
                                Já Instalado
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                                Selecionar
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                {mostrarBuscaLocal && clienteInstalacao && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => setMostrarBuscaLocal(false)}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-800 underline"
                    >
                      Cancelar e manter local selecionado anteriormente
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Caso 2: Local já selecionado - Exibição Clara e Fixa */
              <div className="space-y-4">
                <div className="p-4 bg-indigo-50/70 border-2 border-indigo-200 rounded-2xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-indigo-100">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider">
                        {secretaria}
                      </span>
                      <span className="font-mono text-xs font-bold text-indigo-950 bg-white px-2 py-0.5 rounded border border-indigo-200">
                        GATi Instalação: #{gatiInstalacao}
                      </span>
                      {gatiFaturamento && gatiFaturamento !== gatiInstalacao && (
                        <span className="text-[11px] text-slate-500">
                          (Fat: #{gatiFaturamento})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2.5">
                    <h3 className="text-base font-black text-slate-900 leading-tight">
                      {clienteInstalacao}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      {endereco}, {bairro}
                    </p>
                    {responsavelLocalCadastrado && (
                      <p className="text-xs text-slate-500 mt-1">
                        Responsável cadastrado: <span className="font-semibold text-slate-700">{responsavelLocalCadastrado}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Sub-localizações deste GATi (quando o prédio tem múltiplos setores/impressoras) */}
                {locaisDoGati.length > 1 && (
                  <div
                    data-erro={errors.localizacao ? 'true' : undefined}
                    className={`rounded-2xl border-2 p-3 ${
                      errors.localizacao
                        ? 'border-red-500 bg-red-50/40'
                        : !selectedLocalId
                        ? 'border-amber-400 bg-amber-50/60'
                        : 'border-indigo-300 bg-indigo-50/50'
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-2.5">
                      <MapPin className="w-5 h-5 text-indigo-700 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-black text-indigo-950 uppercase tracking-wide">
                          Selecione o Setor / Localização neste prédio ({locaisDoGati.length})
                        </p>
                        <p className="text-[11px] text-indigo-900/80">
                          Toque no setor exato onde este equipamento está sendo instalado:
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {locaisDoGati.map((loc) => {
                        const ativo = loc.id === selectedLocalId;
                        const instalado = loc.status === 'instalado';
                        const antigo = anteriorDaLocalizacao(loc.setor);
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
                              <span className="block text-sm font-black text-slate-900 uppercase leading-tight">
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
                                  </span>
                                )}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {errors.localizacao && <p className="text-red-600 text-xs mt-2 font-bold">{errors.localizacao}</p>}
                  </div>
                )}
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

                  {/* Aviso para unidades como UBS sem localizações pré-cadastradas na planilha */}
                  {clienteInstalacao && locaisDoGati.every((l) => !l.setor || !l.setor.trim()) && (
                    <div className="mt-2.5 p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-start gap-2">
                      <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Aviso de Localização:</p>
                        <p>
                          Este endereço/unidade não possui localizações específicas pré-cadastradas na planilha.
                          Valide a localização exata diretamente com o responsável do local (ex: Recepção, Triagem, Farmácia, Consultório, etc.).
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Sugestões rápidas de localização em tags */}
                  {clienteInstalacao && sugestoesLocalizacao.length > 0 && (
                    <div className="mt-2.5">
                      <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                        Sugestões de localização (toque para preencher):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {sugestoesLocalizacao.map((sug: string) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => setSetor(sug)}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                              setor.toUpperCase() === sug
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50'
                            }`}
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
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

                  {/* Alerta de Equipamento Anterior Já Retirado */}
                  {equipamentoJaRetiradoInfo && (
                    <div className="p-3 bg-amber-100 border-2 border-amber-400 rounded-xl text-amber-950 flex items-start gap-2.5 text-xs shadow-xs animate-in fade-in">
                      <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-bold text-sm text-amber-950">
                          ⚠️ Consta como RETIRADO: Patrimônio #{equipamentoJaRetiradoInfo.patrimonio} ({equipamentoJaRetiradoInfo.modelo || ''})
                        </p>
                        <p className="mt-0.5 text-xs text-amber-900">
                          Este equipamento já foi recolhido no dia <strong>{equipamentoJaRetiradoInfo.dataRetirada}</strong> no local <strong>{equipamentoJaRetiradoInfo.local}</strong> {equipamentoJaRetiradoInfo.osRet ? `(OS Ret: #${equipamentoJaRetiradoInfo.osRet})` : ''}.
                        </p>
                        <p className="mt-1 text-[11px] text-amber-800">
                          Confira se é realmente este patrimônio físico que está no local antes de prosseguir.
                        </p>
                      </div>
                    </div>
                  )}

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
                                disabled={retirado && !ativo}
                                onClick={() => {
                                  if (!retirado || ativo) handleSelectPatrimonioAnterior(r.patrimonio);
                                }}
                                className={`px-2.5 py-1.5 rounded-lg border text-left text-xs ${
                                  ativo
                                    ? 'bg-amber-600 border-amber-600 text-white'
                                    : sugerido
                                    ? 'bg-white border-amber-500 ring-2 ring-amber-400/40 text-amber-950'
                                    : 'bg-white border-amber-200 text-slate-700'
                                } ${retirado && !ativo ? 'opacity-50 cursor-not-allowed' : ''}`}
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
            <div className="space-y-3 mb-4 pt-4 border-t border-slate-100">
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
              <CheckCircle2 className="w-5 h-5 text-blue-200" />
              {salvando ? 'Salvando na nuvem...' : 'Finalizar OS e gerar PDFs →'}
            </button>
          </div>
          {erroSalvar && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-300 text-red-800 text-xs font-semibold">{erroSalvar}</div>
          )}
        </div>
      )}

      {/* ETAPA 5: CONCLUSÃO (Instalação realizada com sucesso) */}
      {currentStep === 5 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-md border border-slate-200 text-center animate-in zoom-in-95 duration-200 space-y-6 max-w-lg mx-auto">
          <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-600" />
          </div>

          <div>
            <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-full border border-emerald-200 mb-2">
              Salvo na Nuvem Firebase e no Aparelho
            </span>
            <h2 className="text-2xl font-black text-slate-900">Processo Realizado com Sucesso!</h2>
            <p className="text-sm text-slate-600 mt-1">
              Todos os dados, fotos e assinaturas foram gravados no banco em nuvem e os PDFs foram baixados automaticamente neste dispositivo.
            </p>
          </div>

          {savedOS ? (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left text-xs space-y-2">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-medium">Ordem de Serviço (Instalação):</span>
                <span className="font-mono font-bold text-blue-700">{savedOS.numeroOS ? `#${savedOS.numeroOS}` : 'Sem OS vinculada'}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-medium">Novo Equipamento:</span>
                <span className="font-mono font-bold text-slate-900">Patr. #{savedOS.patrimonio} ({savedOS.modelo})</span>
              </div>
              {savedOS.substituiAnterior && savedOS.patrimonioAnterior && (
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium">Equipamento Retirado:</span>
                  <span className="font-mono font-bold text-amber-800">
                    Patr. #{savedOS.patrimonioAnterior} {savedOS.numeroOSRetirada ? `(OS Ret: #${savedOS.numeroOSRetirada})` : ''}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Local / Unidade:</span>
                <span className="font-bold text-slate-800 text-right">{savedOS.clienteInstalacao} {savedOS.setor ? `(${savedOS.setor})` : ''}</span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left text-xs">
              <p className="text-slate-700 font-medium">A ordem de serviço foi arquivada no Histórico com sucesso e o equipamento foi marcado como instalado.</p>
            </div>
          )}

          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={handleStartNew}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg text-base transition-all transform active:scale-98 cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              INICIAR NOVA INSTALAÇÃO
            </button>

            {savedOS && (
              <button
                type="button"
                onClick={() => {
                  if (savedOS.substituiAnterior) {
                    downloadAllOSPDFs(savedOS);
                  } else {
                    downloadOSPDF(savedOS);
                  }
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
              >
                <Download className="w-4 h-4 text-slate-500" />
                Baixar Cópia em PDF desta OS (Opcional)
              </button>
            )}
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
