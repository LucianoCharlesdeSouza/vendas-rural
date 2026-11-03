import { listProducts } from '../domain/products.js';
import { getProductionByDate, saveProduction, listProduction } from '../domain/production.js';
import { parseDecimal } from '../db/database.js';
import { escapeHtml as escape, fmtDate } from './home.js';

export async function renderProduction(el, go){
  const hoje = new Date().toISOString().slice(0,10);
  const registro = await getProductionByDate(hoje);
  const produtos = await listProducts();
  const historico = await listProduction();
  const mapaHoje = new Map((registro?.itens||[]).map(i => [i.produtoId, i.quantidade]));

  el.innerHTML = `
    <h2>Produção de Hoje</h2>
    <div class="card" id="form">
      ${produtos.length ? produtos.map(p => `
        <div class="field">
          <label>${escape(p.nome)} (${p.unidade})</label>
          <input data-pid="${p.id}" data-unidade="${p.unidade}" data-nome="${escape(p.nome)}"
            inputmode="decimal" value="${mapaHoje.get(p.id) ?? ''}" placeholder="0">
        </div>
      `).join('') : '<div class="muted">Cadastre produtos primeiro.</div>'}
      <button class="btn" id="salvar" ${produtos.length?'':'disabled'}>Salvar</button>
    </div>
    <h2>Histórico</h2>
    <div id="hist"></div>
  `;
  const hist = el.querySelector('#hist');
  if (!historico.length){
    hist.innerHTML = '<div class="card muted">Nenhum registro.</div>';
  } else {
    for (const r of historico){
      const d = document.createElement('div'); d.className='card';
      d.innerHTML = `<div class="row"><strong>${fmtDate(r.data+'T12:00:00')}</strong></div>
        <div class="muted">${r.itens.map(i=>`${formatQtd(i.quantidade)} ${escape(i.unidade)} ${escape(i.produtoNome)}`).join(', ')}</div>`;
      hist.appendChild(d);
    }
  }

  const btn = el.querySelector('#salvar');
  if (btn) btn.onclick = async () => {
    const itens = [];
    el.querySelectorAll('input[data-pid]').forEach(inp => {
      const q = parseDecimal(inp.value);
      if (q > 0){
        itens.push({
          produtoId: inp.dataset.pid,
          produtoNome: inp.dataset.nome,
          unidade: inp.dataset.unidade,
          quantidade: q
        });
      }
    });
    await saveProduction({data: hoje, itens});
    go('producao', {}, {replace:true});
  };
}

function formatQtd(q){
  const n = Number(q);
  if (!isFinite(n)) return '0';
  return Number.isInteger(n) ? String(n) : String(n).replace('.', ',');
}