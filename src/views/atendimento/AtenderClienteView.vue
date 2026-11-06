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

    <!-- Ações se houver pedido -->
    <div v-if="pedidosPendentes.length > 0" style="margin-bottom: 20px;">
      <button class="btn" @click="entregarPedido">
        Entregar Pedido
      </button>
      <button class="btn danger" @click="cancelarPedido" :disabled="processando">
        {{ processando ? 'Cancelando...' : 'Cancelar Pedido' }}
      </button>
    </div>

    <!-- Venda Direta -->
    <button class="btn sec" @click="novaVenda">
      Nova Venda Direta
    </button>

        <!-- O NOVO BOTÃO: Se não vendeu nada, apenas conclui a visita -->
    <button class="btn ghost" @click="concluirVisita" :disabled="processando" style="margin-top: 10px;">
      {{ processando ? 'Concluindo...' : 'Não vendeu / Concluir Visita' }}
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
import { listOrders, getOrderItems, setOrderStatus } from '@/domain/orders.js'
import { marcarParadaConcluida } from '@/services/route-service.js'
import { formatarDinheiro, formatarQtd } from '@/utils.js'

const router = useRouter()
const route = useRoute()

const carregando = ref(true)
const processando = ref(false)
const cliente = ref(null)
const pedidosPendentes = ref([])
const itensPendentes = ref([])

onMounted(async () => {
  cliente.value = await getCustomer(route.params.clienteId)
  
  const todosPedidos = await listOrders()
  pedidosPendentes.value = todosPedidos.filter(
    p => p.clienteId === cliente.value.id && p.status === 'pendente'
  )

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

const entregarPedido = () => {
  const pedido = pedidosPendentes.value[0]
  router.push({ 
    name: 'pedido-detalhe', 
    params: { id: pedido.id },
    query: { rotaId: route.query.rotaId }
  })
}

// NOVA FUNÇÃO: Cancelar o pedido
const cancelarPedido = async () => {
  if (!confirm('Tem certeza que deseja cancelar este pedido? Ele será removido da rota.')) {
    return
  }
  
  processando.value = true
  try {
    const pedido = pedidosPendentes.value[0]
    
    // 1. Cancela o pedido no banco de dados
    await setOrderStatus(pedido.id, 'cancelado')
    
    // 2. Marca a parada na rota como concluída (para sumir da lista)
    if (route.query.rotaId) {
      await marcarParadaConcluida(route.query.rotaId, cliente.value.id)
    }
    
    // 3. Volta para a tela de rota
    router.replace({ name: 'rota' })
  } catch (e) {
    alert('Erro ao cancelar: ' + e.message)
  } finally {
    processando.value = false
  }
}

// NOVA FUNÇÃO
const concluirVisita = async () => {
  if (!route.query.rotaId) return router.push({ name: 'rota' })
  
  if (!confirm('Concluir esta visita sem registrar venda? O cliente sairá da rota de hoje.')) return

  processando.value = true
  try {
    // Marca a parada na rota como concluída
    await marcarParadaConcluida(route.query.rotaId, cliente.value.id)
    router.replace({ name: 'rota' })
  } catch (e) {
    alert('Erro: ' + e.message)
  } finally {
    processando.value = false
  }
}

const novaVenda = () => {
  router.push({ 
    name: 'venda-nova', 
    query: { clienteId: cliente.value.id, rotaId: route.query.rotaId }
  })
}

const voltarParaRota = () => {
  router.push({ name: 'rota' })
}
</script>