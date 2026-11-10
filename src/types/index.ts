export interface NovoEquipamento {
  patrimonio: string;
  numeroSerie: string;
  modelo: string;
  tipo: 'Mono' | 'Color';
  status: 'disponivel' | 'instalado';
  ordemServico?: string; // Nº da Ordem de Serviço vinculada a este equipamento
  dataInstalacao?: string;
  gatiInstalacao?: string;
  osId?: string;
}

export interface LocalDistribuicao {
  id: string;
  secretaria: string;
  ordemServico: string;
  ordemServicoRetirada?: string; // Nº da OS de Retirada vinculada
  gatiInstalacao: string;
  gatiFaturamento: string;
  clienteInstalacao: string;
  modeloPrevisto: string;
  tipoEquipamento: string;
  setor?: string;
  endereco: string;
  bairro: string;
  responsavelLocal: string;
  status: 'pendente' | 'instalado';
  patrimonioInstalado?: string;
  serieInstalada?: string;
  dataInstalacao?: string;
  protegido?: boolean; // Bloqueado após preenchimento
}

export interface EquipamentoAnterior {
  patrimonio: string;
  numeroSerie: string;
  modelo: string;
  secretaria: string;
  clienteInstalacao: string;
  gatiInstalacao: string;
  localizacao: string;
  conectividadeIp: string;
  tipoEquipamento: string; // 'Color' | 'Mono'
  status: 'a_retirar' | 'retirado' | 'nao_retirado';
  dataRetirada?: string;
  ordemServicoRetirada?: string; // Nº da OS de Retirada
  contadorMono?: string; // Leitura contador Mono
  contadorColor?: string; // Leitura contador Color
  contadorFinal?: string; // Leitura contador total
  caboEnergiaRetirado?: boolean;
  bandejaSaidaRetirada?: boolean;
  avariasEncontradas?: boolean;
  descricaoAvarias?: string;
  protegido?: boolean; // Bloqueado após preenchimento
}

export type TipoConexao = 'Via Rede' | 'Via WI-FI' | 'Via USB para IMPRESSÃO';

export interface OrdemServico {
  id: string;
  numeroOS: string; // Nº da OS de Instalação
  numeroOSRetirada?: string; // Nº da OS de Retirada (quando houver equipamento substituído)
  dataRegistro: string;
  dataInstalacao: string;
  tecnicoNome: string;
  
  // Local de Instalação (GATi)
  localId?: string; // id da linha exata da planilha (GATi + localização)
  gatiInstalacao: string;
  gatiFaturamento?: string;
  secretaria: string;
  clienteInstalacao: string;
  endereco: string;
  bairro: string;
  setor?: string; // Localização dentro do local (ex: DTI, RH, Protocolo)
  
  // Novo Equipamento
  patrimonio: string;
  numeroSerie: string;
  modelo: string;
  tipoConexao: TipoConexao;
  enderecoIP?: string;
  scanSMB?: boolean; // Se Rede ou WI-FI
  abbyFineReader?: boolean; // Se Rede ou WI-FI
  conectadoWifiERS?: boolean; // Se USB
  justificativaWifiERS?: string; // Se USB e conectadoWifiERS === false
  scanEpsonScan2?: boolean; // Se USB
  ocrComponente?: boolean; // Se USB
  conferenciaERS: boolean;
  justificativaERS?: string; // Se conferenciaERS === false
  
  // Retirada Contrato Anterior
  substituiAnterior: boolean;
  patrimonioAnterior?: string;
  numeroSerieAnterior?: string;
  modeloAnterior?: string;
  tipoEquipamentoAnterior?: 'Mono' | 'Color'; // Se o equipamento retirado é Mono ou Colorido
  contadorMono?: string; // Contador Preto e Branco
  contadorColor?: string; // Contador Colorido
  contadorPaginasFinal?: string; // Contador total no ato da retirada
  fotoRelatorioContadorBase64?: string; // Foto do relatório de contadores impresso no equipamento
  equipamentoRetirado?: boolean;
  justificativaEquipRetirado?: string;
  caboEnergiaRetirado?: boolean;
  justificativaCaboEnergia?: string;
  bandejaSaidaRetirada?: boolean;
  justificativaBandejaSaida?: string;
  avariasEncontradas?: boolean;
  descricaoAvarias?: string;
  fotoAvariaBase64?: string;
  
  // Treinamento de Usuários do Local
  usuariosTreinados?: string[];
  topicosTreinamentoConfirmados?: string[];

  // Validação Cliente
  responsavelNome: string;
  responsavelCPF: string;
  assinaturaClienteBase64?: string;
  assinaturaTecnicoBase64?: string;
  observacoes?: string;
  
  // Metadados de Envio
  enviadoEmail: boolean;
  envioPendenteOffline?: boolean;

  // Anulação (a OS nunca é apagada: fica no Histórico marcada como anulada)
  anulada?: boolean;
  dataAnulacao?: string;

  // OS reconstruída a partir dos PDFs gerados pelo app (importação no Histórico)
  restauradaDePDF?: boolean;
  pdfsOriginais?: { nome: string; blob: Blob }[]; // Sem internet: próxima instalação liberada, envio feito depois
  dataEnvioEmail?: string;
  emailDestinatario: string;
}

export interface Estatisticas {
  totalNovos: number;
  instaladosNovos: number;
  totalLocais: number;
  locaisAtendidos: number;
  totalRetiradas: number;
  retiradasRealizadas: number;
}
