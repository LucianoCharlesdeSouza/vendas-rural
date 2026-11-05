<template>
  <div v-if="carregando" class="muted">Carregando pedido...</div>
  
  <div v-else-if="pedido">
    <!-- FASE 1: Resumo do Pedido -->
    <div v-if="!modoEntrega">
      <div class="card">
        <h2 style="margin: 0">{{ cliente?.nome }}</h2>
        <div style="margin-top: 10px">
          <div v-for="item in itens" :key="item.id" class="item-row">
            <span>{{ formatarQtd(item.quantidade) }} {{ item.produtoNome }}</span>
            <span>{{ formatarDinheiro(item.subtotal) }}</span>
          </div>
        </div>
        <div class="tot">
          <span>Total</span>
          <span>{{ formatarDinheiro(total) }}</span>
        </div>
      </div>
      
      <button class="btn" @click="modoEntrega = true">Entregar</button>
      <button class="btn danger" @click="cancelarPedido">Cancelar Pedido</button>
    </div>

    <!-- FASE 2: Tela de Pagamento e Finalização -->
    <div v-else>
      <h2>Entregar Pedido</h2>
      <div class="card">
        <div class="row">
          <span>{{ cliente?.nome }}</span>
          <span class="big">{{ formatarDinheiro(total) }}</span>
        </div>
      </div>

      <div class="field">
        <label>Pagamento recebido (R$)</label>
        <input v-model="valorRecebidoInput" inputmode="decimal">
      </div>

      <div class="field">
        <label>Forma</label>
        <select v-model="formaPagamento">
          <option value="dinheiro">Dinheiro</option>
          <option value="pix">PIX</option>
          <option value="cartao">Cartão</option>
          <option value="outro">Outro</option>
        </select>
      </div>

      <button class="btn" @click="confirmarEntrega" :disabled="salvando">
        {{ salvando ? 'Processando...' : 'Confirmar' }}
      </button>
      <button class="btn sec" @click="modoEntrega = false">Voltar</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getOrder, getOrderItems, setOrderStatus } from '@/domain/orders.js'
import { getCustomer } from '@/domain/customers.js'
import { finalizarVenda } from '@/services/sale-service.js'
import { parseMoneyCentavos } from '@/db/database.js'
import { formatarDinheiro, formatarQtd } from '@/utils.js'

const router = useRouter()
const route = useRoute()

const carregando = ref(true)
const pedido = ref(null)
const cliente = ref(null)
const itens = ref([])
const modoEntrega = ref(false)
const salvando = ref(false)

const valorRecebidoInput = ref('')
const formaPagamento = ref('dinheiro')

const total = computed(() => itens.value.reduce((soma, item) => soma + item.subtotal, 0))

onMounted(async () => {
  pedido.value = await getOrder(route.params.id)
  if (!pedido.value) return router.replace({ name: 'pedidos' })

  itens.value = await getOrderItems(pedido.value.id)
  cliente.value = await getCustomer(pedido.value.clienteId)
  
  // Preenche o input com o total
  valorRecebidoInput.value = (total.value / 100).toFixed(2).replace('.', ',')
  
  carregando.value = false
})

const cancelarPedido = async () => {
  if (!confirm('Cancelar este pedido?')) return
  await setOrderStatus(pedido.value.id, 'cancelado')
  router.replace({ name: 'pedidos' })
}

const confirmarEntrega = async () => {
  const valorCentavos = parseMoneyCentavos(valorRecebidoInput.value)
  if (valorCentavos > total.value) return alert('Pagamento maior que o total.')

  salvando.value = true
  try {
    const resultado = await finalizarVenda({
      pedidoId: pedido.value.id,
      clienteId: pedido.value.clienteId,
      itens: itens.value,
      valorRecebido: valorCentavos,
      formaPagamento: formaPagamento.value
    })
    
    alert(`Pedido entregue!\nTotal: ${formatarDinheiro(resultado.saldo.total)}\nRecebido: ${formatarDinheiro(resultado.pago)}\nFalta: ${formatarDinheiro(resultado.saldo.restante)}`)

    // AQUI ESTÁ A CORREÇÃO:
    if (route.query.rotaId) {
      const { marcarParadaConcluida } = await import('@/services/route-service.js')
      await marcarParadaConcluida(route.query.rotaId, pedido.value.clienteId)
      router.replace({ name: 'rota' })
    } else {
      router.replace({ name: 'pedidos' })
    }
    
  } catch (e) {
    alert(e.message)
  } finally {
    salvando.value = false
  }
}
</script>