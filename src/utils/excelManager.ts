import * as XLSX from 'xlsx';
import { LocalDistribuicao, NovoEquipamento, OrdemServico, EquipamentoAnterior } from '../types';

/**
 * Exporta a planilha consolidada de distribuição com os patrimônios e séries instalados pelo técnico
 */
export function exportDistribuicaoToExcel(locais: LocalDistribuicao[]): void {
  const rows = locais.map((l, index) => ({
    'Item': index + 1,
    'ID': l.id,
    'Secretaria': l.secretaria,
    'Nº OS Instalação': l.ordemServico || '',
    'Nº OS Retirada': l.ordemServicoRetirada || '',
    'GATi Instalação': l.gatiInstalacao,
    'GATi Faturamento': l.gatiFaturamento,
    'Cliente Instalação': l.clienteInstalacao,
    'Patrimônio Instalado': l.patrimonioInstalado || '',
    'Nº de Série Instalado': l.serieInstalada || '',
    'Modelo': l.modeloPrevisto,
    'Tipo': l.tipoEquipamento,
    'Localização': l.localizacao || l.setor || '',
    'Conectividade': l.conectividade || '',
    'Endereço Local Instalação': l.endereco,
    'Bairro': l.bairro,
    'Responsável do Local': l.responsavelLocal,
    'Data da Instalação': l.dataInstalacao || '',
    'Status': l.status === 'instalado' ? 'CONCLUÍDO' : 'PENDENTE',
    'Bloqueio': l.protegido ? 'PROTEGIDO' : 'LIBERADO',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Distribuição Atualizada');

  XLSX.writeFile(workbook, `Lorena_Distribuicao_Atualizada_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Exporta a relação dos 234 Novos Equipamentos com Nº de Patrimônio, Série e Ordem de Serviço
 */
export function exportNovosEquipamentosToExcel(novos: NovoEquipamento[]): void {
  const rows = novos.map((item, index) => ({
    'Item': index + 1,
    'Patrimônio': item.patrimonio,
    'Nº de Série': item.numeroSerie,
    'Modelo': item.modelo,
    'Ordem de Serviço (OS)': item.ordemServico || '',
    'Tipo': item.tipo,
    'Status': item.status === 'instalado' ? 'INSTALADO' : 'DISPONÍVEL NA VAN',
    'Destino GATi': item.gatiInstalacao || '',
    'Data Instalação': item.dataInstalacao || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Patrimonios_com_OS');

  XLSX.writeFile(workbook, `Lorena_Patrimonios_com_OS_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Exporta a planilha de equipamentos a retirar com as OSs de retirada vinculadas
 */
export function exportRetiradasToExcel(retiradas: EquipamentoAnterior[]): void {
  const rows = retiradas.map((item, index) => ({
    'Item': index + 1,
    'Patrimônio a Retirar': item.patrimonio,
    'Nº de Série': item.numeroSerie,
    'Modelo': item.modelo,
    'Tipo': item.tipoEquipamento,
    'Nº OS Retirada': item.ordemServicoRetirada || '',
    'Secretaria': item.secretaria,
    'Cliente / Local': item.clienteInstalacao,
    'GATi Instalação': item.gatiInstalacao,
    'Localização / Setor': item.localizacao,
    'IP': item.conectividadeIp,
    'Status': item.status === 'retirado' ? 'RETIRADO' : 'A RETIRAR',
    'Data da Retirada': item.dataRetirada || '',
    'Contador Mono': item.contadorMono || '',
    'Contador Color': item.contadorColor || '',
    'Contador Total Final': item.contadorFinal || '',
    'Cabo Energia': item.caboEnergiaRetirado ? 'SIM' : 'NÃO',
    'Bandeja Saída': item.bandejaSaidaRetirada ? 'SIM' : 'NÃO',
    'Avarias': item.avariasEncontradas ? `SIM (${item.descricaoAvarias || ''})` : 'SEM AVARIAS',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Equipamentos_a_Retirar');

  XLSX.writeFile(workbook, `Lorena_Retiradas_com_OS_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Exporta relatório de todas as Ordens de Serviço preenchidas
 */
export function exportOrdensToExcel(ordens: OrdemServico[]): void {
  const rows = ordens.map((o) => ({
    'Nº OS Instalação': o.numeroOS || '',
    'Nº OS Retirada': o.numeroOSRetirada || '',
    'Data Instalação': o.dataInstalacao,
    'GATi Instalação': o.gatiInstalacao,
    'Secretaria': o.secretaria,
    'Cliente Instalação': o.clienteInstalacao,
    'Endereço': o.endereco,
    'Bairro': o.bairro,
    'Patrimônio Novo': o.patrimonio,
    'Modelo Novo': o.modelo,
    'Nº Série Novo': o.numeroSerie,
    'Instalado Via': o.tipoConexao,
    'Endereço IP': o.enderecoIP || '',
    'Conferência ERS': o.conferenciaERS ? 'SIM' : 'NÃO',
    'Justificativa ERS': o.justificativaERS || '',
    'Substituiu Anterior?': o.substituiAnterior ? 'SIM' : 'NÃO',
    'Patrimônio Anterior': o.patrimonioAnterior || '',
    'Nº Série Anterior': o.numeroSerieAnterior || '',
    'Modelo Anterior': o.modeloAnterior || '',
    'Tipo Anterior': o.tipoEquipamentoAnterior || '',
    'Contador Mono Retirada': o.contadorMono || '',
    'Contador Color Retirada': o.contadorColor || '',
    'Contador Total Retirada': o.contadorPaginasFinal || '',
    'Equipamento Retirado': o.equipamentoRetirado ? 'SIM' : 'NÃO',
    'Cabo Retirado': o.caboEnergiaRetirado ? 'SIM' : 'NÃO',
    'Bandeja Retirada': o.bandejaSaidaRetirada ? 'SIM' : 'NÃO',
    'Avarias': o.avariasEncontradas ? 'SIM' : 'NÃO',
    'Descrição Avarias': o.descricaoAvarias || '',
    'Responsável Cliente': o.responsavelNome,
    'CPF Responsável': o.responsavelCPF,
    'Técnico': o.tecnicoNome,
    'E-mail Destino': o.emailDestinatario,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório Ordens de Serviço');

  XLSX.writeFile(workbook, `Relatorio_OS_Maquim_Lorena_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Lê arquivo Excel ou CSV enviado pelo usuário
 */
export async function parseUploadedExcel(file: File): Promise<any[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json(worksheet);
}


export interface CsvLinhaDistribuicao {
  ordemMapa: number;
  secretaria: string;
  ordemServico: string;
  ordemServicoRetirada: string;
  gatiInstalacao: string;
  gatiFaturamento: string;
  clienteInstalacao: string;
  patrimonio: string;
  numeroSerie: string;
  modelo: string;
  equipamento: string;
  localizacao: string;
  conectividade: string;
  instalada: string;
  endereco: string;
  bairro: string;
  responsavelLocal: string;
  id?: string;
}

export interface CsvInconsistencia {
  tipo: 'contagem' | 'patrimonio_inexistente' | 'patrimonio_duplicado' | 'conflito_instalado';
  severidade: 'erro' | 'aviso';
  linha?: number;
  patrimonio?: string;
  gati?: string;
  mensagem: string;
}

export interface ResultadoValidacaoCSV {
  fileName: string;
  totalLinhasCSV: number;
  totalLocaisBanco: number;
  diferencaContagem: number;
  totalPatrimoniosInformados: number;
  instaladosPreservados: number;
  inconsistencias: CsvInconsistencia[];
  bloqueante: boolean;
  linhas: CsvLinhaDistribuicao[];
}

const normTxt = (v: unknown): string =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

/**
 * Lê CSV (UTF-8 ou Windows-1252) ou Excel (.xlsx/.xls), detectando o cabeçalho mesmo
 * quando há linhas de resumo no topo, e mantendo a sequência exata do mapa.
 */
export async function parsePlanilhaDistribuicao(file: File): Promise<CsvLinhaDistribuicao[]> {
  const isCsv = file.name.toLowerCase().endsWith('.csv');
  let matrix: string[][] = [];

  if (isCsv) {
    const buffer = await file.arrayBuffer();
    let text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
    if (text.includes('\uFFFD')) {
      text = new TextDecoder('windows-1252').decode(buffer);
    }
    const wb = XLSX.read(text, { type: 'string', raw: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    matrix = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' });
  } else {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    matrix = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' });
  }

  const headerIdx = matrix.findIndex((row) => {
    const joined = row.map(normTxt).join('|');
    return joined.includes('GATI INSTALACAO') || (joined.includes('SECRETARIA') && joined.includes('CLIENTE'));
  });

  if (headerIdx === -1) {
    throw new Error('Cabeçalho não reconhecido. Certifique-se de que há as colunas Secretaria e GATi Instalação.');
  }

  const headers = matrix[headerIdx].map(normTxt);
  const col = (nomes: string[]): number =>
    headers.findIndex((h) => nomes.some((n) => h === n || h.includes(n)));

  const idxId = col(['ID']);
  const idxSec = col(['SECRETARIA']);
  const idxOS = col(['N° OS INSTALACAO', 'NO OS INSTALACAO', 'ORDEM DE SERVICO', 'OS INSTALACAO']);
  const idxOSRet = col(['N° OS RETIRADA', 'NO OS RETIRADA', 'OS RETIRADA']);
  const idxGatiInst = col(['GATI INSTALACAO', 'GATI']);
  const idxGatiFat = col(['GATI FATURAMENTO']);
  const idxCliente = col(['CLIENTE INSTALACAO', 'CLIENTE']);
  const idxPatr = col(['PATRIMONIO INSTALADO', 'PATRIMONIO']);
  const idxSerie = col(['N° DE SERIE', 'NO DE SERIE', 'NUMERO DE SERIE', 'SERIE']);
  const idxModelo = col(['MODELO']);
  const idxEquip = col(['EQUIPAMENTO', 'TIPO']);
  const idxLoc = col(['LOCALIZACAO', 'SETOR']);
  const idxConect = col(['CONECTIVIDADE']);
  const idxInst = col(['INSTALADA?', 'STATUS']);
  const idxEnd = col(['ENDERECO LOCAL INSTALACAO', 'ENDERECO']);
  const idxBairro = col(['BAIRRO']);
  const idxResp = col(['RESPONSAVEL DO LOCAL', 'RESPONSAVEL']);

  const linhas: CsvLinhaDistribuicao[] = [];
  let seq = 0;

  for (let i = headerIdx + 1; i < matrix.length; i++) {
    const r = matrix[i];
    const get = (idx: number) => (idx >= 0 && idx < r.length ? String(r[idx] ?? '').trim() : '');
    const sec = get(idxSec);
    const gatiInst = get(idxGatiInst);
    const cliente = get(idxCliente);
    if (!sec && !gatiInst && !cliente) continue;

    seq += 1;
    linhas.push({
      id: get(idxId) || undefined,
      ordemMapa: seq,
      secretaria: sec,
      ordemServico: get(idxOS),
      ordemServicoRetirada: get(idxOSRet),
      gatiInstalacao: gatiInst,
      gatiFaturamento: get(idxGatiFat),
      clienteInstalacao: cliente,
      patrimonio: get(idxPatr),
      numeroSerie: get(idxSerie),
      modelo: get(idxModelo),
      equipamento: get(idxEquip),
      localizacao: get(idxLoc),
      conectividade: get(idxConect),
      instalada: get(idxInst),
      endereco: get(idxEnd),
      bairro: get(idxBairro),
      responsavelLocal: get(idxResp),
    });
  }

  return linhas;
}

/**
 * Valida contagem total de locais e identificadores de patrimônio do CSV contra o banco atual,
 * destacando inconsistências antes da aplicação das alterações.
 */
export function validarCSVContraBanco(
  fileName: string,
  linhas: CsvLinhaDistribuicao[],
  locaisAtuais: LocalDistribuicao[],
  novosAtuais: NovoEquipamento[]
): ResultadoValidacaoCSV {
  const inconsistencias: CsvInconsistencia[] = [];
  const totalLinhasCSV = linhas.length;
  const totalLocaisBanco = locaisAtuais.length;
  const diferencaContagem = totalLinhasCSV - totalLocaisBanco;

  if (diferencaContagem !== 0) {
    inconsistencias.push({
      tipo: 'contagem',
      severidade: 'aviso',
      mensagem: `Contagem divergente: o arquivo possui ${totalLinhasCSV} locais e o banco atual possui ${totalLocaisBanco} locais (diferença: ${diferencaContagem > 0 ? `+${diferencaContagem}` : diferencaContagem}).`,
    });
  }

  const mapaPatrimoniosOficiais = new Map(
    novosAtuais.map((n) => [String(n.patrimonio).trim(), n])
  );
  const patrimoniosNoCSV = new Map<string, number>();
  let totalPatrimoniosInformados = 0;
  let instaladosPreservados = 0;

  linhas.forEach((linha) => {
    const patr = linha.patrimonio.trim();
    if (patr) {
      totalPatrimoniosInformados += 1;
      const linhaAnterior = patrimoniosNoCSV.get(patr);
      if (linhaAnterior !== undefined) {
        inconsistencias.push({
          tipo: 'patrimonio_duplicado',
          severidade: 'erro',
          linha: linha.ordemMapa,
          patrimonio: patr,
          gati: linha.gatiInstalacao,
          mensagem: `Linha ${linha.ordemMapa} (GATi ${linha.gatiInstalacao}): Patrimônio ${patr} duplicado na planilha (já aparece na linha ${linhaAnterior}).`,
        });
      } else {
        patrimoniosNoCSV.set(patr, linha.ordemMapa);
      }

      const eqBanco = mapaPatrimoniosOficiais.get(patr);
      if (!eqBanco) {
        inconsistencias.push({
          tipo: 'patrimonio_inexistente',
          severidade: 'erro',
          linha: linha.ordemMapa,
          patrimonio: patr,
          gati: linha.gatiInstalacao,
          mensagem: `Linha ${linha.ordemMapa} (GATi ${linha.gatiInstalacao}): Patrimônio ${patr} não encontrado no cadastro oficial de equipamentos.`,
        });
      } else if (
        eqBanco.status === 'instalado' &&
        eqBanco.gatiInstalacao &&
        eqBanco.gatiInstalacao !== linha.gatiInstalacao
      ) {
        inconsistencias.push({
          tipo: 'conflito_instalado',
          severidade: 'aviso',
          linha: linha.ordemMapa,
          patrimonio: patr,
          gati: linha.gatiInstalacao,
          mensagem: `Linha ${linha.ordemMapa}: Patrimônio ${patr} já consta instalado no GATi ${eqBanco.gatiInstalacao} no banco atual (planilha aponta GATi ${linha.gatiInstalacao}).`,
        });
      }
    }

    const jaInstalado = locaisAtuais.find(
      (l) =>
        l.status === 'instalado' &&
        l.gatiInstalacao === linha.gatiInstalacao &&
        normTxt(l.clienteInstalacao) === normTxt(linha.clienteInstalacao) &&
        (!linha.localizacao || normTxt(l.localizacao || l.setor) === normTxt(linha.localizacao))
    );

    if (jaInstalado) {
      instaladosPreservados += 1;
      if (patr && jaInstalado.patrimonioInstalado && patr !== jaInstalado.patrimonioInstalado) {
        inconsistencias.push({
          tipo: 'conflito_instalado',
          severidade: 'aviso',
          linha: linha.ordemMapa,
          patrimonio: patr,
          gati: linha.gatiInstalacao,
          mensagem: `Linha ${linha.ordemMapa} (${linha.clienteInstalacao}): Já instalado no banco com patrimônio ${jaInstalado.patrimonioInstalado}; o registro existente será preservado.`,
        });
      }
    }
  });

  return {
    fileName,
    totalLinhasCSV,
    totalLocaisBanco,
    diferencaContagem,
    totalPatrimoniosInformados,
    instaladosPreservados,
    inconsistencias,
    bloqueante: inconsistencias.some((i) => i.severidade === 'erro'),
    linhas,
  };
}
