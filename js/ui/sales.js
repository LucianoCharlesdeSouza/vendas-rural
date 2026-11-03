import { listCustomers } from '../domain/customers.js';
import { listProducts } from '../domain/products.js';
import { brl, escapeHtml as escape } from './home.js';
import { finalizarVenda } from '../services/sale-service.js';
import { parseDecimal, calcSubtotalCentavos, parseMoneyCentavos } from '../db/database.js';
import { formatQtd } from './orders.js';

export async function renderNewSale(el, go, params){
  const clientes = await listCustomers();
  const produtos = await listProducts();
  const itens = [];
  if (!clientes.length){
    el.innerHTML = `<div class="card">Cadastre um cliente antes de vender.</div>
      <button class="btn" id="c">Cadastrar Cliente</button>`;
    el.querySelector('#c').onclick = () => go('cliente-form');
    return;
  }
  if (!produtos.length){
    el.innerHTML = `<div class="card">Cadastre um produto antes de vender.</div>
      <button class="btn" id="p">Cadastrar Produto</button>`;
    el.querySelector('#p').onclick = () => go('produto-form');
    return;
  }
  el.innerHTML = `
    <div class="field"><label>Cliente</label>
      <select id="cliente">${clientes.map(c=>`<option value="${c.id}" ${params?.clienteId===c.id?'selected':''}>${escape(c.nome)}</option>`).join('')}</select>
    </div>
    <div class="card">
      <div class="grid2">
        <div><label class="muted">Produto</label>
          <select id="prod">${produtos.map(p=>`<option value="${p.id}">${escape(p.nome)} (${brl(p.preco)}/${p.unidade})</option>`).join('')}</select>
        </div>
        <div><label class="muted">Quantidade</label><input id="qtd" inputmode="decimal" value="1"></div>
      </div>
      <button class="btn small" id="add">Adicionar</button>
    </div>
    <div id="itens"></div>
    <div class="tot"><span>TOTAL</span><span id="total">R$ 0,00</span></div>
    <div class="field"><label>Observação</label><textarea id="obs"></textarea></div>
    <button class="btn" id="finalizar">Finalizar Venda</button>
  `;
  const renderItens = () => {
    el.querySelector('#itens').innerHTML = itens.map((it,ix)=>`<div class="item-row">
      <span>${formatQtd(it.quantidade)} ${escape(it.produtoNome)}</span>
      <span>${brl(it.subtotal)} <button class="btn small danger" data-ix="${ix}">x</button></span>
    </div>`).join('');
    el.querySelectorAll('[data-ix]').forEach(b=>b.onclick=()=>{itens.splice(+b.dataset.ix,1);renderItens();});
    el.querySelector('#total').textContent = brl(itens.reduce((s,i)=>s+i.subtotal,0));
  };
  renderItens();
  el.querySelector('#add').onclick = () => {
    const p = produtos.find(x=>x.id===el.querySelector('#prod').value);
    const q = parseDecimal(el.querySelector('#qtd').value);
    if (q<=0){alert('Quantidade inválida.');return;}
    itens.push({produtoId:p.id,produtoNome:p.nome,quantidade:q,
      precoUnitario:p.preco, subtotal: calcSubtotalCentavos(q, p.preco)});
    renderItens();
  };
  el.querySelector('#finalizar').onclick = () => {
    if (!itens.length){alert('Adicione ao menos um item.');return;}
    go('venda-pagamento', {clienteId:el.querySelector('#cliente').value,
      itens, obs:el.querySelector('#obs').value});
  };
}

export async function renderSalePayment(el, go, params){
  const total = params.itens.reduce((s,i)=>s+i.subtotal,0);
  el.innerHTML = `
    <h2>Pagamento</h2>
    <div class="tot"><span>Total</span><span>${brl(total)}</span></div>
    <div class="field"><label>Quanto recebeu agora?</label>
      <input id="valor" inputmode="decimal" value="${(total/100).toFixed(2).replace('.',',')}">
    </div>
    <div class="field"><label>Forma</label>
      <select id="forma"><option value="dinheiro">Dinheiro</option><option value="pix">PIX</option>
      <option value="cartao">Cartão</option><option value="outro">Outro</option></select>
    </div>
    <button class="btn" id="ok">Confirmar</button>
  `;
  el.querySelector('#ok').onclick = async () => {
    const v = parseMoneyCentavos(el.querySelector('#valor').value);
    if (v > total){ alert('Pagamento maior que o total.'); return; }
    const r = await finalizarVenda({
      clienteId: params.clienteId, itens: params.itens,
      valorRecebido: v, formaPagamento: el.querySelector('#forma').value,
      observacao: params.obs
    });
    alert(`Venda registrada.\nTotal: ${brl(r.saldo.total)}\nRecebido: ${brl(r.pago)}\nFalta: ${brl(r.saldo.restante)}`);
    go('home', {}, {replace:true});
  };
}