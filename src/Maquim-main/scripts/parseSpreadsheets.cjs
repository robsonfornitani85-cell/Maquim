const fs = require('fs');
const path = require('path');

function parseCSV(text) {
  const lines = text.split(/\r?\n/);
  const result = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const row = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        row.push(cur.trim().replace(/^"|"$/g, ''));
        cur = '';
      } else {
        cur += ch;
      }
    }
    row.push(cur.trim().replace(/^"|"$/g, ''));
    result.push(row);
  }
  return result;
}

// 1. Novos Equipamentos
const csv1 = fs.readFileSync('.playwright-cli/Patrimônios-Patrimônios-.csv', 'utf8');
const rows1 = parseCSV(csv1);
const header1 = rows1[0];
const novos = [];
for (let i = 1; i < rows1.length; i++) {
  const [pat, ser, mod] = rows1[i];
  if (pat && pat.trim()) {
    const isColor = (mod || '').includes('5890');
    novos.push({
      patrimonio: pat.trim(),
      numeroSerie: (ser || '').trim(),
      modelo: (mod || (isColor ? 'WFC5890' : 'WFM5899')).trim(),
      tipo: isColor ? 'Color' : 'Mono',
      status: 'disponivel',
    });
  }
}
console.log('Total Novos Equipamentos parsed:', novos.length);

// 2. Distribuição Lorena
const csv2 = fs.readFileSync('.playwright-cli/Municipio-de-Lorena---Distribuição-de-Equipamentos-Relação-de-Equipamentos-.csv', 'utf8');
const rows2 = parseCSV(csv2);
const headerIdx2 = rows2.findIndex(r => r[0] && r[0].includes('Secretaria') && r[2] && r[2].includes('GATi'));
console.log('Distribuicao header at index:', headerIdx2);
const locais = [];
for (let i = headerIdx2 + 1; i < rows2.length; i++) {
  const r = rows2[i];
  const sec = r[0] ? r[0].trim() : '';
  const gati = r[2] ? r[2].trim() : '';
  const cli = r[4] ? r[4].trim() : '';
  if (gati && cli) {
    locais.push({
      id: `loc-${locais.length + 1}`,
      secretaria: sec || 'Geral',
      ordemServico: r[1] && r[1].trim() ? r[1].trim() : '',
      gatiInstalacao: gati,
      gatiFaturamento: r[3] ? r[3].trim() : '',
      clienteInstalacao: cli,
      patrimonioAlocado: r[5] ? r[5].trim() : '',
      numeroSerieAlocado: r[6] ? r[6].trim() : '',
      modeloPrevisto: r[7] ? r[7].trim() : 'WFM5899',
      tipoEquipamento: r[8] ? r[8].trim() : 'Multifuncional',
      setor: r[9] ? r[9].trim() : '',
      endereco: r[12] ? r[12].trim() : '',
      bairro: r[13] ? r[13].trim() : '',
      responsavelLocal: r[14] ? r[14].trim() : '',
      status: r[5] && r[5].trim() ? 'instalado' : 'pendente',
    });
  }
}
console.log('Total Locais Distribuição parsed:', locais.length);

// 3. Retirar
const csv3 = fs.readFileSync('.playwright-cli/Municipio-de-Lorena---Retirar-Relação-de-Equipamentos-.csv', 'utf8');
const rows3 = parseCSV(csv3);
const headerIdx3 = rows3.findIndex(r => r[0] && r[0].includes('Secretaria') && r[4] && r[4].includes('Patrimônio'));
console.log('Retirar header at index:', headerIdx3);
const retiradas = [];
for (let i = headerIdx3 + 1; i < rows3.length; i++) {
  const r = rows3[i];
  const pat = r[4] ? r[4].trim() : '';
  if (pat) {
    retiradas.push({
      secretaria: r[0] ? r[0].trim() : '',
      gatiInstalacao: r[1] ? r[1].trim() : '',
      gatiFaturamento: r[2] ? r[2].trim() : '',
      clienteInstalacao: r[3] ? r[3].trim() : '',
      patrimonio: pat,
      numeroSerie: r[5] ? r[5].trim() : '',
      modelo: r[6] ? r[6].trim() : 'WFM5799',
      tipo: r[7] ? r[7].trim() : '',
      localizacao: r[8] ? r[8].trim() : '',
      ip: r[9] ? r[9].trim() : '',
      endereco: r[10] ? r[10].trim() : '',
      bairro: r[11] ? r[11].trim() : '',
      responsavelLocal: r[12] ? r[12].trim() : '',
      status: 'a_retirar',
    });
  }
}
console.log('Total Retiradas parsed:', retiradas.length);

fs.writeFileSync('src/data/realContractData.json', JSON.stringify({ novos, locais, retiradas }, null, 2));
console.log('Successfully saved to src/data/realContractData.json');
