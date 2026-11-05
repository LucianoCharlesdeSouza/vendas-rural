// Formata centavos para Real
export const formatarDinheiro = (centavos) => {
  return 'R$ ' + ((centavos || 0) / 100).toFixed(2).replace('.', ',')
}

// Formata quantidade (remove .0 de inteiros)
export const formatarQtd = (q) => {
  const n = Number(q)
  if (!isFinite(n)) return '0'
  return Number.isInteger(n) ? String(n) : String(n).replace('.', ',')
}