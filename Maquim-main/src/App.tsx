import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { InstallationForm } from './components/InstallationForm';
import { SpreadsheetViewerModal } from './components/SpreadsheetViewerModal';
import { HistoryModal } from './components/HistoryModal';
import { ChecklistModal } from './components/ChecklistModal';
import {
  getNovosEquipamentos,
  saveNovosEquipamentos,
  getLocaisDistribuicao,
  saveLocaisDistribuicao,
  getEquipamentosAnteriores,
  saveEquipamentosAnteriores,
  getOrdensServico,
  saveOrdemServico,
  getTecnicoPadrao,
  saveTecnicoPadrao,
  resetAllDataToDefault,
  updateLocalOrdemServico,
  updateLocalOrdemServicoRetirada,
} from './data/mockDatabase';
import {
  NovoEquipamento,
  LocalDistribuicao,
  EquipamentoAnterior,
  OrdemServico,
} from './types';
import {
  PlusCircle,
  LayoutDashboard,
  FileSpreadsheet,
  History,
  ShieldCheck,
  WifiOff,
  CloudCheck,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { useMobileKeyboard, useOnlineStatus } from './hooks/useMobileKeyboard';
import { requestPersistentStorage, loadOrdens, putOrdem } from './data/osStore';
import { useFirebaseAuth } from './firebase/FirebaseProvider';
import {
  ensureFirestoreSeeded,
  saveOrdemToFirestore,
  annulOrdemInFirestore,
  subscribeToContractSync,
  subscribeToOrdens,
  ContractSyncData,
} from './firebase/firestoreService';

function sanitizeSyncKey(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/[.\[\]~*/]/g, '_');
}

export default function App() {
  const { user, isAdmin, canAnnul, canManageSpreadsheets, isAnonymous, signInWithGoogle, signOutUser } = useFirebaseAuth();
  const [currentView, setCurrentView] = useState<'form' | 'dashboard'>('form');
  const [selectedLocalId, setSelectedLocalId] = useState<string | undefined>();
  const [formKey, setFormKey] = useState(0);
  const online = useOnlineStatus();
  useMobileKeyboard();

  // Modais
  const [isSpreadsheetOpen, setIsSpreadsheetOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);

  // Dados locais + nuvem em tempo real
  const [novosEquipamentos, setNovosEquipamentos] = useState<NovoEquipamento[]>([]);
  const [locaisDistribuicao, setLocaisDistribuicao] = useState<LocalDistribuicao[]>([]);
  const [equipamentosAnteriores, setEquipamentosAnteriores] = useState<EquipamentoAnterior[]>([]);
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [tecnicoNome, setTecnicoNome] = useState<string>('');

  const [cloudOrdens, setCloudOrdens] = useState<OrdemServico[] | null>(null);
  const [contractSync, setContractSync] = useState<ContractSyncData | null>(null);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const autoSyncedIdsRef = useRef<Set<string>>(new Set());
  const syncRefLatest = useRef<ContractSyncData | null>(null);
  const cloudOrdensLatest = useRef<OrdemServico[] | null>(null);
  syncRefLatest.current = contractSync;
  cloudOrdensLatest.current = cloudOrdens;

  const applyMergedState = useCallback(
    async (localList: OrdemServico[], cloudList: OrdemServico[] | null, sync: ContractSyncData | null) => {
      // 1. Mescla OSs locais (que podem conter fotos/assinaturas/PDFs em cache) com a nuvem
      const map = new Map<string, OrdemServico>();
      for (const locOs of localList) {
        map.set(locOs.id, locOs);
      }
      if (cloudList) {
        for (const cOs of cloudList) {
          const prev = map.get(cOs.id);
          const merged: OrdemServico = prev
            ? {
                ...prev,
                ...cOs,
                assinaturaClienteBase64: cOs.assinaturaClienteBase64 || prev.assinaturaClienteBase64,
                fotoRelatorioContadorBase64: cOs.fotoRelatorioContadorBase64 || prev.fotoRelatorioContadorBase64,
                fotoAvariaBase64: cOs.fotoAvariaBase64 || prev.fotoAvariaBase64,
                pdfsOriginais: prev.pdfsOriginais,
              }
            : cOs;
          map.set(cOs.id, merged);

          // Espelha no IndexedDB para disponibilidade offline imediata
          if (
            !prev ||
            prev.anulada !== merged.anulada ||
            prev.enviadoEmail !== merged.enviadoEmail ||
            prev.dataAnulacao !== merged.dataAnulacao
          ) {
            putOrdem(merged).catch(() => {});
          }
        }
      }

      const mergedOrdens = Array.from(map.values()).sort((a, b) =>
        (b.dataRegistro || '').localeCompare(a.dataRegistro || '')
      );
      setOrdens(mergedOrdens);

      // 2. Mapeia OSs ativas e anuladas (com normalização para reconciliação única)
      const normKey = (v?: string) =>
        String(v || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .toUpperCase();

      const ativosNovosMap = new Map<string, OrdemServico>();
      const ativosLocaisMap = new Map<string, OrdemServico>();
      const ativosRetMap = new Map<string, OrdemServico>();
      const anuladosNovos = new Set<string>();
      const anuladosLocais = new Set<string>();
      const anuladosRet = new Set<string>();
      const osAtivasList: OrdemServico[] = [];

      for (const o of mergedOrdens) {
        const pat = String(o.patrimonio || '').trim();
        const patAnt = String(o.patrimonioAnterior || '').trim();
        if (o.anulada) {
          if (pat) anuladosNovos.add(pat);
          if (o.localId) anuladosLocais.add(o.localId);
          if (patAnt) anuladosRet.add(patAnt);
        } else {
          osAtivasList.push(o);
          if (pat && !ativosNovosMap.has(pat)) ativosNovosMap.set(pat, o);
          if (o.localId && !ativosLocaisMap.has(o.localId)) ativosLocaisMap.set(o.localId, o);
          if (o.substituiAnterior && patAnt) ativosRetMap.set(patAnt, o);
        }
      }

      if (sync?.activeOrdensSummary) {
        for (const s of Object.values(sync.activeOrdensSummary)) {
          const pat = String(s.patrimonio || '').trim();
          const patAnt = String(s.patrimonioAnterior || '').trim();
          if (s.anulada) {
            if (pat) anuladosNovos.add(pat);
            if (s.localId) anuladosLocais.add(s.localId);
            if (patAnt) anuladosRet.add(patAnt);
          }
        }
      }

      // 3. Reconcilia Locais de Distribuição (1 patrimônio por local, sem duplicidade e sem OS órfã)
      const rawLocais = getLocaisDistribuicao();
      const patrimoniosJaAlocadosEmLocais = new Set<string>();
      const osJaVinculadasALocais = new Set<string>();

      // Passo 3A: Aplica vínculos diretos (cloudLoc, localId exato ou registro já instalado) evitando duplicidade de patrimônio
      const prelimLocais = rawLocais.map((l) => {
        const locKey = sanitizeSyncKey(l.id);
        const cloudLoc = sync?.installedLocais?.[locKey];
        const localAtivo = ativosLocaisMap.get(l.id);

        if (anuladosLocais.has(l.id) && !cloudLoc && !localAtivo && l.status === 'instalado') {
          const next = { ...l, status: 'pendente' as const, protegido: false };
          delete next.patrimonioInstalado;
          delete next.serieInstalada;
          delete next.dataInstalacao;
          return next;
        }

        const candPat = String(
          cloudLoc?.patrimonioInstalado || localAtivo?.patrimonio || l.patrimonioInstalado || ''
        ).trim();

        if (candPat && patrimoniosJaAlocadosEmLocais.has(candPat)) {
          // Evita que o mesmo patrimônio (ex: 8430) fique duplicado em dois locais diferentes
          const next = { ...l, status: 'pendente' as const, protegido: false };
          delete next.patrimonioInstalado;
          delete next.serieInstalada;
          delete next.dataInstalacao;
          return next;
        }

        if (cloudLoc && candPat) {
          patrimoniosJaAlocadosEmLocais.add(candPat);
          if (localAtivo) osJaVinculadasALocais.add(localAtivo.id);
          return {
            ...l,
            status: 'instalado' as const,
            patrimonioInstalado: candPat,
            serieInstalada: cloudLoc.serieInstalada || l.serieInstalada,
            dataInstalacao: cloudLoc.dataInstalacao || l.dataInstalacao,
            ordemServico: cloudLoc.ordemServico || l.ordemServico,
            ordemServicoRetirada: cloudLoc.ordemServicoRetirada || l.ordemServicoRetirada,
            protegido: true,
          };
        }
        if (localAtivo && candPat) {
          patrimoniosJaAlocadosEmLocais.add(candPat);
          osJaVinculadasALocais.add(localAtivo.id);
          return {
            ...l,
            status: 'instalado' as const,
            patrimonioInstalado: candPat,
            serieInstalada: localAtivo.numeroSerie || l.serieInstalada,
            dataInstalacao: localAtivo.dataInstalacao || l.dataInstalacao,
            ordemServico: localAtivo.numeroOS || l.ordemServico,
            ordemServicoRetirada: localAtivo.numeroOSRetirada || l.ordemServicoRetirada,
            protegido: true,
          };
        }
        if (l.status === 'instalado' && candPat) {
          patrimoniosJaAlocadosEmLocais.add(candPat);
          const osMatch = ativosNovosMap.get(candPat);
          if (osMatch) osJaVinculadasALocais.add(osMatch.id);
          return {
            ...l,
            ordemServico: l.ordemServico || osMatch?.numeroOS || '',
            ordemServicoRetirada: l.ordemServicoRetirada || osMatch?.numeroOSRetirada || '',
            protegido: true,
          };
        }
        return l;
      });

      // Passo 3B: Vincula OSs ativas que ficaram sem localId (ex: restauradas de PDF ou IDs antigos) ao próximo local livre correspondente
      const syncedLocais = [...prelimLocais];
      for (const o of osAtivasList) {
        const pat = String(o.patrimonio || '').trim();
        if (!pat || osJaVinculadasALocais.has(o.id) || patrimoniosJaAlocadosEmLocais.has(pat)) continue;

        const gatiOS = normKey(o.gatiInstalacao);
        const cliOS = normKey(o.clienteInstalacao);
        const setorOS = normKey(o.setor);

        let targetIdx = syncedLocais.findIndex(
          (l) =>
            l.status !== 'instalado' &&
            normKey(l.gatiInstalacao) === gatiOS &&
            normKey(l.clienteInstalacao) === cliOS &&
            (!setorOS || normKey(l.localizacao || l.setor) === setorOS)
        );
        if (targetIdx === -1) {
          targetIdx = syncedLocais.findIndex(
            (l) => l.status !== 'instalado' && normKey(l.gatiInstalacao) === gatiOS
          );
        }
        if (targetIdx !== -1) {
          patrimoniosJaAlocadosEmLocais.add(pat);
          osJaVinculadasALocais.add(o.id);
          const l = syncedLocais[targetIdx];
          syncedLocais[targetIdx] = {
            ...l,
            status: 'instalado',
            patrimonioInstalado: pat,
            serieInstalada: o.numeroSerie || l.serieInstalada,
            dataInstalacao: o.dataInstalacao || l.dataInstalacao,
            ordemServico: o.numeroOS || l.ordemServico,
            ordemServicoRetirada: o.numeroOSRetirada || l.ordemServicoRetirada,
            protegido: true,
          };
        }
      }

      setLocaisDistribuicao(syncedLocais);
      saveLocaisDistribuicao(syncedLocais);

      // 4. Sincroniza Novos Equipamentos como fonte única consistente com OSs Ativas + Locais Instalados
      const locaisPorPatrimonio = new Map<string, LocalDistribuicao>();
      for (const l of syncedLocais) {
        const p = String(l.patrimonioInstalado || '').trim();
        if (l.status === 'instalado' && p && !locaisPorPatrimonio.has(p)) {
          locaisPorPatrimonio.set(p, l);
        }
      }

      const rawNovos = getNovosEquipamentos();
      const syncedNovos = rawNovos.map((n) => {
        const pat = String(n.patrimonio).trim();
        const patKey = sanitizeSyncKey(pat);
        const cloudNovo = sync?.installedNovos?.[patKey];
        const localAtivo = ativosNovosMap.get(pat);
        const locVinculado = locaisPorPatrimonio.get(pat);

        if (localAtivo || locVinculado || cloudNovo) {
          return {
            ...n,
            status: 'instalado' as const,
            dataInstalacao: localAtivo?.dataInstalacao || locVinculado?.dataInstalacao || cloudNovo?.dataInstalacao || n.dataInstalacao,
            gatiInstalacao: localAtivo?.gatiInstalacao || locVinculado?.gatiInstalacao || cloudNovo?.gatiInstalacao || n.gatiInstalacao,
            osId: localAtivo?.numeroOS || locVinculado?.ordemServico || cloudNovo?.numeroOS || n.osId,
            ordemServico: localAtivo?.numeroOS || locVinculado?.ordemServico || cloudNovo?.numeroOS || n.ordemServico,
          };
        }
        if (anuladosNovos.has(pat) && n.status === 'instalado') {
          const next = { ...n, status: 'disponivel' as const };
          delete next.dataInstalacao;
          delete next.gatiInstalacao;
          delete next.osId;
          return next;
        }
        return n;
      });
      setNovosEquipamentos(syncedNovos);
      saveNovosEquipamentos(syncedNovos);

      // 5. Sincroniza Equipamentos Anteriores (Retiradas)
      const rawRetiradas = getEquipamentosAnteriores();
      const syncedRetiradas = rawRetiradas.map((r) => {
        const pat = String(r.patrimonio).trim();
        const retKey = sanitizeSyncKey(pat);
        const cloudRet = sync?.retiredEquip?.[retKey];
        const localAtivo = ativosRetMap.get(pat);

        if (cloudRet) {
          return {
            ...r,
            status: cloudRet.status || ('retirado' as const),
            dataRetirada: cloudRet.dataRetirada || r.dataRetirada,
            ordemServicoRetirada: cloudRet.ordemServicoRetirada || r.ordemServicoRetirada,
            contadorMono: cloudRet.contadorMono || r.contadorMono,
            contadorColor: cloudRet.contadorColor || r.contadorColor,
            contadorFinal: cloudRet.contadorFinal || r.contadorFinal,
            protegido: true,
          };
        }
        if (localAtivo) {
          return {
            ...r,
            status: localAtivo.equipamentoRetirado === false ? ('nao_retirado' as const) : ('retirado' as const),
            dataRetirada: localAtivo.dataInstalacao || r.dataRetirada,
            ordemServicoRetirada: localAtivo.numeroOSRetirada || r.ordemServicoRetirada,
            contadorMono: localAtivo.contadorMono || r.contadorMono,
            contadorColor: localAtivo.contadorColor || r.contadorColor,
            contadorFinal: localAtivo.contadorPaginasFinal || r.contadorFinal,
            protegido: true,
          };
        }
        if (anuladosRet.has(pat) && r.status === 'retirado') {
          const next = { ...r, status: 'a_retirar' as const, protegido: false };
          delete next.dataRetirada;
          delete next.contadorMono;
          delete next.contadorColor;
          delete next.contadorFinal;
          return next;
        }
        return r;
      });
      setEquipamentosAnteriores(syncedRetiradas);
      saveEquipamentosAnteriores(syncedRetiradas);
    },
    []
  );

  const refreshData = useCallback(() => {
    const savedTec = getTecnicoPadrao();
    if (savedTec) {
      setTecnicoNome(savedTec);
    } else if (user?.displayName) {
      setTecnicoNome(user.displayName);
      saveTecnicoPadrao(user.displayName);
    }

    getOrdensServico()
      .then((loaded) => applyMergedState(loaded, cloudOrdensLatest.current, syncRefLatest.current))
      .catch((e) => console.error('Erro ao carregar OSs:', e));
  }, [applyMergedState, user?.displayName]);

  // Inicialização e listeners em tempo real no Firebase Firestore
  useEffect(() => {
    refreshData();
    requestPersistentStorage();
  }, [refreshData]);

  useEffect(() => {
    if (!user) return;

    let unsubSync: (() => void) | undefined;
    let unsubOrdens: (() => void) | undefined;
    let cancelled = false;

    const initFirebaseListeners = async () => {
      try {
        await ensureFirestoreSeeded(user.uid, canAnnul);
      } catch (err) {
        console.error('Erro ao inicializar base no Firestore:', err);
      }
      if (cancelled) return;

      unsubSync = subscribeToContractSync((syncData) => {
        setContractSync(syncData);
        loadOrdens()
          .then((locais) => applyMergedState(locais, cloudOrdensLatest.current, syncData))
          .catch(() => {});
      });

      unsubOrdens = subscribeToOrdens(user.uid, isAdmin, async (cloudList) => {
        setCloudOrdens(cloudList);
        const locais = await loadOrdens().catch(() => [] as OrdemServico[]);
        await applyMergedState(locais, cloudList, syncRefLatest.current);

        // Auto-upload de OSs criadas localmente antes da ativação da nuvem (ou enquanto estava offline)
        const pendingLocalUploads = locais.filter(
          (loc) =>
            !loc.id.startsWith('os-base-') &&
            !autoSyncedIdsRef.current.has(loc.id) &&
            !cloudList.some(
              (c) =>
                c.id === loc.id ||
                (loc.numeroOS && c.numeroOS === loc.numeroOS && c.patrimonio === loc.patrimonio)
            )
        );

        if (pendingLocalUploads.length > 0 && navigator.onLine) {
          setIsSyncingCloud(true);
          let uploadedCount = 0;
          let failedCount = 0;
          for (const pending of pendingLocalUploads) {
            autoSyncedIdsRef.current.add(pending.id);
            try {
              await saveOrdemToFirestore(pending, user.uid);
              uploadedCount++;
            } catch (err) {
              autoSyncedIdsRef.current.delete(pending.id);
              failedCount++;
              console.error('Falha ao auto-enviar OS local para a nuvem:', pending.id, err);
            }
          }
          setIsSyncingCloud(false);
          if (failedCount > 0) {
            setSyncError(
              `${failedCount} OS(s) salva(s) neste aparelho ainda não subiram para o Firebase. Toque em "Sincronizar agora" com internet ativa.`
            );
          } else if (uploadedCount > 0) {
            setSyncError(null);
            setSyncNotice(
              `${uploadedCount} Ordem(ns) de Serviço que estava(m) salva(s) neste aparelho foi(ram) enviada(s) para o banco em nuvem.`
            );
            setTimeout(() => setSyncNotice(null), 8000);
          }
        }
      });
    };

    initFirebaseListeners();

    return () => {
      cancelled = true;
      unsubSync?.();
      unsubOrdens?.();
    };
  }, [user, isAdmin, canAnnul, applyMergedState]);

  const unsyncedOrdens = useMemo(() => {
    if (!cloudOrdens) return [];
    return ordens.filter(
      (loc) =>
        !loc.id.startsWith('os-base-') &&
        !cloudOrdens.some(
          (c) =>
            c.id === loc.id ||
            (loc.numeroOS && c.numeroOS === loc.numeroOS && c.patrimonio === loc.patrimonio)
        )
    );
  }, [ordens, cloudOrdens]);

  const syncPendingOrdensNow = useCallback(async () => {
    if (!user || isSyncingCloud) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSyncError('Sem internet no momento. Assim que o sinal voltar, toque em "Sincronizar agora".');
      return;
    }

    const locais = await loadOrdens().catch(() => [] as OrdemServico[]);
    const cloudList = cloudOrdensLatest.current || [];
    const pending = locais.filter(
      (loc) =>
        !loc.id.startsWith('os-base-') &&
        !cloudList.some(
          (c) =>
            c.id === loc.id ||
            (loc.numeroOS && c.numeroOS === loc.numeroOS && c.patrimonio === loc.patrimonio)
        )
    );

    if (!pending.length) {
      setSyncError(null);
      return;
    }

    setIsSyncingCloud(true);
    setSyncError(null);
    let uploadedCount = 0;
    let lastError = '';
    for (const os of pending) {
      autoSyncedIdsRef.current.add(os.id);
      try {
        await saveOrdemToFirestore(os, user.uid);
        uploadedCount++;
      } catch (err: any) {
        autoSyncedIdsRef.current.delete(os.id);
        lastError = err?.message || 'Erro de permissão ou conexão';
        console.error('Erro ao sincronizar OS pendente:', os.id, err);
      }
    }
    setIsSyncingCloud(false);

    if (uploadedCount > 0 && !lastError) {
      setSyncNotice(`${uploadedCount} OS(s) sincronizada(s) com sucesso no Firebase.`);
      setTimeout(() => setSyncNotice(null), 8000);
    } else if (lastError) {
      setSyncError(
        `Falha ao enviar para o Firebase (${pending.length - uploadedCount} pendente(s)). Verifique sua conexão ou recarregue o app.`
      );
    }
  }, [user, isSyncingCloud]);

  // Re-sincroniza pendências locais assim que a internet voltar no aparelho
  useEffect(() => {
    if (!online || !user || !cloudOrdens) return;
    let active = true;
    (async () => {
      const locais = await loadOrdens().catch(() => [] as OrdemServico[]);
      const pending = locais.filter(
        (loc) =>
          !loc.id.startsWith('os-base-') &&
          !autoSyncedIdsRef.current.has(loc.id) &&
          !cloudOrdens.some((c) => c.id === loc.id)
      );
      if (!pending.length || !active) return;
      setIsSyncingCloud(true);
      let okCount = 0;
      let errCount = 0;
      for (const os of pending) {
        autoSyncedIdsRef.current.add(os.id);
        try {
          await saveOrdemToFirestore(os, user.uid);
          okCount++;
        } catch (err) {
          autoSyncedIdsRef.current.delete(os.id);
          errCount++;
          console.error('Falha ao re-sincronizar OS ao voltar online:', os.id, err);
        }
      }
      if (active) {
        setIsSyncingCloud(false);
        if (errCount > 0) {
          setSyncError(`${errCount} OS(s) não conseguiram subir automaticamente. Toque em "Sincronizar agora".`);
        } else if (okCount > 0) {
          setSyncError(null);
          setSyncNotice(`${okCount} OS(s) offline enviada(s) automaticamente para o Firebase.`);
          setTimeout(() => setSyncNotice(null), 8000);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [online, user, cloudOrdens]);

  const handleUpdateTecnico = (nome: string) => {
    setTecnicoNome(nome);
    saveTecnicoPadrao(nome);
  };

  const handleSaveOS = async (novaOS: OrdemServico) => {
    try {
      // 1. Garante persistência imediata local (IndexedDB + LocalStorage)
      await saveOrdemServico(novaOS);

      // 2. Grava no Firebase Firestore (se offline, entra na fila persistente local sem travar a tela)
      if (user) {
        setIsSyncingCloud(true);
        setSyncError(null);
        const cloudWrite = saveOrdemToFirestore(novaOS, user.uid, { isNew: true })
          .then(() => {
            setSyncError(null);
          })
          .catch((err) => {
            console.error('Erro ao gravar OS na nuvem (mantida no aparelho):', err);
            setSyncError(
              `A OS do Patr. #${novaOS.patrimonio} foi salva neste aparelho, mas falhou ao subir para o Firebase. Toque em "Sincronizar agora".`
            );
          })
          .finally(() => {
            setIsSyncingCloud(false);
          });

        if (typeof navigator !== 'undefined' && navigator.onLine) {
          await Promise.race([
            cloudWrite,
            new Promise<void>((resolve) => setTimeout(resolve, 6000)),
          ]);
        }
      }
    } finally {
      refreshData();
    }
  };

  const handleSaveRestoredOS = async (restoredOS: OrdemServico) => {
    if (!user) return;
    setIsSyncingCloud(true);
    try {
      await saveOrdemToFirestore(restoredOS, user.uid);
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handleAnnulFirestoreOS = async (os: OrdemServico) => {
    if (!user || !canAnnul) return;
    setIsSyncingCloud(true);
    try {
      await annulOrdemInFirestore(os, user.uid);
    } finally {
      setIsSyncingCloud(false);
      refreshData();
    }
  };

  const handleAnnulLocalFromSpreadsheet = async (local: LocalDistribuicao, patrimonioLiberado?: string) => {
    if (!user || !canAnnul) return;
    const patTarget = (patrimonioLiberado || local.patrimonioInstalado || '').trim();
    const matchingOS = ordens.find(
      (o) => !o.anulada && (o.localId === local.id || (patTarget && o.patrimonio === patTarget))
    );

    setIsSyncingCloud(true);
    try {
      if (matchingOS) {
        await annulOrdemInFirestore(matchingOS, user.uid);
      } else {
        await annulOrdemInFirestore(
          {
            id: '',
            numeroOS: local.ordemServico || '',
            dataRegistro: new Date().toISOString(),
            dataInstalacao: local.dataInstalacao || '',
            tecnicoNome: tecnicoNome || 'Admin',
            localId: local.id,
            gatiInstalacao: local.gatiInstalacao,
            secretaria: local.secretaria,
            clienteInstalacao: local.clienteInstalacao,
            endereco: local.endereco,
            bairro: local.bairro,
            setor: local.setor,
            patrimonio: patTarget,
            numeroSerie: local.serieInstalada || '',
            modelo: local.modeloPrevisto,
            tipoConexao: 'Via Rede',
            conferenciaERS: true,
            substituiAnterior: false,
            responsavelNome: local.responsavelLocal || 'Admin',
            responsavelCPF: '000.000.000-00',
            enviadoEmail: true,
            emailDestinatario: 'contratos2@maquim.com.br',
          },
          user.uid
        );
      }
    } finally {
      setIsSyncingCloud(false);
      refreshData();
    }
  };

  const handleUpdateLocalOS = (localId: string, numeroOS: string) => {
    updateLocalOrdemServico(localId, numeroOS);
    refreshData();
  };

  const handleStartInstallationFromLocation = (localId?: string) => {
    setSelectedLocalId(localId);
    setFormKey((k) => k + 1);
    setCurrentView('form');
  };

  const ordensAtivas = ordens.filter((o) => !o.anulada);

  const totalNovos = novosEquipamentos.length;
  const instaladosNovos = novosEquipamentos.filter((e) => e.status === 'instalado').length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        currentView={currentView}
        onChangeView={(view) => {
          setSelectedLocalId(undefined);
          setCurrentView(view);
        }}
        onOpenSpreadsheet={() => setIsSpreadsheetOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenChecklist={() => setIsChecklistOpen(true)}
        totalNovos={totalNovos}
        instaladosNovos={instaladosNovos}
        tecnicoNome={tecnicoNome}
        onUpdateTecnico={handleUpdateTecnico}
        isOnline={online}
        isSyncing={isSyncingCloud}
        isAnonymous={isAnonymous}
        userEmail={user?.email}
        onSignInAdmin={signInWithGoogle}
        onSignOut={signOutUser}
      />

      {/* Quick Mobile Bar */}
      <div className="sm:hidden bg-[#0B1B3D] border-b border-blue-900/60 px-4 py-2 flex items-center justify-between text-xs text-slate-300">
        <button
          onClick={() => {
            setSelectedLocalId(undefined);
            setCurrentView('form');
          }}
          className={`flex items-center gap-1 py-1 px-2.5 rounded-lg ${
            currentView === 'form' ? 'bg-[#0D52BD] text-white font-bold' : ''
          }`}
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Formulário
        </button>

        <button
          onClick={() => setCurrentView('dashboard')}
          className={`flex items-center gap-1 py-1 px-2.5 rounded-lg ${
            currentView === 'dashboard' ? 'bg-[#0D52BD] text-white font-bold' : ''
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          Visão Geral
        </button>

        <button
          onClick={() => setIsSpreadsheetOpen(true)}
          className="flex items-center gap-1 py-1 px-2.5 rounded-lg text-emerald-400"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          Planilhas
        </button>

        <button
          onClick={() => setIsHistoryOpen(true)}
          className="flex items-center gap-1 py-1 px-2.5 rounded-lg text-blue-400"
        >
          <History className="w-3.5 h-3.5" />
          Histórico
        </button>

        <button
          onClick={() => setIsChecklistOpen(true)}
          className="flex items-center gap-1 py-1 px-2 rounded-lg text-amber-300 font-bold"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Guia
        </button>
      </div>

      {/* Avisos de conexão e sincronização */}
      {(!online || syncNotice || syncError || unsyncedOrdens.length > 0) && (
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-3 space-y-2">
          {syncNotice && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-semibold">
              <CloudCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700" />
              <span>{syncNotice}</span>
            </div>
          )}
          {(syncError || unsyncedOrdens.length > 0) && (
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-semibold">
              <div className="flex items-start gap-2 min-w-0">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                <span>
                  {syncError ||
                    `${unsyncedOrdens.length} OS(s) salva(s) neste aparelho ainda aguardando envio ao Firebase (${unsyncedOrdens.map((o) => `Patr. #${o.patrimonio}`).slice(0, 4).join(', ')}${unsyncedOrdens.length > 4 ? '...' : ''}).`}
                </span>
              </div>
              <button
                type="button"
                onClick={syncPendingOrdensNow}
                disabled={isSyncingCloud}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-[11px] font-bold shrink-0 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-spin' : ''}`} />
                {isSyncingCloud ? 'Sincronizando...' : 'Sincronizar agora'}
              </button>
            </div>
          )}
          {!online && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-800 text-white text-xs">
              <WifiOff className="w-4 h-4 shrink-0 mt-0.5 text-amber-300" />
              <span>
                <strong>Sem internet.</strong> Pode continuar trabalhando normalmente: os dados, fotos,
                assinaturas e PDFs ficam salvos neste aparelho e serão enviados automaticamente ao Firebase quando a conexão voltar.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Main View Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-6 pb-[var(--kb-height,0px)]">
        {currentView === 'form' ? (
          <InstallationForm
            key={formKey}
            online={online}
            novosEquipamentos={novosEquipamentos}
            locaisDistribuicao={locaisDistribuicao}
            equipamentosAnteriores={equipamentosAnteriores}
            ordens={ordens}
            tecnicoPadrao={tecnicoNome}
            onSaveOS={handleSaveOS}
            preSelectedLocalId={selectedLocalId}
          />
        ) : (
          <Dashboard
            novosEquipamentos={novosEquipamentos}
            locaisDistribuicao={locaisDistribuicao}
            equipamentosAnteriores={equipamentosAnteriores}
            ordens={ordensAtivas}
            onStartInstallation={handleStartInstallationFromLocation}
            onOpenSpreadsheet={() => setIsSpreadsheetOpen(true)}
            onOpenHistory={() => setIsHistoryOpen(true)}
          />
        )}
      </main>

      {/* Modais Compartilhados */}
      <SpreadsheetViewerModal
        isOpen={isSpreadsheetOpen}
        onClose={() => setIsSpreadsheetOpen(false)}
        novosEquipamentos={novosEquipamentos}
        locaisDistribuicao={locaisDistribuicao}
        equipamentosAnteriores={equipamentosAnteriores}
        onSelectLocalParaInstalar={handleStartInstallationFromLocation}
        onUpdateOS={handleUpdateLocalOS}
        onUpdateOSRetirada={(localId, osRet) => {
          updateLocalOrdemServicoRetirada(localId, osRet);
          refreshData();
        }}
        onResetData={
          canManageSpreadsheets
            ? () => {
                resetAllDataToDefault();
                refreshData();
              }
            : undefined
        }
        onRefreshData={refreshData}
        isAdmin={isAdmin}
        canAnnul={canAnnul}
        canManageSpreadsheets={canManageSpreadsheets}
        onAnnulLocal={handleAnnulLocalFromSpreadsheet}
      />

      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        ordens={ordens}
        locaisDistribuicao={locaisDistribuicao}
        novosEquipamentos={novosEquipamentos}
        online={online}
        isAdmin={isAdmin}
        canAnnul={canAnnul}
        isAnonymous={isAnonymous}
        onSignInAdmin={signInWithGoogle}
        onUpdateOS={handleSaveOS}
        onSaveRestoredOS={handleSaveRestoredOS}
        onAnnulFirestoreOS={handleAnnulFirestoreOS}
        onAnnulSpreadsheetLocal={handleAnnulLocalFromSpreadsheet}
        onRefresh={refreshData}
      />

      <ChecklistModal
        isOpen={isChecklistOpen}
        onClose={() => setIsChecklistOpen(false)}
      />
    </div>
  );
}
