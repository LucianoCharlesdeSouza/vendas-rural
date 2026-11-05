<template>
  <div v-if="carregando" class="muted">Carregando rota...</div>
  
  <div v-else-if="!rota">
    <div class="card">Nenhuma rota para hoje.</div>
    <button class="btn" @click="irParaCriar">Criar Rota</button>
  </div>

  <div v-else>
    <h2>Rota de Hoje</h2>
    <div class="muted" style="margin-bottom: 8px">Arraste pelo ⋮⋮ para ordenar a sequência.</div>
    
    <div id="paradas">
      <!-- Lista de PENDENTES (com Drag & Drop) -->
      <div 
        v-for="(parada, idx) in paradasPendentes" 
        :key="parada.clienteId"
        class="rota-parada"
        draggable="true"
        @dragstart="onDragStart(parada.originalIndex)"
        @dragover.prevent
        @drop="onDrop(parada.originalIndex)"
      >
        <div class="handle">⋮⋮</div>
        
        <div class="info" @click="abrirCliente(parada.clienteId)">
          <div class="row">
            <strong>{{ idx + 1 }}. {{ parada.nomeCliente }}</strong>
            <span>{{ formatarDinheiro(parada.total) }}</span>
          </div>
          <div class="muted">
            {{ parada.resumoItens || 'Sem pedidos pendentes' }}
          </div>
        </div>
        
        <button 
          class="btn small" 
          style="background: #2e7d32; margin-left: 8px;" 
          @click.stop="atenderCliente(parada.clienteId)"
        >
          Atender
        </button>
      </div>
    </div>

    <div v-if="paradasPendentes.length === 0" class="card muted" style="text-align:center; padding: 20px;">
      Tudo entregue por hoje! 🎉
    </div>

    <!-- Lista de CONCLUÍDOS -->
    <div v-if="paradasConcluidas.length > 0">
      <h2 style="margin-top: 30px; color: #666;">Concluídos ({{ paradasConcluidas.length }})</h2>
      
      <div 
        v-for="parada in paradasConcluidas" 
        :key="parada.clienteId"
        class="rota-parada concluida"
        style="opacity: 0.6; background: #f5f5f5;"
      >
        <div class="info">
          <div class="row">
            <strong style="text-decoration: line-through;">{{ parada.nomeCliente }}</strong>
            <span>{{ formatarDinheiro(parada.total) }}</span>
          </div>
        </div>
        <span class="pill pago" style="margin-left: 8px;">✓ Feito</span>
      </div>
    </div>

    <button class="btn sec" @click="irParaCriar" style="margin-top: 20px;">+ Adicionar Cliente</button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { listCustomers } from '@/domain/customers.js'
import { getOrderItems, listOrders } from '@/domain/orders.js'
import { obterRotaDeHoje, moverParada } from '@/services/route-service.js'
import { formatarDinheiro, formatarQtd } from '@/utils.js'

const router = useRouter()
const carregando = ref(true)
const rota = ref(null)
const resumoParadas = ref([])

// Estado do Drag & Drop
const draggedIndex = ref(null)

// Filtra as paradas para exibição na tela
const paradasPendentes = computed(() => resumoParadas.value.filter(p => !p.concluida))
const paradasConcluidas = computed(() => resumoParadas.value.filter(p => p.concluida))

const carregarRota = async () => {
  carregando.value = true
  rota.value = await obterRotaDeHoje()
  
  if (rota.value) {
    const clientes = await listCustomers()
    const pedidos = await listOrders()
    const resumo = []

    // Usamos o index original (i) para garantir que o Drag & Drop pegue o item certo
    for (let i = 0; i < rota.value.paradas.length; i++) {
      const p = rota.value.paradas[i]
      const cliente = clientes.find(c => c.id === p.clienteId)
      const pedidosCliente = pedidos.filter(x => x.clienteId === p.clienteId && x.status === 'pendente')
      
      let itens = []
      for (const ped of pedidosCliente) {
        itens = itens.concat(await getOrderItems(ped.id))
      }
      
      const total = itens.reduce((soma, item) => soma + item.subtotal, 0)
      const resumoItens = itens.map(i => `${formatarQtd(i.quantidade)} ${i.produtoNome}`).join(', ')

      resumo.push({
        clienteId: p.clienteId,
        nomeCliente: cliente ? cliente.nome : '?',
        total,
        resumoItens,
        concluida: p.concluida,
        originalIndex: i // Guarda a posição real do array no banco de dados
      })
    }
    resumoParadas.value = resumo
  }
  carregando.value = false
}

onMounted(carregarRota)

// Drag & Drop com base no index original
const onDragStart = (indexOriginal) => {
  draggedIndex.value = indexOriginal
}

const onDrop = async (targetIndexOriginal) => {
  if (draggedIndex.value === null || draggedIndex.value === targetIndexOriginal) return
  
  await moverParada(rota.value.id, draggedIndex.value, targetIndexOriginal)
  draggedIndex.value = null
  await carregarRota() // Recarrega a lista na nova ordem
}

// Ações
const atenderCliente = (clienteId) => {
  router.push({ name: 'atender-cliente', params: { clienteId }, query: { rotaId: rota.value.id } })
}

const abrirCliente = (clienteId) => router.push({ name: 'cliente-detalhe', params: { id: clienteId } })
const irParaCriar = () => router.push({ name: 'rota-criar' })
</script>