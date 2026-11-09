import { OrdemServico } from '../types';
import {
  generateOSInstalacaoPDF,
  generateOSRetiradaPDF,
  getOSFilename,
  downloadAllOSPDFs,
} from './pdfGenerator';

export const MAQUIM_EMAIL_DESTINATARIO = 'contratos2@maquim.com.br';

/**
 * Assunto padronizado exato:
 * "Instalação: Patr. [Patrimônio Instalado] & Retirada: Patr. [Patrimônio Retirado]"
 */
export function buildEmailSubject(os: OrdemServico): string {
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
 * Corpo resumido e otimizado para o protocolo mailto: (evita o limite de 2048 caracteres do Windows / Outlook Classic)
 */
export function buildEmailBodyConcise(os: OrdemServico): string {
  const fileInstalacao = getOSFilename(os, 'instalacao');
  const fileRetirada = os.substituiAnterior ? getOSFilename(os, 'retirada') : null;

  let anexosInfo = `Anexo(s) salvo(s) na pasta Downloads:\n- ${fileInstalacao}`;
  if (fileRetirada) {
    anexosInfo += `\n- ${fileRetirada}`;
  }

  let retiradaText = '';
  if (os.substituiAnterior) {
    retiradaText = `\nRETIRADA CONTRATO ANTERIOR:\n` +
      `- OS Retirada: ${os.numeroOSRetirada || '(Pendente na planilha)'}\n` +
      `- Patrimônio Retirado: #${os.patrimonioAnterior || 'N/A'}\n` +
      `- Modelo Retirado: ${os.modeloAnterior || 'N/A'}\n` +
      `- Contadores na Retirada: ${os.contadorPaginasFinal || (os.contadorMono ? `Mono: ${os.contadorMono} / Color: ${os.contadorColor || 'N/A'}` : 'N/A')}\n` +
      `- Equipamento Recolhido: ${os.equipamentoRetirado ? 'SIM' : 'NÃO'} | Cabo: ${os.caboEnergiaRetirado ? 'SIM' : 'NÃO'} | Bandeja: ${os.bandejaSaidaRetirada ? 'SIM' : 'NÃO'}\n`;
  }

  return `Prezada equipe de Contratos Maquim,

Seguem as Ordens de Serviço referente à implantação e retirada em Lorena/SP:

INSTALAÇÃO:
- OS Instalação: ${os.numeroOS || '(Pendente na planilha)'}
- Local: ${os.clienteInstalacao} (GATi: ${os.gatiInstalacao})
- Endereço: ${os.endereco} - ${os.bairro}
- Patrimônio Novo: #${os.patrimonio} (${os.modelo} - Série: ${os.numeroSerie})
- Conexão: ${os.tipoConexao || 'N/I'} | ERS: ${os.conferenciaERS ? 'SIM' : 'NÃO'}${retiradaText}
VALIDAÇÃO:
- Responsável: ${os.responsavelNome} (CPF: ${os.responsavelCPF})
- Técnico: ${os.tecnicoNome} | Data: ${os.dataInstalacao}

${anexosInfo}
(Assinatura digital e fotos dos contadores/avarias carimbadas nos PDFs anexos)`.trim();
}

/**
 * Corpo completo detalhado para visualização ou cópia integral
 */
export function buildEmailBody(os: OrdemServico): string {
  return buildEmailBodyConcise(os);
}

/**
 * Abre diretamente o Outlook Classic (ou cliente padrão do Windows) via protocolo mailto:
 * sem restrições de tamanho de buffer do Windows.
 */
export function openOutlookClassic(os: OrdemServico): void {
  // Baixa os PDFs primeiro para garantir que estão na pasta Downloads
  try {
    downloadAllOSPDFs(os);
  } catch (e) {
    console.error('Erro ao baixar PDFs:', e);
  }

  const subject = encodeURIComponent(buildEmailSubject(os));
  const body = encodeURIComponent(buildEmailBodyConcise(os));
  const mailtoUrl = `mailto:${MAQUIM_EMAIL_DESTINATARIO}?subject=${subject}&body=${body}`;

  // Cria um elemento <a> temporário para acionar o protocolo do Windows de forma confiável
  const link = document.createElement('a');
  link.href = mailtoUrl;
  link.target = '_self';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Copia os dados completos para a área de transferência como apoio
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(buildEmailBodyConcise(os)).catch(() => {});
  }
}

/**
 * Abre diretamente o Outlook Web (Office 365 Corporativo)
 */
export function openOutlookOffice365Web(os: OrdemServico): void {
  try {
    downloadAllOSPDFs(os);
  } catch (e) {
    console.error('Erro ao baixar PDFs:', e);
  }

  const subject = encodeURIComponent(buildEmailSubject(os));
  const body = encodeURIComponent(buildEmailBodyConcise(os));
  const url = `https://outlook.office.com/mail/deeplink/compose?to=${MAQUIM_EMAIL_DESTINATARIO}&subject=${subject}&body=${body}`;
  window.open(url, '_blank');
}

/**
 * Abre diretamente o Outlook Live / Hotmail Web
 */
export function openOutlookLiveWeb(os: OrdemServico): void {
  try {
    downloadAllOSPDFs(os);
  } catch (e) {
    console.error('Erro ao baixar PDFs:', e);
  }

  const subject = encodeURIComponent(buildEmailSubject(os));
  const body = encodeURIComponent(buildEmailBodyConcise(os));
  const url = `https://outlook.live.com/mail/0/deeplink/compose?to=${MAQUIM_EMAIL_DESTINATARIO}&subject=${subject}&body=${body}`;
  window.open(url, '_blank');
}

/**
 * Abre o Gmail Web com destinatário e dados preenchidos
 */
export function openGmailWeb(os: OrdemServico): void {
  try {
    downloadAllOSPDFs(os);
  } catch (e) {
    console.error('Erro ao baixar PDFs:', e);
  }

  const subject = encodeURIComponent(buildEmailSubject(os));
  const body = encodeURIComponent(buildEmailBodyConcise(os));
  const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${MAQUIM_EMAIL_DESTINATARIO}&su=${subject}&body=${body}`;
  window.open(url, '_blank');
}

/**
 * Copia os dados do e-mail para a área de transferência
 */
export async function copyEmailContent(os: OrdemServico): Promise<boolean> {
  const content = `Para: ${MAQUIM_EMAIL_DESTINATARIO}
Assunto: ${buildEmailSubject(os)}

${buildEmailBodyConcise(os)}`;

  try {
    await navigator.clipboard.writeText(content);
    return true;
  } catch (e) {
    console.error('Erro ao copiar:', e);
    return false;
  }
}

/**
 * Abre o cliente de e-mail padrão pré-preenchido
 */
export function openMailClient(os: OrdemServico): void {
  openOutlookClassic(os);
}

/**
 * Envia / compartilha a OS com o(s) arquivo(s) PDF físico(s) anexado(s).
 * - Em smartphones / tablets (Android/iOS): anexa diretamente os arquivos PDF via Web Share API.
 * - No PC / Desktop (Windows com Outlook Classic): baixa os PDFs para a pasta Downloads e abre o Outlook Classic pré-preenchido!
 */
export async function shareOSWithPDFAttachment(os: OrdemServico): Promise<{
  success: boolean;
  method: 'native-share' | 'download-mailto';
  filenames: string[];
  message?: string;
}> {
  const filenameInstalacao = getOSFilename(os, 'instalacao');
  const filenameRetirada = os.substituiAnterior ? getOSFilename(os, 'retirada') : null;
  const filenames = filenameRetirada ? [filenameInstalacao, filenameRetirada] : [filenameInstalacao];

  const subject = buildEmailSubject(os);
  const body = buildEmailBodyConcise(os);

  // No mobile/tablet moderno que suporta envio direto com arquivos:
  const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

  if (isMobile) {
    try {
      const docInst = generateOSInstalacaoPDF(os);
      const blobInst = docInst.output('blob');
      const fileInst = new File([blobInst], filenameInstalacao, { type: 'application/pdf' });
      const filesToShare: File[] = [fileInst];

      if (os.substituiAnterior) {
        const docRet = generateOSRetiradaPDF(os);
        const blobRet = docRet.output('blob');
        const fileRet = new File([blobRet], filenameRetirada!, { type: 'application/pdf' });
        filesToShare.push(fileRet);
      }

      if (navigator.canShare && navigator.canShare({ files: filesToShare })) {
        await navigator.share({
          files: filesToShare,
          title: subject,
          text: body,
        });
        return { success: true, method: 'native-share', filenames };
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: false, method: 'native-share', filenames, message: 'Compartilhamento cancelado.' };
      }
      console.warn('Web Share mobile não disponível, usando fallback para Outlook:', err);
    }
  }

  // No PC / Desktop: Aciona o Outlook Classic, baixa os PDFs na pasta Downloads e copia os dados
  openOutlookClassic(os);

  const filenamesList = filenames.join(' e ');
  return {
    success: true,
    method: 'download-mailto',
    filenames,
    message: `Outlook Classic acionado! Os PDFs (${filenamesList}) foram salvos na sua pasta Downloads e o e-mail foi aberto para contratos2@maquim.com.br. Basta anexar os arquivos.`,
  };
}

/**
 * Gera link de compartilhamento para WhatsApp
 */
export function openWhatsAppShare(os: OrdemServico): void {
  const osRetiradaText = os.substituiAnterior
    ? `*OS Retirada:* ${os.numeroOSRetirada || 'S/N'}\n*Patrimônio Retirado:* #${os.patrimonioAnterior} (${os.modeloAnterior}) - Contador: ${os.contadorPaginasFinal || 'N/I'}\n`
    : '';

  const text = encodeURIComponent(
    `*Ordem de Serviço Maquim - Lorena*\n\n` +
      `*OS Instalação:* ${os.numeroOS || 'S/N'}\n` +
      `*Local:* ${os.clienteInstalacao} (GATi: ${os.gatiInstalacao})\n` +
      `*Patrimônio Instalado:* #${os.patrimonio} (${os.modelo})\n` +
      osRetiradaText +
      `*Responsável:* ${os.responsavelNome} (CPF: ${os.responsavelCPF})\n` +
      `*Técnico:* ${os.tecnicoNome}\n` +
      `*Status:* Instalação e/ou Retirada concluídas com sucesso!`
  );
  window.open(`https://wa.me/?text=${text}`, '_blank');
}
