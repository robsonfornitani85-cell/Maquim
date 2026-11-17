import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCPF, isValidCPF, isValidIPv4, normalizeSearch, validateOSForm } from './validation';

test('formatCPF formats digits into standard Brazilian CPF mask', () => {
  assert.equal(formatCPF('12345678901'), '123.456.789-01');
  assert.equal(formatCPF('123'), '123');
  assert.equal(formatCPF('123456'), '123.456');
  assert.equal(formatCPF('123456789'), '123.456.789');
});

test('isValidCPF correctly checks CPF checksum', () => {
  // Test known valid CPFs
  assert.equal(isValidCPF('52998224725'), true);
  // Invalid CPFs
  assert.equal(isValidCPF('11111111111'), false);
  assert.equal(isValidCPF('12345678900'), false);
  assert.equal(isValidCPF('00000000000'), false);
  assert.equal(isValidCPF('123'), false);
});

test('isValidIPv4 validates IP addresses', () => {
  assert.equal(isValidIPv4('192.168.15.1'), true);
  assert.equal(isValidIPv4('10.0.0.254'), true);
  assert.equal(isValidIPv4('256.100.0.1'), false);
  assert.equal(isValidIPv4('192.168.1'), false);
  assert.equal(isValidIPv4('192.168.01.1'), false);
  assert.equal(isValidIPv4('abc.def.ghi.jkl'), false);
});

test('normalizeSearch strips accents and casing for smooth search', () => {
  assert.equal(normalizeSearch('São Sebastião'), 'sao sebastiao');
  assert.equal(normalizeSearch('SECRETARIA DE EDUCAÇÃO'), 'secretaria de educacao');
  assert.equal(normalizeSearch('Patrimônio nº 8478'), 'patrimonio no 8478');
});

test('validateOSForm enforces required justifications for negative answers', () => {
  // If USB and not connected to WiFi for ERS, justification is required
  const resUSB = validateOSForm({
    patrimonio: '8478',
    numeroSerie: 'XBJZ043714',
    modelo: 'WFC5890',
    gatiInstalacao: '47513',
    clienteInstalacao: 'Sec Agricultura',
    tipoConexao: 'Via USB para IMPRESSÃO',
    conectadoWifiERS: false,
    justificativaWifiERS: '', // Missing!
    conferenciaERS: true,
    substituiAnterior: false,
    responsavelNome: 'João Silva',
    responsavelCPF: '52998224725',
    tecnicoNome: 'Carlos Técnico',
  });
  assert.equal(resUSB.isValid, false);
  assert.ok(resUSB.errors.justificativaWifiERS);

  // If ERS conferencia is false, justification is required
  const resERS = validateOSForm({
    patrimonio: '8478',
    numeroSerie: 'XBJZ043714',
    modelo: 'WFC5890',
    gatiInstalacao: '47513',
    clienteInstalacao: 'Sec Agricultura',
    tipoConexao: 'Via Rede',
    enderecoIP: '192.168.15.50',
    conferenciaERS: false,
    justificativaERS: '', // Missing!
    substituiAnterior: false,
    responsavelNome: 'João Silva',
    responsavelCPF: '52998224725',
    tecnicoNome: 'Carlos Técnico',
  });
  assert.equal(resERS.isValid, false);
  assert.ok(resERS.errors.justificativaERS);

  // If valid, should pass
  const resValid = validateOSForm({
    patrimonio: '8478',
    numeroSerie: 'XBJZ043714',
    modelo: 'WFC5890',
    gatiInstalacao: '47513',
    clienteInstalacao: 'Sec Agricultura',
    tipoConexao: 'Via Rede',
    enderecoIP: '192.168.15.50',
    conferenciaERS: true,
    substituiAnterior: false,
    responsavelNome: 'João Silva',
    responsavelCPF: '52998224725',
    tecnicoNome: 'Carlos Técnico',
  });
  assert.equal(resValid.isValid, true);
});
