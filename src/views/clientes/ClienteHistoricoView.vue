<template>
  <div v-if="carregando" class="muted">Carregando histórico...</div>
  
  <div v-else-if="cliente">
    <h2>{{ cliente.nome }}</h2>
    <div class="card">
      Saldo devedor: <span class="big" :style="{ color: situacao.devido > 0 ? '#c62828' : '#2e7d32' }">
        {{ formatarDinheiro(situacao.devido) }}
      </span>
    </div>

    <h2>Histórico</h2>
    <div v-if="historico.length === 0" class="card muted">
      Nenhuma venda registrada.
    </div>

    <div v-for="venda in historico" :key="venda.id" class="card">
      <div class="row">
        <span>{{ formatarData(venda.createdAt) }}</span>
        <span>{{ formatarDinheiro(venda.total) }}</span>
      </div>
      <div class="muted">
        {{ venda.itens.map(i => `${formatarQtd(i.quantidade)} ${i.produtoNome}`).join(', ') }}
      </div>
      <div class="row muted" style="margin-top: 6px">
        <span>Recebeu {{ formatarDinheiro(venda.pago) }}</span>
        <span v-if="venda.cancelada">—</span>
        <span v-else-if="venda.falta > 0">Falta {{ formatarDinheiro(venda.falta) }}</span>
        <span v-else>Pago</span>
      </div>
      <div style="margin-top: 6px">
        <span v-if="venda.cancelada" class="pill cancelada">cancelada</span>
        <span v-else-if="venda.falta > 0" class="pill pendente">pendente</span>
        <span v-else class="pill pago">pago</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getCustomer } from '@/domain/customers.js'
import { listAllSales } from '@/domain/sales.js'
import { totalPagoDaVenda } from '@/domain/payments.js'
import { situacaoCliente } from '@/services/payment-service.js'
import { formatarDinheiro, formatarQtd } from '@/utils.js'

const route = useRoute()
const router = useRouter()

const carregando = ref(true)
const cliente = ref(null)
const situacao = ref({ devido: 0 })
const historico = ref([])

onMounted(async () => {
  const [dadosCliente, dadosSituacao] = await Promise.all([
    getCustomer(route.params.id),
    situacaoCliente(route.params.id)
  ])

  if (!dadosCliente) return router.replace({ name: 'clientes' })
  
  cliente.value = dadosCliente
  situacao.value = dadosSituacao

  // Busca TODAS as vendas (incluindo canceladas) para o histórico
  const todasVendas = await listAllSales()
  const vendasDoCliente = todasVendas.filter(v => v.clienteId === cliente.value.id)

  // Calcula os valores pagos e a falta de cada venda
  const historicoProcessado = []
  for (const v of vendasDoCliente) {
    const pago = await totalPagoDaVenda(v.id)
    historicoProcessado.push({
      ...v,
      pago,
      falta: v.cancelada ? 0 : v.total - pago
    })
  }

  // Ordena da mais recente para a mais antiga
  historico.value = historicoProcessado.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  carregando.value = false
})

const formatarData = (iso) => new Date(iso).toLocaleDateString('pt-BR')
</script>