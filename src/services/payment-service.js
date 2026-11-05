import { savePayment, totalPagoDaVenda } from '../domain/payments.js';
import { salesByCliente, getSale } from '../domain/sales.js';

/** Situação do cliente, considerando apenas vendas válidas. */
export async function situacaoCliente(clienteId){
  const vendas = await salesByCliente(clienteId);
  const total = vendas.reduce((s,v)=>s+v.total,0);
  let pago = 0;
  for (const v of vendas) pago += await totalPagoDaVenda(v.id);
  return { totalVendido: total, totalRecebido: pago, devido: total - pago, vendas };
}

export async function receberPagamento(clienteId, valor, forma, observacao, vendaId){
  const v = Math.round(Number(valor));
  if (!(v > 0)) throw new Error('Informe um valor maior que zero.');
  if (vendaId){
    const s = await saldoVenda(vendaId);
    if (v > s.restante) throw new Error('Pagamento maior que o saldo restante.');
    return savePayment({vendaId, valor: v, forma, observacao});
  }
  const vendas = (await salesByCliente(clienteId)).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
  let restante = v;
  for (const sale of vendas){
    if (restante <= 0) break;
    const s = await saldoVenda(sale.id);
    if (s.restante <= 0) continue;
    const aplicar = Math.min(restante, s.restante);
    await savePayment({vendaId: sale.id, valor: aplicar, forma, observacao});
    restante -= aplicar;
  }
  if (restante > 0) throw new Error('Valor maior que o total devido pelo cliente.');
}

export async function saldoVenda(vendaId){
  const v = await getSale(vendaId);
  if (!v || v.cancelada) return { total:0, pago:0, restante:0 };
  const pago = await totalPagoDaVenda(vendaId);
  return { total: v.total, pago, restante: v.total - pago };
}

/** Soma devedora de todos os clientes (para "A Receber"). */
export async function listaDevedores(clientes){
  const out = [];
  for (const c of clientes){
    const s = await situacaoCliente(c.id);
    if (s.devido > 0) out.push({ cliente: c, ...s });
  }
  out.sort((a,b)=>b.devido - a.devido);
  return out;
}