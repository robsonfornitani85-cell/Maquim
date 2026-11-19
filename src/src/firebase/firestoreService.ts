import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  deleteField,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './config';
import { OperationType, handleFirestoreError } from './errorHandler';
import { OrdemServico } from '../types';
import { CONFIRMED_BASE_ORDENS } from '../data/osStore';

export const CONTRACT_SYNC_COLLECTION = 'contract_sync';
export const CONTRACT_SYNC_DOC_ID = 'lorena_234';
export const ORDENS_COLLECTION = 'ordens';

export interface InstalledNovoSync {
  patrimonio: string;
  modelo?: string;
  dataInstalacao: string;
  gatiInstalacao: string;
  localNome?: string;
  setor?: string;
  numeroOS?: string;
  updatedByUid: string;
}

export interface InstalledLocalSync {
  localId: string;
  gatiInstalacao: string;
  patrimonioInstalado: string;
  serieInstalada?: string;
  dataInstalacao: string;
  ordemServico?: string;
  ordemServicoRetirada?: string;
  updatedByUid: string;
}

export interface RetiredEquipSync {
  patrimonio: string;
  status: 'retirado' | 'nao_retirado';
  dataRetirada: string;
  ordemServicoRetirada?: string;
  contadorMono?: string;
  contadorColor?: string;
  contadorFinal?: string;
  updatedByUid: string;
}

export interface LockSync {
  patrimonio: string;
  tecnicoNome: string;
  lockedByUid: string;
  timestamp: number;
}

export interface OrdemSummarySync {
  id: string;
  numeroOS?: string;
  numeroOSRetirada?: string;
  dataRegistro?: string;
  dataInstalacao: string;
  tecnicoNome: string;
  localId?: string;
  gatiInstalacao: string;
  clienteInstalacao: string;
  secretaria?: string;
  bairro?: string;
  setor?: string;
  patrimonio: string;
  numeroSerie?: string;
  modelo?: string;
  tipoConexao: string;
  enderecoIP?: string;
  substituiAnterior: boolean;
  patrimonioAnterior?: string;
  numeroSerieAnterior?: string;
  modeloAnterior?: string;
  responsavelNome: string;
  anulada?: boolean;
  dataAnulacao?: string;
  createdByUid: string;
}

export interface ContractSyncData {
  installedNovos: Record<string, InstalledNovoSync>;
  installedLocais: Record<string, InstalledLocalSync>;
  retiredEquip: Record<string, RetiredEquipSync>;
  locks: Record<string, LockSync>;
  activeOrdensSummary: Record<string, OrdemSummarySync>;
  updatedByUid: string;
  updatedAt?: unknown;
}

function sanitizeId(raw: string): string {
  const cleaned = String(raw || '')
    .trim()
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .slice(0, 128);
  return cleaned || `os-${Date.now()}`;
}

function clip(val: string | undefined, max: number): string | undefined {
  if (val === undefined || val === null) return undefined;
  return String(val).slice(0, max);
}

function sanitizeKey(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/[.\[\]~*/]/g, '_');
}

function normalizeTipoConexao(raw?: string): 'Via Rede' | 'Via WI-FI' | 'Via USB para IMPRESSÃO' {
  if (raw === 'Via WI-FI') return 'Via WI-FI';
  if (raw === 'Via USB para IMPRESSÃO' || (raw && raw.toUpperCase().includes('USB'))) {
    return 'Via USB para IMPRESSÃO';
  }
  return 'Via Rede';
}

function byteLength(str: string): number {
  try {
    return new Blob([str]).size;
  } catch {
    return str.length;
  }
}

function buildOrdemFirestoreDoc(os: OrdemServico, uid: string, hasAttachments: boolean): Record<string, any> {
  const safeId = sanitizeId(os.id);
  const docData: Record<string, any> = {
    id: safeId,
    tecnicoNome: clip((os.tecnicoNome || '').trim() || 'Técnico Maquim', 120)!,
    gatiInstalacao: clip((os.gatiInstalacao || '').trim() || '00000', 40)!,
    clienteInstalacao: clip((os.clienteInstalacao || '').trim() || 'Lorena', 160)!,
    patrimonio: clip((os.patrimonio || '').trim() || '0000', 40)!,
    tipoConexao: normalizeTipoConexao(os.tipoConexao),
    conferenciaERS: Boolean(os.conferenciaERS),
    substituiAnterior: Boolean(os.substituiAnterior),
    responsavelNome: clip((os.responsavelNome || '').trim() || 'Responsável Local', 120)!,
    enviadoEmail: Boolean(os.enviadoEmail),
    emailDestinatario: clip((os.emailDestinatario || '').trim() || 'contratos2@maquim.com.br', 120)!,
    hasAttachments,
    createdByUid: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const optionalStrings: Array<[keyof OrdemServico, number]> = [
    ['numeroOS', 40],
    ['numeroOSRetirada', 40],
    ['dataRegistro', 50],
    ['dataInstalacao', 30],
    ['localId', 64],
    ['gatiFaturamento', 40],
    ['secretaria', 160],
    ['endereco', 240],
    ['bairro', 120],
    ['setor', 160],
    ['numeroSerie', 60],
    ['modelo', 60],
    ['enderecoIP', 45],
    ['justificativaWifiERS', 500],
    ['justificativaERS', 500],
    ['patrimonioAnterior', 40],
    ['numeroSerieAnterior', 60],
    ['modeloAnterior', 60],
    ['contadorMono', 30],
    ['contadorColor', 30],
    ['contadorPaginasFinal', 30],
    ['justificativaEquipRetirado', 500],
    ['justificativaCaboEnergia', 500],
    ['justificativaBandejaSaida', 500],
    ['descricaoAvarias', 1000],
    ['responsavelCPF', 20],
    ['observacoes', 1000],
    ['dataAnulacao', 50],
    ['dataEnvioEmail', 50],
  ];

  for (const [key, maxLen] of optionalStrings) {
    const v = os[key];
    if (typeof v === 'string' && v.length > 0) {
      docData[key] = clip(v, maxLen);
    }
  }

  if (os.tipoEquipamentoAnterior === 'Mono' || os.tipoEquipamentoAnterior === 'Color') {
    docData.tipoEquipamentoAnterior = os.tipoEquipamentoAnterior;
  }

  const optionalBools: Array<keyof OrdemServico> = [
    'scanSMB',
    'abbyFineReader',
    'conectadoWifiERS',
    'scanEpsonScan2',
    'ocrComponente',
    'equipamentoRetirado',
    'caboEnergiaRetirado',
    'bandejaSaidaRetirada',
    'avariasEncontradas',
    'envioPendenteOffline',
    'anulada',
    'restauradaDePDF',
    'restauradaPDF',
  ];

  for (const key of optionalBools) {
    const v = os[key];
    if (typeof v === 'boolean') {
      docData[key] = v;
    }
  }

  if (Array.isArray(os.usuariosTreinados) && os.usuariosTreinados.length > 0) {
    docData.usuariosTreinados = os.usuariosTreinados
      .slice(0, 50)
      .map((u) => String(u).slice(0, 120));
  }

  return docData;
}

function buildOrdemSummary(os: OrdemServico, uid: string): OrdemSummarySync {
  return {
    id: sanitizeId(os.id),
    numeroOS: os.numeroOS || '',
    numeroOSRetirada: os.numeroOSRetirada || '',
    dataRegistro: os.dataRegistro || new Date().toISOString(),
    dataInstalacao: os.dataInstalacao || '',
    tecnicoNome: os.tecnicoNome || '',
    localId: os.localId || '',
    gatiInstalacao: os.gatiInstalacao || '',
    clienteInstalacao: os.clienteInstalacao || '',
    secretaria: os.secretaria || '',
    bairro: os.bairro || '',
    setor: os.setor || '',
    patrimonio: os.patrimonio || '',
    numeroSerie: os.numeroSerie || '',
    modelo: os.modelo || '',
    tipoConexao: os.tipoConexao || 'Via Rede',
    enderecoIP: os.enderecoIP || '',
    substituiAnterior: Boolean(os.substituiAnterior),
    patrimonioAnterior: os.patrimonioAnterior || '',
    numeroSerieAnterior: os.numeroSerieAnterior || '',
    modeloAnterior: os.modeloAnterior || '',
    responsavelNome: os.responsavelNome || '',
    anulada: Boolean(os.anulada),
    dataAnulacao: os.dataAnulacao || '',
    createdByUid: uid,
  };
}

function buildInitialContractSync(uid: string): ContractSyncData {
  const installedNovos: Record<string, InstalledNovoSync> = {};
  const installedLocais: Record<string, InstalledLocalSync> = {};
  const retiredEquip: Record<string, RetiredEquipSync> = {};
  const activeOrdensSummary: Record<string, OrdemSummarySync> = {};

  for (const os of CONFIRMED_BASE_ORDENS) {
    const safeId = sanitizeId(os.id);
    activeOrdensSummary[safeId] = buildOrdemSummary(os, uid);

    if (os.anulada) continue;

    if (os.patrimonio) {
      const patKey = sanitizeKey(os.patrimonio);
      installedNovos[patKey] = {
        patrimonio: os.patrimonio,
        modelo: os.modelo || '',
        dataInstalacao: os.dataInstalacao || '',
        gatiInstalacao: os.gatiInstalacao || '',
        localNome: os.clienteInstalacao || '',
        setor: os.setor || '',
        numeroOS: os.numeroOS || '',
        updatedByUid: uid,
      };
    }

    if (os.localId) {
      const locKey = sanitizeKey(os.localId);
      installedLocais[locKey] = {
        localId: os.localId,
        gatiInstalacao: os.gatiInstalacao || '',
        patrimonioInstalado: os.patrimonio,
        serieInstalada: os.numeroSerie || '',
        dataInstalacao: os.dataInstalacao || '',
        ordemServico: os.numeroOS || '',
        ordemServicoRetirada: os.numeroOSRetirada || '',
        updatedByUid: uid,
      };
    }

    if (os.substituiAnterior && os.patrimonioAnterior) {
      const retKey = sanitizeKey(os.patrimonioAnterior);
      retiredEquip[retKey] = {
        patrimonio: os.patrimonioAnterior,
        status: os.equipamentoRetirado === false ? 'nao_retirado' : 'retirado',
        dataRetirada: os.dataInstalacao || '',
        ordemServicoRetirada: os.numeroOSRetirada || '',
        contadorMono: os.contadorMono || '',
        contadorColor: os.contadorColor || '',
        contadorFinal: os.contadorPaginasFinal || '',
        updatedByUid: uid,
      };
    }
  }

  return {
    installedNovos,
    installedLocais,
    retiredEquip,
    locks: {},
    activeOrdensSummary,
    updatedByUid: uid,
    updatedAt: serverTimestamp(),
  };
}

/**
 * Inicializa o documento compartilhado /contract_sync/lorena_234 caso ainda não exista no Firestore.
 * Se o usuário for o administrador, garante também que as ordens base confirmadas existam em /ordens.
 */
export async function ensureFirestoreSeeded(uid: string, isAdminUser: boolean): Promise<void> {
  const syncPath = `${CONTRACT_SYNC_COLLECTION}/${CONTRACT_SYNC_DOC_ID}`;
  const syncRef = doc(db, CONTRACT_SYNC_COLLECTION, CONTRACT_SYNC_DOC_ID);

  try {
    const snap = await getDoc(syncRef);
    if (!snap.exists()) {
      const initial = buildInitialContractSync(uid);
      await setDoc(syncRef, initial);
    }
  } catch (err) {
    // Não interrompe fluxo offline; erros de permissão reais são tratados via handleFirestoreError
    if (err instanceof Error && err.message.includes('Missing or insufficient permissions')) {
      handleFirestoreError(err, OperationType.WRITE, syncPath);
    }
  }

  if (isAdminUser) {
    try {
      const existingSnap = await getDocs(collection(db, ORDENS_COLLECTION));
      const existingIds = new Set(existingSnap.docs.map((d) => d.id));
      const batch = writeBatch(db);
      let count = 0;

      for (const os of CONFIRMED_BASE_ORDENS) {
        const safeId = sanitizeId(os.id);
        if (!existingIds.has(safeId)) {
          const docRef = doc(db, ORDENS_COLLECTION, safeId);
          batch.set(docRef, buildOrdemFirestoreDoc(os, uid, false));
          count++;
        }
      }

      if (count > 0) {
        await batch.commit();
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('Missing or insufficient permissions')) {
        handleFirestoreError(err, OperationType.WRITE, ORDENS_COLLECTION);
      }
    }
  }
}

/**
 * Grava uma Ordem de Serviço no Firestore com anexos separados e atualiza
 * atomicamente o painel compartilhado de equipamentos/locais para todos os técnicos.
 */
export async function saveOrdemToFirestore(
  os: OrdemServico,
  uid: string,
  options?: { isNew?: boolean }
): Promise<void> {
  const safeId = sanitizeId(os.id);
  const osRef = doc(db, ORDENS_COLLECTION, safeId);
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

  const attachments: Array<{ type: 'signature' | 'relatorio' | 'avaria'; dataUrl: string }> = [];
  if (os.assinaturaClienteBase64 && byteLength(os.assinaturaClienteBase64) <= 750000) {
    attachments.push({ type: 'signature', dataUrl: os.assinaturaClienteBase64 });
  }
  if (os.fotoRelatorioContadorBase64 && byteLength(os.fotoRelatorioContadorBase64) <= 750000) {
    attachments.push({ type: 'relatorio', dataUrl: os.fotoRelatorioContadorBase64 });
  }
  if (os.fotoAvariaBase64 && byteLength(os.fotoAvariaBase64) <= 750000) {
    attachments.push({ type: 'avaria', dataUrl: os.fotoAvariaBase64 });
  }

  try {
    let existingSnap: Awaited<ReturnType<typeof getDoc>> | null = null;
    if (!options?.isNew && !isOffline) {
      try {
        existingSnap = await getDoc(osRef);
      } catch (readErr) {
        if (readErr instanceof Error && readErr.message.includes('Missing or insufficient permissions')) {
          handleFirestoreError(readErr, OperationType.GET, `${ORDENS_COLLECTION}/${safeId}`);
        }
        // Offline ou erro transitório de leitura: tenta gravar como criação
        existingSnap = null;
      }
    }

    if (!existingSnap || !existingSnap.exists()) {
      const batch = writeBatch(db);
      batch.set(osRef, buildOrdemFirestoreDoc(os, uid, attachments.length > 0));

      for (const att of attachments) {
        const attRef = doc(db, ORDENS_COLLECTION, safeId, 'attachments', att.type);
        batch.set(attRef, {
          type: att.type,
          dataUrl: att.dataUrl,
          createdByUid: uid,
          createdAt: serverTimestamp(),
        });
      }

      if (isOffline) {
        // Em modo offline, enfileira na persistência local sem travar antes do update de contract_sync
        batch.commit().catch((err) => {
          console.warn('Erro na fila offline ao gravar OS:', safeId, err);
        });
      } else {
        await batch.commit();
      }
    } else {
      const existingData = (existingSnap.data() || {}) as Record<string, any>;
      if (existingData.createdByUid === uid) {
        let addedMissingAttachment = false;
        for (const att of attachments) {
          const attRef = doc(db, ORDENS_COLLECTION, safeId, 'attachments', att.type);
          let attExists = false;
          try {
            attExists = (await getDoc(attRef)).exists();
          } catch {
            attExists = false;
          }
          if (!attExists) {
            await setDoc(attRef, {
              type: att.type,
              dataUrl: att.dataUrl,
              createdByUid: uid,
              createdAt: serverTimestamp(),
            });
            addedMissingAttachment = true;
          }
        }

        const updatePayload: Record<string, any> = {
          enviadoEmail: Boolean(os.enviadoEmail),
          envioPendenteOffline: Boolean(os.envioPendenteOffline),
          updatedAt: serverTimestamp(),
        };
        if (os.dataEnvioEmail) {
          updatePayload.dataEnvioEmail = clip(os.dataEnvioEmail, 50);
        }
        if (typeof os.restauradaDePDF === 'boolean' && os.restauradaDePDF !== existingData.restauradaDePDF) {
          updatePayload.restauradaDePDF = os.restauradaDePDF;
        }
        if (typeof os.restauradaPDF === 'boolean' && os.restauradaPDF !== existingData.restauradaPDF) {
          updatePayload.restauradaPDF = os.restauradaPDF;
        }
        if (addedMissingAttachment || attachments.length > 0 || existingData.hasAttachments) {
          updatePayload.hasAttachments = true;
        }

        await updateDoc(osRef, updatePayload);
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('Missing or insufficient permissions')) {
      handleFirestoreError(err, OperationType.WRITE, `${ORDENS_COLLECTION}/${safeId}`);
    }
    throw err;
  }

  // Atualiza estado operacional compartilhado (/contract_sync/lorena_234)
  const syncRef = doc(db, CONTRACT_SYNC_COLLECTION, CONTRACT_SYNC_DOC_ID);
  const patKey = sanitizeKey(os.patrimonio);
  const locKey = os.localId ? sanitizeKey(os.localId) : '';
  const retKey = os.substituiAnterior && os.patrimonioAnterior ? sanitizeKey(os.patrimonioAnterior) : '';

  const novoEntry: InstalledNovoSync = {
    patrimonio: os.patrimonio,
    modelo: os.modelo || '',
    dataInstalacao: os.dataInstalacao || '',
    gatiInstalacao: os.gatiInstalacao || '',
    localNome: os.clienteInstalacao || '',
    setor: os.setor || '',
    numeroOS: os.numeroOS || '',
    updatedByUid: uid,
  };

  const localEntry: InstalledLocalSync | null = locKey
    ? {
        localId: os.localId!,
        gatiInstalacao: os.gatiInstalacao || '',
        patrimonioInstalado: os.patrimonio,
        serieInstalada: os.numeroSerie || '',
        dataInstalacao: os.dataInstalacao || '',
        ordemServico: os.numeroOS || '',
        ordemServicoRetirada: os.numeroOSRetirada || '',
        updatedByUid: uid,
      }
    : null;

  const retiredEntry: RetiredEquipSync | null = retKey
    ? {
        patrimonio: os.patrimonioAnterior!,
        status: os.equipamentoRetirado === false ? 'nao_retirado' : 'retirado',
        dataRetirada: os.dataInstalacao || '',
        ordemServicoRetirada: os.numeroOSRetirada || '',
        contadorMono: os.contadorMono || '',
        contadorColor: os.contadorColor || '',
        contadorFinal: os.contadorPaginasFinal || '',
        updatedByUid: uid,
      }
    : null;

  const summaryEntry = buildOrdemSummary(os, uid);

  const buildSyncUpdates = () => {
    const u: Record<string, any> = {
      [`installedNovos.${patKey}`]: novoEntry,
      [`activeOrdensSummary.${safeId}`]: summaryEntry,
      [`locks.${patKey}`]: deleteField(),
      updatedByUid: uid,
      updatedAt: serverTimestamp(),
    };
    if (localEntry && locKey) u[`installedLocais.${locKey}`] = localEntry;
    if (retiredEntry && retKey) u[`retiredEquip.${retKey}`] = retiredEntry;
    return u;
  };

  try {
    if (isOffline) {
      updateDoc(syncRef, buildSyncUpdates()).catch((err) => {
        console.warn('Erro na fila offline ao atualizar contract_sync:', err);
      });
    } else {
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(syncRef);
        if (!snap.exists()) {
          const initial = buildInitialContractSync(uid);
          initial.installedNovos[patKey] = novoEntry;
          if (localEntry && locKey) initial.installedLocais[locKey] = localEntry;
          if (retiredEntry && retKey) initial.retiredEquip[retKey] = retiredEntry;
          initial.activeOrdensSummary[safeId] = summaryEntry;
          transaction.set(syncRef, initial);
          return;
        }
        transaction.update(syncRef, buildSyncUpdates());
      });
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('Missing or insufficient permissions')) {
      handleFirestoreError(err, OperationType.UPDATE, `${CONTRACT_SYNC_COLLECTION}/${CONTRACT_SYNC_DOC_ID}`);
    }
    try {
      await updateDoc(syncRef, buildSyncUpdates());
    } catch (fallbackErr) {
      if (fallbackErr instanceof Error && fallbackErr.message.includes('Missing or insufficient permissions')) {
        handleFirestoreError(fallbackErr, OperationType.UPDATE, `${CONTRACT_SYNC_COLLECTION}/${CONTRACT_SYNC_DOC_ID}`);
      }
      throw fallbackErr;
    }
  }
}

/**
 * Marca uma Ordem de Serviço como anulada no Firestore (somente Admin)
 * e libera o patrimônio/local no painel compartilhado.
 */
export async function annulOrdemInFirestore(os: OrdemServico, uid: string): Promise<void> {
  const hasOrdemId = Boolean(os.id && os.id.trim());
  const safeId = hasOrdemId ? sanitizeId(os.id) : '';
  const agora = new Date().toLocaleString('pt-BR');

  if (hasOrdemId) {
    const osRef = doc(db, ORDENS_COLLECTION, safeId);
    try {
      const snap = await getDoc(osRef);
      if (snap.exists()) {
        await updateDoc(osRef, {
          anulada: true,
          dataAnulacao: agora,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('Missing or insufficient permissions')) {
        handleFirestoreError(err, OperationType.UPDATE, `${ORDENS_COLLECTION}/${safeId}`);
      }
      throw err;
    }
  }

  const syncRef = doc(db, CONTRACT_SYNC_COLLECTION, CONTRACT_SYNC_DOC_ID);
  const patKey = sanitizeKey(os.patrimonio);
  const locKey = os.localId ? sanitizeKey(os.localId) : '';
  const retKey = os.substituiAnterior && os.patrimonioAnterior ? sanitizeKey(os.patrimonioAnterior) : '';

  const updates: Record<string, any> = {
    updatedByUid: uid,
    updatedAt: serverTimestamp(),
  };
  if (patKey) updates[`installedNovos.${patKey}`] = deleteField();
  if (hasOrdemId) {
    updates[`activeOrdensSummary.${safeId}.anulada`] = true;
    updates[`activeOrdensSummary.${safeId}.dataAnulacao`] = agora;
  }
  if (locKey) updates[`installedLocais.${locKey}`] = deleteField();
  if (retKey) updates[`retiredEquip.${retKey}`] = deleteField();

  try {
    await updateDoc(syncRef, updates);
  } catch (err) {
    if (err instanceof Error && err.message.includes('Missing or insufficient permissions')) {
      handleFirestoreError(err, OperationType.UPDATE, `${CONTRACT_SYNC_COLLECTION}/${CONTRACT_SYNC_DOC_ID}`);
    }
  }
}

/**
 * Carrega assinatura e fotos de uma OS armazenadas na subcoleção /attachments sob demanda.
 */
export async function loadOrdemAttachments(
  osId: string
): Promise<{
  assinaturaClienteBase64?: string;
  fotoRelatorioContadorBase64?: string;
  fotoAvariaBase64?: string;
}> {
  const safeId = sanitizeId(osId);
  const result: {
    assinaturaClienteBase64?: string;
    fotoRelatorioContadorBase64?: string;
    fotoAvariaBase64?: string;
  } = {};

  try {
    const types: Array<'signature' | 'relatorio' | 'avaria'> = ['signature', 'relatorio', 'avaria'];
    const snaps = await Promise.all(
      types.map((t) => getDoc(doc(db, ORDENS_COLLECTION, safeId, 'attachments', t)))
    );
    snaps.forEach((snap, idx) => {
      if (!snap.exists()) return;
      const dataUrl = snap.data()?.dataUrl;
      if (typeof dataUrl !== 'string') return;
      if (types[idx] === 'signature') result.assinaturaClienteBase64 = dataUrl;
      if (types[idx] === 'relatorio') result.fotoRelatorioContadorBase64 = dataUrl;
      if (types[idx] === 'avaria') result.fotoAvariaBase64 = dataUrl;
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes('Missing or insufficient permissions')) {
      handleFirestoreError(err, OperationType.GET, `${ORDENS_COLLECTION}/${safeId}/attachments`);
    }
  }

  return result;
}

/**
 * Reserva temporariamente um patrimônio para evitar que dois técnicos instalem a mesma máquina ao mesmo tempo.
 */
export async function updateLockInFirestore(
  patrimonio: string,
  tecnicoNome: string,
  uid: string,
  action: 'acquire' | 'release'
): Promise<void> {
  const syncRef = doc(db, CONTRACT_SYNC_COLLECTION, CONTRACT_SYNC_DOC_ID);
  const patKey = sanitizeKey(patrimonio);
  if (!patKey) return;

  try {
    if (action === 'release') {
      await updateDoc(syncRef, {
        [`locks.${patKey}`]: deleteField(),
        updatedByUid: uid,
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(syncRef, {
        [`locks.${patKey}`]: {
          patrimonio,
          tecnicoNome: clip(tecnicoNome || 'Técnico', 120),
          lockedByUid: uid,
          timestamp: Date.now(),
        },
        updatedByUid: uid,
        updatedAt: serverTimestamp(),
      });
    }
  } catch {
    // Falha silenciosa se estiver offline; não bloqueia o preenchimento em campo
  }
}

/**
 * Listener em tempo real do estado compartilhado do contrato (/contract_sync/lorena_234).
 */
export function subscribeToContractSync(
  onData: (syncData: ContractSyncData) => void
): Unsubscribe {
  const syncRef = doc(db, CONTRACT_SYNC_COLLECTION, CONTRACT_SYNC_DOC_ID);
  return onSnapshot(
    syncRef,
    (snap) => {
      if (snap.exists()) {
        onData(snap.data() as ContractSyncData);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `${CONTRACT_SYNC_COLLECTION}/${CONTRACT_SYNC_DOC_ID}`);
    }
  );
}

/**
 * Listener em tempo real da coleção /ordens.
 * O Administrador recebe todas as OSs de todos os técnicos; cada técnico recebe as suas OSs criadas.
 */
export function subscribeToOrdens(
  uid: string,
  isAdminUser: boolean,
  onData: (ordens: OrdemServico[]) => void
): Unsubscribe {
  const q = isAdminUser
    ? query(collection(db, ORDENS_COLLECTION))
    : query(collection(db, ORDENS_COLLECTION), where('createdByUid', '==', uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: OrdemServico[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          ...(data as OrdemServico),
          id: data.id || d.id,
        };
      });
      list.sort((a, b) => (b.dataRegistro || '').localeCompare(a.dataRegistro || ''));
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, ORDENS_COLLECTION);
    }
  );
}
