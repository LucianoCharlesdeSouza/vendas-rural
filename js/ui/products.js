import { listProducts, saveProduct, getProduct, UNIDADES } from '../domain/products.js';
import { brl, escapeHtml as escape } from './home.js';

export async function renderProducts(el, go){
  el.innerHTML = `<button class="btn" id="novo">+ Novo Produto</button>
    <ul class="list" id="lista"></ul>`;
  el.querySelector('#novo').onclick = () => go('produto-form');
  const list = await listProducts();
  const ul = el.querySelector('#lista');
  if (!list.length) ul.innerHTML = '<li class="muted">Nenhum produto.</li>';
  for (const p of list){
    const li = document.createElement('li');
    li.innerHTML = `<div class="row"><strong>${escape(p.nome)}</strong>
      <span>${brl(p.preco)} / ${p.unidade}</span></div>`;
    li.onclick = () => go('produto-form', {id:p.id});
    ul.appendChild(li);
  }
}

export async function renderProductForm(el, go, params){
  const id = params?.id;
  const p = id ? await getProduct(id) : null;
  el.innerHTML = `
    <form id="f">
      <div class="field"><label>Nome</label><input name="nome" required value="${p?escape(p.nome):''}"></div>
      <div class="field"><label>Unidade</label>
        <select name="unidade">${UNIDADES.map(u=>`<option ${p&&p.unidade===u?'selected':''}>${u}</option>`).join('')}</select>
      </div>
      <div class="field"><label>Preço (R$)</label>
        <input name="preco" inputmode="decimal" value="${p?(p.preco/100).toFixed(2).replace('.',','):''}">
      </div>
      <button class="btn" type="submit">Salvar</button>
    </form>
  `;
  el.querySelector('#f').onsubmit = async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    const cent = Math.round(parseFloat(String(d.preco).replace(',','.')) * 100) || 0;
    try {
      await saveProduct({ id: p?.id, nome:d.nome, unidade:d.unidade, preco:cent });
      go('produtos', {}, {replace:true});
    } catch(err){ alert(err.message); }
  };
}