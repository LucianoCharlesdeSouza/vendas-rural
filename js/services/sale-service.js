import { saveSale, getSale } from '../domain/sales.js';
import { savePayment, totalPagoDaVenda } from '../domain/payments.js';
import { setOrderStatus } from '../domain/orders.js';
import { calcSubtotalCentavos } from '../db/database.js';

export async function finalizarVenda({pedidoId, clienteId, itens, valorRecebido, formaPagamento, observacao}){
  const itensNorm = (itens||[]).map(i => ({
    produtoId: i.produtoId,
    produtoNome: i.produtoNome,
    quantidade: Number(i.quantidade),
    precoUnitario: Math.round(Number(i.precoUnitario)),
    subtotal: calcSubtotalCentavos(i.quantidade, i.precoUnitario)
  }));
  const total = itensNorm.reduce((s,i)=>s+i.subtotal,0);
  if (!itensNorm.length) throw new Error('Adicione ao menos um item.');
  if (total <= 0) throw new Error('Total da venda inválido.');
  const venda = await saveSale({pedidoId, clienteId, total, itens: itensNorm, observacao});
  let pago = 0;
  if (valorRecebido > 0){
    await savePayment({vendaId: venda.id, valor: valorRecebido, forma: formaPagamento});
    pago = valorRecebido;
  }
  if (pedidoId) await setOrderStatus(pedidoId, 'entregue');
  const saldo = await saldoDaVenda(venda.id);
  return { venda, pago, saldo };
}

export async function saldoDaVenda(vendaId){
  const v = await getSale(vendaId);
  if (!v) return { total:0, pago:0, restante:0 };
  const pago = await totalPagoDaVenda(vendaId);
  return { total: v.total, pago, restante: v.total - pago };
}