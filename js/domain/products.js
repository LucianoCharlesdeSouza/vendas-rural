import { getAll, getOne, put, uid } from '../db/database.js';

export const UNIDADES = ['un','kg','pote','litro'];

export async function listProducts(includeInactive=false){
  const all = await getAll('products');
  return all.filter(p => includeInactive || p.ativo !== false)
            .sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
}
export const getProduct = (id) => getOne('products', id);
export async function saveProduct(data){
  const now = new Date().toISOString();
  const existing = data.id ? await getOne('products', data.id) : null;
  const obj = {
    id: data.id || uid(),
    nome: (data.nome||'').trim(),
    unidade: data.unidade || 'un',
    preco: Math.max(0, Math.round(Number(data.preco)||0)),
    ativo: data.ativo !== false,
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };
  if (!obj.nome) throw new Error('Informe o nome do produto.');
  await put('products', obj);
  return obj;
}
export async function deactivateProduct(id){
  const p = await getOne('products', id);
  if (!p) return;
  p.ativo = false; p.updatedAt = new Date().toISOString();
  await put('products', p);
}