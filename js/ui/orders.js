import { listOrders, getOrderItems, saveOrder, totalPedido, getOrder, setOrderStatus } from '../domain/orders.js';
import { listCustomers, getCustomer } from '../domain/customers.js';
import { listProducts } from '../domain/products.js';
import { brl, escapeHtml as escape, fmtDate } from './home.js';
import { finalizarVenda } from '../services/sale-service.js';
import { parseDecimal, calcSubtotalCentavos, parseMoneyCentavos } from '../db/database.js';

export async function renderOrders(el, go){
  el.innerHTML = `<button class="btn" id="novo">+ Novo Pedido</button><div id="area"></div>`;
  el.querySelector('#novo').onclick = () => go('pedido-form');
  const pedidos = await listOrders();
  const clientes = await listCustomers();
  const hoje = new Date().toISOString().slice(0,10);
  const amanha = new Date(Date.now()+86400000).toISOString().slice(0,10);
  const area = el.querySelector('#area');
  const grupos = {hoje:[],amanha:[],outros:[]};
  for (const p of pedidos){
    if (p.status !== 'pendente') continue;
    const d = (p.data||'').slice(0,10);
    if (d===hoje) grupos.hoje.push(p);
    else if (d===amanha) grupos.amanha.push(p);
    else grupos.outros.push(p);
  }
  for (const [k,titulo] of [['hoje','HOJE'],['amanha','AMANHÃ'],['outros','OUTROS']]){
    if (!grupos[k].length) continue;
    const h = document.createElement('h2'); h.textContent = titulo; area.appendChild(h);
    for (const p of grupos[k]){
      const c = clientes.find(x=>x.id===p.clienteId);
      const itens = await getOrderItems(p.id);
      const div = document.createElement('div'); div.className='card';
      div.innerHTML = `<div class="row"><strong>${c?escape(c.nome):'?'}</strong>
        <span>${brl(totalPedido(itens))}</span></div>
        <div class="muted">${itens.map(i=>`${formatQtd(i.quantidade)} ${escape(i.produtoNome)}`).join(', ')}</div>
        <div style="margin-top:8px"><span class="pill pendente">pendente</span></div>`;
      div.onclick = () => go('pedido-detalhe', {id:p.id});
      area.appendChild(div);
    }
  }
}

export async function renderOrderForm(el, go){
  const clientes = await listCustomers();
  const produtos = await listProducts();
  const itens = [];
  el.innerHTML = `
    <div class="field"><label>Cliente</label>
      <select id="cliente">${clientes.map(c=>`<option value="${c.id}">${escape(c.nome)}</option>`).join('')}</select>
    </div>
    <div class="field"><label>Data</label><input type="date" id="data" value="${new Date().toISOString().slice(0,10)}"></div>
    <div class="card">
      <div class="grid2">
        <div><label class="muted">Produto</label>
          <select id="prod">${produtos.map(p=>`<option value="${p.id}">${escape(p.nome)} (${brl(p.preco)}/${p.unidade})</option>`).join('')}</select>
        </div>
        <div><label class="muted">Quantidade</label>
          <input id="qtd" inputmode="decimal" value="1">
        </div>
      </div>
      <button class="btn small" id="add">Adicionar</button>
    </div>
    <div id="itens"></div>
    <div class="tot"><span>TOTAL</span><span id="total">R$ 0,00</span></div>
    <button class="btn" id="salvar">Salvar Pedido</button>
  `;
  const renderItens = () => {
    const box = el.querySelector('#itens');
    box.innerHTML = itens.map((it,ix)=>`<div class="item-row">
      <span>${formatQtd(it.quantidade)} ${escape(it.produtoNome)}</span>
      <span>${brl(it.subtotal)} <button data-ix="${ix}" class="btn small danger">x</button></span>
    </div>`).join('');
    box.querySelectorAll('button[data-ix]').forEach(b=>{
      b.onclick = () => { itens.splice(+b.dataset.ix,1); renderItens(); };
    });
    el.querySelector('#total').textContent = brl(itens.reduce((s,i)=>s+i.subtotal,0));
  };
  renderItens();
  el.querySelector('#add').onclick = () => {
    const pid = el.querySelector('#prod').value;
    const p = produtos.find(x=>x.id===pid);
    const qtd = parseDecimal(el.querySelector('#qtd').value);
    if (qtd <= 0){ alert('Quantidade inválida.'); return; }
    itens.push({
      produtoId:p.id, produtoNome:p.nome, quantidade:qtd,
      precoUnitario:p.preco, subtotal: calcSubtotalCentavos(qtd, p.preco)
    });
    renderItens();
  };
  el.querySelector('#salvar').onclick = async () => {
    if (!itens.length){ alert('Adicione ao menos um item.'); return; }
    const clienteId = el.querySelector('#cliente').value;
    const data = el.querySelector('#data').value;
    await saveOrder({clienteId, data:new Date(data).toISOString(), itens});
    go('pedidos', {}, {replace:true});
  };
}

export async function renderOrderDetail(el, go, params){
  const p = await getOrder(params.id);
  if (!p) return go('pedidos', {}, {replace:true});
  const c = await getCustomer(p.clienteId);
  const itens = await getOrderItems(p.id);
  const total = totalPedido(itens);
  el.innerHTML = `
    <div class="card">
      <h2 style="margin:0">${escape(c?.nome||'')}</h2>
      <div>${itens.map(i=>`<div class="item-row"><span>${formatQtd(i.quantidade)} ${escape(i.produtoNome)}</span><span>${brl(i.subtotal)}</span></div>`).join('')}</div>
      <div class="tot"><span>Total</span><span>${brl(total)}</span></div>
    </div>
    <button class="btn" id="entregar">Entregar</button>
    <button class="btn danger" id="cancelar">Cancelar Pedido</button>
  `;
  el.querySelector('#entregar').onclick = () => go('pedido-entregar', {id:p.id});
  el.querySelector('#cancelar').onclick = async () => {
    if (!confirm('Cancelar este pedido?')) return;
    await setOrderStatus(p.id,'cancelado');
    go('pedidos', {}, {replace:true});
  };
}

export async function renderOrderDeliver(el, go, params){
  const p = await getOrder(params.id);
  const c = await getCustomer(p.clienteId);
  const itens = await getOrderItems(p.id);
  const total = totalPedido(itens);
  el.innerHTML = `
    <h2>Entregar Pedido</h2>
    <div class="card">
      <div class="row"><span>${escape(c.nome)}</span><span class="big">${brl(total)}</span></div>
    </div>
    <div class="field"><label>Pagamento recebido (R$)</label>
      <input id="valor" inputmode="decimal" value="${(total/100).toFixed(2).replace('.',',')}">
    </div>
    <div class="field"><label>Forma</label>
      <select id="forma"><option value="dinheiro">Dinheiro</option><option value="pix">PIX</option>
      <option value="cartao">Cartão</option><option value="outro">Outro</option></select>
    </div>
    <button class="btn" id="ok">Confirmar</button>
  `;
  el.querySelector('#ok').onclick = async () => {
    const valor = parseMoneyCentavos(el.querySelector('#valor').value);
    const forma = el.querySelector('#forma').value;
    if (valor > total){ alert('Pagamento maior que o total.'); return; }
    const r = await finalizarVenda({
      pedidoId:p.id, clienteId:p.clienteId,
      itens: itens.map(i=>({produtoId:i.produtoId,produtoNome:i.produtoNome,
        quantidade:i.quantidade,precoUnitario:i.precoUnitario})),
      valorRecebido:valor, formaPagamento:forma
    });
    alert(`Venda registrada.\nTotal: ${brl(r.saldo.total)}\nRecebido: ${brl(r.pago)}\nFalta: ${brl(r.saldo.restante)}`);
    go('pedidos', {}, {replace:true});
  };
}

export function formatQtd(q){
  const n = Number(q);
  if (!isFinite(n)) return '0';
  return Number.isInteger(n) ? String(n) : String(n).replace('.', ',');
}