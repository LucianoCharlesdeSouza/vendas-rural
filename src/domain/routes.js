import { getAll, getOne, put, uid, del } from '../db/database.js';

/**
 * Estrutura:
 * {
 *   id, data (ISO), paradas: [
 *     { clienteId, pedidoIds: [], concluida: bool, concluidaEm: ISO|null }
 *   ], createdAt, updatedAt
 * }
 * A ordem das paradas é a ordem do array.
 */
export async function listRoutes(){
  return (await getAll('routes')).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
}
export const getRoute = (id) => getOne('routes', id);

export async function saveRoute({id, data, paradas}){
  const now = new Date().toISOString();
  const existing = id ? await getOne('routes', id) : null;
  const r = {
    id: id || uid(),
    data: data || now,
    paradas: (paradas||[]).map(p => ({
      clienteId: p.clienteId,
      pedidoIds: Array.isArray(p.pedidoIds) ? [...p.pedidoIds] : [],
      concluida: p.concluida === true,
      concluidaEm: p.concluidaEm || null
    })),
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };
  await put('routes', r);
  return r;
}
export async function deleteRoute(id){ await del('routes', id); }