const payload = {
    "movimentos": [
        {
            "data": "27/03/2026",
            "conta": "450000856524",
            "matricula": "1",
            "cartao_dispositivo": "9724 9985 6524 0042",
            "produto": "DSL",
            "quantidade": "18,270 l",
            "posto": "E.S. CIRCUL",
            "montante": "40,00 €"
        }
    ]
};

function findField(row, candidates) {
  for (const c of candidates) {
    const key = Object.keys(row).find(k => k.toLowerCase().includes(c.toLowerCase()));
    if (key && row[key]) return row[key];
  }
  return '';
}
function parseNumber(val) {
  if (!val) return null;
  const clean = val.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

const row = payload.movimentos[0];

const cardNumber = findField(row, ['tarjeta', 'cartao_dispositivo', 'cartao', 'card', 'PAN']);
const amountStr = findField(row, ['montante', 'importe', 'valor', 'total', 'amount']);
const qtyStr = findField(row, ['litros', 'cantidad', 'quantidade', 'volume']);

console.log("cardNumber:", cardNumber);
console.log("amountStr:", amountStr);
console.log("qtyStr:", qtyStr);
console.log("parsed amount:", parseNumber(amountStr));
console.log("parsed qty:", parseNumber(qtyStr));
