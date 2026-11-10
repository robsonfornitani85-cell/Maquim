import { NovoEquipamento, LocalDistribuicao, EquipamentoAnterior, OrdemServico } from '../types';
import realData from './realContractData.json';
import { loadOrdens, putOrdem } from './osStore';

// Senha de anulação: o app guarda só a "impressão digital" (hash SHA-256) da senha,
// nunca a senha em texto. Para trocar a senha, gere um novo hash de
// 'maquim-lorena:<nova senha>' e substitua abaixo.
const PASSWORD_HASH = '466203779afe70fdf19565ecb6031672d1f1d9eaca54f08440544c1e2ae9bfb4';

export async function verifyProtectionPassword(password: string): Promise<boolean> {
  try {
    const data = new TextEncoder().encode(`maquim-lorena:${password.trim()}`);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const hex = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return hex === PASSWORD_HASH;
  } catch {
    return false;
  }
}

// Chaves de armazenamento versionadas (v6 com 170 OSs de retirada vinculadas e finalizações de 4423, 8479, 8472)
const STORAGE_KEYS = {
  NOVOS: 'maquim_novos_equipamentos_v6_lorena',
  LOCAIS: 'maquim_locais_distribuicao_v6_lorena',
  RETIRADAS: 'maquim_equipamentos_anteriores_v6_lorena',
  TECNICO: 'maquim_tecnico_padrao_v6',
};

// Carrega os 234 equipamentos novos reais extraídos da planilha do OneDrive
export function buildInitialNovosEquipamentos(): NovoEquipamento[] {
  return (realData.novos as NovoEquipamento[]).map(item => ({
    ...item,
    status: item.status || 'disponivel',
  }));
}

// Carrega os 234 locais reais de Lorena da planilha de Distribuição do OneDrive
export function buildInitialLocaisDistribuicao(): LocalDistribuicao[] {
  return (realData.locais as LocalDistribuicao[]).map(loc => ({
    ...loc,
    status: loc.status || 'pendente',
    ordemServico: loc.ordemServico || '',
    ordemServicoRetirada: (loc as any).ordemServicoRetirada || '',
    protegido: loc.status === 'instalado',
  }));
}

// Carrega os 260 equipamentos anteriores reais da planilha de Retirada do OneDrive
export function buildInitialEquipamentosAnteriores(): EquipamentoAnterior[] {
  return (realData.retiradas as any[]).map(ret => ({
    patrimonio: String(ret.patrimonio || '').trim(),
    numeroSerie: String(ret.numeroSerie || '').trim(),
    modelo: String(ret.modelo || '').trim(),
    secretaria: String(ret.secretaria || '').trim(),
    clienteInstalacao: String(ret.clienteInstalacao || '').trim(),
    gatiInstalacao: String(ret.gatiInstalacao || '').trim(),
    localizacao: String(ret.localizacao || '').trim(),
    conectividadeIp: String(ret.ip || '').trim(),
    tipoEquipamento: String(ret.tipo || (ret.modelo?.includes('5790') ? 'Color' : 'Mono')).trim(),
    status: (ret.status as any) || 'a_retirar',
    dataRetirada: ret.dataRetirada || undefined,
    ordemServicoRetirada: ret.ordemServicoRetirada || '',
    caboEnergiaRetirado: ret.caboEnergiaRetirado,
    bandejaSaidaRetirada: ret.bandejaSaidaRetirada,
    avariasEncontradas: ret.avariasEncontradas,
    descricaoAvarias: ret.descricaoAvarias,
    protegido: ret.status === 'retirado',
  }));
}

/**
 * Aparelhos que já abriram o app guardam uma cópia das planilhas. Quando o
 * banco oficial (realContractData.json) recebe novos Nº de OS, esta função
 * preenche na cópia do aparelho as OSs que ainda estão em branco, casando por
 * patrimônio + nº de série. Nunca apaga nem sobrescreve uma OS já existente.
 */
function sincronizarOS<T extends { patrimonio: string; numeroSerie: string }>(
  salvos: T[],
  oficiais: T[],
  campo: keyof T
): { lista: T[]; alterou: boolean } {
  const chave = (x: T) => `${String(x.patrimonio).trim()}|${String(x.numeroSerie).trim().toUpperCase()}`;
  const mapa = new Map<string, unknown>();
  oficiais.forEach((o) => {
    const v = o[campo];
    if (v) mapa.set(chave(o), v);
  });
  let alterou = false;
  salvos.forEach((item) => {
    if (!item[campo]) {
      const v = mapa.get(chave(item));
      if (v) {
        (item as any)[campo] = v;
        alterou = true;
      }
    }
  });
  return { lista: salvos, alterou };
}

// Funções de gerenciamento com LocalStorage
export function getNovosEquipamentos(): NovoEquipamento[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOVOS);
    if (raw) {
      const { lista, alterou } = sincronizarOS(JSON.parse(raw) as NovoEquipamento[], buildInitialNovosEquipamentos(), 'ordemServico');
      if (alterou) saveNovosEquipamentos(lista);
      return lista;
    }
  } catch (e) {
    console.error('Erro ao ler novos equipamentos:', e);
  }
  const initial = buildInitialNovosEquipamentos();
  saveNovosEquipamentos(initial);
  return initial;
}

export function saveNovosEquipamentos(items: NovoEquipamento[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.NOVOS, JSON.stringify(items));
  } catch (e) {
    console.error('Erro ao salvar novos equipamentos:', e);
  }
}

export function getLocaisDistribuicao(): LocalDistribuicao[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOCAIS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Erro ao ler locais:', e);
  }
  const initial = buildInitialLocaisDistribuicao();
  saveLocaisDistribuicao(initial);
  return initial;
}

export function saveLocaisDistribuicao(items: LocalDistribuicao[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LOCAIS, JSON.stringify(items));
  } catch (e) {
    console.error('Erro ao salvar locais:', e);
  }
}

export function getEquipamentosAnteriores(): EquipamentoAnterior[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RETIRADAS);
    if (raw) {
      const { lista, alterou } = sincronizarOS(
        JSON.parse(raw) as EquipamentoAnterior[],
        buildInitialEquipamentosAnteriores(),
        'ordemServicoRetirada'
      );
      if (alterou) saveEquipamentosAnteriores(lista);
      return lista;
    }
  } catch (e) {
    console.error('Erro ao ler retiradas:', e);
  }
  const initial = buildInitialEquipamentosAnteriores();
  saveEquipamentosAnteriores(initial);
  return initial;
}

export function saveEquipamentosAnteriores(items: EquipamentoAnterior[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.RETIRADAS, JSON.stringify(items));
  } catch (e) {
    console.error('Erro ao salvar retiradas:', e);
  }
}

/** Ordens de Serviço salvas neste aparelho (IndexedDB). */
export function getOrdensServico(): Promise<OrdemServico[]> {
  return loadOrdens();
}

/** Localiza a linha exata da planilha de distribuição (GATi + localização). */
export function findLocalIndex(locais: LocalDistribuicao[], localId?: string, gati?: string, setor?: string): number {
  if (localId) {
    const byId = locais.findIndex(l => l.id === localId);
    if (byId >= 0) return byId;
  }
  if (!gati) return -1;
  const g = gati.trim();
  const s = (setor || '').trim().toUpperCase();
  const sameGati = locais.map((l, i) => ({ l, i })).filter(({ l }) => l.gatiInstalacao.trim() === g);
  if (!sameGati.length) return -1;
  const bySetor = sameGati.find(({ l }) => (l.setor || '').trim().toUpperCase() === s && l.status !== 'instalado')
    || sameGati.find(({ l }) => (l.setor || '').trim().toUpperCase() === s);
  if (bySetor) return bySetor.i;
  const pendente = sameGati.find(({ l }) => l.status !== 'instalado');
  return (pendente || sameGati[0]).i;
}

/**
 * Salva a OS no aparelho (IndexedDB) e atualiza as planilhas locais.
 */
export async function saveOrdemServico(os: OrdemServico): Promise<void> {
  // 1. Atualiza status do novo equipamento: marcado como 'instalado'
  const novos = getNovosEquipamentos();
  const eqIndex = novos.findIndex(e => e.patrimonio === os.patrimonio);
  if (eqIndex >= 0) {
    novos[eqIndex].status = 'instalado';
    novos[eqIndex].dataInstalacao = os.dataInstalacao;
    novos[eqIndex].gatiInstalacao = os.gatiInstalacao;
    novos[eqIndex].osId = os.numeroOS;
    saveNovosEquipamentos(novos);
  }

  // 2. Atualiza local de distribuição: preenche patrimônio, série, data e bloqueia
  const locais = getLocaisDistribuicao();
  const locIndex = findLocalIndex(locais, os.localId, os.gatiInstalacao, os.setor);
  if (locIndex >= 0) {
    locais[locIndex].status = 'instalado';
    locais[locIndex].patrimonioInstalado = os.patrimonio;
    locais[locIndex].serieInstalada = os.numeroSerie;
    locais[locIndex].dataInstalacao = os.dataInstalacao;
    locais[locIndex].protegido = true; // Bloqueado
    if (os.numeroOS && os.numeroOS.trim()) {
      locais[locIndex].ordemServico = os.numeroOS.trim();
    }
    if (os.numeroOSRetirada && os.numeroOSRetirada.trim()) {
      locais[locIndex].ordemServicoRetirada = os.numeroOSRetirada.trim();
    }
    saveLocaisDistribuicao(locais);
  }

  // 3. Se retirou equipamento anterior: atualiza status, contadores e bloqueia
  if (os.substituiAnterior && os.patrimonioAnterior) {
    const retiradas = getEquipamentosAnteriores();
    const retIndex = retiradas.findIndex(r => r.patrimonio === os.patrimonioAnterior);
    if (retIndex >= 0) {
      retiradas[retIndex].status = os.equipamentoRetirado ? 'retirado' : 'nao_retirado';
      retiradas[retIndex].dataRetirada = os.dataInstalacao;
      if (os.numeroOSRetirada) retiradas[retIndex].ordemServicoRetirada = os.numeroOSRetirada;
      retiradas[retIndex].contadorMono = os.contadorMono || '';
      retiradas[retIndex].contadorColor = os.contadorColor || '';
      retiradas[retIndex].contadorFinal = os.contadorPaginasFinal || '';
      retiradas[retIndex].protegido = true; // Bloqueado
      saveEquipamentosAnteriores(retiradas);
    }
  }

  // 4. Grava a OS completa (fotos e assinatura inclusas) no IndexedDB
  await putOrdem(os);
}

/**
 * Anula a instalação de um local e libera o patrimônio de volta para ser instalado.
 * Requer confirmação pela senha de anulação.
 */
export async function anularInstalacao(
  localId: string,
  password: string
): Promise<{ success: boolean; message: string; patrimonioLiberado?: string }> {
  if (!(await verifyProtectionPassword(password))) {
    return { success: false, message: 'Senha de proteção incorreta. Acesso não autorizado.' };
  }

  const locais = getLocaisDistribuicao();
  const locIndex = locais.findIndex(l => l.id === localId);
  if (locIndex < 0) {
    return { success: false, message: 'Local de distribuição não encontrado.' };
  }
  const gatiInstalacao = locais[locIndex].gatiInstalacao;

  const local = locais[locIndex];
  const patInstalado = local.patrimonioInstalado;

  // 1. Libera o equipamento novo (volta para disponível na van)
  if (patInstalado) {
    const novos = getNovosEquipamentos();
    const nIndex = novos.findIndex(n => n.patrimonio === patInstalado);
    if (nIndex >= 0) {
      novos[nIndex].status = 'disponivel';
      delete novos[nIndex].dataInstalacao;
      delete novos[nIndex].gatiInstalacao;
      delete novos[nIndex].osId;
      saveNovosEquipamentos(novos);
    }
  }

  // 2. Anula dados do local e remove bloqueio
  local.status = 'pendente';
  delete local.patrimonioInstalado;
  delete local.serieInstalada;
  delete local.dataInstalacao;
  local.protegido = false;
  saveLocaisDistribuicao(locais);

  // 3. Libera o equipamento anterior retirado nesta OS (identificado pela própria OS)
  const ordensDoLocal = (await loadOrdens()).filter(
    o =>
      !o.anulada &&
      (o.localId === localId || (!o.localId && o.gatiInstalacao === gatiInstalacao && o.patrimonio === patInstalado))
  );
  const patAnterior = ordensDoLocal.find(o => o.patrimonioAnterior)?.patrimonioAnterior;
  const retiradas = getEquipamentosAnteriores();
  const retIndex = patAnterior ? retiradas.findIndex(r => r.patrimonio === patAnterior) : -1;
  if (retIndex >= 0) {
    retiradas[retIndex].status = 'a_retirar';
    delete retiradas[retIndex].dataRetirada;
    delete retiradas[retIndex].contadorMono;
    delete retiradas[retIndex].contadorColor;
    delete retiradas[retIndex].contadorFinal;
    retiradas[retIndex].protegido = false;
    saveEquipamentosAnteriores(retiradas);
  }

  // 4. A OS NÃO é apagada: fica no Histórico marcada como "Anulada", com os PDFs.
  const agora = new Date().toLocaleString('pt-BR');
  for (const o of ordensDoLocal) {
    await putOrdem({ ...o, anulada: true, dataAnulacao: agora });
  }

  return {
    success: true,
    message: `Instalação do GATi ${gatiInstalacao} anulada com sucesso! O patrimônio #${patInstalado || ''} foi liberado na van para ser instalado novamente.`,
    patrimonioLiberado: patInstalado,
  };
}

/**
 * Atualiza o número da OS de instalação na planilha
 */
export function updateLocalOrdemServico(localId: string, numeroOS: string): void {
  const locais = getLocaisDistribuicao();
  const locIndex = locais.findIndex(l => l.id === localId);
  if (locIndex >= 0) {
    locais[locIndex].ordemServico = numeroOS.trim();
    saveLocaisDistribuicao(locais);
  }
}

/**
 * Atualiza o número da OS de retirada na planilha de distribuição
 */
export function updateLocalOrdemServicoRetirada(localId: string, numeroOSRetirada: string): void {
  const locais = getLocaisDistribuicao();
  const locIndex = locais.findIndex(l => l.id === localId);
  if (locIndex >= 0) {
    locais[locIndex].ordemServicoRetirada = numeroOSRetirada.trim();
    saveLocaisDistribuicao(locais);
  }
}

/**
 * Atualiza o número da OS de retirada na planilha de equipamentos a retirar
 */
export function updateRetiradaOrdemServico(patrimonio: string, numeroOSRetirada: string): void {
  const retiradas = getEquipamentosAnteriores();
  const retIndex = retiradas.findIndex(r => r.patrimonio === patrimonio);
  if (retIndex >= 0) {
    retiradas[retIndex].ordemServicoRetirada = numeroOSRetirada.trim();
    saveEquipamentosAnteriores(retiradas);
  }
}

export function getTecnicoPadrao(): string {
  return localStorage.getItem(STORAGE_KEYS.TECNICO) || '';
}

export function saveTecnicoPadrao(nome: string): void {
  localStorage.setItem(STORAGE_KEYS.TECNICO, nome);
}

/**
 * Recarrega as planilhas originais. As OSs já registradas neste aparelho
 * (histórico com PDFs) NÃO são apagadas.
 */
export function resetAllDataToDefault(): void {
  localStorage.removeItem(STORAGE_KEYS.NOVOS);
  localStorage.removeItem(STORAGE_KEYS.LOCAIS);
  localStorage.removeItem(STORAGE_KEYS.RETIRADAS);

  const novos = buildInitialNovosEquipamentos();
  const locais = buildInitialLocaisDistribuicao();
  const retiradas = buildInitialEquipamentosAnteriores();

  saveNovosEquipamentos(novos);
  saveLocaisDistribuicao(locais);
  saveEquipamentosAnteriores(retiradas);
}

/**
 * Reinclui OSs reconstruídas a partir dos PDFs (Histórico → "Restaurar a partir dos PDFs").
 * Marca de novo a planilha (equipamento instalado, localização, retirada) e guarda os PDFs originais.
 * OSs que já estão ativas no Histórico são ignoradas.
 */
export async function restaurarOrdens(
  ordens: OrdemServico[]
): Promise<{ restauradas: OrdemServico[]; jaExistiam: OrdemServico[] }> {
  const existentes = (await loadOrdens()).filter((o) => !o.anulada);
  const restauradas: OrdemServico[] = [];
  const jaExistiam: OrdemServico[] = [];
  for (const os of ordens) {
    const dup = existentes.find(
      (e) =>
        (os.numeroOS && e.numeroOS === os.numeroOS) ||
        (!os.numeroOS && e.patrimonio === os.patrimonio && e.gatiInstalacao === os.gatiInstalacao)
    );
    if (dup) {
      jaExistiam.push(os);
      continue;
    }
    const locais = getLocaisDistribuicao();
    const idx = findLocalIndex(locais, undefined, os.gatiInstalacao, os.setor);
    const completa: OrdemServico = { ...os, localId: idx >= 0 ? locais[idx].id : undefined };
    await saveOrdemServico(completa);
    restauradas.push(completa);
    existentes.push(completa);
  }
  return { restauradas, jaExistiam };
}
