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

// Funções de gerenciamento com LocalStorage e Sincronização Inteligente
export function getNovosEquipamentos(): NovoEquipamento[] {
  const initial = buildInitialNovosEquipamentos();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOVOS);
    if (raw) {
      const salvos = JSON.parse(raw) as NovoEquipamento[];
      const mapaOficial = new Map(initial.map((n) => [String(n.patrimonio).trim(), n]));
      let alterou = false;
      salvos.forEach((s) => {
        const oficial = mapaOficial.get(String(s.patrimonio).trim());
        if (oficial) {
          if (oficial.status === 'instalado' && s.status !== 'instalado') {
            s.status = 'instalado';
            s.dataInstalacao = oficial.dataInstalacao || s.dataInstalacao;
            s.gatiInstalacao = oficial.gatiInstalacao || s.gatiInstalacao;
            s.osId = oficial.osId || s.osId;
            alterou = true;
          }
          if (oficial.ordemServico && !s.ordemServico) {
            s.ordemServico = oficial.ordemServico;
            alterou = true;
          }
        }
      });
      if (alterou) saveNovosEquipamentos(salvos);
      return salvos;
    }
  } catch (e) {
    console.error('Erro ao ler novos equipamentos:', e);
  }
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

const normLocKey = (v: unknown): string =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

/**
 * Mescla uma nova lista oficial de locais (mantendo a sequência oficial do mapa)
 * preservando 100% dos registros já instalados ou com OS preenchida no aparelho.
 */
export function mesclarLocaisPreservandoInstalacoes(
  oficiais: LocalDistribuicao[],
  salvos: LocalDistribuicao[]
): LocalDistribuicao[] {
  const usados = new Set<string>();
  const poolComDados = salvos.filter(
    (s) => s.status === 'instalado' || Boolean(s.patrimonioInstalado) || Boolean(s.ordemServico) || Boolean(s.ordemServicoRetirada)
  );

  return oficiais.map((oficial) => {
    const match =
      poolComDados.find((s) => {
        if (usados.has(s.id)) return false;
        const mesmoGati = String(s.gatiInstalacao || '').trim() === String(oficial.gatiInstalacao || '').trim();
        const mesmoCliente = normLocKey(s.clienteInstalacao) === normLocKey(oficial.clienteInstalacao);
        const mesmoSetor = normLocKey(s.localizacao || s.setor) === normLocKey(oficial.localizacao || oficial.setor);
        return mesmoGati && mesmoCliente && mesmoSetor;
      }) ||
      poolComDados.find((s) => !usados.has(s.id) && s.id === oficial.id && normLocKey(s.clienteInstalacao) === normLocKey(oficial.clienteInstalacao));

    if (match) {
      usados.add(match.id);
      const jaInstalado = match.status === 'instalado' || oficial.status === 'instalado';
      return {
        ...oficial,
        status: jaInstalado ? 'instalado' : 'pendente',
        patrimonioInstalado: match.patrimonioInstalado || oficial.patrimonioInstalado,
        serieInstalada: match.serieInstalada || oficial.serieInstalada,
        dataInstalacao: match.dataInstalacao || oficial.dataInstalacao,
        ordemServico: match.ordemServico || oficial.ordemServico || '',
        ordemServicoRetirada: match.ordemServicoRetirada || oficial.ordemServicoRetirada || '',
        protegido: Boolean(match.protegido || oficial.protegido || jaInstalado),
      };
    }
    return oficial;
  });
}

export function getLocaisDistribuicao(): LocalDistribuicao[] {
  const initial = buildInitialLocaisDistribuicao();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOCAIS);
    if (raw) {
      const salvos = JSON.parse(raw) as LocalDistribuicao[];
      const mesclados = mesclarLocaisPreservandoInstalacoes(initial, salvos);
      saveLocaisDistribuicao(mesclados);
      return mesclados;
    }
  } catch (e) {
    console.error('Erro ao ler locais:', e);
  }
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
  const initial = buildInitialEquipamentosAnteriores();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RETIRADAS);
    if (raw) {
      const salvos = JSON.parse(raw) as EquipamentoAnterior[];
      const mapaOficial = new Map(initial.map((r) => [String(r.patrimonio).trim(), r]));
      let alterou = false;
      salvos.forEach((s) => {
        const oficial = mapaOficial.get(String(s.patrimonio).trim());
        if (oficial) {
          if (oficial.status === 'retirado' && s.status !== 'retirado') {
            s.status = 'retirado';
            s.dataRetirada = oficial.dataRetirada || s.dataRetirada;
            s.ordemServicoRetirada = oficial.ordemServicoRetirada || s.ordemServicoRetirada;
            s.caboEnergiaRetirado = oficial.caboEnergiaRetirado ?? s.caboEnergiaRetirado;
            s.bandejaSaidaRetirada = oficial.bandejaSaidaRetirada ?? s.bandejaSaidaRetirada;
            s.avariasEncontradas = oficial.avariasEncontradas ?? s.avariasEncontradas;
            s.protegido = true;
            alterou = true;
          }
          if (oficial.ordemServicoRetirada && !s.ordemServicoRetirada) {
            s.ordemServicoRetirada = oficial.ordemServicoRetirada;
            alterou = true;
          }
        }
      });
      if (alterou) saveEquipamentosAnteriores(salvos);
      return salvos;
    }
  } catch (e) {
    console.error('Erro ao ler retiradas:', e);
  }
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
 * Anula uma Ordem de Serviço específica por ID de forma segura e estritamente individual.
 * Nunca afeta outras OSs do mesmo local ou GATi.
 */
export async function anularOrdemPorId(
  osId: string,
  password: string
): Promise<{ success: boolean; message: string; patrimonioLiberado?: string }> {
  if (!(await verifyProtectionPassword(password))) {
    return { success: false, message: 'Senha de proteção incorreta. Acesso não autorizado.' };
  }

  const todas = await loadOrdens();
  const os = todas.find((o) => o.id === osId);
  if (!os) {
    return { success: false, message: 'Ordem de Serviço não encontrada.' };
  }

  // 1. Libera o equipamento novo na van
  if (os.patrimonio) {
    const novos = getNovosEquipamentos();
    const nIndex = novos.findIndex((n) => n.patrimonio === os.patrimonio);
    if (nIndex >= 0) {
      novos[nIndex].status = 'disponivel';
      delete novos[nIndex].dataInstalacao;
      delete novos[nIndex].gatiInstalacao;
      delete novos[nIndex].osId;
      saveNovosEquipamentos(novos);
    }
  }

  // 2. Libera o local de distribuição específico desta OS
  const locais = getLocaisDistribuicao();
  const locIndex = locais.findIndex(
    (l) =>
      (os.localId && l.id === os.localId) ||
      (os.patrimonio && l.patrimonioInstalado === os.patrimonio) ||
      (l.gatiInstalacao === os.gatiInstalacao && os.setor && l.setor === os.setor && l.status === 'instalado')
  );
  if (locIndex >= 0) {
    locais[locIndex].status = 'pendente';
    delete locais[locIndex].patrimonioInstalado;
    delete locais[locIndex].serieInstalada;
    delete locais[locIndex].dataInstalacao;
    locais[locIndex].protegido = false;
    saveLocaisDistribuicao(locais);
  }

  // 3. Libera o equipamento anterior da retirada (se houver)
  if (os.substituiAnterior && os.patrimonioAnterior) {
    const retiradas = getEquipamentosAnteriores();
    const retIndex = retiradas.findIndex((r) => r.patrimonio === os.patrimonioAnterior);
    if (retIndex >= 0) {
      retiradas[retIndex].status = 'a_retirar';
      delete retiradas[retIndex].dataRetirada;
      delete retiradas[retIndex].contadorMono;
      delete retiradas[retIndex].contadorColor;
      delete retiradas[retIndex].contadorFinal;
      retiradas[retIndex].protegido = false;
      saveEquipamentosAnteriores(retiradas);
    }
  }

  // 4. Marca APENAS esta OS como anulada no IndexedDB
  const agora = new Date().toLocaleString('pt-BR');
  await putOrdem({ ...os, anulada: true, dataAnulacao: agora });

  return {
    success: true,
    message: `OS #${os.numeroOS || os.patrimonio} anulada com sucesso! O patrimônio #${os.patrimonio} foi liberado para nova instalação.`,
    patrimonioLiberado: os.patrimonio,
  };
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
  const locIndex = locais.findIndex((l) => l.id === localId);
  if (locIndex < 0) {
    return { success: false, message: 'Local de distribuição não encontrado.' };
  }

  const local = locais[locIndex];
  const patInstalado = local.patrimonioInstalado;

  // 1. Libera o equipamento novo (volta para disponível na van)
  if (patInstalado) {
    const novos = getNovosEquipamentos();
    const nIndex = novos.findIndex((n) => n.patrimonio === patInstalado);
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

  // 3. Libera o equipamento anterior retirado nesta OS estritamente
  const ordensDoLocal = (await loadOrdens()).filter(
    (o) =>
      !o.anulada &&
      (o.localId === localId || (patInstalado && o.patrimonio === patInstalado))
  );
  const patAnterior = ordensDoLocal.find((o) => o.patrimonioAnterior)?.patrimonioAnterior;
  if (patAnterior) {
    const retiradas = getEquipamentosAnteriores();
    const retIndex = retiradas.findIndex((r) => r.patrimonio === patAnterior);
    if (retIndex >= 0) {
      retiradas[retIndex].status = 'a_retirar';
      delete retiradas[retIndex].dataRetirada;
      delete retiradas[retIndex].contadorMono;
      delete retiradas[retIndex].contadorColor;
      delete retiradas[retIndex].contadorFinal;
      retiradas[retIndex].protegido = false;
      saveEquipamentosAnteriores(retiradas);
    }
  }

  // 4. Marca as OSs deste local como anuladas
  const agora = new Date().toLocaleString('pt-BR');
  for (const o of ordensDoLocal) {
    await putOrdem({ ...o, anulada: true, dataAnulacao: agora });
  }

  return {
    success: true,
    message: `Instalação anulada com sucesso! O patrimônio #${patInstalado || ''} foi liberado na van para ser instalado novamente.`,
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
  ordens: OrdemServico[],
  ordensNuvem: OrdemServico[] = []
): Promise<{ restauradas: OrdemServico[]; jaExistiam: OrdemServico[] }> {
  const locaisMap = new Map<string, OrdemServico>();
  for (const o of [...(await loadOrdens()), ...ordensNuvem]) {
    if (!o.anulada) locaisMap.set(o.id, o);
  }
  const existentes = Array.from(locaisMap.values());
  const novosNoApp = getNovosEquipamentos();
  const locaisNoApp = getLocaisDistribuicao();

  const patsInstaladosNoApp = new Set<string>([
    ...novosNoApp.filter((n) => n.status === 'instalado').map((n) => String(n.patrimonio).trim()),
    ...locaisNoApp.filter((l) => l.status === 'instalado' && l.patrimonioInstalado).map((l) => String(l.patrimonioInstalado).trim()),
  ]);

  const restauradas: OrdemServico[] = [];
  const jaExistiam: OrdemServico[] = [];

  for (const os of ordens) {
    const pat = String(os.patrimonio || '').trim();
    const numOS = String(os.numeroOS || '').trim();
    const dup = existentes.find(
      (e) =>
        (numOS && String(e.numeroOS || '').trim() === numOS) ||
        (pat && String(e.patrimonio || '').trim() === pat)
    );
    const jaInstaladoSemOS = pat && patsInstaladosNoApp.has(pat);

    if (dup || jaInstaladoSemOS) {
      jaExistiam.push(os);
      continue;
    }
    const idx = findLocalIndex(locaisNoApp, undefined, os.gatiInstalacao, os.setor);
    const completa: OrdemServico = { ...os, localId: idx >= 0 ? locaisNoApp[idx].id : undefined };
    await saveOrdemServico(completa);
    restauradas.push(completa);
    existentes.push(completa);
    if (pat) patsInstaladosNoApp.add(pat);
  }
  return { restauradas, jaExistiam };
}
