#!/usr/bin/env node
// debug_csv_headers.cjs — Mostra os cabeçalhos do CSV e tenta mapear colunas do motorista

const fs = require('fs');
const path = require('path');

const CSV_PATH = process.argv[2] || null;

if (!CSV_PATH) {
  console.error('Uso: node debug_csv_headers.cjs "C:/caminho/para/ficheiro.csv"');
  process.exit(1);
}

if (!fs.existsSync(CSV_PATH)) {
  console.error('Ficheiro não encontrado:', CSV_PATH);
  process.exit(1);
}

const raw = fs.readFileSync(CSV_PATH, 'utf-8');
const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);

if (lines.length === 0) {
  console.error('CSV vazio!');
  process.exit(1);
}

// Detectar separador
const firstLine = lines[0];
const tabCount = (firstLine.match(/\t/g) || []).length;
const semiCount = (firstLine.match(/;/g) || []).length;
const commaCount = (firstLine.match(/,/g) || []).length;
const sep = tabCount > commaCount && tabCount > semiCount ? '\t' : semiCount > commaCount ? ';' : ',';
const sepName = sep === '\t' ? 'TAB' : sep;

// Parsear cabeçalho
const headers = firstLine.split(sep).map(h => h.trim().replace(/^["']|["']$/g, ''));

console.log('\n=== DIAGNÓSTICO DE CABEÇALHOS CSV ===\n');
console.log(`Ficheiro: ${path.basename(CSV_PATH)}`);
console.log(`Separador: "${sepName}"`);
console.log(`Total de linhas (com dados): ${lines.length - 1}`);
console.log(`\n─── ${headers.length} Colunas Encontradas ───`);
headers.forEach((h, i) => {
  console.log(`  [${i}] "${h}"`);
});

const DRIVER_ALIASES = ['driver', 'driver id', 'motorista', 'driver name', 'nome motorista', 'driver uuid', 'uuid do motorista'];

console.log('\n─── Verificação de colunas de motorista ───');
const headersLower = headers.map(h => h.toLowerCase().trim());
let found = false;
for (const alias of DRIVER_ALIASES) {
  const idx = headersLower.findIndex(h => h === alias || h.includes(alias));
  if (idx >= 0) {
    console.log(`  ✅ Coluna reconhecida: "${headers[idx]}" (índice ${idx})`);
    found = true;
  }
}
if (!found) {
  console.log('  ❌ Nenhuma coluna de motorista reconhecida!');
  console.log('\n  Colunas que contêm "driver", "motorista" ou "uuid":');
  headers.forEach((h, i) => {
    if (h.toLowerCase().includes('driver') || h.toLowerCase().includes('motorista') || h.toLowerCase().includes('uuid')) {
      console.log(`    → [${i}] "${h}"`);
    }
  });
}

// Mostrar primeira linha de dados como exemplo
if (lines.length > 1) {
  console.log('\n─── Primeira linha de dados ───');
  const cells = lines[1].split(sep).map(c => c.trim().replace(/^["']|["']$/g, ''));
  headers.forEach((h, i) => {
    const val = cells[i] || '(vazio)';
    console.log(`  ${h}: ${val}`);
  });
}

console.log('\n=== FIM DO DIAGNÓSTICO ===\n');
