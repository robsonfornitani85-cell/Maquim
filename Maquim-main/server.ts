import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const DB_FILE_PATH = path.resolve(__dirname, 'src', 'data', 'server_database.json');
const SEED_DATA_PATH = path.resolve(__dirname, 'src', 'data', 'realContractData.json');

interface LockInfo {
  patrimonio: string;
  tecnicoNome: string;
  timestamp: number;
}

interface ServerState {
  version: number;
  lastUpdated: string;
  novos: any[];
  locais: any[];
  retiradas: any[];
  ordens: any[];
  locks: Record<string, LockInfo>;
}

const INITIAL_SEEDED_ORDENS = [
  // 1. #8399 (10/11/2026) - JURÍDICO - PROCURADORES
  {
    id: 'os-base-8399',
    numeroOS: '2026110408',
    numeroOSRetirada: '2026110586',
    dataRegistro: '2026-11-10T10:00:00.000Z',
    dataInstalacao: '2026-11-10',
    tecnicoNome: 'Técnico Maquim',
    localId: 'loc-144',
    gatiInstalacao: '28559',
    gatiFaturamento: '40466',
    secretaria: 'SECRETARIA ADMINISTRAÇÃO',
    clienteInstalacao: 'PAÇO MUNICIPAL',
    endereco: 'AV. CAPITÃO MESSIAS RIBEIRO, 625',
    bairro: 'OLARIA',
    setor: 'JURÍDICO - PROCURADORES',
    patrimonio: '8399',
    numeroSerie: 'XC75065655',
    modelo: 'WFM5899',
    tipoConexao: 'Via Rede',
    scanSMB: true,
    abbyFineReader: true,
    conferenciaERS: true,
    substituiAnterior: true,
    equipamentoRetirado: true,
    patrimonioAnterior: '4489',
    numeroSerieAnterior: 'X3BK001998',
    modeloAnterior: 'WFM5799',
    tipoEquipamentoAnterior: 'Mono',
    caboEnergiaRetirado: true,
    bandejaSaidaRetirada: true,
    avariasEncontradas: false,
    responsavelNome: 'Fábio Chaves',
    responsavelCPF: '000.000.000-00',
    enviadoEmail: true,
    emailDestinatario: 'contratos2@maquim.com.br',
    restauradaPDF: true,
  },
  // 2. #8420 (10/11/2026) - FISCALIZAÇÃO
  {
    id: 'os-base-8420',
    numeroOS: '2026110434',
    numeroOSRetirada: '2026110128',
    dataRegistro: '2026-11-10T10:30:00.000Z',
    dataInstalacao: '2026-11-10',
    tecnicoNome: 'Técnico Maquim',
    localId: 'loc-134',
    gatiInstalacao: '28559',
    gatiFaturamento: '40466',
    secretaria: 'SECRETARIA ADMINISTRAÇÃO',
    clienteInstalacao: 'PAÇO MUNICIPAL',
    endereco: 'AV. CAPITÃO MESSIAS RIBEIRO, 625',
    bairro: 'OLARIA',
    setor: 'FISCALIZAÇÃO',
    patrimonio: '8420',
    numeroSerie: 'XC75065586',
    modelo: 'WFM5899',
    tipoConexao: 'Via Rede',
    scanSMB: true,
    abbyFineReader: true,
    conferenciaERS: true,
    substituiAnterior: true,
    equipamentoRetirado: true,
    patrimonioAnterior: '5132',
    numeroSerieAnterior: 'X3BK000619',
    modeloAnterior: 'WFM5799',
    tipoEquipamentoAnterior: 'Mono',
    caboEnergiaRetirado: true,
    bandejaSaidaRetirada: true,
    avariasEncontradas: false,
    responsavelNome: 'Milena Silva',
    responsavelCPF: '000.000.000-00',
    enviadoEmail: true,
    emailDestinatario: 'contratos2@maquim.com.br',
    restauradaPDF: true,
  },
  // 3. #8421 (10/11/2026) - JURÍDICO - SECRETARIA
  {
    id: 'os-base-8421',
    numeroOS: '2026110435',
    numeroOSRetirada: '2026110136',
    dataRegistro: '2026-11-10T11:00:00.000Z',
    dataInstalacao: '2026-11-10',
    tecnicoNome: 'Técnico Maquim',
    localId: 'loc-145',
    gatiInstalacao: '28559',
    gatiFaturamento: '40466',
    secretaria: 'SECRETARIA ADMINISTRAÇÃO',
    clienteInstalacao: 'PAÇO MUNICIPAL',
    endereco: 'AV. CAPITÃO MESSIAS RIBEIRO, 625',
    bairro: 'OLARIA',
    setor: 'JURÍDICO - SECRETARIA',
    patrimonio: '8421',
    numeroSerie: 'XC75065683',
    modelo: 'WFM5899',
    tipoConexao: 'Via Rede',
    scanSMB: true,
    abbyFineReader: true,
    conferenciaERS: true,
    substituiAnterior: true,
    equipamentoRetirado: true,
    patrimonioAnterior: '4715',
    numeroSerieAnterior: 'X3BK002636',
    modeloAnterior: 'WFM5799',
    tipoEquipamentoAnterior: 'Mono',
    caboEnergiaRetirado: true,
    bandejaSaidaRetirada: true,
    avariasEncontradas: false,
    responsavelNome: 'Ariel Azevedo',
    responsavelCPF: '000.000.000-00',
    enviadoEmail: true,
    emailDestinatario: 'contratos2@maquim.com.br',
    restauradaPDF: true,
  },
  // 4. #8382 (10/11/2026) - TRIBUTAÇÃO
  {
    id: 'os-base-8382',
    numeroOS: '2026110387',
    numeroOSRetirada: '2026110139',
    dataRegistro: '2026-11-10T11:30:00.000Z',
    dataInstalacao: '2026-11-10',
    tecnicoNome: 'Técnico Maquim',
    localId: 'loc-136',
    gatiInstalacao: '28559',
    gatiFaturamento: '40466',
    secretaria: 'Financas',
    clienteInstalacao: 'PAÇO MUNICIPAL',
    endereco: 'AV. CAPITÃO MESSIAS RIBEIRO, 625',
    bairro: 'OLARIA',
    setor: 'TRIBUTAÇÃO',
    patrimonio: '8382',
    numeroSerie: 'XC75065687',
    modelo: 'WFM5899',
    tipoConexao: 'Via Rede',
    scanSMB: true,
    abbyFineReader: true,
    conferenciaERS: true,
    substituiAnterior: true,
    equipamentoRetirado: true,
    patrimonioAnterior: '4719',
    numeroSerieAnterior: 'X3BK002659',
    modeloAnterior: 'WFM5799',
    tipoEquipamentoAnterior: 'Mono',
    caboEnergiaRetirado: true,
    bandejaSaidaRetirada: true,
    avariasEncontradas: false,
    responsavelNome: 'Kenia Eloi',
    responsavelCPF: '000.000.000-00',
    enviadoEmail: true,
    emailDestinatario: 'contratos2@maquim.com.br',
    restauradaPDF: true,
  },
  // 5. #8392 (10/11/2026) - COMPRAS
  {
    id: 'os-base-8392',
    numeroOS: '2026110400',
    numeroOSRetirada: '2026110135',
    dataRegistro: '2026-11-10T12:00:00.000Z',
    dataInstalacao: '2026-11-10',
    tecnicoNome: 'Técnico Maquim',
    localId: 'loc-125',
    gatiInstalacao: '28559',
    gatiFaturamento: '40466',
    secretaria: 'SECRETARIA ADMINISTRAÇÃO',
    clienteInstalacao: 'PAÇO MUNICIPAL',
    endereco: 'AV. CAPITÃO MESSIAS RIBEIRO, 625',
    bairro: 'OLARIA',
    setor: 'COMPRAS',
    patrimonio: '8392',
    numeroSerie: 'XC75065930',
    modelo: 'WFM5899',
    tipoConexao: 'Via Rede',
    scanSMB: true,
    abbyFineReader: true,
    conferenciaERS: true,
    substituiAnterior: true,
    equipamentoRetirado: true,
    patrimonioAnterior: '4440',
    numeroSerieAnterior: 'X3BK002579',
    modeloAnterior: 'WFM5799',
    tipoEquipamentoAnterior: 'Mono',
    caboEnergiaRetirado: true,
    bandejaSaidaRetirada: true,
    avariasEncontradas: false,
    responsavelNome: 'Tatiana Velozo',
    responsavelCPF: '000.000.000-00',
    enviadoEmail: true,
    emailDestinatario: 'contratos2@maquim.com.br',
    restauradaPDF: true,
  },
  // 6. #8401 (10/11/2026) - TRIBUTAÇÃO
  {
    id: 'os-base-8401',
    numeroOS: '2026110410',
    numeroOSRetirada: '2026110142',
    dataRegistro: '2026-11-10T12:30:00.000Z',
    dataInstalacao: '2026-11-10',
    tecnicoNome: 'Técnico Maquim',
    localId: 'loc-136',
    gatiInstalacao: '28559',
    gatiFaturamento: '40466',
    secretaria: 'Financas',
    clienteInstalacao: 'PAÇO MUNICIPAL',
    endereco: 'AV. CAPITÃO MESSIAS RIBEIRO, 625',
    bairro: 'OLARIA',
    setor: 'TRIBUTAÇÃO',
    patrimonio: '8401',
    numeroSerie: 'XC75065917',
    modelo: 'WFM5899',
    tipoConexao: 'Via Rede',
    scanSMB: true,
    abbyFineReader: true,
    conferenciaERS: true,
    substituiAnterior: true,
    equipamentoRetirado: true,
    patrimonioAnterior: '4602',
    numeroSerieAnterior: 'X3CF000165',
    modeloAnterior: 'WFM5299',
    tipoEquipamentoAnterior: 'Mono',
    caboEnergiaRetirado: true,
    bandejaSaidaRetirada: true,
    avariasEncontradas: false,
    responsavelNome: 'Roselene Julião',
    responsavelCPF: '000.000.000-00',
    enviadoEmail: true,
    emailDestinatario: 'contratos2@maquim.com.br',
    restauradaPDF: true,
  },
  // 7. #8416 (10/11/2026) - CONTABILIDADE
  {
    id: 'os-base-8416',
    numeroOS: '2026110429',
    numeroOSRetirada: '2026110130',
    dataRegistro: '2026-11-10T13:00:00.000Z',
    dataInstalacao: '2026-11-10',
    tecnicoNome: 'Técnico Maquim',
    localId: 'loc-133',
    gatiInstalacao: '28559',
    gatiFaturamento: '40466',
    secretaria: 'Financas',
    clienteInstalacao: 'PAÇO MUNICIPAL',
    endereco: 'AV. CAPITÃO MESSIAS RIBEIRO, 625',
    bairro: 'OLARIA',
    setor: 'CONTABILIDADE',
    patrimonio: '8416',
    numeroSerie: 'XC75065743',
    modelo: 'WFM5899',
    tipoConexao: 'Via Rede',
    scanSMB: true,
    abbyFineReader: true,
    conferenciaERS: true,
    substituiAnterior: true,
    equipamentoRetirado: true,
    patrimonioAnterior: '4508',
    numeroSerieAnterior: 'X3BK001526',
    modeloAnterior: 'WFM5799',
    tipoEquipamentoAnterior: 'Mono',
    caboEnergiaRetirado: true,
    bandejaSaidaRetirada: true,
    avariasEncontradas: false,
    responsavelNome: 'André Avila',
    responsavelCPF: '000.000.000-00',
    enviadoEmail: true,
    emailDestinatario: 'contratos2@maquim.com.br',
    restauradaPDF: true,
  },
  // 8. #8419 (10/11/2026) - TESOURARIA
  {
    id: 'os-base-8419',
    numeroOS: '2026110433',
    numeroOSRetirada: '2026110129',
    dataRegistro: '2026-11-10T13:30:00.000Z',
    dataInstalacao: '2026-11-10',
    tecnicoNome: 'Técnico Maquim',
    localId: 'loc-135',
    gatiInstalacao: '28559',
    gatiFaturamento: '40466',
    secretaria: 'Financas',
    clienteInstalacao: 'PAÇO MUNICIPAL',
    endereco: 'AV. CAPITÃO MESSIAS RIBEIRO, 625',
    bairro: 'OLARIA',
    setor: 'TESOURARIA',
    patrimonio: '8419',
    numeroSerie: 'XC75066123',
    modelo: 'WFM5899',
    tipoConexao: 'Via Rede',
    scanSMB: true,
    abbyFineReader: true,
    conferenciaERS: true,
    substituiAnterior: true,
    equipamentoRetirado: true,
    patrimonioAnterior: '5087',
    numeroSerieAnterior: 'X3BK001474',
    modeloAnterior: 'WFM5799',
    tipoEquipamentoAnterior: 'Mono',
    caboEnergiaRetirado: true,
    bandejaSaidaRetirada: true,
    avariasEncontradas: false,
    responsavelNome: 'Vitória Betoni',
    responsavelCPF: '000.000.000-00',
    enviadoEmail: true,
    emailDestinatario: 'contratos2@maquim.com.br',
    restauradaPDF: true,
  },
  // 9. #8402 (29/10/2026) - SECRETARIA DE ADMINISTRAÇÃO
  {
    id: 'os-base-8402',
    numeroOS: '2026110412',
    numeroOSRetirada: '2026110133',
    dataRegistro: '2026-10-29T17:30:00.000Z',
    dataInstalacao: '2026-10-29',
    tecnicoNome: 'Técnico Maquim',
    localId: 'loc-131',
    gatiInstalacao: '28559',
    gatiFaturamento: '40466',
    secretaria: 'SECRETARIA ADMINISTRAÇÃO',
    clienteInstalacao: 'PAÇO MUNICIPAL',
    endereco: 'AV. CAPITÃO MESSIAS RIBEIRO, 625',
    bairro: 'OLARIA',
    setor: 'SECRETARIA DE ADMINISTRAÇÃO',
    patrimonio: '8402',
    numeroSerie: 'XC75065926',
    modelo: 'WFM5899',
    tipoConexao: 'Via Rede',
    scanSMB: true,
    abbyFineReader: true,
    conferenciaERS: true,
    substituiAnterior: true,
    equipamentoRetirado: true,
    patrimonioAnterior: '4711',
    numeroSerieAnterior: 'X3BK002463',
    modeloAnterior: 'WFM5799',
    tipoEquipamentoAnterior: 'Mono',
    caboEnergiaRetirado: true,
    bandejaSaidaRetirada: true,
    avariasEncontradas: false,
    responsavelNome: 'Responsável Administração',
    responsavelCPF: '000.000.000-00',
    enviadoEmail: true,
    emailDestinatario: 'contratos2@maquim.com.br',
  },
  // 10. #8408 (29/10/2026) - TRIBUTAÇÃO - ATENDIMENTO
  {
    id: 'os-base-8408',
    numeroOS: '2026110419',
    numeroOSRetirada: '2026110137',
    dataRegistro: '2026-10-29T17:00:00.000Z',
    dataInstalacao: '2026-10-29',
    tecnicoNome: 'Técnico Maquim',
    localId: 'loc-136',
    gatiInstalacao: '28559',
    gatiFaturamento: '40466',
    secretaria: 'Financas',
    clienteInstalacao: 'PAÇO MUNICIPAL',
    endereco: 'AV. CAPITÃO MESSIAS RIBEIRO, 625',
    bairro: 'OLARIA',
    setor: 'TRIBUTAÇÃO - ATENDIMENTO',
    patrimonio: '8408',
    numeroSerie: 'XC75065681',
    modelo: 'WFM5899',
    tipoConexao: 'Via Rede',
    scanSMB: true,
    abbyFineReader: true,
    conferenciaERS: true,
    substituiAnterior: true,
    equipamentoRetirado: true,
    patrimonioAnterior: '4717',
    numeroSerieAnterior: 'X3BK002640',
    modeloAnterior: 'WFM5799',
    tipoEquipamentoAnterior: 'Mono',
    caboEnergiaRetirado: true,
    bandejaSaidaRetirada: true,
    avariasEncontradas: false,
    responsavelNome: 'Responsável Tributação',
    responsavelCPF: '000.000.000-00',
    enviadoEmail: true,
    emailDestinatario: 'contratos2@maquim.com.br',
  },
  // 11. #8391 (29/10/2026) - TRIBUTAÇÃO - ATENDIMENTO
  {
    id: 'os-base-8391',
    numeroOS: '2026110398',
    numeroOSRetirada: '2026110227',
    dataRegistro: '2026-10-29T16:30:00.000Z',
    dataInstalacao: '2026-10-29',
    tecnicoNome: 'Técnico Maquim',
    localId: 'loc-137',
    gatiInstalacao: '28559',
    gatiFaturamento: '40466',
    secretaria: 'Financas',
    clienteInstalacao: 'PAÇO MUNICIPAL',
    endereco: 'AV. CAPITÃO MESSIAS RIBEIRO, 625',
    bairro: 'OLARIA',
    setor: 'TRIBUTAÇÃO - ATENDIMENTO',
    patrimonio: '8391',
    numeroSerie: 'XC75066094',
    modelo: 'WFM5899',
    tipoConexao: 'Via Rede',
    scanSMB: true,
    abbyFineReader: true,
    conferenciaERS: true,
    substituiAnterior: true,
    equipamentoRetirado: true,
    patrimonioAnterior: '4615',
    numeroSerieAnterior: 'X3CF000162',
    modeloAnterior: 'WFM5299',
    tipoEquipamentoAnterior: 'Mono',
    caboEnergiaRetirado: true,
    bandejaSaidaRetirada: true,
    avariasEncontradas: false,
    responsavelNome: 'Responsável Tributação',
    responsavelCPF: '000.000.000-00',
    enviadoEmail: true,
    emailDestinatario: 'contratos2@maquim.com.br',
  },
  // 12. #8403 (29/10/2026) - PROTOCOLO
  {
    id: 'os-base-8403',
    numeroOS: '2026110413',
    numeroOSRetirada: '2026110143',
    dataRegistro: '2026-10-29T16:00:00.000Z',
    dataInstalacao: '2026-10-29',
    tecnicoNome: 'Técnico Maquim',
    localId: 'loc-128',
    gatiInstalacao: '28559',
    gatiFaturamento: '40466',
    secretaria: 'SECRETARIA ADMINISTRAÇÃO',
    clienteInstalacao: 'PAÇO MUNICIPAL',
    endereco: 'AV. CAPITÃO MESSIAS RIBEIRO, 625',
    bairro: 'OLARIA',
    setor: 'PROTOCOLO',
    patrimonio: '8403',
    numeroSerie: 'XC75065921',
    modelo: 'WFM5899',
    tipoConexao: 'Via Rede',
    scanSMB: true,
    abbyFineReader: true,
    conferenciaERS: true,
    substituiAnterior: true,
    equipamentoRetirado: true,
    patrimonioAnterior: '4583',
    numeroSerieAnterior: 'X3CF000203',
    modeloAnterior: 'WFM5299',
    tipoEquipamentoAnterior: 'Mono',
    caboEnergiaRetirado: true,
    bandejaSaidaRetirada: true,
    avariasEncontradas: false,
    responsavelNome: 'Responsável Protocolo',
    responsavelCPF: '000.000.000-00',
    enviadoEmail: true,
    emailDestinatario: 'contratos2@maquim.com.br',
  },
  // 13. #8472 (29/10/2026) - SALA DE PREGÃO
  {
    id: 'os-base-8472',
    numeroOS: '2026110205',
    dataRegistro: '2026-10-29T15:00:00.000Z',
    dataInstalacao: '2026-10-29',
    tecnicoNome: 'Técnico Maquim',
    localId: 'loc-130',
    gatiInstalacao: '28559',
    gatiFaturamento: '40466',
    secretaria: 'SECRETARIA ADMINISTRAÇÃO',
    clienteInstalacao: 'PAÇO MUNICIPAL',
    endereco: 'AV. CAPITÃO MESSIAS RIBEIRO, 625',
    bairro: 'OLARIA',
    setor: 'SALA DE PREGÃO',
    patrimonio: '8472',
    numeroSerie: 'XC75066156',
    modelo: 'WFM5899',
    tipoConexao: 'Via Rede',
    enderecoIP: '192.168.15.137',
    scanSMB: true,
    abbyFineReader: true,
    conferenciaERS: true,
    substituiAnterior: false,
    responsavelNome: 'Setor de Licitação',
    responsavelCPF: '000.000.000-00',
    enviadoEmail: true,
    emailDestinatario: 'contratos2@maquim.com.br',
  },
  // 14. #8479 (29/10/2026) - DTI
  {
    id: 'os-base-8479',
    numeroOS: '2026100543',
    numeroOSRetirada: '2026100562',
    dataRegistro: '2026-10-29T14:30:00.000Z',
    dataInstalacao: '2026-10-29',
    tecnicoNome: 'Técnico Maquim',
    localId: 'loc-126',
    gatiInstalacao: '28559',
    gatiFaturamento: '40466',
    secretaria: 'SECRETARIA ADMINISTRAÇÃO',
    clienteInstalacao: 'PAÇO MUNICIPAL',
    endereco: 'AV. CAPITÃO MESSIAS RIBEIRO, 625',
    bairro: 'OLARIA',
    setor: 'DTI',
    patrimonio: '8479',
    numeroSerie: 'XBJZ043697',
    modelo: 'WFC5890',
    tipoConexao: 'Via Rede',
    enderecoIP: '192.168.15.1',
    scanSMB: true,
    abbyFineReader: true,
    conferenciaERS: true,
    substituiAnterior: true,
    equipamentoRetirado: true,
    patrimonioAnterior: '4423',
    numeroSerieAnterior: 'X3B7007461',
    modeloAnterior: 'WFC5790',
    tipoEquipamentoAnterior: 'Color',
    caboEnergiaRetirado: true,
    bandejaSaidaRetirada: true,
    avariasEncontradas: false,
    responsavelNome: 'Coordenação DTI',
    responsavelCPF: '000.000.000-00',
    enviadoEmail: true,
    emailDestinatario: 'contratos2@maquim.com.br',
  },
  // 15. #8259 (11/11/2026 - Data de Hoje) - PAÇO MUNICIPAL (OS: 2026110191)
  {
    id: 'os-base-8259',
    numeroOS: '2026110191',
    dataRegistro: '2026-11-11T08:30:00.000Z',
    dataInstalacao: '2026-11-11',
    tecnicoNome: 'Técnico Maquim',
    localId: 'loc-132',
    gatiInstalacao: '28559',
    gatiFaturamento: '40466',
    secretaria: 'SECRETARIA ADMINISTRAÇÃO',
    clienteInstalacao: 'PAÇO MUNICIPAL',
    endereco: 'AV. CAPITÃO MESSIAS RIBEIRO, 625',
    bairro: 'OLARIA',
    setor: 'ADMINISTRAÇÃO / TESTE',
    patrimonio: '8259',
    numeroSerie: 'XC75045646',
    modelo: 'WFM5899',
    tipoConexao: 'Via Rede',
    enderecoIP: '192.168.1.159',
    scanSMB: true,
    abbyFineReader: true,
    conferenciaERS: true,
    substituiAnterior: false,
    responsavelNome: 'Robson Fornitani',
    responsavelCPF: '000.000.000-00',
    enviadoEmail: true,
    emailDestinatario: 'contratos2@maquim.com.br',
    anulada: true,
    dataAnulacao: '11/11/2026',
  },
  // 16. #8260 (11/11/2026 - Data de Hoje) - PAÇO MUNICIPAL (OS: 2026110192)
  {
    id: 'os-base-8260',
    numeroOS: '2026110192',
    dataRegistro: '2026-11-11T08:45:00.000Z',
    dataInstalacao: '2026-11-11',
    tecnicoNome: 'Técnico Maquim',
    localId: 'loc-143',
    gatiInstalacao: '28559',
    gatiFaturamento: '40466',
    secretaria: 'SECRETARIA ADMINISTRAÇÃO',
    clienteInstalacao: 'PAÇO MUNICIPAL',
    endereco: 'AV. CAPITÃO MESSIAS RIBEIRO, 625',
    bairro: 'OLARIA',
    setor: 'ADMINISTRAÇÃO / TESTE',
    patrimonio: '8260',
    numeroSerie: 'XC75045643',
    modelo: 'WFM5899',
    tipoConexao: 'Via Rede',
    enderecoIP: '192.168.1.160',
    scanSMB: true,
    abbyFineReader: true,
    conferenciaERS: true,
    substituiAnterior: false,
    responsavelNome: 'Robson Fornitani',
    responsavelCPF: '000.000.000-00',
    enviadoEmail: true,
    emailDestinatario: 'contratos2@maquim.com.br',
    anulada: true,
    dataAnulacao: '11/11/2026',
  },
];

function loadServerState(): ServerState {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.novos) && Array.isArray(parsed.locais)) {
        return {
          version: parsed.version || 1,
          lastUpdated: parsed.lastUpdated || new Date().toISOString(),
          novos: parsed.novos,
          locais: parsed.locais,
          retiradas: parsed.retiradas || [],
          ordens: parsed.ordens || INITIAL_SEEDED_ORDENS,
          locks: parsed.locks || {},
        };
      }
    }
  } catch (err) {
    console.error('Falha ao ler banco central do servidor, carregando dados de seed:', err);
  }

  // Se o arquivo não existir ou for inválido, inicializa com o seed original
  try {
    const seedRaw = fs.readFileSync(SEED_DATA_PATH, 'utf-8');
    const seedData = JSON.parse(seedRaw);
    const initial: ServerState = {
      version: 1,
      lastUpdated: new Date().toISOString(),
      novos: (seedData.novos || []).map((n: any) => ({ ...n, status: n.status || 'disponivel' })),
      locais: (seedData.locais || []).map((l: any) => ({
        ...l,
        status: l.status || 'pendente',
        protegido: l.status === 'instalado',
      })),
      retiradas: (seedData.retiradas || []).map((r: any) => ({
        ...r,
        status: r.status || 'a_retirar',
        protegido: r.status === 'retirado',
      })),
      ordens: INITIAL_SEEDED_ORDENS,
      locks: {},
    };
    saveServerState(initial);
    return initial;
  } catch (err) {
    console.error('Erro crítico ao carregar dados de semente:', err);
    return {
      version: 1,
      lastUpdated: new Date().toISOString(),
      novos: [],
      locais: [],
      retiradas: [],
      ordens: INITIAL_SEEDED_ORDENS,
      locks: {},
    };
  }
}

function saveServerState(state: ServerState) {
  try {
    state.lastUpdated = new Date().toISOString();
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Erro ao gravar banco central no disco:', err);
  }
}

// In-memory server state
let serverState = loadServerState();

// Limpeza periódica de locks (trava expira em 15 minutos)
function cleanExpiredLocks() {
  const now = Date.now();
  let changed = false;
  for (const [pat, lock] of Object.entries(serverState.locks || {})) {
    if (now - lock.timestamp > 15 * 60 * 1000) {
      delete serverState.locks[pat];
      changed = true;
    }
  }
  if (changed) {
    serverState.version++;
    saveServerState(serverState);
  }
}
setInterval(cleanExpiredLocks, 60 * 1000);

async function start() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  // API: Status e Saúde
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'online',
      version: serverState.version,
      lastUpdated: serverState.lastUpdated,
      ordensCount: serverState.ordens.length,
      instaladosCount: serverState.novos.filter((n) => n.status === 'instalado').length,
    });
  });

  // API: Consulta centralizada de dados para uso simultâneo
  app.get('/api/data', (_req, res) => {
    cleanExpiredLocks();
    res.json({
      version: serverState.version,
      lastUpdated: serverState.lastUpdated,
      novos: serverState.novos,
      locais: serverState.locais,
      retiradas: serverState.retiradas,
      ordens: serverState.ordens,
      locks: serverState.locks || {},
    });
  });

  // API: Gravação de Ordem de Serviço em tempo real (Uso Simultâneo)
  app.post('/api/ordens', (req, res) => {
    try {
      const os = req.body;
      if (!os || !os.patrimonio) {
        return res.status(400).json({ error: 'Dados da Ordem de Serviço incompletos.' });
      }

      // Adiciona ou atualiza a OS
      const idx = serverState.ordens.findIndex((o) => o.id === os.id);
      if (idx >= 0) {
        serverState.ordens[idx] = os;
      } else {
        serverState.ordens.unshift(os);
      }

      // 1. Atualiza novo equipamento
      const eqIdx = serverState.novos.findIndex((n) => n.patrimonio === os.patrimonio);
      if (eqIdx >= 0) {
        serverState.novos[eqIdx].status = 'instalado';
        serverState.novos[eqIdx].dataInstalacao = os.dataInstalacao;
        serverState.novos[eqIdx].gatiInstalacao = os.gatiInstalacao;
        serverState.novos[eqIdx].osId = os.numeroOS;
      }

      // 2. Atualiza local de distribuição
      const locIdx = serverState.locais.findIndex((l) => l.gatiInstalacao === os.gatiInstalacao);
      if (locIdx >= 0) {
        serverState.locais[locIdx].status = 'instalado';
        serverState.locais[locIdx].patrimonioInstalado = os.patrimonio;
        serverState.locais[locIdx].serieInstalada = os.numeroSerie;
        serverState.locais[locIdx].dataInstalacao = os.dataInstalacao;
        serverState.locais[locIdx].protegido = true;
        if (os.numeroOS) serverState.locais[locIdx].ordemServico = os.numeroOS;
        if (os.numeroOSRetirada) serverState.locais[locIdx].ordemServicoRetirada = os.numeroOSRetirada;
      }

      // 3. Atualiza equipamento retirado
      if (os.substituiAnterior && os.patrimonioAnterior) {
        const retIdx = serverState.retiradas.findIndex((r) => r.patrimonio === os.patrimonioAnterior);
        if (retIdx >= 0) {
          serverState.retiradas[retIdx].status = os.equipamentoRetirado ? 'retirado' : 'nao_retirado';
          serverState.retiradas[retIdx].dataRetirada = os.dataInstalacao;
          serverState.retiradas[retIdx].ordemServicoRetirada = os.numeroOSRetirada || '';
          serverState.retiradas[retIdx].contadorMono = os.contadorMono || '';
          serverState.retiradas[retIdx].contadorColor = os.contadorColor || '';
          serverState.retiradas[retIdx].contadorFinal = os.contadorPaginasFinal || '';
          serverState.retiradas[retIdx].protegido = true;
        }
      }

      // Libera qualquer lock do patrimônio
      if (serverState.locks && serverState.locks[os.patrimonio]) {
        delete serverState.locks[os.patrimonio];
      }

      serverState.version++;
      saveServerState(serverState);

      return res.json({
        success: true,
        version: serverState.version,
        message: `Instalação do Patr. ${os.patrimonio} sincronizada com sucesso para todos os técnicos.`,
      });
    } catch (err: any) {
      console.error('Erro ao salvar OS na API:', err);
      return res.status(500).json({ error: 'Erro interno ao salvar OS.' });
    }
  });

  // API: Reserva/Claim de patrimônio para evitar colisão entre técnicos simultâneos
  app.post('/api/lock', (req, res) => {
    try {
      const { patrimonio, tecnicoNome, action } = req.body;
      if (!patrimonio) return res.status(400).json({ error: 'Patrimônio obrigatório.' });

      if (action === 'release') {
        if (serverState.locks && serverState.locks[patrimonio]) {
          delete serverState.locks[patrimonio];
          serverState.version++;
          saveServerState(serverState);
        }
        return res.json({ success: true });
      }

      // Verifica se já está bloqueado por outro técnico
      const existing = serverState.locks[patrimonio];
      const now = Date.now();
      if (existing && existing.tecnicoNome !== tecnicoNome && now - existing.timestamp < 15 * 60 * 1000) {
        return res.json({
          locked: true,
          by: existing.tecnicoNome,
          message: `Este equipamento está sendo instalado neste momento por ${existing.tecnicoNome}.`,
        });
      }

      serverState.locks[patrimonio] = {
        patrimonio,
        tecnicoNome: tecnicoNome || 'Outro Técnico',
        timestamp: now,
      };
      serverState.version++;
      saveServerState(serverState);

      return res.json({ success: true, locked: false });
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao registrar trava.' });
    }
  });

  // API: Anulação de instalação com senha 223622 (suporta tanto Patrimônio quanto GATi)
  app.post('/api/anular', (req, res) => {
    try {
      const { gatiInstalacao, patrimonio, identifier, chave, password, senha } = req.body;
      const pwd = String(password || senha || '').trim();
      if (pwd !== '223622') {
        return res.status(403).json({ error: 'Senha de proteção incorreta.' });
      }

      const idClean = String(identifier || chave || patrimonio || gatiInstalacao || '').trim();
      if (!idClean) {
        return res.status(400).json({ error: 'Informe o patrimônio ou GATi para anulação.' });
      }

      // Procura no local por GATi ou por patrimônio instalado
      const locIdx = serverState.locais.findIndex(
        (l) => l.gatiInstalacao.trim() === idClean || (l.patrimonioInstalado && l.patrimonioInstalado.trim() === idClean)
      );

      // Procura no equipamento novo por patrimônio
      const nIdx = serverState.novos.findIndex(
        (n) => n.patrimonio.trim() === idClean || (locIdx >= 0 && n.patrimonio.trim() === (serverState.locais[locIdx].patrimonioInstalado || '').trim())
      );

      const patLiberado = nIdx >= 0 ? serverState.novos[nIdx].patrimonio : (locIdx >= 0 ? serverState.locais[locIdx].patrimonioInstalado : idClean);
      const gatiAfetado = locIdx >= 0 ? serverState.locais[locIdx].gatiInstalacao : (nIdx >= 0 ? serverState.novos[nIdx].gatiInstalacao : idClean);

      if (nIdx >= 0) {
        serverState.novos[nIdx].status = 'disponivel';
        delete serverState.novos[nIdx].dataInstalacao;
        delete serverState.novos[nIdx].gatiInstalacao;
        delete serverState.novos[nIdx].osId;
      }

      if (locIdx >= 0) {
        const local = serverState.locais[locIdx];
        local.status = 'pendente';
        delete local.patrimonioInstalado;
        delete local.serieInstalada;
        delete local.dataInstalacao;
        local.protegido = false;
      }

      // Libera equipamento anterior (retirada)
      const retIdx = serverState.retiradas.findIndex(
        (r) => (gatiAfetado && r.gatiInstalacao.trim() === gatiAfetado.trim()) || (patLiberado && r.patrimonio.trim() === patLiberado.trim())
      );
      if (retIdx >= 0) {
        serverState.retiradas[retIdx].status = 'a_retirar';
        delete serverState.retiradas[retIdx].dataRetirada;
        delete serverState.retiradas[retIdx].contadorMono;
        delete serverState.retiradas[retIdx].contadorColor;
        delete serverState.retiradas[retIdx].contadorFinal;
        serverState.retiradas[retIdx].protegido = false;
      }

      // Remove cirurgicamente apenas a OS correspondente ao patrimônio liberado ou identificador específico
      serverState.ordens = serverState.ordens.filter((o) => {
        if (patLiberado && o.patrimonio === patLiberado) return false;
        if (idClean && (o.id === idClean || o.numeroOS === idClean)) return false;
        return true;
      });

      serverState.version++;
      saveServerState(serverState);

      return res.json({
        success: true,
        version: serverState.version,
        message: `Instalação do Patrimônio #${patLiberado || idClean} anulada com sucesso! O equipamento voltou a ficar disponível para instalação na van.`,
      });
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao anular instalação.' });
    }
  });

  // API: Sincronização em lote para técnicos que estiveram offline
  app.post('/api/sync', (req, res) => {
    try {
      const { ordens = [] } = req.body;
      let changed = false;

      for (const os of ordens) {
        const exists = serverState.ordens.find((o) => o.id === os.id);
        if (!exists) {
          serverState.ordens.unshift(os);
          const eqIdx = serverState.novos.findIndex((n) => n.patrimonio === os.patrimonio);
          if (eqIdx >= 0) {
            serverState.novos[eqIdx].status = 'instalado';
            serverState.novos[eqIdx].dataInstalacao = os.dataInstalacao;
            serverState.novos[eqIdx].gatiInstalacao = os.gatiInstalacao;
            serverState.novos[eqIdx].osId = os.numeroOS;
          }
          const locIdx = serverState.locais.findIndex((l) => l.gatiInstalacao === os.gatiInstalacao);
          if (locIdx >= 0) {
            serverState.locais[locIdx].status = 'instalado';
            serverState.locais[locIdx].patrimonioInstalado = os.patrimonio;
            serverState.locais[locIdx].serieInstalada = os.numeroSerie;
            serverState.locais[locIdx].dataInstalacao = os.dataInstalacao;
            serverState.locais[locIdx].protegido = true;
          }
          changed = true;
        }
      }

      if (changed) {
        serverState.version++;
        saveServerState(serverState);
      }

      res.json({
        version: serverState.version,
        lastUpdated: serverState.lastUpdated,
        novos: serverState.novos,
        locais: serverState.locais,
        retiradas: serverState.retiradas,
        ordens: serverState.ordens,
        locks: serverState.locks || {},
      });
    } catch (err) {
      res.status(500).json({ error: 'Erro na sincronização.' });
    }
  });

  // Integração com Vite (Dev ou Produção)
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd && fs.existsSync(path.resolve(__dirname, 'dist'))) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Maquim Server] Servidor Full-Stack rodando na porta ${PORT} com suporte a uso simultâneo.`);
  });
}

start().catch((err) => {
  console.error('[Maquim Server] Erro ao iniciar servidor:', err);
});
