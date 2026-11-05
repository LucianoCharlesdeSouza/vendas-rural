<template>
  <div class="menu">
    <button class="btn" @click="irPara('venda-nova')">+ Nova Venda</button>
    <button class="btn sec" @click="irPara('pedidos')">Pedidos</button>
    <button class="btn sec" @click="irPara('clientes')">Clientes</button>
    <button class="btn sec" @click="irPara('produtos')">Produtos</button>
    <button class="btn sec" @click="irPara('rota')">Rota de Hoje</button>
    <button class="btn sec" @click="irPara('receber')">Recebimentos</button>
    <button class="btn sec" @click="irPara('relatorios')">Relatórios</button>
    <button class="btn sec" @click="irPara('producao')">Produção</button>
    <button class="btn sec" @click="irPara('backup')">Backup</button>
  </div>

  <h2>Hoje</h2>
  <div class="card">
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
      <span>{{ kpis.entregas }} entrega(s)</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
// Importaremos as funções do seu banco de dados antigo aqui
// import { listSales } from '@/domain/sales.js' 
// import { listPayments } from '@/domain/payments.js'

const router = useRouter()

// Estado reativo para os dados do topo
const kpis = ref({
  vendas: 0,
  recebido: 0,
  aReceber: 0,
  entregas: 0
})

// Navegação programática
const irPara = (rota) => {
  // Como as rotas ainda não existem, isso vai dar erro por enquanto, 
  // mas é assim que navegamos no Vue.
  router.push({ name: rota }) 
}

// Função para formatar centavos em R$
const formatarDinheiro = (centavos) => {
  return 'R$ ' + ((centavos || 0) / 100).toFixed(2).replace('.', ',')
}

// onMounted roda assim que a tela aparece
onMounted(async () => {
  // Aqui você vai chamar o seu banco de dados real no futuro
  // const vendas = await listSales()
  // const pagamentos = await listPayments()
  
  // Simulando dados para ver a mágica acontecer agora:
  setTimeout(() => {
    kpis.value = {
      vendas: 32050,   // R$ 320,50
      recebido: 25000, // R$ 250,00
      aReceber: 7050,  // R$ 70,50
      entregas: 3
    }
  }, 500) // Pequeno delay para você ver o 0 mudar para o valor
})
</script>