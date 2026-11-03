import { getAll, put, uid } from '../db/database.js';

/**
 * Estrutura:
 * { id, data (YYYY-MM-DD), itens: [{ produtoId, produtoNome, unidade, quantidade }], createdAt }
 * Um registro por dia (upsert via saveProduction).
 */
export async function listProduction(){
  return (await getAll('production')).sort((a,b)=> (b.data||'').localeCompare(a.data||''));
}
export async function getProductionByDate(dateISO){
  const all = await getAll('production');
  return all.find(p => (p.data||'').slice(0,10) === dateISO.slice(0,10)) || null;
}
export async function saveProduction({data, itens}){
  const dia = (data || new Date().toISOString()).slice(0,10);
  const existente = await getProductionByDate(dia);
  const obj = {
    id: existente?.id || uid(),
    data: dia,
    itens: (itens||[]).map(it => ({
      produtoId: it.produtoId || null,
      produtoNome: it.produtoNome,
      unidade: it.unidade || 'un',
      quantidade: Number(it.quantidade) || 0
    })),
    createdAt: existente?.createdAt || new Date().toISOString()
  };
  await put('production', obj);
  return obj;
}