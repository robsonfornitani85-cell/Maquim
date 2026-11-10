import { OrdemServico, TipoConexao } from '../types';

/**
 * Reconstrói Ordens de Serviço a partir dos PDFs gerados pelo próprio app
 * (versão antiga e atual). Usado para recuperar OSs que sumiram do Histórico:
 * o técnico seleciona os PDFs que ficaram na pasta Downloads (ou recebidos por
 * e-mail) e o app volta a registrar a OS, marca a planilha e guarda os PDFs
 * originais para download.
 */

export interface PdfLido {
  arquivo: File;
  tipo: 'instalacao' | 'retirada' | 'desconhecido';
  itens: string[];
  texto: string;
}

/** Extrai os textos do PDF na ordem de leitura (linha por linha, da esquerda para a direita). */
export async function lerTextoPDF(arquivo: File): Promise<PdfLido> {
  const pdfjs = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const data = new Uint8Array(await arquivo.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const itens: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const tc = await (await doc.getPage(p)).getTextContent();
    const linhas = new Map<number, { x: number; s: string }[]>();
    for (const it of tc.items as any[]) {
      if (typeof it.str !== 'string') continue;
      const y = Math.round(it.transform[5]);
      if (!linhas.has(y)) linhas.set(y, []);
      linhas.get(y)!.push({ x: it.transform[4], s: it.str });
    }
    [...linhas.entries()]
      .sort((a, b) => b[0] - a[0])
      .forEach(([, r]) =>
        r
          .sort((a, b) => a.x - b.x)
          .forEach((i) => {
            const t = i.s.trim();
            if (t) itens.push(t);
          })
      );
  }
  const texto = itens.join('\n');
  const tipo = /ORDEM DE SERVI[ÇC]O DE INSTALA/i.test(texto)
    ? 'instalacao'
    : /ORDEM DE SERVI[ÇC]O DE RETIRADA/i.test(texto)
    ? 'retirada'
    : 'desconhecido';
  return { arquivo, tipo, itens, texto };
}

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();

/** Valor do item logo após o rótulo (ex: "Patrimônio:" → "8392"). */
function depoisDe(itens: string[], rotulo: string, aPartirDe = 0): { valor?: string; indice: number } {
  const alvo = norm(rotulo);
  for (let i = aPartirDe; i < itens.length; i++) {
    const n = norm(itens[i]);
    if (n === alvo || n === alvo.replace(/:$/, '') || (n.startsWith(alvo) && n.length === alvo.length + 1)) {
      return { valor: itens[i + 1], indice: i };
    }
  }
  return { indice: -1 };
}

/** Valor dentro do mesmo texto (ex: "Nº DA OS DE INSTALAÇÃO: 2026110400"). */
function inline(texto: string, rotulo: RegExp): string | undefined {
  const m = rotulo.exec(texto);
  return m ? m[1].trim() : undefined;
}

const simNao = (v?: string): boolean | undefined => {
  if (!v) return undefined;
  const n = norm(v);
  if (n.startsWith('SIM')) return true;
  if (n.startsWith('NAO')) return false;
  return undefined;
};

const numeroOS = (v?: string) => (v && /\d{6,}/.test(v) ? v.match(/\d{6,}/)![0] : '');

function lerInstalacao(pdf: PdfLido): Partial<OrdemServico> {
  const { itens, texto } = pdf;
  const v = (r: string, de = 0) => depoisDe(itens, r, de).valor;
  const os: Partial<OrdemServico> = {};

  os.numeroOS = numeroOS(inline(texto, /N[ºo°] DA OS DE INSTALA[ÇC][ÃA]O:\s*([^\n]*)/i)) ||
    numeroOS(inline(texto, /OS Instala[çc][ãa]o:\s*([^|\n]*)/i));
  os.dataInstalacao = inline(texto, /DATA DA INSTALA[ÇC][ÃA]O:\s*([^\n]*)/i);
  os.tecnicoNome = inline(texto, /T[ée]cnico Respons[áa]vel:\s*([^\n]*)/i);
  os.clienteInstalacao = v('Cliente / Unidade:');
  os.secretaria = v('Secretaria:');
  os.gatiInstalacao = v('GATi Instalação:') || inline(texto, /GATi:\s*(\d+)/i);
  os.endereco = v('Endereço:');
  os.bairro = v('Bairro:');
  const setor = v('Setor / Sala:');
  os.setor = setor && !/Geral \/ Padr/i.test(setor) ? setor : '';

  const pat = depoisDe(itens, 'Patrimônio:');
  os.patrimonio = pat.valor || inline(texto, /\| Patr:\s*([^|\n]*)/i);
  os.modelo = v('Modelo:', Math.max(0, pat.indice));
  os.numeroSerie = v('Nº de Série:', Math.max(0, pat.indice));
  const via = v('Instalado via:');
  if (via) os.tipoConexao = (/USB/i.test(via) ? 'Via USB para IMPRESSÃO' : /WI-?FI/i.test(via) ? 'Via WI-FI' : 'Via Rede') as TipoConexao;
  const ip = v('Endereço IP Configurado:');
  if (ip && /\d+\.\d+\.\d+\.\d+/.test(ip)) os.enderecoIP = ip.match(/\d+\.\d+\.\d+\.\d+/)![0];
  os.scanSMB = simNao(v('Digitalização via SMB (pasta PC):'));
  os.abbyFineReader = simNao(v('Abby Fine Reader instalado (PDF-A):'));
  os.conectadoWifiERS = simNao(v('Conectado via WI-FI para monitoramento ERS?'));
  os.scanEpsonScan2 = simNao(v('Epson Scan 2 instalado:'));
  os.ocrComponente = simNao(v('OCR Componente instalado (PDF-A):'));
  os.conferenciaERS = simNao(v('Equipamento incluído no ERS / Conferência realizada?')) ?? true;

  os.substituiAnterior = simNao(v('Houve substituição de equipamento anterior?')) ?? false;
  if (os.substituiAnterior) {
    os.numeroOSRetirada = numeroOS(v('Nº OS de Retirada:'));
    const ant = depoisDe(itens, 'Patrimônio Retirado:');
    os.patrimonioAnterior = ant.valor;
    os.modeloAnterior = v('Modelo:', Math.max(0, ant.indice));
    os.numeroSerieAnterior = v('Nº de Série:', Math.max(0, ant.indice));
    const cont = inline(texto, /CONTADORES FINAIS \(NO ATO DA RETIRADA\):\s*\n?([^\n]*)/i);
    os.contadorPaginasFinal = cont;
    os.contadorMono = inline(texto, /Total Mono:\s*([\d.,]+)/i);
    os.contadorColor = inline(texto, /Total Color:\s*([\d.,]+)/i);
    os.equipamentoRetirado = simNao(v('1. Equipamento retirado:'));
    os.caboEnergiaRetirado = simNao(v('2. Cabo energia:'));
    os.bandejaSaidaRetirada = simNao(v('3. Bandeja saída:'));
    os.avariasEncontradas = simNao(v('4. Avarias encontradas:'));
    os.descricaoAvarias = inline(texto, /Descri[çc][ãa]o da Avaria:\s*([^\n]*)/i);
  }

  lerResponsavel(pdf, os);
  return os;
}

function lerRetirada(pdf: PdfLido): Partial<OrdemServico> {
  const { itens, texto } = pdf;
  const v = (r: string, de = 0) => depoisDe(itens, r, de).valor;
  const os: Partial<OrdemServico> = { substituiAnterior: true };
  os.numeroOSRetirada = numeroOS(inline(texto, /N[ºo°] DA OS DE RETIRADA:\s*([^\n]*)/i)) ||
    numeroOS(inline(texto, /OS Retirada:\s*([^|\n]*)/i));
  os.numeroOS = numeroOS(inline(texto, /OS de Instala[çc][ãa]o Vinculada:\s*([^\n]*)/i)) || numeroOS(v('Nº OS de Instalação:'));
  os.dataInstalacao = inline(texto, /DATA DA RETIRADA:\s*([^\n]*)/i);
  os.tecnicoNome = inline(texto, /T[ée]cnico Respons[áa]vel pela Retirada:\s*([^\n]*)/i);
  os.clienteInstalacao = v('Cliente / Unidade:');
  os.secretaria = v('Secretaria:');
  os.gatiInstalacao = v('GATi Instalação/Origem:') || inline(texto, /GATi:\s*(\d+)/i);
  os.endereco = v('Endereço:');
  os.bairro = v('Bairro:');
  const setor = v('Setor / Sala:');
  os.setor = setor && !/Geral \/ Padr/i.test(setor) ? setor : '';
  const ant = depoisDe(itens, 'Patrimônio Retirado:');
  os.patrimonioAnterior = ant.valor || inline(texto, /Patr Retirado:\s*([^|\n]*)/i);
  os.modeloAnterior = v('Modelo:', Math.max(0, ant.indice));
  os.numeroSerieAnterior = v('Nº de Série:', Math.max(0, ant.indice));
  const mono = v('Contador Mono (P&B):');
  const color = v('Contador Colorido:');
  os.contadorMono = mono;
  os.contadorColor = color && !/N\/A/i.test(color) ? color : undefined;
  os.contadorPaginasFinal = v('Total Geral:');
  os.equipamentoRetirado = simNao(v('1. Equipamento físico retirado?'));
  os.caboEnergiaRetirado = simNao(v('2. Cabo de energia retirado?'));
  os.bandejaSaidaRetirada = simNao(v('3. Bandeja de papéis retirada?'));
  os.avariasEncontradas = simNao(v('4. Avaria(s) encontrada(s)?'));
  const novo = depoisDe(itens, 'Patrimônio Novo:');
  os.patrimonio = novo.valor;
  os.modelo = v('Modelo:', Math.max(0, novo.indice));
  os.numeroSerie = v('Nº de Série:', Math.max(0, novo.indice));
  lerResponsavel(pdf, os);
  return os;
}

function lerResponsavel(pdf: PdfLido, os: Partial<OrdemServico>) {
  const { itens } = pdf;
  const v = (r: string) => depoisDe(itens, r).valor;
  os.responsavelNome =
    v('NOME E SOBRENOME DO RESPONSÁVEL QUE ACOMPANHOU E VALIDOU O SERVIÇO:') || v('Responsável do Local:') || '';
  os.responsavelCPF = v('CPF DO RESPONSÁVEL QUE ACOMPANHOU E VALIDOU O SERVIÇO:') || v('CPF do Responsável:') || '';
  // Lista de usuários: primeiro texto após o rótulo que não seja outro rótulo
  const r1 = depoisDe(itens, 'INSTRUÇÕES DE USO E PRÉ-MANUTENÇÃO PRESTADAS A:');
  const r2 = depoisDe(itens, 'Usuários Instruídos (Uso & Pré-Manutenção):');
  const idx = r1.indice >= 0 ? r1.indice : r2.indice;
  if (idx >= 0) {
    for (let i = idx + 1; i < Math.min(itens.length, idx + 4); i++) {
      if (!itens[i].trim().endsWith(':')) {
        const nomes = itens[i].split('•').map((s) => s.trim()).filter(Boolean);
        if (nomes.length && !/Nenhum usu/i.test(itens[i])) os.usuariosTreinados = nomes;
        break;
      }
    }
  }
}

export interface ResultadoImportacao {
  ordens: OrdemServico[];
  ignorados: string[]; // arquivos que não são PDFs de OS do app
}

/**
 * Lê vários PDFs e junta, numa mesma OS, o PDF de instalação e o de retirada
 * do mesmo atendimento (pelo Nº da OS de instalação ou pelo patrimônio novo).
 */
export async function importarPDFs(arquivos: File[]): Promise<ResultadoImportacao> {
  const grupos = new Map<string, { dados: Partial<OrdemServico>; pdfs: { nome: string; blob: Blob }[] }>();
  const ignorados: string[] = [];

  for (const arq of arquivos) {
    let lido: PdfLido;
    try {
      lido = await lerTextoPDF(arq);
    } catch {
      ignorados.push(arq.name);
      continue;
    }
    if (lido.tipo === 'desconhecido') {
      ignorados.push(arq.name);
      continue;
    }
    const dados = lido.tipo === 'instalacao' ? lerInstalacao(lido) : lerRetirada(lido);
    const chave = dados.numeroOS ? `os:${dados.numeroOS}` : `pat:${dados.patrimonio || arq.name}`;
    const g = grupos.get(chave) || { dados: {}, pdfs: [] };
    // Dados do PDF de instalação têm prioridade; o de retirada completa o que faltar
    const base = lido.tipo === 'instalacao' ? { ...g.dados, ...limpar(dados) } : { ...limpar(dados), ...g.dados };
    g.dados = base;
    g.pdfs.push({ nome: arq.name, blob: arq });
    grupos.set(chave, g);
  }

  const ordens: OrdemServico[] = [];
  for (const { dados, pdfs } of grupos.values()) {
    if (!dados.patrimonio && !dados.patrimonioAnterior) continue;
    ordens.push({
      id: `os-restaurada-${dados.numeroOS || dados.patrimonio}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      numeroOS: dados.numeroOS || '',
      numeroOSRetirada: dados.numeroOSRetirada || undefined,
      dataRegistro: new Date().toISOString(),
      dataInstalacao: dados.dataInstalacao || '',
      tecnicoNome: dados.tecnicoNome || '',
      gatiInstalacao: dados.gatiInstalacao || '',
      secretaria: dados.secretaria || '',
      clienteInstalacao: dados.clienteInstalacao || '',
      endereco: dados.endereco || '',
      bairro: dados.bairro || '',
      setor: dados.setor || '',
      patrimonio: dados.patrimonio || '',
      numeroSerie: dados.numeroSerie || '',
      modelo: dados.modelo || '',
      tipoConexao: dados.tipoConexao || 'Via Rede',
      enderecoIP: dados.enderecoIP,
      scanSMB: dados.scanSMB,
      abbyFineReader: dados.abbyFineReader,
      conectadoWifiERS: dados.conectadoWifiERS,
      scanEpsonScan2: dados.scanEpsonScan2,
      ocrComponente: dados.ocrComponente,
      conferenciaERS: dados.conferenciaERS ?? true,
      substituiAnterior: Boolean(dados.substituiAnterior),
      patrimonioAnterior: dados.patrimonioAnterior,
      numeroSerieAnterior: dados.numeroSerieAnterior,
      modeloAnterior: dados.modeloAnterior,
      contadorMono: dados.contadorMono,
      contadorColor: dados.contadorColor,
      contadorPaginasFinal: dados.contadorPaginasFinal,
      equipamentoRetirado: dados.equipamentoRetirado,
      caboEnergiaRetirado: dados.caboEnergiaRetirado,
      bandejaSaidaRetirada: dados.bandejaSaidaRetirada,
      avariasEncontradas: dados.avariasEncontradas,
      descricaoAvarias: dados.descricaoAvarias,
      usuariosTreinados: dados.usuariosTreinados,
      responsavelNome: dados.responsavelNome || '',
      responsavelCPF: dados.responsavelCPF || '',
      enviadoEmail: true, // PDFs já existiam (gerados e, em geral, já enviados)
      emailDestinatario: 'contratos2@maquim.com.br',
      restauradaDePDF: true,
      pdfsOriginais: pdfs,
    });
  }
  return { ordens, ignorados };
}

function limpar<T extends object>(o: T): Partial<T> {
  const out: Partial<T> = {};
  (Object.keys(o) as (keyof T)[]).forEach((k) => {
    const v = o[k];
    if (v !== undefined && v !== null && v !== '') out[k] = v;
  });
  return out;
}

// Exposto para testes automatizados
export const _parsers = { lerInstalacao, lerRetirada };
