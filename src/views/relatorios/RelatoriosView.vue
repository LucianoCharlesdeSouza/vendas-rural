<template>
  <div v-if="carregando" class="muted">Carregando relatórios...</div>
  
  <div v-else>
    <h2>Movimento</h2>
    
    <!-- HOJE -->
    <div class="card">
      <h3>Hoje</h3>
      <div class="row"><span>Vendido</span><span>{{ formatarDinheiro(movimento.hoje.vendido) }}</span></div>
      <div class="row"><span>Recebido</span><span>{{ formatarDinheiro(movimento.hoje.recebido) }}</span></div>
      <div class="row"><span>A receber</span><span>{{ formatarDinheiro(movimento.hoje.aReceber) }}</span></div>
    </div>

    <!-- SEMANA -->
    <div class="card">
      <h3>Esta semana</h3>
      <div class="row"><span>Vendido</span><span>{{ formatarDinheiro(movimento.semana.vendido) }}</span></div>
      <div class="row"><span>Recebido</span><span>{{ formatarDinheiro(movimento.semana.recebido) }}</span></div>
      <div class="row"><span>A receber</span><span>{{ formatarDinheiro(movimento.semana.aReceber) }}</span></div>
    </div>

    <!-- MÊS -->
    <div class="card">
      <h3>Este mês</h3>
      <div class="row"><span>Vendido</span><span>{{ formatarDinheiro(movimento.mes.vendido) }}</span></div>
      <div class="row"><span>Recebido</span><span>{{ formatarDinheiro(movimento.mes.recebido) }}</span></div>
      <div class="row"><span>A receber</span><span>{{ formatarDinheiro(movimento.mes.aReceber) }}</span></div>
    </div>

    <h2>A Receber</h2>
    <div v-for="dev in devedores" :key="dev.cliente.id" class="card" @click="irParaCliente(dev.cliente.id)">
      <div class="row">
        <span>{{ dev.cliente.nome }}</span>
        <span>{{ formatarDinheiro(dev.devido) }}</span>
      </div>
    </div>
    <div v-if="devedores.length === 0" class="card muted">
      Nenhum cliente devendo.
    </div>
    <div v-else class="tot">
      <span>TOTAL</span>
      <span>{{ formatarDinheiro(totalDevedores) }}</span>
    </div>

    <button class="btn sec" @click="exportarCSV">Exportar CSV de vendas</button>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { listSales } from '@/domain/sales.js'
import { listPayments } from '@/domain/payments.js'
import { listCustomers } from '@/domain/customers.js'
import { listaDevedores } from '@/services/payment-service.js'
import { formatarDinheiro } from '@/utils.js'

const router = useRouter()
const carregando = ref(true)

// Dados brutos carregados do banco
const todasVendas = ref([])
const todosPagamentos = ref([])
const clientes = ref([])
const devedores = ref([])

onMounted(async () => {
  // Carrega tudo em paralelo
  const [vendas, pagamentos, listaClientes] = await Promise.all([
    listSales(),
    listPayments(),
    listCustomers()
  ])
  
  todasVendas.value = vendas
  todosPagamentos.value = pagamentos
  clientes.value = listaClientes
  
  devedores.value = await listaDevedores(listaClientes)
  carregando.value = false
})

// Função auxiliar para calcular os períodos
const calcularPeriodo = (dataCorte) => {
  const vendido = todasVendas.value
    .filter(v => v.createdAt >= dataCorte)
    .reduce((soma, v) => soma + v.total, 0)
    
  const recebido = todosPagamentos.value
    .filter(p => p.createdAt >= dataCorte)
    .reduce((soma, p) => soma + p.valor, 0)
    
  return { vendido, recebido, aReceber: vendido - recebido }
}

// Propriedade computada que se atualiza sozinha se os dados brutos mudarem
const movimento = computed(() => {
  const hoje = new Date().toISOString().slice(0, 10)
  const inicioSemana = new Date(Date.now() - 7 * 86400000).toISOString()
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  return {
    hoje: calcularPeriodo(hoje),
    semana: calcularPeriodo(inicioSemana),
    mes: calcularPeriodo(inicioMes)
  }
})

const totalDevedores = computed(() => devedores.value.reduce((soma, d) => soma + d.devido, 0))

const irParaCliente = (id) => router.push({ name: 'cliente-detalhe', params: { id } })

// Exportação CSV
const exportarCSV = () => {
  const linhas = [['data', 'cliente', 'total', 'recebido', 'pendente'].join(',')]
  
  for (const v of todasVendas.value) {
    const c = clientes.value.find(x => x.id === v.clienteId)
    const pago = todosPagamentos.value
      .filter(x => x.vendaId === v.id)
      .reduce((a, x) => a + x.valor, 0)
      
    linhas.push([
      v.createdAt.slice(0, 10),
      c?.nome || '',
      (v.total / 100).toFixed(2),
      (pago / 100).toFixed(2),
      ((v.total - pago) / 100).toFixed(2)
    ].join(','))
  }
  
  const blob = new Blob([linhas.join('\n')], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'vendas.csv'
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}
</script>