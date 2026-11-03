export function renderHome(el, state, go){
  const { kpis } = state;
  el.innerHTML = `
    <div class="menu">
      <button class="btn" data-go="venda-nova">+ Nova Venda</button>
      <button class="btn sec" data-go="pedidos">Pedidos</button>
      <button class="btn sec" data-go="clientes">Clientes</button>
      <button class="btn sec" data-go="produtos">Produtos</button>
      <button class="btn sec" data-go="rota">Rota de Hoje</button>
      <button class="btn sec" data-go="receber">Recebimentos</button>
      <button class="btn sec" data-go="relatorios">Relatórios</button>
      <button class="btn sec" data-go="producao">Produção</button>
      <button class="btn sec" data-go="backup">Backup</button>
    </div>
    <h2>Hoje</h2>
    <div class="card">
      <div class="row"><span>Vendas</span><span class="big">${brl(kpis.vendas)}</span></div>
      <div class="row"><span>Recebido</span><span class="big">${brl(kpis.recebido)}</span></div>
      <div class="row"><span>A receber</span><span class="big">${brl(kpis.aReceber)}</span></div>
      <div class="row muted" style="margin-top:8px"><span>${kpis.entregas} entrega(s)</span></div>
    </div>
  `;
  el.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
}
export const brl = (cents) => 'R$ ' + ((cents||0)/100).toFixed(2).replace('.',',');
export const escapeHtml = s => String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const fmtDate = iso => new Date(iso).toLocaleDateString('pt-BR');
export const fmtDateTime = iso => new Date(iso).toLocaleString('pt-BR');