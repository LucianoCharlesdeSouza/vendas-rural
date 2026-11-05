import { getAll, getOne, put, uid, calcSubtotalCentavos } from '../db/database.js';

/** Somente vendas válidas (não canceladas) — usada em toda a UI e cálculos. */
export async function listSales(){
  const all = await getAll('sales');
  return all.filter(s => !s.cancelada).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
}
/** Todas as vendas (inclui canceladas) — auditoria/histórico. */
export async function listAllSales(){
  return (await getAll('sales')).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
}
export async function getSale(id){ return getOne('sales', id); }
export async function salesByCliente(clienteId){
  return (await listSales()).filter(s=>s.clienteId===clienteId);
}

export async function saveSale({pedidoId, clienteId, data, total, observacao, itens}){
  const now = new Date().toISOString();
  const sale = {
    id: uid(),
    pedidoId: pedidoId || null,
    clienteId,
    data: data || now,
    total: Math.round(Number(total)),
    itens: (itens||[]).map(i=>({
      produtoId: i.produtoId,
      produtoNome: i.produtoNome,
      quantidade: Number(i.quantidade),
      precoUnitario: Math.round(Number(i.precoUnitario)),
      subtotal: calcSubtotalCentavos(i.quantidade, i.precoUnitario)
    })),
    observacao: observacao || '',
    cancelada: false,
    createdAt: now
  };
  await put('sales', sale);
  return sale;
}

export async function cancelSale(id){
  const s = await getOne('sales', id);
  if (!s) return;
  s.cancelada = true; s.canceladaEm = new Date().toISOString();
  await put('sales', s);
}