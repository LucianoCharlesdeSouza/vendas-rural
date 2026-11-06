import { getAll, getOne, put, uid, del, calcSubtotalCentavos } from '../db/database.js'

export async function listOrders() {
  const all = await getAll('orders')
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getOrderItems(pedidoId) {
  const all = await getAll('orderItems')
  return all.filter(i => i.pedidoId === pedidoId)
}

export const getOrder = (id) => getOne('orders', id)
export const totalPedido = (itens) => itens.reduce((s, i) => s + i.subtotal, 0)

export async function saveOrder({ id, clienteId, data, observacao, itens }) {
  const now = new Date().toISOString()
  const dataIso = data || now
  const dataDia = dataIso.slice(0, 10)

  let pedidoExistente = null

  // Se não veio um ID, procuramos se já existe um pedido pendente para o mesmo cliente na mesma data
  if (!id) {
    const todosPedidos = await getAll('orders')
    pedidoExistente = todosPedidos.find(p => 
      p.clienteId === clienteId && 
      (p.data || '').slice(0, 10) === dataDia && 
      p.status === 'pendente'
    )
  } else {
    pedidoExistente = await getOne('orders', id)
  }

  const pedidoId = pedidoExistente ? pedidoExistente.id : uid()
  const pedido = {
    id: pedidoId,
    clienteId,
    data: dataIso,
    observacao: observacao || pedidoExistente?.observacao || '',
    status: pedidoExistente?.status || 'pendente',
    createdAt: pedidoExistente?.createdAt || now,
    updatedAt: now
  }

  await put('orders', pedido)

  // Se havia um pedido existente, carregamos os itens antigos
  let itensAntigos = []
  if (pedidoExistente) {
    itensAntigos = await getOrderItems(pedidoId)
  }

  // Lógica para agrupar (merge) os itens novos com os antigos
  const itensFinais = [...itensAntigos]
  
  for (const it of itens || []) {
    const itemExistente = itensFinais.find(i => i.produtoId === it.produtoId)
    
    if (itemExistente) {
      // Se o produto já existe, soma a quantidade
      itemExistente.quantidade += Number(it.quantidade)
      itemExistente.subtotal = calcSubtotalCentavos(itemExistente.quantidade, itemExistente.precoUnitario)
    } else {
      // Se é um produto novo, adiciona na lista
      itensFinais.push({
        id: uid(),
        pedidoId: pedidoId,
        produtoId: it.produtoId,
        produtoNome: it.produtoNome,
        quantidade: Number(it.quantidade),
        precoUnitario: Math.round(Number(it.precoUnitario)),
        subtotal: calcSubtotalCentavos(it.quantidade, it.precoUnitario)
      })
    }
  }

  // Remove os itens antigos do banco para não duplicar
  for (const oldItem of itensAntigos) {
    await del('orderItems', oldItem.id)
  }

  // Salva a lista final de itens
  for (const itemFinal of itensFinais) {
    await put('orderItems', itemFinal)
  }

  return pedido
}

export async function setOrderStatus(pedidoId, status) {
  const p = await getOne('orders', pedidoId)
  if (!p) return
  p.status = status
  p.updatedAt = new Date().toISOString()
  await put('orders', p)
}