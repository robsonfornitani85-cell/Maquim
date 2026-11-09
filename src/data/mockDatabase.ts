import { NovoEquipamento, LocalDistribuicao, EquipamentoAnterior, OrdemServico } from '../types';
import realData from './realContractData.json';

// Senha mestra de proteção definida pelo usuário para o contrato de Lorena
export const PASSWORD_PROTECTION = '223622';

export function verifyProtectionPassword(password: string): boolean {
  return password.trim() === PASSWORD_PROTECTION;
}

// Chaves de armazenamento versionadas (v6 com 170 OSs de retirada vinculadas e finalizações de 4423, 8479, 8472)
const STORAGE_KEYS = {
  NOVOS: 'maquim_novos_equipamentos_v6_lorena',
  LOCAIS: 'maquim_locais_distribuicao_v6_lorena',
  RETIRADAS: 'maquim_equipamentos_anteriores_v6_lorena',
  ORDENS: 'maquim_ordens_servico_v6_lorena',
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

// Funções de gerenciamento com LocalStorage
export function getNovosEquipamentos(): NovoEquipamento[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOVOS);
    if (raw) return JSON.parse(raw);
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
    if (raw) return JSON.parse(raw);
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

export function getOrdensServico(): OrdemServico[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ORDENS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Erro ao ler ordens de serviço:', e);
  }
  return [];
}

export function saveOrdemServico(os: OrdemServico): void {
  const ordens = getOrdensServico();
  const existingIndex = ordens.findIndex(o => o.id === os.id);
  if (existingIndex >= 0) {
    ordens[existingIndex] = os;
  } else {
    ordens.unshift(os);
  }
  localStorage.setItem(STORAGE_KEYS.ORDENS, JSON.stringify(ordens));

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

  // 2. Atualiza local de distribuição: preenche patrimônio, série, data e bloqueia com senha 223622
  const locais = getLocaisDistribuicao();
  const locIndex = locais.findIndex(l => l.gatiInstalacao === os.gatiInstalacao);
  if (locIndex >= 0) {
    locais[locIndex].status = 'instalado';
    locais[locIndex].patrimonioInstalado = os.patrimonio;
    locais[locIndex].serieInstalada = os.numeroSerie;
    locais[locIndex].dataInstalacao = os.dataInstalacao;
    locais[locIndex].protegido = true; // Bloqueado com senha 223622
    if (os.numeroOS && os.numeroOS.trim()) {
      locais[locIndex].ordemServico = os.numeroOS.trim();
    }
    if (os.numeroOSRetirada && os.numeroOSRetirada.trim()) {
      locais[locIndex].ordemServicoRetirada = os.numeroOSRetirada.trim();
    }
    saveLocaisDistribuicao(locais);
  }

  // 3. Se retirou equipamento anterior: atualiza status, contadores e bloqueia com senha 223622
  if (os.substituiAnterior && os.patrimonioAnterior) {
    const retiradas = getEquipamentosAnteriores();
    const retIndex = retiradas.findIndex(r => r.patrimonio === os.patrimonioAnterior);
    if (retIndex >= 0) {
      retiradas[retIndex].status = os.equipamentoRetirado ? 'retirado' : 'nao_retirado';
      retiradas[retIndex].dataRetirada = os.dataInstalacao;
      retiradas[retIndex].ordemServicoRetirada = os.numeroOSRetirada || '';
      retiradas[retIndex].contadorMono = os.contadorMono || '';
      retiradas[retIndex].contadorColor = os.contadorColor || '';
      retiradas[retIndex].contadorFinal = os.contadorPaginasFinal || '';
      retiradas[retIndex].protegido = true; // Bloqueado com senha 223622
      saveEquipamentosAnteriores(retiradas);
    }
  }
}

/**
 * Anula a instalação de um local e libera o patrimônio de volta para ser instalado.
 * Requer confirmação por senha '223622'.
 */
export function anularInstalacao(
  gatiInstalacao: string,
  password: string
): { success: boolean; message: string; patrimonioLiberado?: string } {
  if (!verifyProtectionPassword(password)) {
    return { success: false, message: 'Senha de proteção incorreta. Acesso não autorizado.' };
  }

  const locais = getLocaisDistribuicao();
  const locIndex = locais.findIndex(l => l.gatiInstalacao === gatiInstalacao);
  if (locIndex < 0) {
    return { success: false, message: 'Local de distribuição não encontrado.' };
  }

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

  // 3. Libera o equipamento anterior a retirar (se houver vinculado pelo GATi)
  const retiradas = getEquipamentosAnteriores();
  const retIndex = retiradas.findIndex(r => r.gatiInstalacao === gatiInstalacao);
  if (retIndex >= 0) {
    retiradas[retIndex].status = 'a_retirar';
    delete retiradas[retIndex].dataRetirada;
    delete retiradas[retIndex].contadorMono;
    delete retiradas[retIndex].contadorColor;
    delete retiradas[retIndex].contadorFinal;
    retiradas[retIndex].protegido = false;
    saveEquipamentosAnteriores(retiradas);
  }

  // 4. Remove a OS do histórico correspondente a este GATi
  const ordens = getOrdensServico();
  const filteredOrdens = ordens.filter(o => o.gatiInstalacao !== gatiInstalacao);
  localStorage.setItem(STORAGE_KEYS.ORDENS, JSON.stringify(filteredOrdens));

  return {
    success: true,
    message: `Instalação do GATi ${gatiInstalacao} anulada com sucesso! O patrimônio #${patInstalado || ''} foi liberado na van para ser instalado novamente.`,
    patrimonioLiberado: patInstalado,
  };
}

/**
 * Atualiza o número da OS de instalação na planilha
 */
export function updateLocalOrdemServico(gatiInstalacao: string, numeroOS: string): void {
  const locais = getLocaisDistribuicao();
  const locIndex = locais.findIndex(l => l.gatiInstalacao === gatiInstalacao);
  if (locIndex >= 0) {
    locais[locIndex].ordemServico = numeroOS.trim();
    saveLocaisDistribuicao(locais);
  }
}

/**
 * Atualiza o número da OS de retirada na planilha de distribuição
 */
export function updateLocalOrdemServicoRetirada(gatiInstalacao: string, numeroOSRetirada: string): void {
  const locais = getLocaisDistribuicao();
  const locIndex = locais.findIndex(l => l.gatiInstalacao === gatiInstalacao);
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

export function resetAllDataToDefault(): void {
  localStorage.removeItem(STORAGE_KEYS.NOVOS);
  localStorage.removeItem(STORAGE_KEYS.LOCAIS);
  localStorage.removeItem(STORAGE_KEYS.RETIRADAS);
  localStorage.removeItem(STORAGE_KEYS.ORDENS);

  const novos = buildInitialNovosEquipamentos();
  const locais = buildInitialLocaisDistribuicao();
  const retiradas = buildInitialEquipamentosAnteriores();

  saveNovosEquipamentos(novos);
  saveLocaisDistribuicao(locais);
  saveEquipamentosAnteriores(retiradas);
}
