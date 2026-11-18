import { OrdemServico } from '../types';

/**
 * Armazenamento durável das Ordens de Serviço no próprio aparelho (IndexedDB).
 *
 * Por que não localStorage: o localStorage tem limite de ~5 MB e cada OS carrega
 * fotos e assinatura em base64. Depois de algumas OSs o salvamento falhava em
 * silêncio. O IndexedDB guarda centenas de MB, funciona sem internet e
 * sobrevive ao fechamento do navegador. Os PDFs são gerados a partir destes
 * dados, então qualquer OS salva aqui pode ter o PDF refeito a qualquer momento.
 */

const DB_NAME = 'maquim_campo';
const DB_VERSION = 1;
const STORE = 'ordens';
const LEGACY_LS_KEY = 'maquim_ordens_servico_v6_lorena';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return openDB().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const store = t.objectStore(STORE);
        const req = fn(store);
        let result: T | undefined;
        if (req) req.onsuccess = () => (result = req.result);
        t.oncomplete = () => resolve(result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      })
  );
}

/** Migra (uma única vez) as OSs antigas que estavam no localStorage. */
async function migrateLegacy(): Promise<void> {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(LEGACY_LS_KEY);
  } catch {
    return;
  }
  if (!raw) return;
  try {
    const legacy = JSON.parse(raw) as OrdemServico[];
    if (Array.isArray(legacy) && legacy.length) {
      await tx('readwrite', (store) => {
        legacy.forEach((os) => os && os.id && store.put(os));
      });
    }
    localStorage.removeItem(LEGACY_LS_KEY);
  } catch (e) {
    console.error('Falha ao migrar OSs antigas:', e);
  }
}

export const CONFIRMED_BASE_ORDENS: OrdemServico[] = [
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

let migrated = false;

export async function loadOrdens(): Promise<OrdemServico[]> {
  if (!migrated) {
    migrated = true;
    await migrateLegacy();
  }
  const all = (await tx<OrdemServico[]>('readonly', (store) => store.getAll())) || [];

  // Garante que as 7 ordens base confirmadas estejam permanentemente preservadas
  for (const base of CONFIRMED_BASE_ORDENS) {
    const existing = all.find(
      (o) =>
        o.id === base.id ||
        (base.numeroOS && o.numeroOS === base.numeroOS) ||
        (o.patrimonio === base.patrimonio && o.gatiInstalacao === base.gatiInstalacao)
    );
    if (!existing) {
      await putOrdem(base);
      all.push(base);
    }
  }

  return all.sort((a, b) => (b.dataRegistro || '').localeCompare(a.dataRegistro || ''));
}

export async function putOrdem(os: OrdemServico): Promise<void> {
  await tx('readwrite', (store) => store.put(os));
}

export async function deleteOrdensWhere(pred: (os: OrdemServico) => boolean): Promise<void> {
  const all = await loadOrdens();
  const toDelete = all.filter(pred);
  if (!toDelete.length) return;
  await tx('readwrite', (store) => {
    toDelete.forEach((os) => store.delete(os.id));
  });
}

/**
 * Pede ao navegador para não apagar os dados deste site quando o aparelho
 * estiver com pouco espaço. Retorna true se o armazenamento ficou persistente.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage && navigator.storage.persist) {
      if (await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    }
  } catch {
    // ignora
  }
  return false;
}
