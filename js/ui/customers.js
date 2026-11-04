import { listCustomers, saveCustomer, getCustomer } from '../domain/customers.js';
import { situacaoCliente } from '../services/payment-service.js';
import { listAllSales } from '../domain/sales.js';
import { totalPagoDaVenda } from '../domain/payments.js';
import { brl, escapeHtml as escape, fmtDate } from './home.js';
import { gerarLinkWhatsApp } from '../utils.js';

export async function renderCustomers(el, go){
  el.innerHTML = `
    <button class="btn" id="novo">+ Novo Cliente</button>
    <ul class="list" id="lista"></ul>
  `;
  el.querySelector('#novo').onclick = () => go('cliente-form');
  const list = await listCustomers();
  const ul = el.querySelector('#lista');
  if (!list.length) ul.innerHTML = '<li class="muted">Nenhum cliente.</li>';
  for (const c of list){
    const li = document.createElement('li');
    li.innerHTML = `<strong>${escape(c.nome)}</strong>
      <div class="muted">${c.telefone ? escape(c.telefone) : ''}</div>`;
    li.onclick = () => go('cliente-detalhe', {id:c.id});
    ul.appendChild(li);
  }
}

export async function renderCustomerForm(el, go, params){
  const id = params?.id;
  const c = id ? await getCustomer(id) : null;
  el.innerHTML = `
    <form id="f">
      <div class="field"><label>Nome *</label><input name="nome" required value="${c?escape(c.nome):''}"></div>
      <div class="field"><label>Telefone</label><input name="telefone" value="${c?escape(c.telefone):''}"></div>
      <div class="field"><label>Endereço</label><input name="endereco" value="${c?escape(c.endereco):''}"></div>
      <div class="field"><label>Observação</label><textarea name="observacao">${c?escape(c.observacao):''}</textarea></div>
      <button class="btn" type="submit">Salvar</button>
    </form>
  `;
  el.querySelector('#f').onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    try {
      await saveCustomer({...data, id: c?.id});
      go('clientes', {}, {replace:true});
    } catch(err){ alert(err.message); }
  };
}

export async function renderCustomerDetail(el, go, params){
  const c = await getCustomer(params.id);
  if (!c) return go('clientes', {}, {replace:true});
  const s = await situacaoCliente(c.id);
  const linkWpp = gerarLinkWhatsApp(c.telefone, `Olá ${c.nome}, tudo bem?`);
  el.innerHTML = `
    <div class="card">
      <h2 style="margin:0">${escape(c.nome)}</h2>
      <div class="muted">${c.telefone?escape(c.telefone):''}</div>
      <div class="muted">${c.endereco?escape(c.endereco):''}</div>
      <!-- BOTÃO DO WHATSAPP AQUI -->
      ${linkWpp ? `<a href="${linkWpp}" target="_blank" class="btn small" style="background:#25D366; color:#fff; text-decoration:none; text-align:center; margin-top:10px; display:block; padding:10px;">Abrir WhatsApp</a>` : ''}
    </div>
    <div class="card">
      <div class="row"><span>Total vendido</span><span class="big">${brl(s.totalVendido)}</span></div>
      <div class="row"><span>Total recebido</span><span class="big">${brl(s.totalRecebido)}</span></div>
      <div class="row"><span>Ainda deve</span><span class="big" style="color:#c62828">${brl(s.devido)}</span></div>
      ${s.devido>0 ? '<button class="btn" id="receber">Receber Pagamento</button>' : ''}
    </div>
    <button class="btn sec" id="novavenda">Nova Venda</button>
    <button class="btn sec" id="historico">Ver Histórico</button>
  `;
  el.querySelector('#novavenda').onclick = () => go('venda-nova', {clienteId:c.id});
  el.querySelector('#historico').onclick = () => go('cliente-historico', {id:c.id});
  const rb = el.querySelector('#receber');
  if (rb) rb.onclick = () => go('receber-cliente', {id:c.id});
}

/**
 * Histórico do cliente: mostra todas as vendas (inclusive canceladas) com status.
 * Vendas canceladas NÃO entram no saldo devedor (ver payment-service.situacaoCliente).
 */
export async function renderCustomerHistory(el, go, params){
  const c = await getCustomer(params.id);
  const s = await situacaoCliente(params.id);
  const todas = (await listAllSales()).filter(v => v.clienteId === params.id);
  el.innerHTML = `
    <h2>${escape(c.nome)}</h2>
    <div class="card">Saldo devedor: <span class="big">${brl(s.devido)}</span></div>
    <h2>Histórico</h2>
  `;
  if (!todas.length){
    el.innerHTML += '<div class="card muted">Nenhuma venda registrada.</div>';
    return;
  }
  for (const v of todas){
    const pago = await totalPagoDaVenda(v.id);
    const falta = v.total - pago;
    const div = document.createElement('div');
    div.className = 'card';
    const statusPill = v.cancelada
      ? '<span class="pill cancelada">cancelada</span>'
      : (falta>0 ? '<span class="pill pendente">pendente</span>' : '<span class="pill pago">pago</span>');
    div.innerHTML = `
      <div class="row"><span>${fmtDate(v.createdAt)}</span><span>${brl(v.total)}</span></div>
      <div class="muted">${v.itens.map(i=>`${formatQtd(i.quantidade)} ${escape(i.produtoNome)}`).join(', ')}</div>
      <div class="row muted" style="margin-top:6px">
        <span>Recebeu ${brl(pago)}</span>
        <span>${v.cancelada ? '—' : (falta>0 ? 'Falta '+brl(falta) : 'Pago')}</span>
      </div>
      <div style="margin-top:6px">${statusPill}</div>
    `;
    el.appendChild(div);
  }
}

function formatQtd(q){
  const n = Number(q);
  if (!isFinite(n)) return '0';
  return Number.isInteger(n) ? String(n) : String(n).replace('.', ',');
}