/**
 * Validação e formatação de CPF
 */
export function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

export function isValidCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  // Elimina CPFs com todos dígitos iguais (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i], 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(digits[9], 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits[i], 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(digits[10], 10)) return false;

  return true;
}

/**
 * Validação de IP (IPv4)
 */
export function isValidIPv4(ip: string): boolean {
  const trimmed = ip.trim();
  const parts = trimmed.split('.');
  if (parts.length !== 4) return false;
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return false;
    const num = parseInt(part, 10);
    if (num < 0 || num > 255) return false;
    // Não permitir zeros à esquerda tipo 01
    if (part.length > 1 && part.startsWith('0')) return false;
  }
  return true;
}

/**
 * Normalizador de busca para texto com acentos
 */
export function normalizeSearch(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/º/g, 'o')
    .replace(/ª/g, 'a')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Validação de integridade do formulário de Ordem de Serviço
 */
export interface OSValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface OSFormData {
  patrimonio: string;
  numeroSerie: string;
  modelo: string;
  gatiInstalacao: string;
  clienteInstalacao: string;
  tipoConexao: 'Via Rede' | 'Via WI-FI' | 'Via USB para IMPRESSÃO' | '';
  enderecoIP?: string;
  conectadoWifiERS?: boolean;
  justificativaWifiERS?: string;
  conferenciaERS?: boolean;
  justificativaERS?: string;
  substituiAnterior: boolean;
  patrimonioAnterior?: string;
  equipamentoRetirado?: boolean;
  justificativaEquipRetirado?: string;
  caboEnergiaRetirado?: boolean;
  justificativaCaboEnergia?: string;
  bandejaSaidaRetirada?: boolean;
  justificativaBandejaSaida?: string;
  avariasEncontradas?: boolean;
  descricaoAvarias?: string;
  responsavelNome: string;
  responsavelCPF: string;
  tecnicoNome: string;
}

export function validateOSForm(data: Partial<OSFormData>): OSValidationResult {
  const errors: Record<string, string> = {};

  if (!data.patrimonio?.trim()) {
    errors.patrimonio = 'Informe ou selecione o patrimônio do equipamento.';
  }
  if (!data.numeroSerie?.trim()) {
    errors.numeroSerie = 'Número de série não preenchido.';
  }
  if (!data.gatiInstalacao?.trim()) {
    errors.gatiInstalacao = 'Informe o código GATi do local.';
  }
  if (!data.clienteInstalacao?.trim()) {
    errors.clienteInstalacao = 'Cliente ou local de instalação não informado.';
  }

  // Validação do tipo de conexão
  if (!data.tipoConexao) {
    errors.tipoConexao = 'Selecione a forma de instalação (Rede, WI-FI ou USB).';
  } else if (data.tipoConexao === 'Via Rede' || data.tipoConexao === 'Via WI-FI') {
    if (!data.enderecoIP?.trim()) {
      errors.enderecoIP = 'Endereço IP é obrigatório para conexões Rede/WI-FI.';
    } else if (!isValidIPv4(data.enderecoIP)) {
      errors.enderecoIP = 'Formato de IP inválido (ex: 192.168.15.100).';
    }
  } else if (data.tipoConexao === 'Via USB para IMPRESSÃO') {
    if (data.conectadoWifiERS === false && !data.justificativaWifiERS?.trim()) {
      errors.justificativaWifiERS = 'Justifique por que o equipamento USB não está conectado ao WI-FI para monitoramento ERS.';
    }
  }

  // Validação de ERS
  if (data.conferenciaERS === false && !data.justificativaERS?.trim()) {
    errors.justificativaERS = 'Justifique por que o equipamento não foi incluído ou conferido no ERS.';
  }

  // Validação do contrato anterior
  if (data.substituiAnterior) {
    if (!data.patrimonioAnterior?.trim()) {
      errors.patrimonioAnterior = 'Informe o patrimônio do equipamento anterior a ser retirado.';
    }
    if (data.equipamentoRetirado === false && !data.justificativaEquipRetirado?.trim()) {
      errors.justificativaEquipRetirado = 'Justifique por que o equipamento anterior não foi retirado.';
    }
    if (data.caboEnergiaRetirado === false && !data.justificativaCaboEnergia?.trim()) {
      errors.justificativaCaboEnergia = 'Justifique por que o cabo de energia não foi retirado.';
    }
    if (data.bandejaSaidaRetirada === false && !data.justificativaBandejaSaida?.trim()) {
      errors.justificativaBandejaSaida = 'Justifique por que a bandeja de saída não foi retirada.';
    }
    if (data.avariasEncontradas === true && !data.descricaoAvarias?.trim()) {
      errors.descricaoAvarias = 'Descreva as avarias encontradas no equipamento anterior.';
    }
  }

  // Validação do responsável e técnico
  if (!data.responsavelNome?.trim()) {
    errors.responsavelNome = 'Nome e sobrenome do responsável do local são obrigatórios.';
  } else if (data.responsavelNome.trim().split(' ').length < 2) {
    errors.responsavelNome = 'Informe nome e sobrenome completos do responsável.';
  }

  if (!data.responsavelCPF?.trim()) {
    errors.responsavelCPF = 'CPF do responsável é obrigatório.';
  } else if (!isValidCPF(data.responsavelCPF)) {
    errors.responsavelCPF = 'CPF inválido. Verifique os números digitados.';
  }

  if (!data.tecnicoNome?.trim()) {
    errors.tecnicoNome = 'Nome do técnico responsável é obrigatório.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
