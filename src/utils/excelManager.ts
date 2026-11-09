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
    'Setor': l.setor || '', // Localização dentro do local
    'Endereço Local Instalação': l.endereco,
    'Bairro': l.bairro,
    'Responsável do Local': l.responsavelLocal,
    'Data da Instalação': l.dataInstalacao || '',
    'Status': l.status === 'instalado' ? 'CONCLUÍDO' : 'PENDENTE',
    'Bloqueio': l.protegido ? 'PROTEGIDO (223622)' : 'LIBERADO',
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
