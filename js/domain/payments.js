import { getAll, getOne, put, uid } from '../db/database.js';
import { salesByCliente } from './sales.js';

export const FORMAS = ['dinheiro','pix','cartao','outro'];

export async function listPayments(){
  const all = await getAll('payments');
  return all.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
}
export async function paymentsByVenda(vendaId){
  return (await listPayments()).filter(p=>p.vendaId===vendaId);
}
export async function paymentsByCliente(clienteId){
  const sales = await salesByCliente(clienteId);
  const ids = new Set(sales.map(s=>s.id));
  return (await listPayments()).filter(p=>ids.has(p.vendaId));
}
export async function savePayment({vendaId, valor, forma, observacao}){
  const v = Math.round(Number(valor));
  if (!vendaId) throw new Error('Venda não informada.');
  if (!(v>0)) throw new Error('Informe um valor maior que zero.');
  if (!FORMAS.includes(forma)) throw new Error('Forma de pagamento inválida.');
  const p = {
    id: uid(),
    vendaId,
    data: new Date().toISOString(),
    valor: v,
    forma,
    observacao: observacao||'',
    createdAt: new Date().toISOString()
  };
  await put('payments', p);
  return p;
}
export async function totalPagoDaVenda(vendaId){
  const ps = await paymentsByVenda(vendaId);
  return ps.reduce((s,p)=>s+p.valor,0);
}