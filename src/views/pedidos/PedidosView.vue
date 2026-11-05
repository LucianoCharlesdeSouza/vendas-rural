<template>
  <button class="btn" @click="irParaNovo">+ Novo Pedido</button>

  <div v-if="carregando" class="muted">Carregando pedidos...</div>
  
  <div v-else>
    <!-- Agrupamento HOJE -->
    <template v-if="pedidosHoje.length > 0">
      <h2>HOJE</h2>
      <div v-for="pedido in pedidosHoje" :key="pedido.id" class="card" @click="abrirPedido(pedido.id)">
        <div class="row">
          <strong>{{ getNomeCliente(pedido.clienteId) }}</strong>
          <span>{{ formatarDinheiro(calcularTotal(pedido.id)) }}</span>
        </div>
        <div class="muted">{{ getResumoItens(pedido.id) }}</div>
        <div style="margin-top: 8px"><span class="pill pendente">pendente</span></div>
      </div>
    </template>

    <!-- Agrupamento AMANHÃ -->
    <template v-if="pedidosAmanha.length > 0">
      <h2>AMANHÃ</h2>
      <div v-for="pedido in pedidosAmanha" :key="pedido.id" class="card" @click="abrirPedido(pedido.id)">
        <div class="row">
          <strong>{{ getNomeCliente(pedido.clienteId) }}</strong>
          <span>{{ formatarDinheiro(calcularTotal(pedido.id)) }}</span>
        </div>
        <div class="muted">{{ getResumoItens(pedido.id) }}</div>
      </div>
    </template>

    <!-- Agrupamento OUTROS -->
    <template v-if="pedidosOutros.length > 0">
      <h2>OUTROS</h2>
      <div v-for="pedido in pedidosOutros" :key="pedido.id" class="card" @click="abrirPedido(pedido.id)">
        <div class="row">
          <strong>{{ getNomeCliente(pedido.clienteId) }}</strong>
          <span>{{ formatarDinheiro(calcularTotal(pedido.id)) }}</span>
        </div>
        <div class="muted">{{ getResumoItens(pedido.id) }}</div>
      </div>
    </template>

    <div v-if="pedidosPendentes.length === 0" class="muted">
      Nenhum pedido pendente.
    </div>
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
const itensPorPedido = ref({}) // Cache para não buscar no banco toda hora no HTML

onMounted(async () => {
  clientes.value = await listCustomers()
  const todosPedidos = await listOrders()
  
  // Filtra apenas os pendentes
  const pendentes = todosPedidos.filter(p => p.status === 'pendente')
  
  // Pré-carrega os itens de cada pedido para a tela
  for (const p of pendentes) {
    itensPorPedido.value[p.id] = await getOrderItems(p.id)
  }
  pedidos.value = pendentes
  carregando.value = false
})

// Agrupamento por data
const pedidosPendentes = computed(() => pedidos.value)

const pedidosHoje = computed(() => {
  const hoje = new Date().toISOString().slice(0, 10)
  return pedidos.value.filter(p => (p.data || '').slice(0, 10) === hoje)
})

const pedidosAmanha = computed(() => {
  const amanha = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  return pedidos.value.filter(p => (p.data || '').slice(0, 10) === amanha)
})

const pedidosOutros = computed(() => {
  const hoje = new Date().toISOString().slice(0, 10)
  const amanha = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  return pedidos.value.filter(p => {
    const d = (p.data || '').slice(0, 10)
    return d !== hoje && d !== amanha
  })
})

// Funções auxiliares para o HTML
const getNomeCliente = (id) => clientes.value.find(c => c.id === id)?.nome || '?'
const calcularTotal = (pedidoId) => totalPedido(itensPorPedido.value[pedidoId] || [])
const getResumoItens = (pedidoId) => {
  const itens = itensPorPedido.value[pedidoId] || []
  return itens.map(i => `${formatarQtd(i.quantidade)} ${i.produtoNome}`).join(', ')
}

// Navegação
const irParaNovo = () => router.push({ name: 'pedido-form' })
const abrirPedido = (id) => router.push({ name: 'pedido-detalhe', params: { id } })
</script>