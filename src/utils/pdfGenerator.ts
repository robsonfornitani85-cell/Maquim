import { jsPDF } from 'jspdf';
import { OrdemServico } from '../types';

/**
 * Retorna o nome do arquivo da OS conforme especificação exata:
 * - Instalação: Número da OS de instalação, ou patrimônio instalado se em branco.
 * - Retirada: Número da OS de retirada, ou patrimônio retirado se em branco.
 */
export function getOSFilename(
  os: OrdemServico,
  tipo: 'instalacao' | 'retirada' = 'instalacao'
): string {
  if (tipo === 'retirada') {
    const cleanOSRet = (os.numeroOSRetirada || '').trim();
    if (cleanOSRet) {
      const safeNum = cleanOSRet.replace(/[/\\?%*:|"<>]/g, '-');
      return `${safeNum}.pdf`;
    }
    const cleanPatAnt = (os.patrimonioAnterior || '').trim();
    if (cleanPatAnt) {
      const safePat = cleanPatAnt.replace(/[/\\?%*:|"<>]/g, '-');
      return `${safePat}.pdf`;
    }
    return 'OS_Retirada.pdf';
  }

  // Instalação (padrão)
  const cleanOS = (os.numeroOS || '').trim();
  if (cleanOS) {
    const safeNum = cleanOS.replace(/[/\\?%*:|"<>]/g, '-');
    return `${safeNum}.pdf`;
  }
  const cleanPat = (os.patrimonio || '').trim();
  if (cleanPat) {
    const safePat = cleanPat.replace(/[/\\?%*:|"<>]/g, '-');
    return `${safePat}.pdf`;
  }
  return 'OS_Instalacao.pdf';
}

/**
 * Assunto padronizado exato para o e-mail Maquim Contratos:
 */
export function getEmailSubject(os: OrdemServico): string {
  const patInstalado = os.patrimonio ? os.patrimonio.trim() : 'Não informado';
  const osInstalacao = os.numeroOS && os.numeroOS.trim() ? ` (OS: ${os.numeroOS.trim()})` : '';

  if (os.substituiAnterior && os.patrimonioAnterior && os.patrimonioAnterior.trim()) {
    const patRetirado = os.patrimonioAnterior.trim();
    const osRetirada = os.numeroOSRetirada && os.numeroOSRetirada.trim() ? ` (OS Ret: ${os.numeroOSRetirada.trim()})` : '';
    return `Instalação: Patr. ${patInstalado}${osInstalacao} & Retirada: Patr. ${patRetirado}${osRetirada}`;
  }
  return `Instalação: Patr. ${patInstalado}${osInstalacao}`;
}

/**
 * Bloco da seção 4 (mesma ordem do formulário): usuários instruídos, depois
 * nome e CPF do responsável que acompanhou e validou o serviço.
 */
function drawBlocoValidacaoResponsavel(doc: jsPDF, os: OrdemServico, margin: number, y: number): void {
  const usuariosTexto = os.usuariosTreinados && os.usuariosTreinados.length > 0
    ? os.usuariosTreinados.join(' • ')
    : '(Nenhum usuário informado)';

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('INSTRUÇÕES DE USO E PRÉ-MANUTENÇÃO PRESTADAS A:', margin + 3, y + 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  const linhasUsuarios = (doc.splitTextToSize(usuariosTexto, 98) as string[]).slice(0, 2);
  doc.text(linhasUsuarios, margin + 3, y + 15.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('NOME E SOBRENOME DO RESPONSÁVEL QUE ACOMPANHOU E VALIDOU O SERVIÇO:', margin + 3, y + 23, { maxWidth: 100 });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`${os.responsavelNome || ''}`, margin + 3, y + 26.5, { maxWidth: 98 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('CPF DO RESPONSÁVEL QUE ACOMPANHOU E VALIDOU O SERVIÇO:', margin + 3, y + 31);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`${os.responsavelCPF || ''}`, margin + 3, y + 34.5);
}

// Cores Oficiais Maquim
const MAQUIM_COLORS = {
  navyDark: [11, 27, 61], // #0B1B3D - Deep Navy Maquim
  navyMid: [15, 34, 74], // #0F224A
  bluePrimary: [13, 82, 189], // #0D52BD - Royal Blue Maquim
  blueAccent: [2, 132, 199], // #0284C7
  amberWarn: [180, 83, 9],
  slateText: [15, 23, 42],
  slateLight: [248, 250, 252],
  borderSlate: [226, 232, 240],
};

/**
 * PDF 1: ORDEM DE SERVIÇO DE INSTALAÇÃO
 * Começa com o equipamento instalado em destaque e termina com os dados do equipamento retirado.
 */
export function generateOSInstalacaoPDF(os: OrdemServico): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  let y = 14;

  // Header Banner Maquim (Deep Navy Blue)
  doc.setFillColor(MAQUIM_COLORS.navyDark[0], MAQUIM_COLORS.navyDark[1], MAQUIM_COLORS.navyDark[2]);
  doc.rect(margin, y, contentWidth, 24, 'F');

  // Brand text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('MAQUIM - OUTSOURCING & GESTÃO DE IMPRESSÃO', margin + 6, y + 8.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('ORDEM DE SERVIÇO DE INSTALAÇÃO DE EQUIPAMENTO', margin + 6, y + 14.5);
  doc.text('CONTRATO: MUNICÍPIO DE LORENA / SP  |  E-mail: contratos2@maquim.com.br', margin + 6, y + 19.5);

  y += 28;

  // Box: Identificação da OS e Data
  doc.setDrawColor(MAQUIM_COLORS.borderSlate[0], MAQUIM_COLORS.borderSlate[1], MAQUIM_COLORS.borderSlate[2]);
  doc.setFillColor(MAQUIM_COLORS.slateLight[0], MAQUIM_COLORS.slateLight[1], MAQUIM_COLORS.slateLight[2]);
  doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'FD');

  doc.setTextColor(MAQUIM_COLORS.slateText[0], MAQUIM_COLORS.slateText[1], MAQUIM_COLORS.slateText[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  const osLabel = os.numeroOS && os.numeroOS.trim() ? os.numeroOS.trim() : '(Em branco / Lançamento pendente)';
  doc.text(`Nº DA OS DE INSTALAÇÃO: ${osLabel}`, margin + 4, y + 6);
  doc.text(`DATA DA INSTALAÇÃO: ${os.dataInstalacao || new Date().toLocaleDateString('pt-BR')}`, margin + contentWidth - 75, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Técnico Responsável: ${os.tecnicoNome || 'Técnico Maquim'}`, margin + 4, y + 11);
  doc.text(`Registro no Sistema: ${new Date(os.dataRegistro || Date.now()).toLocaleString('pt-BR')}`, margin + contentWidth - 75, y + 11);

  y += 18;

  // Helper para desenhar títulos de seção
  const drawSectionTitle = (title: string, color = MAQUIM_COLORS.navyDark) => {
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(title, margin + 4, y + 4.5);
    y += 7;
  };

  // SEÇÃO 1: LOCAL DE INSTALAÇÃO
  drawSectionTitle('1. DADOS DO LOCAL DE INSTALAÇÃO (MUNICÍPIO DE LORENA)');
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y, contentWidth, 22, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);

  doc.text(`Cliente / Unidade: `, margin + 3, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.text(`${os.clienteInstalacao}`, margin + 30, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.text(`Secretaria: `, margin + 3, y + 10);
  doc.setFont('helvetica', 'bold');
  doc.text(`${os.secretaria || 'Não especificada'}`, margin + 20, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.text(`GATi Instalação: `, margin + 110, y + 10);
  doc.setFont('helvetica', 'bold');
  doc.text(`${os.gatiInstalacao}`, margin + 135, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.text(`Endereço: `, margin + 3, y + 15);
  doc.text(`${os.endereco}`, margin + 20, y + 15);

  doc.text(`Bairro: `, margin + 110, y + 15);
  doc.text(`${os.bairro}`, margin + 122, y + 15);

  doc.text(`Setor / Sala: `, margin + 3, y + 20);
  doc.text(`${os.setor || 'Geral / Padrão'}`, margin + 22, y + 20);

  y += 25;

  // SEÇÃO 2: NOVO EQUIPAMENTO INSTALADO (DESTAQUE PRINCIPAL DA OS DE INSTALAÇÃO)
  drawSectionTitle('2. NOVO EQUIPAMENTO INSTALADO (CONTRATO NOVO)');
  doc.rect(margin, y, contentWidth, 38, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);

  // Linha 1: Patrimônio, Modelo, Série
  doc.text(`Patrimônio: `, margin + 3, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.text(`${os.patrimonio}`, margin + 22, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.text(`Modelo: `, margin + 60, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.text(`${os.modelo}`, margin + 74, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.text(`Nº de Série: `, margin + 120, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.text(`${os.numeroSerie}`, margin + 140, y + 5);

  // Linha 2: Tipo de Instalação e IP
  doc.setFont('helvetica', 'normal');
  doc.text(`Instalado via: `, margin + 3, y + 11);
  doc.setFont('helvetica', 'bold');
  doc.text(`${os.tipoConexao}`, margin + 25, y + 11);

  if (os.tipoConexao === 'Via Rede' || os.tipoConexao === 'Via WI-FI') {
    doc.setFont('helvetica', 'normal');
    doc.text(`Endereço IP Configurado: `, margin + 80, y + 11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${os.enderecoIP || 'Não informado'}`, margin + 120, y + 11);

    // Linha 3: Softwares Rede/Wifi
    doc.setFont('helvetica', 'normal');
    doc.text(`Digitalização via SMB (pasta PC): `, margin + 3, y + 17);
    doc.setFont('helvetica', 'bold');
    doc.text(`${os.scanSMB ? 'SIM' : 'NÃO'}`, margin + 55, y + 17);

    doc.setFont('helvetica', 'normal');
    doc.text(`Abby Fine Reader instalado (PDF-A): `, margin + 80, y + 17);
    doc.setFont('helvetica', 'bold');
    doc.text(`${os.abbyFineReader ? 'SIM' : 'NÃO'}`, margin + 140, y + 17);
  } else {
    // Linha 3: USB
    doc.setFont('helvetica', 'normal');
    doc.text(`Conectado via WI-FI para monitoramento ERS? `, margin + 3, y + 17);
    doc.setFont('helvetica', 'bold');
    doc.text(`${os.conectadoWifiERS ? 'SIM' : 'NÃO'}`, margin + 75, y + 17);

    if (os.conectadoWifiERS === false && os.justificativaWifiERS) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.text(`Justificativa USB sem Wi-Fi: ${os.justificativaWifiERS}`, margin + 3, y + 22);
      doc.setFontSize(8.5);
    }

    doc.setFont('helvetica', 'normal');
    doc.text(`Epson Scan 2 instalado: `, margin + 3, y + 27);
    doc.setFont('helvetica', 'bold');
    doc.text(`${os.scanEpsonScan2 ? 'SIM' : 'NÃO'}`, margin + 40, y + 27);

    doc.setFont('helvetica', 'normal');
    doc.text(`OCR Componente instalado (PDF-A): `, margin + 80, y + 27);
    doc.setFont('helvetica', 'bold');
    doc.text(`${os.ocrComponente ? 'SIM' : 'NÃO'}`, margin + 140, y + 27);
  }

  // Linha 4: Auditoria ERS
  const ersY = y + 33;
  doc.setFont('helvetica', 'normal');
  doc.text(`Equipamento incluído no ERS / Conferência realizada? `, margin + 3, ersY);
  doc.setFont('helvetica', 'bold');
  doc.text(`${os.conferenciaERS ? 'SIM' : 'NÃO'}`, margin + 85, ersY);

  if (os.conferenciaERS === false && os.justificativaERS) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.text(`Justificativa ERS: ${os.justificativaERS}`, margin + 98, ersY);
    doc.setFontSize(8.5);
  }

  y += 42;

  // SEÇÃO 3: EQUIPAMENTO RETIRADO EM SUBSTITUIÇÃO (TERMINA COM OS DADOS DE RETIRADA)
  drawSectionTitle('3. EQUIPAMENTO RETIRADO EM SUBSTITUIÇÃO (CONTRATO ANTERIOR)');
  
  const retirHeight = os.substituiAnterior ? 45 : 14;
  doc.rect(margin, y, contentWidth, retirHeight, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);

  doc.text(`Houve substituição de equipamento anterior? `, margin + 3, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.text(`${os.substituiAnterior ? 'SIM' : 'NÃO (Instalação Nova)'}`, margin + 70, y + 5);

  if (os.substituiAnterior) {
    // Nº OS de Retirada vinculado
    doc.setFont('helvetica', 'normal');
    doc.text(`Nº OS de Retirada: `, margin + 110, y + 5);
    doc.setFont('helvetica', 'bold');
    doc.text(`${os.numeroOSRetirada || '(A definir na planilha)'}`, margin + 140, y + 5);

    // Linha 1 de retirada
    doc.setFont('helvetica', 'normal');
    doc.text(`Patrimônio Retirado: `, margin + 3, y + 10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${os.patrimonioAnterior || 'Não informado'}`, margin + 35, y + 10);

    doc.setFont('helvetica', 'normal');
    doc.text(`Modelo: `, margin + 65, y + 10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${os.modeloAnterior || 'Não identificado'}`, margin + 78, y + 10);

    doc.setFont('helvetica', 'normal');
    doc.text(`Nº de Série: `, margin + 120, y + 10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${os.numeroSerieAnterior || 'Não identificado'}`, margin + 140, y + 10);

    // Destaque dos Contadores na Retirada (Mono & Color)
    doc.setFillColor(254, 243, 199); // Amber-100
    doc.setDrawColor(245, 158, 11);
    doc.roundedRect(margin + 3, y + 13, contentWidth - 6, 8, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(180, 83, 9);
    doc.text(`CONTADORES FINAIS (NO ATO DA RETIRADA):`, margin + 5, y + 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);

    let contadoresText = '';
    if (os.contadorMono) contadoresText += `Total Mono: ${os.contadorMono}  `;
    if (os.contadorColor) contadoresText += `|  Total Color: ${os.contadorColor}  `;
    if (os.contadorPaginasFinal) contadoresText += `|  Total Geral: ${os.contadorPaginasFinal}`;
    if (!contadoresText) contadoresText = os.contadorPaginasFinal || 'Não informado';

    doc.setFont('helvetica', 'bold');
    doc.text(contadoresText, margin + 75, y + 18);

    // Checklist de retirada
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(`1. Equipamento retirado: `, margin + 3, y + 25);
    doc.setFont('helvetica', 'bold');
    doc.text(`${os.equipamentoRetirado ? 'SIM' : 'NÃO'}${!os.equipamentoRetirado && os.justificativaEquipRetirado ? ` (${os.justificativaEquipRetirado})` : ''}`, margin + 38, y + 25);

    doc.setFont('helvetica', 'normal');
    doc.text(`2. Cabo energia: `, margin + 100, y + 25);
    doc.setFont('helvetica', 'bold');
    doc.text(`${os.caboEnergiaRetirado ? 'SIM' : 'NÃO'}`, margin + 125, y + 25);

    doc.setFont('helvetica', 'normal');
    doc.text(`3. Bandeja saída: `, margin + 3, y + 31);
    doc.setFont('helvetica', 'bold');
    doc.text(`${os.bandejaSaidaRetirada ? 'SIM' : 'NÃO'}`, margin + 30, y + 31);

    doc.setFont('helvetica', 'normal');
    doc.text(`4. Avarias encontradas: `, margin + 100, y + 31);
    doc.setFont('helvetica', 'bold');
    doc.text(`${os.avariasEncontradas ? 'SIM' : 'NÃO'}`, margin + 135, y + 31);

    if (os.avariasEncontradas && os.descricaoAvarias) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(`Descrição da Avaria: ${os.descricaoAvarias}`, margin + 3, y + 37);
    }
  }

  y += retirHeight + 4;

  // SEÇÃO 4: CONFIRMAÇÃO E VALIDAÇÃO DO CLIENTE
  drawSectionTitle('4. INSTRUÇÕES AOS USUÁRIOS & VALIDAÇÃO DO RESPONSÁVEL');
  doc.rect(margin, y, contentWidth, 38, 'FD');

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text(
    'Declaro para os devidos fins que os serviços de instalação e ativação do equipamento de impressão foram devidamente',
    margin + 3,
    y + 4
  );
  doc.text(
    'executados, com instruções de operação e pré-manutenção prestadas aos usuários indicados, estando o equipamento operacional.',
    margin + 3,
    y + 7.5
  );

  drawBlocoValidacaoResponsavel(doc, os, margin, y);

  // Caixa de Assinatura do Cliente
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Assinatura do responsável que validou o serviço:', margin + 105, y + 13);
  doc.rect(margin + 105, y + 15, 70, 18);

  if (os.assinaturaClienteBase64) {
    try {
      doc.addImage(os.assinaturaClienteBase64, 'PNG', margin + 106, y + 15.5, 68, 17);
    } catch (e) {
      doc.text('(Assinado digitalmente)', margin + 120, y + 24);
    }
  }

  y += 40;

  // SEÇÃO 5: IDENTIFICAÇÃO DO TÉCNICO
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, contentWidth, 16, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Técnico que Realizou a Instalação: ${os.tecnicoNome || 'Técnico Maquim'}`, margin + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`E-mail de Envio: ${os.emailDestinatario || 'contratos2@maquim.com.br'}`, margin + 4, y + 11.5);
  doc.text('Documento eletrônico comprobatório de entrega técnica e instalação patrimonial.', margin + 70, y + 11.5);

  // Rodapé da Página 1
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Maquim - Sistema de Gestão de Contratos | OS Instalação: ${os.numeroOS || 'S/N'} | Patr: ${os.patrimonio} | GATi: ${os.gatiInstalacao} | Gerado em ${new Date().toLocaleString('pt-BR')}`,
    margin,
    pageHeight - 6
  );

  // PÁGINA 2: ANEXO FOTOGRÁFICO DO RELATÓRIO DO CONTADOR IMPRESSO
  if (os.substituiAnterior && (os.fotoRelatorioContadorBase64 || os.fotoAvariaBase64)) {
    doc.addPage();
    renderPaginaFotos(doc, os, 'instalacao');
  }

  return doc;
}

/**
 * PDF 2: ORDEM DE SERVIÇO DE RETIRADA E DEVOLUÇÃO
 * Começa com o equipamento retirado em destaque e termina com os dados do equipamento instalado.
 */
export function generateOSRetiradaPDF(os: OrdemServico): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  let y = 14;

  // Header Banner Maquim (Navy Blue)
  doc.setFillColor(MAQUIM_COLORS.navyDark[0], MAQUIM_COLORS.navyDark[1], MAQUIM_COLORS.navyDark[2]);
  doc.rect(margin, y, contentWidth, 24, 'F');

  // Brand text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('MAQUIM - OUTSOURCING & GESTÃO DE IMPRESSÃO', margin + 6, y + 8.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('ORDEM DE SERVIÇO DE RETIRADA E DEVOLUÇÃO DE EQUIPAMENTO', margin + 6, y + 14.5);
  doc.text('CONTRATO ANTERIOR: MUNICÍPIO DE LORENA / SP  |  E-mail: contratos2@maquim.com.br', margin + 6, y + 19.5);

  y += 28;

  // Box: Identificação da OS de Retirada
  doc.setDrawColor(MAQUIM_COLORS.borderSlate[0], MAQUIM_COLORS.borderSlate[1], MAQUIM_COLORS.borderSlate[2]);
  doc.setFillColor(MAQUIM_COLORS.slateLight[0], MAQUIM_COLORS.slateLight[1], MAQUIM_COLORS.slateLight[2]);
  doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'FD');

  doc.setTextColor(MAQUIM_COLORS.slateText[0], MAQUIM_COLORS.slateText[1], MAQUIM_COLORS.slateText[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  const osRetLabel = os.numeroOSRetirada && os.numeroOSRetirada.trim() ? os.numeroOSRetirada.trim() : '(Em branco / Lançamento pendente)';
  doc.text(`Nº DA OS DE RETIRADA: ${osRetLabel}`, margin + 4, y + 6);
  doc.text(`DATA DA RETIRADA: ${os.dataInstalacao || new Date().toLocaleDateString('pt-BR')}`, margin + contentWidth - 75, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Técnico Responsável pela Retirada: ${os.tecnicoNome || 'Técnico Maquim'}`, margin + 4, y + 11);
  doc.text(`OS de Instalação Vinculada: ${os.numeroOS || 'S/N'}`, margin + contentWidth - 75, y + 11);

  y += 18;

  const drawSectionTitle = (title: string, color = MAQUIM_COLORS.navyDark) => {
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(title, margin + 4, y + 4.5);
    y += 7;
  };

  // SEÇÃO 1: LOCAL DE ORIGEM DA RETIRADA
  drawSectionTitle('1. DADOS DO LOCAL DE ORIGEM DA RETIRADA (MUNICÍPIO DE LORENA)');
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y, contentWidth, 22, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);

  doc.text(`Cliente / Unidade: `, margin + 3, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.text(`${os.clienteInstalacao}`, margin + 30, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.text(`Secretaria: `, margin + 3, y + 10);
  doc.setFont('helvetica', 'bold');
  doc.text(`${os.secretaria || 'Não especificada'}`, margin + 20, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.text(`GATi Instalação/Origem: `, margin + 110, y + 10);
  doc.setFont('helvetica', 'bold');
  doc.text(`${os.gatiInstalacao}`, margin + 145, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.text(`Endereço: `, margin + 3, y + 15);
  doc.text(`${os.endereco}`, margin + 20, y + 15);

  doc.text(`Bairro: `, margin + 110, y + 15);
  doc.text(`${os.bairro}`, margin + 122, y + 15);

  doc.text(`Setor / Sala: `, margin + 3, y + 20);
  doc.text(`${os.setor || 'Geral / Padrão'}`, margin + 22, y + 20);

  y += 25;

  // SEÇÃO 2: EQUIPAMENTO DO CONTRATO ANTERIOR RETIRADO (DESTAQUE MÁXIMO DO PDF 2)
  drawSectionTitle('2. EQUIPAMENTO DO CONTRATO ANTERIOR RETIRADO & CONTADORES');
  doc.rect(margin, y, contentWidth, 48, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);

  // Linha 1: Patrimônio, Modelo, Série Retirados
  doc.text(`Patrimônio Retirado: `, margin + 3, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.text(`${os.patrimonioAnterior || 'Não informado'}`, margin + 35, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.text(`Modelo: `, margin + 70, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.text(`${os.modeloAnterior || 'Não identificado'}`, margin + 83, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.text(`Nº de Série: `, margin + 125, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.text(`${os.numeroSerieAnterior || 'Não identificado'}`, margin + 145, y + 5);

  // Box Destaque de Contadores (Mono e Color)
  doc.setFillColor(254, 243, 199); // Amber-100
  doc.setDrawColor(245, 158, 11);
  doc.roundedRect(margin + 3, y + 9, contentWidth - 6, 15, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(180, 83, 9);
  doc.text(`LEITURA DOS CONTADORES NO ATO DA RETIRADA (FECHAMENTO DE CONTRATO):`, margin + 5, y + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);

  doc.text(`Contador Mono (P&B): `, margin + 5, y + 20);
  doc.setFont('helvetica', 'bold');
  doc.text(`${os.contadorMono || 'N/A'}`, margin + 40, y + 20);

  doc.setFont('helvetica', 'normal');
  doc.text(`Contador Colorido: `, margin + 65, y + 20);
  doc.setFont('helvetica', 'bold');
  doc.text(`${os.contadorColor || 'N/A'}`, margin + 95, y + 20);

  doc.setFont('helvetica', 'normal');
  doc.text(`Total Geral: `, margin + 125, y + 20);
  doc.setFont('helvetica', 'bold');
  doc.text(`${os.contadorPaginasFinal || 'Não informado'}`, margin + 145, y + 20);

  // Checklist de retirada física
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);

  doc.text(`1. Equipamento físico retirado? `, margin + 3, y + 29);
  doc.setFont('helvetica', 'bold');
  doc.text(`${os.equipamentoRetirado ? 'SIM' : 'NÃO'}${!os.equipamentoRetirado && os.justificativaEquipRetirado ? ` (${os.justificativaEquipRetirado})` : ''}`, margin + 48, y + 29);

  doc.setFont('helvetica', 'normal');
  doc.text(`2. Cabo de energia retirado? `, margin + 105, y + 29);
  doc.setFont('helvetica', 'bold');
  doc.text(`${os.caboEnergiaRetirado ? 'SIM' : 'NÃO'}${!os.caboEnergiaRetirado && os.justificativaCaboEnergia ? ` (${os.justificativaCaboEnergia})` : ''}`, margin + 148, y + 29);

  doc.setFont('helvetica', 'normal');
  doc.text(`3. Bandeja de papéis retirada? `, margin + 3, y + 36);
  doc.setFont('helvetica', 'bold');
  doc.text(`${os.bandejaSaidaRetirada ? 'SIM' : 'NÃO'}${!os.bandejaSaidaRetirada && os.justificativaBandejaSaida ? ` (${os.justificativaBandejaSaida})` : ''}`, margin + 48, y + 36);

  doc.setFont('helvetica', 'normal');
  doc.text(`4. Avaria(s) encontrada(s)? `, margin + 105, y + 36);
  doc.setFont('helvetica', 'bold');
  doc.text(`${os.avariasEncontradas ? 'SIM' : 'NÃO'}`, margin + 145, y + 36);

  if (os.avariasEncontradas && os.descricaoAvarias) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`Descrição da Avaria: ${os.descricaoAvarias}`, margin + 3, y + 43);
  }

  y += 52;

  // SEÇÃO 3: NOVO EQUIPAMENTO INSTALADO EM SUBSTITUIÇÃO (TERMINA COM O NOVO EQUIPAMENTO)
  drawSectionTitle('3. NOVO EQUIPAMENTO INSTALADO EM SUBSTITUIÇÃO (CONTRATO NOVO)');
  doc.rect(margin, y, contentWidth, 20, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);

  doc.text(`Patrimônio Novo: `, margin + 3, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.text(`${os.patrimonio}`, margin + 30, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.text(`Modelo: `, margin + 65, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.text(`${os.modelo}`, margin + 78, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.text(`Nº de Série: `, margin + 120, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.text(`${os.numeroSerie}`, margin + 140, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.text(`Instalado via: `, margin + 3, y + 11);
  doc.setFont('helvetica', 'bold');
  doc.text(`${os.tipoConexao} ${os.enderecoIP ? `(IP: ${os.enderecoIP})` : ''}`, margin + 25, y + 11);

  doc.setFont('helvetica', 'normal');
  doc.text(`Nº OS de Instalação: `, margin + 110, y + 11);
  doc.setFont('helvetica', 'bold');
  doc.text(`${os.numeroOS || 'S/N'}`, margin + 143, y + 11);

  y += 24;

  // SEÇÃO 4: CONFIRMAÇÃO DO CLIENTE / RESPONSÁVEL DO LOCAL
  drawSectionTitle('4. INSTRUÇÕES AOS USUÁRIOS & VALIDAÇÃO DO RESPONSÁVEL');
  doc.rect(margin, y, contentWidth, 38, 'FD');

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text(
    'Declaro para os devidos fins que o equipamento do contrato anterior acima identificado foi devidamente retirado e conferido',
    margin + 3,
    y + 4
  );
  doc.text(
    'pela equipe técnica da Maquim, com contadores finais apurados no ato, instruções prestadas e substituído pelo novo equipamento.',
    margin + 3,
    y + 7.5
  );

  drawBlocoValidacaoResponsavel(doc, os, margin, y);

  // Caixa de Assinatura do Cliente
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Assinatura do responsável que validou o serviço:', margin + 105, y + 13);
  doc.rect(margin + 105, y + 15, 70, 18);

  if (os.assinaturaClienteBase64) {
    try {
      doc.addImage(os.assinaturaClienteBase64, 'PNG', margin + 106, y + 15.5, 68, 17);
    } catch (e) {
      doc.text('(Assinado digitalmente)', margin + 120, y + 24);
    }
  }

  y += 40;

  // SEÇÃO 5: IDENTIFICAÇÃO DO TÉCNICO
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, contentWidth, 16, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Técnico que Realizou a Retirada: ${os.tecnicoNome || 'Técnico Maquim'}`, margin + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`E-mail de Envio: ${os.emailDestinatario || 'contratos2@maquim.com.br'}`, margin + 4, y + 11.5);
  doc.text('Documento eletrônico comprobatório de encerramento de contrato e devolução patrimonial.', margin + 70, y + 11.5);

  // Rodapé da Página 1
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Maquim - Sistema de Gestão de Contratos | OS Retirada: ${os.numeroOSRetirada || 'S/N'} | Patr Retirado: ${os.patrimonioAnterior || 'N/A'} | GATi: ${os.gatiInstalacao} | Gerado em ${new Date().toLocaleString('pt-BR')}`,
    margin,
    pageHeight - 6
  );

  // PÁGINA 2: ANEXO FOTOGRÁFICO DO RELATÓRIO DO CONTADOR IMPRESSO
  if (os.fotoRelatorioContadorBase64 || os.fotoAvariaBase64) {
    doc.addPage();
    renderPaginaFotos(doc, os, 'retirada');
  }

  return doc;
}

/**
 * Renderiza a Página 2 de Fotos com alta fidelidade para relatórios e avarias
 */
function renderPaginaFotos(doc: jsPDF, os: OrdemServico, tipoOS: 'instalacao' | 'retirada'): void {
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;

  let page2Y = 14;

  // Header Página 2
  doc.setFillColor(MAQUIM_COLORS.navyDark[0], MAQUIM_COLORS.navyDark[1], MAQUIM_COLORS.navyDark[2]);
  doc.rect(margin, page2Y, contentWidth, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('ANEXO: COMPROVANTES FOTOGRÁFICOS DA RETIRADA', margin + 6, page2Y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(
    `Patrimônio Retirado: ${os.patrimonioAnterior || 'N/A'} | Série: ${os.numeroSerieAnterior || 'N/A'} | Modelo: ${os.modeloAnterior || 'N/A'} | Contadores: ${os.contadorPaginasFinal || os.contadorMono || 'N/A'}`,
    margin + 6,
    page2Y + 13
  );

  page2Y += 24;

  // Foto do Relatório do Contador (Destaque Principal)
  if (os.fotoRelatorioContadorBase64) {
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, page2Y, contentWidth, 8, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(MAQUIM_COLORS.navyDark[0], MAQUIM_COLORS.navyDark[1], MAQUIM_COLORS.navyDark[2]);
    doc.text('1. FOTO DO RELATÓRIO IMPRESSO DE CONTADORES E SUPRIMENTOS (MÁQUINA RETIRADA)', margin + 4, page2Y + 5.5);

    page2Y += 10;

    try {
      const imgHeight = os.fotoAvariaBase64 ? 120 : 180;
      doc.addImage(
        os.fotoRelatorioContadorBase64,
        'JPEG',
        margin + (contentWidth - 140) / 2,
        page2Y,
        140,
        imgHeight
      );
      page2Y += imgHeight + 6;
    } catch (err) {
      doc.setTextColor(220, 38, 38);
      doc.text('(Erro ao processar imagem do relatório)', margin + 4, page2Y + 10);
      page2Y += 20;
    }
  }

  // Foto da Avaria (se houver)
  if (os.fotoAvariaBase64 && page2Y < pageHeight - 60) {
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(252, 165, 165);
    doc.rect(margin, page2Y, contentWidth, 8, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(185, 28, 28);
    doc.text(`2. FOTO DA AVARIA ENCONTRADA: ${os.descricaoAvarias || ''}`, margin + 4, page2Y + 5.5);

    page2Y += 10;
    try {
      doc.addImage(
        os.fotoAvariaBase64,
        'JPEG',
        margin + (contentWidth - 110) / 2,
        page2Y,
        110,
        65
      );
    } catch (e) {
      // Ignora erro secundário
    }
  }

  // Rodapé Página 2
  const osNome = tipoOS === 'retirada' ? (os.numeroOSRetirada || 'S/N') : (os.numeroOS || 'S/N');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Página 2 de 2 | Anexo Fotográfico da OS ${osNome} | Técnico: ${os.tecnicoNome}`,
    margin,
    pageHeight - 6
  );
}

/**
 * Função de conveniência padrão
 */
export function generateOSPDF(os: OrdemServico): jsPDF {
  return generateOSInstalacaoPDF(os);
}

/**
 * Baixa o PDF de instalação individualmente
 */
export function downloadOSInstalacaoPDF(os: OrdemServico): void {
  const doc = generateOSInstalacaoPDF(os);
  const filename = getOSFilename(os, 'instalacao');
  doc.save(filename);
}

/**
 * Baixa o PDF de retirada individualmente
 */
export function downloadOSRetiradaPDF(os: OrdemServico): void {
  const doc = generateOSRetiradaPDF(os);
  const filename = getOSFilename(os, 'retirada');
  doc.save(filename);
}

/**
 * Baixa ambos os PDFs se houver retirada, ou apenas a instalação se não houver
 */
export function downloadAllOSPDFs(os: OrdemServico): void {
  downloadOSInstalacaoPDF(os);
  if (os.substituiAnterior) {
    // Pequeno delay para permitir o download conjunto pelo navegador
    setTimeout(() => {
      downloadOSRetiradaPDF(os);
    }, 400);
  }
}

/**
 * Mantido para compatibilidade retroativa
 */
export function downloadOSPDF(os: OrdemServico): void {
  downloadAllOSPDFs(os);
}
