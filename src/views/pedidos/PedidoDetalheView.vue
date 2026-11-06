<template>
  <div v-if="carregando" class="muted" style="text-align: center; margin-top: 20px;">
    Carregando pedido...
  </div>
  
  <div v-else-if="pedido">
    <!-- FASE 1: Resumo -->
    <div v-if="!modoEntrega">
      <div class="header-cliente">
        <div class="avatar-large">{{ getInicial(cliente?.nome) }}</div>
        <div>
          <h2 style="margin: 0;">{{ cliente?.nome }}</h2>
          <div class="muted">Entrega em: {{ formatarData(pedido.data) }}</div>
        </div>
      </div>

      <h3 style="margin-top: 24px;">Itens do Pedido</h3>
      
      <div class="card" style="padding: 0 16px;">
        <div v-for="item in itens" :key="item.id" class="item-row" style="padding: 16px 0;">
          <div>
            <strong>{{ formatarQtd(item.quantidade) }} {{ item.produtoNome }}</strong>
            <div class="muted" style="font-size: 13px;">
              {{ formatarDinheiro(item.precoUnitario) }} / un
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: bold;">{{ formatarDinheiro(item.subtotal) }}</div>
            <button 
              class="btn small danger" 
              style="margin-top: 4px; padding: 4px 8px; font-size: 12px;" 
              @click="cancelarItem(item)"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>

      <div class="card tot" style="background: #ecfdf5; border-color: #a7f3d0; margin-top: 16px; padding: 16px; display: flex; justify-content: space-between; align-items: center;">
        <span>TOTAL</span>
        <span style="color: var(--primary-dark); font-size: 24px;">{{ formatarDinheiro(total) }}</span>
      </div>

      <button class="btn" style="margin-top: 24px;" @click="modoEntrega = true">
        Entregar e Receber
      </button>
      <button class="btn danger" style="margin-top: 8px;" @click="cancelarPedidoInteiro" :disabled="processando">
        Cancelar Pedido Inteiro
      </button>
    </div>

    <!-- FASE 2: Pagamento -->
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
        <input v-model="valorRecebidoInput" inputmode="decimal" style="font-size: 24px; font-weight: bold;">
      </div>

      <div class="field">
        <label>Forma de Pagamento</label>
        <div class="payment-grid">
          <label class="payment-option" :class="{ active: formaPagamento === 'dinheiro' }">
            <input type="radio" value="dinheiro" v-model="formaPagamento" class="hidden-radio">
            <span class="icon">💵</span> Dinheiro
          </label>
          <label class="payment-option" :class="{ active: formaPagamento === 'pix' }">
            <input type="radio" value="pix" v-model="formaPagamento" class="hidden-radio">
            <span class="icon">⚡</span> PIX
          </label>
          <label class="payment-option" :class="{ active: formaPagamento === 'cartao' }">
            <input type="radio" value="cartao" v-model="formaPagamento" class="hidden-radio">
            <span class="icon">💳</span> Cartão
          </label>
          <label class="payment-option" :class="{ active: formaPagamento === 'outro' }">
            <input type="radio" value="outro" v-model="formaPagamento" class="hidden-radio">
            <span class="icon">🔄</span> Outro
          </label>
        </div>
      </div>

      <button class="btn" @click="confirmarEntrega" :disabled="processando" style="margin-top: 24px;">
        {{ processando ? 'Processando...' : 'Confirmar e Finalizar' }}
      </button>
      <button class="btn sec" @click="modoEntrega = false" style="margin-top: 8px;">Voltar</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getOrder, getOrderItems, setOrderStatus } from '@/domain/orders.js'
import { getCustomer } from '@/domain/customers.js'
import { finalizarVenda } from '@/services/sale-service.js'
import { parseMoneyCentavos, del } from '@/db/database.js'
import { formatarDinheiro, formatarQtd } from '@/utils.js'

const router = useRouter()
const route = useRoute()

const carregando = ref(true)
const processando = ref(false)
const pedido = ref(null)
const cliente = ref(null)
const itens = ref([])
const modoEntrega = ref(false)

const valorRecebidoInput = ref('')
const formaPagamento = ref('dinheiro')

const total = computed(() => itens.value.reduce((soma, item) => soma + item.subtotal, 0))

onMounted(async () => {
  pedido.value = await getOrder(route.params.id)
  if (!pedido.value) return router.replace({ name: 'pedidos' })

  cliente.value = await getCustomer(pedido.value.clienteId)
  itens.value = await getOrderItems(pedido.value.id)
  
  valorRecebidoInput.value = (total.value / 100).toFixed(2).replace('.', ',')
  carregando.value = false
})

// Cancela um item específico e remove do banco de dados
const cancelarItem = async (item) => {
  if (!confirm(`Remover ${item.produtoNome} do pedido?`)) return
  
  processando.value = true
  try {
    await del('orderItems', item.id)
    itens.value = itens.value.filter(i => i.id !== item.id)
    
    // Se não sobrar nenhum item, cancela o pedido inteiro automaticamente
    if (itens.value.length === 0) {
      await cancelarPedidoInteiro()
      return
    }

    valorRecebidoInput.value = (total.value / 100).toFixed(2).replace('.', ',')
  } catch (e) {
    alert(e.message)
  } finally {
    processando.value = false
  }
}

const cancelarPedidoInteiro = async () => {
  if (!confirm('Tem certeza que deseja cancelar este pedido inteiro?')) return
  
  processando.value = true
  try {
    await setOrderStatus(pedido.value.id, 'cancelado')
    router.replace({ name: 'pedidos' })
  } catch (e) {
    alert(e.message)
  } finally {
    processando.value = false
  }
}

const confirmarEntrega = async () => {
  if (itens.value.length === 0) return alert('Não há itens para entregar.')
  
  const valorCentavos = parseMoneyCentavos(valorRecebidoInput.value)
  if (valorCentavos > total.value) return alert('Pagamento maior que o total.')

  processando.value = true
  try {
    const resultado = await finalizarVenda({
      pedidoId: pedido.value.id,
      clienteId: pedido.value.clienteId,
      itens: itens.value,
      valorRecebido: valorCentavos,
      formaPagamento: formaPagamento.value
    })
    
    alert(`Pedido entregue!\nTotal: ${formatarDinheiro(resultado.saldo.total)}\nRecebido: ${formatarDinheiro(resultado.pago)}\nFalta: ${formatarDinheiro(resultado.saldo.restante)}`)
    router.replace({ name: 'pedidos' })
  } catch (e) {
    alert(e.message)
  } finally {
    processando.value = false
  }
}

// Auxiliares
const formatarData = (iso) => new Date(iso).toLocaleDateString('pt-BR')
const getInicial = (nome) => nome ? nome.charAt(0).toUpperCase() : '?'
</script>

<style scoped>
.header-cliente { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
.avatar-large {
  width: 56px; height: 56px; border-radius: 50%;
  background: #ecfdf5; color: var(--primary-dark);
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 24px;
}
.hidden-radio { position: absolute; opacity: 0; width: 0; height: 0; }
.payment-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.payment-option {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 12px; background: var(--bg-card); border: 2px solid var(--border);
  border-radius: var(--radius); cursor: pointer; font-weight: 600; color: var(--text-muted);
}
.payment-option.active { border-color: var(--primary); background: #ecfdf5; color: var(--primary-dark); }
.payment-option .icon { font-size: 20px; }
</style>