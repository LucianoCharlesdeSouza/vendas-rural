import { getAll, getOne, put, uid } from '../db/database.js';

export async function listCustomers(includeInactive=false){
  const all = await getAll('customers');
  return all.filter(c => includeInactive || c.ativo !== false)
            .sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
}
export const getCustomer = (id) => getOne('customers', id);
export async function saveCustomer(data){
  const now = new Date().toISOString();
  const existing = data.id ? await getOne('customers', data.id) : null;
  const obj = {
    id: data.id || uid(),
    nome: (data.nome||'').trim(),
    telefone: (data.telefone||'').trim(),
    endereco: (data.endereco||'').trim(),
    observacao: (data.observacao||'').trim(),
    ativo: data.ativo !== false,
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };
  if (!obj.nome) throw new Error('Informe o nome do cliente.');
  await put('customers', obj);
  return obj;
}
export async function deactivateCustomer(id){
  const c = await getOne('customers', id);
  if (!c) return;
  c.ativo = false; c.updatedAt = new Date().toISOString();
  await put('customers', c);
}