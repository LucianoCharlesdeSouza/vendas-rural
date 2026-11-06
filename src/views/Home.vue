<template>
  <!-- <div class="menu">
    <button class="btn" @click="irPara('venda-nova')">+ Nova Venda</button>
    <button class="btn sec" @click="irPara('pedidos')">Pedidos</button>
    <button class="btn sec" @click="irPara('clientes')">Clientes</button>
    <button class="btn sec" @click="irPara('produtos')">Produtos</button>
    <button class="btn sec" @click="irPara('rota')">Rota de Hoje</button>
    <button class="btn sec" @click="irPara('receber')">Recebimentos</button>
    <button class="btn sec" @click="irPara('relatorios')">Relatórios</button>
    <button class="btn sec" @click="irPara('producao')">Produção</button>
    <button class="btn sec" @click="irPara('backup')">Backup</button>
  </div> -->
  <div class="home-actions">
    <!-- Ação Principal -->
    <button class="btn-primary-large" @click="irPara('venda-nova')">
      <span class="icon">🛒</span>
      Nova Venda
    </button>

    <!-- Grid de Atalhos -->
    <div class="shortcut-grid">
      <button class="shortcut-btn" @click="irPara('rota')">
        <span class="icon">🚚</span> Rota de Hoje
      </button>
      <button class="shortcut-btn" @click="irPara('pedidos')">
        <span class="icon">📋</span> Pedidos
      </button>
      <button class="shortcut-btn" @click="irPara('receber')">
        <span class="icon">💰</span> Receber
      </button>
      <button class="shortcut-btn" @click="irPara('clientes')">
        <span class="icon">👥</span> Clientes
      </button>
      <button class="shortcut-btn" @click="irPara('produtos')">
        <span class="icon">🧀</span> Produtos
      </button>
      <button class="shortcut-btn" @click="irPara('producao')">
        <span class="icon">📦</span> Produção
      </button>
    </div>
    
    <!-- Ações Secundárias (menores) -->
    <div class="secondary-actions">
      <button @click="irPara('relatorios')">📊 Relatórios</button>
      <button @click="irPara('backup')">☁️ Backup</button>
    </div>
  </div>

  <h2>Hoje</h2>
  <div v-if="carregando" class="card muted">
    Carregando dados de hoje...
  </div>
  
  <div v-else>
    <!-- CARD DE KPIs -->
    <!-- <div class="card">
      <div class="row">
        <span>Vendas</span>
        <span class="big">{{ formatarDinheiro(kpis.vendas) }}</span>
      </div>
      <div class="row">
        <span>Recebido</span>
        <span class="big">{{ formatarDinheiro(kpis.recebido) }}</span>
      </div>
      <div class="row">
        <span>A receber</span>
        <span class="big">{{ formatarDinheiro(kpis.aReceber) }}</span>
      </div>
      <div class="row muted" style="margin-top: 8px">
        <span>{{ kpis.entregas }} entrega(s) pendente(s)</span>
      </div>
    </div> -->

    <h2 class="section-title">Resumo de Hoje</h2>

<div class="dashboard-card">
  <div class="kpi-row">
    <div class="kpi-item">
      <span class="kpi-label">Vendido</span>
      <span class="kpi-value">{{ formatarDinheiro(kpis.vendas) }}</span>
    </div>
    <div class="kpi-item">
      <span class="kpi-label">Recebido</span>
      <span class="kpi-value" style="color: var(--primary);">{{ formatarDinheiro(kpis.recebido) }}</span>
    </div>
  </div>
  
  <hr style="border: 0; border-top: 1px solid var(--border); margin: 16px 0;">
  
  <div class="kpi-row">
    <div class="kpi-item">
      <span class="kpi-label">A receber</span>
      <span class="kpi-value" style="color: var(--danger);">{{ formatarDinheiro(kpis.aReceber) }}</span>
    </div>
    <div class="kpi-item" style="align-items: flex-end;">
      <span class="pill warning">{{ kpis.entregas }} entregas hoje</span>
    </div>
  </div>
</div>
    <!-- LISTA EXPANSÍVEL: ENTREGAS PENDENTES -->
    <details v-if="listaEntregas.length > 0" class="expandable-card">
      <summary>
        <span>🚚 Entregas de Hoje</span>
        <span class="badge">{{ listaEntregas.length }}</span>
      </summary>
      <div class="expandable-content">
        <div 
          v-for="item in listaEntregas" 
          :key="item.pedidoId" 
          class="list-item"
          @click="abrirPedido(item.pedidoId)"
        >
          <div>
            <strong>{{ item.clienteNome }}</strong>
            <div class="muted">{{ item.resumo }}</div>
          </div>
          <span>{{ formatarDinheiro(item.total) }}</span>
        </div>
      </div>
    </details>

    <!-- LISTA EXPANSÍVEL: VALORES A RECEBER -->
    <details v-if="listaReceber.length > 0" class="expandable-card" style="margin-top: 10px;">
      <summary>
        <span>💰 Quem está devendo</span>
        <span class="badge">{{ listaReceber.length }}</span>
      </summary>
      <div class="expandable-content">
        <div 
          v-for="item in listaReceber" 
          :key="item.clienteId" 
          class="list-item"
          @click="abrirRecebimento(item.clienteId)"
        >
          <div>
            <strong>{{ item.clienteNome }}</strong>
            <div class="muted">Toque para receber</div>
          </div>
          <span style="color: #c62828; font-weight: bold;">
            {{ formatarDinheiro(item.devido) }}
          </span>
        </div>
      </div>
    </details>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { listSales } from '@/domain/sales.js' 
import { listPayments } from '@/domain/payments.js'
import { listOrders, getOrderItems } from '@/domain/orders.js'
import { listCustomers } from '@/domain/customers.js'
import { situacaoCliente } from '@/services/payment-service.js'
import { formatarDinheiro, formatarQtd } from '@/utils.js'

const router = useRouter()
const carregando = ref(true)

const kpis = ref({
  vendas: 0,
  recebido: 0,
  aReceber: 0,
  entregas: 0
})

const listaEntregas = ref([])
const listaReceber = ref([])

const irPara = (rota) => router.push({ name: rota })

onMounted(async () => {
  try {
    const [vendas, pagamentos, pedidos, clientes] = await Promise.all([
      listSales(),
      listPayments(),
      listOrders(),
      listCustomers()
    ])
    
    const hoje = new Date().toISOString().slice(0, 10)

    // --- CÁLCULO DOS KPIs ---
    const vendasHoje = vendas.filter(v => v.createdAt.slice(0, 10) === hoje)
    const totalVendas = vendasHoje.reduce((soma, v) => soma + v.total, 0)

    const pagamentosHoje = pagamentos.filter(p => p.createdAt.slice(0, 10) === hoje)
    const totalRecebido = pagamentosHoje.reduce((soma, p) => soma + p.valor, 0)

    kpis.value.vendas = totalVendas
    kpis.value.recebido = totalRecebido
    kpis.value.aReceber = totalVendas - totalRecebido

    // --- PREPARAR LISTA DE ENTREGAS PENDENTES HOJE ---
    const entregasHoje = pedidos.filter(p => p.status === 'pendente' && (p.data || '').slice(0, 10) === hoje)
    kpis.value.entregas = entregasHoje.length

    const tempEntregas = []
    for (const ped of entregasHoje) {
      const cliente = clientes.find(c => c.id === ped.clienteId)
      const itens = await getOrderItems(ped.id)
      tempEntregas.push({
        pedidoId: ped.id,
        clienteNome: cliente ? cliente.nome : '?',
        resumo: itens.map(i => `${formatarQtd(i.quantidade)} ${i.produtoNome}`).join(', '),
        total: itens.reduce((s, i) => s + i.subtotal, 0)
      })
    }
    listaEntregas.value = tempEntregas

    // --- PREPARAR LISTA DE DEVEDORES ---
    // (Considerando apenas os que devem algo)
    const tempReceber = []
    for (const c of clientes) {
      const s = await situacaoCliente(c.id)
      if (s.devido > 0) {
        tempReceber.push({
          clienteId: c.id,
          clienteNome: c.nome,
          devido: s.devido
        })
      }
    }
    // Ordena do maior devedor para o menor
    listaReceber.value = tempReceber.sort((a, b) => b.devido - a.devido)

  } catch (error) {
    console.error("Erro ao carregar dados:", error)
  } finally {
    carregando.value = false
  }
})

// Navegação rápida ao clicar
const abrirPedido = (id) => router.push({ name: 'pedido-detalhe', params: { id } })
const abrirRecebimento = (id) => router.push({ name: 'receber-cliente', params: { id } })
</script>

<style scoped>
/* Estilos exclusivos para o elemento <details> parecer um card */
.expandable-card {
  background: var(--bg-card);
  border-radius: var(--radius);
  margin-top: 16px;
  box-shadow: var(--shadow);
  border: 1px solid var(--border);
}

/* O cabeçalho clicável */
.expandable-card summary {
  padding: 16px;
  font-weight: 600;
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Remove a setinha no Safari */
.expandable-card summary::-webkit-details-marker {
  display: none;
}

/* Adiciona uma setinha customizada */
.expandable-card summary::after {
  content: '▼';
  font-size: 12px;
  color: #666;
  transition: transform 0.2s;
}
.expandable-card[open] summary::after {
  transform: rotate(180deg);
}

/* O conteúdo que expande */
.expandable-content {
  padding: 0 16px;
  background: #fafafa; /* Fundo levemente diferente ao abrir */
  border-radius: 0 0 var(--radius) var(--radius);
}

/* A linha de cada cliente */
.list-item {
  padding: 16px 0;
  border-bottom: 1px solid var(--border);
}

.list-item:last-child {
  border-bottom: none;
}
.list-item:active {
  background: #f9f9f9;
}

/* A bolinha com a quantidade */
.badge {
  background: #2e7d32;
  color: white;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 13px;
  margin-left: auto;
  margin-right: 10px;
}




.home-actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.btn-primary-large {
  background: var(--primary);
  color: white;
  border: none;
  border-radius: var(--radius);
  padding: 20px;
  font-size: 20px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  box-shadow: var(--shadow);
  cursor: pointer;
}

.shortcut-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.shortcut-btn {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: var(--text-main);
  box-shadow: var(--shadow);
  cursor: pointer;
}

.shortcut-btn .icon {
  font-size: 24px;
}

.secondary-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
}

.secondary-actions button {
  flex: 1;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px;
  color: var(--text-muted);
  font-weight: 500;
}




.section-title {
  font-size: 18px;
  margin: 24px 0 12px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 13px;
}

.dashboard-card {
  background: var(--bg-card);
  border-radius: var(--radius);
  padding: 20px;
  box-shadow: var(--shadow);
}

.kpi-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.kpi-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.kpi-label {
  font-size: 13px;
  color: var(--text-muted);
}

.kpi-value {
  font-size: 24px;
  font-weight: 700;
}

.pill {
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
}
.pill.warning {
  background: #fef3c7;
  color: #92400e;
}
</style>