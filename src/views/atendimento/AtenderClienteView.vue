<template>
  <div v-if="carregando" class="muted">Carregando atendimento...</div>
  
  <div v-else-if="cliente">
    <h2>Atender: {{ cliente.nome }}</h2>
    
    <!-- Resumo dos Pedidos Pendentes -->
    <div class="card">
      <h3>Pedidos Pendentes</h3>
      <div v-if="pedidosPendentes.length === 0" class="muted">
        Nenhum pedido antecipado para este cliente.
      </div>
      <div v-else>
        <div v-for="item in itensPendentes" :key="item.id" class="item-row">
          <span>{{ formatarQtd(item.quantidade) }} {{ item.produtoNome }}</span>
          <span>{{ formatarDinheiro(item.subtotal) }}</span>
        </div>
        <div class="tot">
          <span>Total Pendente</span>
          <span>{{ formatarDinheiro(totalPendente) }}</span>
        </div>
      </div>
    </div>

    <!-- Ações -->
    <button 
      v-if="pedidosPendentes.length > 0" 
      class="btn" 
      @click="entregarPedido"
    >
      Entregar Pedido
    </button>

    <button class="btn sec" @click="novaVenda">
      Nova Venda Direta
    </button>

    <button class="btn ghost" style="margin-top: 20px" @click="voltarParaRota">
      Voltar para Rota
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getCustomer } from '@/domain/customers.js'
import { listOrders, getOrderItems } from '@/domain/orders.js'
import { marcarParadaConcluida } from '@/services/route-service.js'
import { formatarDinheiro, formatarQtd } from '@/utils.js'

const router = useRouter()
const route = useRoute()

const carregando = ref(true)
const cliente = ref(null)
const pedidosPendentes = ref([])
const itensPendentes = ref([])

onMounted(async () => {
  cliente.value = await getCustomer(route.params.clienteId)
  
  // Busca pedidos pendentes deste cliente
  const todosPedidos = await listOrders()
  pedidosPendentes.value = todosPedidos.filter(
    p => p.clienteId === cliente.value.id && p.status === 'pendente'
  )

  // Carrega os itens de todos os pedidos pendentes
  let itens = []
  for (const ped of pedidosPendentes.value) {
    itens = itens.concat(await getOrderItems(ped.id))
  }
  itensPendentes.value = itens
  
  carregando.value = false
})

const totalPendente = computed(() => 
  itensPendentes.value.reduce((soma, item) => soma + item.subtotal, 0)
)

// Se ele entregar o pedido, ele vai para a tela de detalhes do pedido para finalizar
const entregarPedido = () => {
  // Pega o primeiro pedido pendente (se tiver mais de um, seria bom ter uma tela de seleção, mas para o MVP o primeiro resolve)
  const pedido = pedidosPendentes.value[0]
  router.push({
    name: 'pedido-detalhe',
    params: {
      id: pedido.id
    },
    query: { rotaId: route.query.rotaId } // <-- Passa o rotaId adiante
  })
}

// Se ele fizer uma venda extra na hora
const novaVenda = () => {
  router.push({ 
    name: 'venda-nova',
    query: {
      clienteId: cliente.value.id,
      rotaId: route.query.rotaId // <-- Passa o ID da rota adiante
    }
  })
}

// Volta para a rota
const voltarParaRota = () => {
  router.push({ name: 'rota' })
}
</script>