import { renderHome, brl } from './ui/home.js';
import { renderCustomers, renderCustomerForm, renderCustomerDetail, renderCustomerHistory } from './ui/customers.js';
import { renderProducts, renderProductForm } from './ui/products.js';
import { renderOrders, renderOrderForm, renderOrderDetail, renderOrderDeliver } from './ui/orders.js';
import { renderNewSale, renderSalePayment } from './ui/sales.js';
import { renderRoute, renderRouteCreate } from './ui/routes.js';
import { renderReports } from './ui/reports.js';
import { renderProduction } from './ui/production.js';
import { listSales } from './domain/sales.js';
import { listPayments } from './domain/payments.js';
import { listOrders } from './domain/orders.js';
import { listCustomers, getCustomer } from './domain/customers.js';
import { situacaoCliente, receberPagamento } from './services/payment-service.js';
import {
  baixarBackup, compartilharOuBaixarBackup, restaurarBackup,
  ultimoBackup, ultimoRestore, estimativaArmazenamento
} from './services/backup-service.js';
import { fmtDateTime } from './ui/home.js';

const app = document.getElementById('app');
const title = document.getElementById('title');
const btnBack = document.getElementById('btnBack');

const history = [];
let current = 'home';
let currentParams = {};

const TITULOS = {
  home:'Venda Rural', clientes:'Clientes', 'cliente-form':'Novo Cliente',
  'cliente-detalhe':'Cliente', 'cliente-historico':'Histórico',
  produtos:'Produtos','produto-form':'Novo Produto',
  pedidos:'Pedidos','pedido-form':'Novo Pedido','pedido-detalhe':'Pedido','pedido-entregar':'Entregar',
  'venda-nova':'Nova Venda','venda-pagamento':'Pagamento',
  rota:'Rota','rota-criar':'Criar Rota',
  receber:'Recebimentos','receber-cliente':'Receber',
  relatorios:'Relatórios', producao:'Produção', backup:'Backup'
};

async function kpisHome(){
  const vendas = await listSales();
  const pagamentos = await listPayments();
  const hoje = new Date().toISOString().slice(0,10);
  const vendasHoje = vendas.filter(v=>v.createdAt.slice(0,10)===hoje);
  const pagHoje = pagamentos.filter(p=>p.createdAt.slice(0,10)===hoje);
  const totalV = vendasHoje.reduce((a,v)=>a+v.total,0);
  const totalP = pagHoje.reduce((a,p)=>a+p.valor,0);
  const orders = (await listOrders()).filter(o=>o.status==='pendente' && (o.data||'').slice(0,10)===hoje);
  return { vendas: totalV, recebido: totalP, aReceber: totalV-totalP, entregas: orders.length };
}

async function renderBackup(){
  const u = await ultimoBackup();
  const r = await ultimoRestore();
  const est = await estimativaArmazenamento();
  let persistido = 'desconhecido';
  try {
    if (navigator.storage && navigator.storage.persisted){
      persistido = (await navigator.storage.persisted()) ? 'sim' : 'não';
    }
  } catch {}
  app.innerHTML = `
    <div class="card">
      <div class="muted">Último backup</div>
      <div class="big">${u ? fmtDateTime(u) : 'Nunca'}</div>
      ${r ? `<div class="muted" style="margin-top:6px">Última restauração: ${fmtDateTime(r)}</div>` : ''}
      <div class="muted" style="margin-top:6px">Armazenamento persistente: ${persistido}</div>
      ${est ? `<div class="muted">Uso aproximado: ${(est.usage/1024/1024).toFixed(1)} MB de ${(est.quota/1024/1024).toFixed(0)} MB</div>` : ''}
    </div>
    <button class="btn" id="fazer">Fazer Backup</button>
    <button class="btn sec" id="compartilhar">Compartilhar Backup</button>
    <button class="btn sec" id="restaurar">Restaurar Backup</button>
    <input type="file" id="file" accept=".vrbackup,.json,application/json" hidden>
    <div class="card muted">
      Os dados ficam somente neste celular. Se o celular for perdido, os dados podem ser perdidos.
      Faça backups periódicos.
    </div>
  `;
  app.querySelector('#fazer').onclick = async () => { await baixarBackup(); toast('Backup gerado.'); };
  app.querySelector('#compartilhar').onclick = async () => {
    const modo = await compartilharOuBaixarBackup();
    toast(modo === 'share' ? 'Backup compartilhado.' : 'Backup baixado.');
  };
  app.querySelector('#restaurar').onclick = () => app.querySelector('#file').click();
  app.querySelector('#file').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    if (!confirm('A restauração substituirá os dados atuais. Continuar?')) return;
    try {
      const res = await restaurarBackup(f);
      alert(`Backup restaurado.\nClientes: ${res.clientes}\nProdutos: ${res.produtos}\nPedidos: ${res.pedidos}\nVendas: ${res.vendas}\nPagamentos: ${res.pagamentos}\nRotas: ${res.rotas}\nProdução: ${res.producao}`);
      go('home', {}, {replace:true});
    } catch(err){ alert('Erro: '+err.message); }
  };
}

async function renderReceber(){
  const clientes = await listCustomers();
  const devedores = [];
  for (const c of clientes){
    const s = await situacaoCliente(c.id);
    if (s.devido > 0) devedores.push({c, s});
  }
  devedores.sort((a,b)=>b.s.devido-a.s.devido);
  app.innerHTML = `<h2>A Receber</h2><div id="l"></div>`;
  const l = app.querySelector('#l');
  let total = 0;
  for (const {c,s} of devedores){
    total += s.devido;
    const d = document.createElement('div'); d.className='card';
    d.innerHTML = `<div class="row"><span>${escapeHtml(c.nome)}</span><span>${brl(s.devido)}</span></div>`;
    d.onclick = () => go('receber-cliente', {id:c.id});
    l.appendChild(d);
  }
  const t = document.createElement('div'); t.className='tot';
  t.innerHTML = `<span>TOTAL</span><span>${brl(total)}</span>`;
  l.appendChild(t);
}

async function renderReceberCliente(params){
  const c = await getCustomer(params.id);
  const s = await situacaoCliente(params.id);
  app.innerHTML = `
    <h2>${escapeHtml(c.nome)}</h2>
    <div class="card">Deve: <span class="big" style="color:#c62828">${brl(s.devido)}</span></div>
    <div class="field"><label>Valor (R$)</label>
      <input id="valor" inputmode="decimal" value="${(s.devido/100).toFixed(2).replace('.',',')}">
    </div>
    <div class="field"><label>Forma</label>
      <select id="forma"><option value="dinheiro">Dinheiro</option><option value="pix">PIX</option>
      <option value="cartao">Cartão</option><option value="outro">Outro</option></select>
    </div>
    <button class="btn" id="ok">Registrar</button>
  `;
  app.querySelector('#ok').onclick = async () => {
    const { parseMoneyCentavos } = await import('./db/database.js');
    const v = parseMoneyCentavos(app.querySelector('#valor').value);
    try {
      await receberPagamento(params.id, v, app.querySelector('#forma').value, '');
      alert('Pagamento registrado.');
      go('home', {}, {replace:true});
    } catch(e){ alert(e.message); }
  };
}

function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.hidden = false;
  setTimeout(()=>t.hidden=true, 2000);
}

const escapeHtml = s => String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const rotas = {
  'home': async () => {
    const kpis = await kpisHome();
    renderHome(app, {kpis}, go);
  },
  'clientes': async () => renderCustomers(app, go),
  'cliente-form': async (p) => renderCustomerForm(app, go, p),
  'cliente-detalhe': async (p) => renderCustomerDetail(app, go, p),
  'cliente-historico': async (p) => renderCustomerHistory(app, go, p),
  'produtos': async () => renderProducts(app, go),
  'produto-form': async (p) => renderProductForm(app, go, p),
  'pedidos': async () => renderOrders(app, go),
  'pedido-form': async () => renderOrderForm(app, go),
  'pedido-detalhe': async (p) => renderOrderDetail(app, go, p),
  'pedido-entregar': async (p) => renderOrderDeliver(app, go, p),
  'venda-nova': async (p) => renderNewSale(app, go, p),
  'venda-pagamento': async (p) => renderSalePayment(app, go, p),
  'rota': async () => renderRoute(app, go),
  'rota-criar': async () => renderRouteCreate(app, go),
  'receber': renderReceber,
  'receber-cliente': renderReceberCliente,
  'relatorios': async () => renderReports(app, go),
  'producao': async () => renderProduction(app, go),
  'backup': renderBackup
};

async function render(){
  title.textContent = TITULOS[current] || 'Venda Rural';
  btnBack.hidden = current === 'home';
  try { await rotas[current](currentParams); }
  catch(e){ app.innerHTML = `<div class="card">Erro: ${escapeHtml(e.message)}</div>`; }
  window.scrollTo(0,0);
}

/**
 * Navegação. `opts.replace = true` zera a pilha (usado após salvar/concluir).
 * Navegação "de exploração" usa replace=false e empilha normalmente.
 */
function go(screen, params={}, opts={}){
  const replace = opts.replace === true;
  if (replace) history.length = 0;
  else if (current !== screen) history.push({screen:current, params:currentParams});
  current = screen; currentParams = params; render();
}

btnBack.onclick = () => {
  const prev = history.pop();
  if (prev){ current = prev.screen; currentParams = prev.params; }
  else { current='home'; currentParams={}; }
  render();
};

/* Persistência de armazenamento: tenta tornar durável (silencioso) */
(async () => {
  try {
    if (navigator.storage && navigator.storage.persist){
      await navigator.storage.persist();
    }
  } catch {}
})();

if ('serviceWorker' in navigator){
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(()=>{}));
}
render();