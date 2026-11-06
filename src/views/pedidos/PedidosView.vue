<template>
  <div class="header-actions">
    <button class="btn" @click="irParaNovo">+ Novo Pedido</button>
  </div>

  <div v-if="carregando" class="muted" style="text-align: center; margin-top: 20px;">
    Carregando pedidos...
  </div>
  
  <div v-else>
    <div v-if="pedidosHoje.length === 0 && pedidosAmanha.length === 0 && pedidosOutros.length === 0" class="card empty-state">
      <div style="font-size: 40px; margin-bottom: 12px;">📋</div>
      <h3 style="margin: 0;">Nenhum pedido pendente</h3>
      <div class="muted" style="margin-top: 8px;">Tudo limpo por aqui!</div>
    </div>

    <!-- Renderização por Seções -->
    <template v-for="secao in secoesAgrupadas" :key="secao.titulo">
      <div v-if="secao.pedidos.length > 0" class="section-group">
        <div class="section-header">
          <span class="section-title">{{ secao.titulo }}</span>
          <span class="pill" :class="secao.classePill">{{ secao.pedidos.length }}</span>
        </div>
        
        <div 
          v-for="grupo in secao.pedidos" 
          :key="grupo.clienteId + secao.titulo" 
          class="card pedido-card" 
          :class="secao.classeCard"
          @click="abrirPedido(grupo.pedidoPrincipalId)"
        >
          <div class="pedido-content">
            <div class="avatar">{{ getInicial(grupo.nomeCliente) }}</div>
            <div class="pedido-info">
              <div class="row">
                <strong class="cliente-nome">{{ grupo.nomeCliente }}</strong>
                <span class="valor">{{ formatarDinheiro(grupo.total) }}</span>
              </div>
              <div class="resumo-itens">
                <span class="badge-qtd">{{ grupo.qtdPedidos }} pedido(s)</span>
                {{ grupo.resumoItens }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { listOrders, getOrderItems, totalPedido } from '@/domain/orders.js'
import { listCustomers } from '@/domain/customers.js'
import { formatarDinheiro, formatarQtd } from '@/utils.js'

const router = useRouter()
const carregando = ref(true)
const pedidos = ref([])
const clientes = ref([])
const itensPorPedido = ref({})

onMounted(async () => {
  clientes.value = await listCustomers()
  const todosPedidos = await listOrders()
  
  const pendentes = todosPedidos.filter(p => p.status === 'pendente')
  
  for (const p of pendentes) {
    itensPorPedido.value[p.id] = await getOrderItems(p.id)
  }
  pedidos.value = pendentes
  carregando.value = false
})

// --- LÓGICA DE AGRUPAMENTO ---
// Essa função agrupa por Cliente + Data para não duplicar cartões
const agruparPedidos = (listaPedidos) => {
  const grupos = {}

  for (const pedido of listaPedidos) {
    // Chave única para o agrupamento: ID do Cliente + Data
    const dataPedido = (pedido.data || '').slice(0, 10)
    const chave = `${pedido.clienteId}_${dataPedido}`

    if (!grupos[chave]) {
      grupos[chave] = {
        clienteId: pedido.clienteId,
        data: dataPedido,
        pedidoPrincipalId: pedido.id, // Salva o ID do primeiro para navegar
        qtdPedidos: 0,
        total: 0,
        itens: []
      }
    }

    const grupo = grupos[chave]
    grupo.qtdPedidos += 1
    grupo.total += calcularTotal(pedido.id)
    
    // Junta os itens de todos os pedidos desse cliente nesse dia
    const itensDoPedido = itensPorPedido.value[pedido.id] || []
    grupo.itens = grupo.itens.concat(itensDoPedido)
  }

  // Transforma o objeto agrupado em uma lista pronta para o HTML
  return Object.values(grupos).map(grupo => {
    const cliente = clientes.value.find(c => c.id === grupo.clienteId)
    
    return {
      ...grupo,
      nomeCliente: cliente ? cliente.nome : '?',
      resumoItens: grupo.itens.map(i => `${formatarQtd(i.quantidade)} ${i.produtoNome}`).join(', ')
    }
  }).sort((a, b) => a.nomeCliente.localeCompare(b.nomeCliente)) // Ordena alfabeticamente
}

// --- COMPUTEDS DE SEÇÃO ---
const hoje = new Date().toISOString().slice(0, 10)
const amanha = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

const pedidosHoje = computed(() => agruparPedidos(pedidos.value.filter(p => (p.data || '').slice(0, 10) === hoje)))
const pedidosAmanha = computed(() => agruparPedidos(pedidos.value.filter(p => (p.data || '').slice(0, 10) === amanha)))
const pedidosOutros = computed(() => agruparPedidos(pedidos.value.filter(p => {
  const d = (p.data || '').slice(0, 10)
  return d !== hoje && d !== amanha
})))

// Configuração visual das seções
const secoesAgrupadas = computed(() => [
  { titulo: 'Hoje', pedidos: pedidosHoje.value, classeCard: 'hoje', classePill: 'pendente' },
  { titulo: 'Amanhã', pedidos: pedidosAmanha.value, classeCard: '', classePill: 'pendente' },
  { titulo: 'Outros dias', pedidos: pedidosOutros.value, classeCard: '', classePill: '' }
])

// Auxiliares
const getInicial = (nome) => nome ? nome.charAt(0).toUpperCase() : '?'
const calcularTotal = (pedidoId) => totalPedido(itensPorPedido.value[pedidoId] || [])

const irParaNovo = () => router.push({ name: 'pedido-form' })
const abrirPedido = (id) => router.push({ name: 'pedido-detalhe', params: { id } })
</script>

<style scoped>
.section-group {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding: 0 4px;
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.pedido-card {
  padding: 16px;
  margin: 8px 0;
  transition: transform 0.2s;
}
.pedido-card:active { transform: scale(0.98); }
.pedido-card.hoje { border-left: 4px solid var(--primary); }

.pedido-content {
  display: flex;
  gap: 12px;
  align-items: center;
}

.avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #ecfdf5;
  color: var(--primary-dark);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 18px;
  flex-shrink: 0;
}

.pedido-info { flex: 1; min-width: 0; }
.cliente-nome { font-size: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.valor { font-weight: 700; color: var(--text-main); }

.resumo-itens {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.badge-qtd {
  display: inline-block;
  background: #ecfdf5;
  color: var(--primary-dark);
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  margin-right: 6px;
  font-weight: 600;
}

.empty-state { text-align: center; padding: 40px 20px; }
</style>