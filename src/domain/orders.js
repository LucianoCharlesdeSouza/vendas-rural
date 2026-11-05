import { getAll, getOne, put, uid, del, calcSubtotalCentavos } from '../db/database.js';

export async function listOrders(){
  const all = await getAll('orders');
  return all.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
}
export async function getOrderItems(pedidoId){
  const all = await getAll('orderItems');
  return all.filter(i => i.pedidoId === pedidoId);
}
export const getOrder = (id) => getOne('orders', id);
export const totalPedido = (itens) => itens.reduce((s,i)=>s+i.subtotal,0);

export async function saveOrder({id, clienteId, data, observacao, itens}){
  const now = new Date().toISOString();
  const existing = id ? await getOne('orders', id) : null;
  const pedido = {
    id: id || uid(),
    clienteId,
    data: data || now,
    observacao: observacao || '',
    status: existing?.status || 'pendente',
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };
  await put('orders', pedido);
  if (id){
    const olds = await getOrderItems(id);
    for (const o of olds) await del('orderItems', o.id);
  }
  for (const it of itens||[]){
    const item = {
      id: it.id || uid(),
      pedidoId: pedido.id,
      produtoId: it.produtoId,
      produtoNome: it.produtoNome,
      quantidade: Number(it.quantidade),
      precoUnitario: Math.round(Number(it.precoUnitario)),
      subtotal: calcSubtotalCentavos(it.quantidade, it.precoUnitario)
    };
    await put('orderItems', item);
  }
  return pedido;
}

export async function setOrderStatus(pedidoId, status){
  const p = await getOne('orders', pedidoId);
  if (!p) return;
  p.status = status; p.updatedAt = new Date().toISOString();
  await put('orders', p);
}