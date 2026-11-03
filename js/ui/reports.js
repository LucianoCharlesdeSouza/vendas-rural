import { listSales } from '../domain/sales.js';
import { listPayments } from '../domain/payments.js';
import { listCustomers } from '../domain/customers.js';
import { listaDevedores } from '../services/payment-service.js';
import { brl, escapeHtml as escape, fmtDate } from './home.js';

export async function renderReports(el, go){
  const vendas = await listSales();
  const pagamentos = await listPayments();
  const hoje = new Date().toISOString().slice(0,10);
  const inicioSemana = new Date(Date.now() - 7*86400000).toISOString();
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const calc = (desde) => {
    const v = vendas.filter(s => s.createdAt >= desde).reduce((a,s)=>a+s.total,0);
    const p = pagamentos.filter(x => x.createdAt >= desde).reduce((a,x)=>a+x.valor,0);
    return { vendido:v, recebido:p, aReceber: v-p };
  };
  const hojeR = calc(hoje);
  const semanaR = calc(inicioSemana);
  const mesR = calc(inicioMes);

  const clientes = await listCustomers();
  const devedores = await listaDevedores(clientes);

  el.innerHTML = `
    <h2>Movimento</h2>
    <div class="card">
      <h3>Hoje</h3>
      <div class="row"><span>Vendido</span><span>${brl(hojeR.vendido)}</span></div>
      <div class="row"><span>Recebido</span><span>${brl(hojeR.recebido)}</span></div>
      <div class="row"><span>A receber</span><span>${brl(hojeR.aReceber)}</span></div>
    </div>
    <div class="card">
      <h3>Esta semana</h3>
      <div class="row"><span>Vendido</span><span>${brl(semanaR.vendido)}</span></div>
      <div class="row"><span>Recebido</span><span>${brl(semanaR.recebido)}</span></div>
      <div class="row"><span>A receber</span><span>${brl(semanaR.aReceber)}</span></div>
    </div>
    <div class="card">
      <h3>Este mês</h3>
      <div class="row"><span>Vendido</span><span>${brl(mesR.vendido)}</span></div>
      <div class="row"><span>Recebido</span><span>${brl(mesR.recebido)}</span></div>
      <div class="row"><span>A receber</span><span>${brl(mesR.aReceber)}</span></div>
    </div>
    <h2>A Receber</h2>
    <div id="dev"></div>
    <button class="btn sec" id="csv">Exportar CSV de vendas</button>
  `;
  const dev = el.querySelector('#dev');
  let total = 0;
  for (const {cliente, devido} of devedores){
    total += devido;
    const d = document.createElement('div'); d.className='card';
    d.innerHTML = `<div class="row"><span>${escape(cliente.nome)}</span><span>${brl(devido)}</span></div>`;
    d.onclick = () => go('cliente-detalhe', {id:cliente.id});
    dev.appendChild(d);
  }
  const t = document.createElement('div');
  t.className = 'tot'; t.innerHTML = `<span>TOTAL</span><span>${brl(total)}</span>`;
  dev.appendChild(t);

  el.querySelector('#csv').onclick = async () => {
    const linhas = [['data','cliente','total','recebido','pendente'].join(',')];
    for (const v of vendas){
      const c = clientes.find(x=>x.id===v.clienteId);
      const p = pagamentos.filter(x=>x.vendaId===v.id).reduce((a,x)=>a+x.valor,0);
      linhas.push([v.createdAt.slice(0,10), c?.nome||'', (v.total/100).toFixed(2),
        (p/100).toFixed(2), ((v.total-p)/100).toFixed(2)].join(','));
    }
    const blob = new Blob([linhas.join('\n')], {type:'text/csv'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'vendas.csv'; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
  };
}