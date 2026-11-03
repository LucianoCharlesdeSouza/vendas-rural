import { listCustomers, getCustomer } from '../domain/customers.js';
import { listOrders } from '../domain/orders.js';
import {
  obterRotaDeHoje, criarRotaDeHoje, resumoRota,
  adicionarClienteNaRota, marcarParadaConcluida, moverParada, salvarParadas
} from '../services/route-service.js';
import { saveRoute } from '../domain/routes.js';
import { brl, escapeHtml as escape } from './home.js';
import { formatQtd } from './orders.js';

export async function renderRoute(el, go){
  const rota = await obterRotaDeHoje();
  if (!rota){
    el.innerHTML = `<div class="card">Nenhuma rota hoje.</div>
      <button class="btn" id="criar">Criar Rota</button>`;
    el.querySelector('#criar').onclick = () => go('rota-criar');
    return;
  }
  await desenharRota(el, go, rota);
}

async function desenharRota(el, go, rota){
  const resumo = await resumoRota(rota);
  const clientes = await listCustomers();
  el.innerHTML = `<h2>Rota de Hoje</h2>
    <div class="muted" style="margin-bottom:8px">Arraste pelo ícone ⋮⋮ ou use ↑/↓ para ordenar.</div>
    <div id="paradas"></div>
    <button class="btn sec" id="add">+ Adicionar Cliente</button>
    <button class="btn ghost" id="recomecar">Recriar Rota</button>`;
  const box = el.querySelector('#paradas');

  const render = async () => {
    // Recalcula paradas em ordem
    box.innerHTML = '';
    resumo.forEach((r, idx) => {
      const c = clientes.find(x=>x.id===r.clienteId);
      const div = document.createElement('div');
      div.className = 'rota-parada' + (r.concluida ? ' concluida' : '');
      div.draggable = true;
      div.dataset.index = idx;
      div.innerHTML = `
        <div class="handle" title="Arraste para reordenar">⋮⋮</div>
        <div class="info">
          <div class="row"><strong>${idx+1}. ${escape(c?.nome||'?')}</strong><span>${brl(r.total)}</span></div>
          <div class="muted">${r.itens.map(it=>`${formatQtd(it.quantidade)} ${escape(it.produtoNome)}`).join(', ')||'sem pedidos'}</div>
        </div>
        <div class="mover">
          <button data-up="${idx}" ${idx===0?'disabled':''}>↑</button>
          <button data-down="${idx}" ${idx===resumo.length-1?'disabled':''}>↓</button>
        </div>
        <button class="btn small ${r.concluida?'ghost':''}" data-concluir="${r.clienteId}">
          ${r.concluida ? '✓ Feito' : 'Concluir'}
        </button>
      `;
      div.querySelector('.info').onclick = () => go('cliente-detalhe', {id:r.clienteId});
      div.querySelector(`[data-concluir]`).onclick = async (e) => {
        e.stopPropagation();
        await marcarParadaConcluida(rota.id, r.clienteId, !r.concluida);
        const nova = await obterRotaDeHoje();
        await desenharRota(el, go, nova);
      };
      box.appendChild(div);
    });

    // Handlers de reordenar
    box.querySelectorAll('[data-up]').forEach(b=>b.onclick = async (e)=>{
      e.stopPropagation();
      const i = +b.dataset.up;
      await moverParada(rota.id, i, i-1);
      const nova = await obterRotaDeHoje();
      await desenharRota(el, go, nova);
    });
    box.querySelectorAll('[data-down]').forEach(b=>b.onclick = async (e)=>{
      e.stopPropagation();
      const i = +b.dataset.down;
      await moverParada(rota.id, i, i+1);
      const nova = await obterRotaDeHoje();
      await desenharRota(el, go, nova);
    });

    // Drag and drop
    let dragIndex = null;
    box.querySelectorAll('.rota-parada').forEach(div => {
      div.addEventListener('dragstart', (e)=>{
        dragIndex = +div.dataset.index;
        div.classList.add('drag');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', String(dragIndex)); } catch {}
      });
      div.addEventListener('dragend', ()=>div.classList.remove('drag'));
      div.addEventListener('dragover', (e)=>{ e.preventDefault(); div.classList.add('over'); });
      div.addEventListener('dragleave', ()=>div.classList.remove('over'));
      div.addEventListener('drop', async (e)=>{
        e.preventDefault();
        div.classList.remove('over');
        const target = +div.dataset.index;
        if (dragIndex === null || dragIndex === target) return;
        const novas = [...rota.paradas];
        const [item] = novas.splice(dragIndex, 1);
        novas.splice(target, 0, item);
        await salvarParadas(rota.id, novas);
        const nova = await obterRotaDeHoje();
        await desenharRota(el, go, nova);
      });
    });
  };
  await render();

  el.querySelector('#add').onclick = async () => {
    const sel = await escolherCliente(clientes);
    if (!sel) return;
    await adicionarClienteNaRota(rota.id, sel);
    const nova = await obterRotaDeHoje();
    await desenharRota(el, go, nova);
  };
  el.querySelector('#recomecar').onclick = async () => {
    if (!confirm('Recriar a rota do zero?')) return;
    const nova = await criarRotaDeHoje([]);
    await desenharRota(el, go, nova);
  };
}

function escolherCliente(clientes){
  return new Promise(resolve => {
    const nomes = clientes.map((c,i)=>`${i+1}. ${c.nome}`).join('\n');
    const escolha = prompt('Número do cliente:\n'+nomes);
    const n = parseInt(escolha,10);
    if (!n || n<1 || n>clientes.length) return resolve(null);
    resolve(clientes[n-1].id);
  });
}

export async function renderRouteCreate(el, go){
  const clientes = await listCustomers();
  const pedidos = (await listOrders()).filter(p=>p.status==='pendente');
  const comPedido = new Set(pedidos.map(p=>p.clienteId));
  const marcados = new Set([...comPedido]);
  el.innerHTML = `<h2>Criar Rota</h2><div id="lista"></div>
    <button class="btn" id="criar">Criar Rota</button>`;
  const box = el.querySelector('#lista');
  for (const c of clientes){
    const div = document.createElement('label'); div.className='checkline';
    div.innerHTML = `<input type="checkbox" ${marcados.has(c.id)?'checked':''} data-id="${c.id}">
      <span>${escape(c.nome)} ${comPedido.has(c.id)?'<span class="pill pendente">pedido</span>':''}</span>`;
    box.appendChild(div);
  }
  el.querySelector('#criar').onclick = async () => {
    const ids = [...el.querySelectorAll('input[type=checkbox]:checked')].map(i=>i.dataset.id);
    await criarRotaDeHoje(ids);
    go('rota', {}, {replace:true});
  };
}