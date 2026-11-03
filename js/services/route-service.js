import { saveRoute, getRoute, listRoutes } from '../domain/routes.js';
import { listOrders, getOrderItems } from '../domain/orders.js';

export async function obterRotaDeHoje(){
  const rs = await listRoutes();
  const hoje = new Date().toISOString().slice(0,10);
  return rs.find(r => (r.data||'').slice(0,10) === hoje) || null;
}

/**
 * Cria rota para hoje com paradas a partir de clienteIds.
 * Pedidos pendentes desses clientes são automaticamente referenciados em pedidoIds.
 */
export async function criarRotaDeHoje(clienteIds){
  const pedidos = (await listOrders()).filter(p=>p.status==='pendente');
  const paradas = clienteIds.map(cid => ({
    clienteId: cid,
    pedidoIds: pedidos.filter(p=>p.clienteId===cid).map(p=>p.id),
    concluida: false,
    concluidaEm: null
  }));
  return saveRoute({ data: new Date().toISOString(), paradas });
}

export async function salvarParadas(rotaId, paradas){
  const rota = await getRoute(rotaId);
  if (!rota) throw new Error('Rota não encontrada.');
  return saveRoute({ id: rota.id, data: rota.data, paradas });
}

export async function adicionarClienteNaRota(rotaId, clienteId){
  const rota = await getRoute(rotaId);
  if (!rota) return criarRotaDeHoje([clienteId]);
  if (rota.paradas.some(p=>p.clienteId===clienteId)) return rota;
  const pedidos = (await listOrders()).filter(p=>p.status==='pendente' && p.clienteId===clienteId);
  const paradas = [...rota.paradas, {
    clienteId,
    pedidoIds: pedidos.map(p=>p.id),
    concluida: false,
    concluidaEm: null
  }];
  return saveRoute({ id: rota.id, data: rota.data, paradas });
}

export async function marcarParadaConcluida(rotaId, clienteId, concluida=true){
  const rota = await getRoute(rotaId);
  if (!rota) return;
  const paradas = rota.paradas.map(p => p.clienteId===clienteId
    ? { ...p, concluida, concluidaEm: concluida ? new Date().toISOString() : null }
    : p);
  return saveRoute({ id: rota.id, data: rota.data, paradas });
}

export async function moverParada(rotaId, deIndex, paraIndex){
  const rota = await getRoute(rotaId);
  if (!rota) return;
  if (deIndex === paraIndex) return rota;
  const paradas = [...rota.paradas];
  if (deIndex < 0 || deIndex >= paradas.length) return rota;
  const [item] = paradas.splice(deIndex,1);
  const dest = Math.max(0, Math.min(paradas.length, paraIndex));
  paradas.splice(dest, 0, item);
  return saveRoute({ id: rota.id, data: rota.data, paradas });
}

export async function resumoRota(rota){
  if (!rota) return [];
  const pedidos = await listOrders();
  const out = [];
  for (const p of rota.paradas){
    const pedidosCliente = pedidos.filter(x => x.clienteId===p.clienteId && x.status==='pendente'
      && (p.pedidoIds.length === 0 || p.pedidoIds.includes(x.id)));
    let itens = [];
    for (const ped of pedidosCliente) itens = itens.concat(await getOrderItems(ped.id));
    const total = itens.reduce((s,i)=>s+i.subtotal,0);
    out.push({
      clienteId: p.clienteId,
      pedidos: pedidosCliente,
      itens,
      total,
      concluida: p.concluida,
      concluidaEm: p.concluidaEm
    });
  }
  return out;
}