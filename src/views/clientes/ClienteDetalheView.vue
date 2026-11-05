<template>
  <div v-if="carregando" class="muted">Carregando dados...</div>
  
  <div v-else-if="cliente">
    <!-- Cartão de Informações -->
    <div class="card">
      <h2 style="margin: 0">{{ cliente.nome }}</h2>
      <div class="muted">{{ cliente.telefone || 'Sem telefone' }}</div>
      <div class="muted">{{ cliente.endereco || 'Sem endereço' }}</div>
      
      <!-- Botão do WhatsApp (Só aparece se tiver telefone) -->
      <a 
        v-if="cliente.telefone" 
        :href="linkWhatsApp" 
        target="_blank" 
        class="btn small" 
        style="background: #25D366; color: #fff; text-decoration: none; text-align: center; margin-top: 10px; display: block; padding: 10px;"
      >
        Abrir WhatsApp
      </a>
    </div>

    <!-- Cartão Financeiro -->
    <div class="card">
      <div class="row">
        <span>Total vendido</span>
        <span class="big">{{ formatarDinheiro(situacao.totalVendido) }}</span>
      </div>
      <div class="row">
        <span>Total recebido</span>
        <span class="big">{{ formatarDinheiro(situacao.totalRecebido) }}</span>
      </div>
      <div class="row">
        <span>Ainda deve</span>
        <span class="big" :style="{ color: situacao.devido > 0 ? '#c62828' : '#2e7d32' }">
          {{ formatarDinheiro(situacao.devido) }}
        </span>
      </div>
      
      <!-- Botão de receber (só aparece se houver dívida) -->
      <button v-if="situacao.devido > 0" class="btn" @click="irParaReceber" style="margin-top: 10px;">
        Receber Pagamento
      </button>
    </div>

    <!-- Ações -->
    <button class="btn sec" @click="irParaNovaVenda">Nova Venda</button>
    <button class="btn sec" @click="irParaHistorico">Ver Histórico</button>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
// Importações do seu banco
import { getCustomer } from '@/domain/customers.js'
import { situacaoCliente } from '@/services/payment-service.js'
import { gerarLinkWhatsApp } from '@/services/whatsapp-service'
import { formatarDinheiro } from '@/utils.js'

const router = useRouter()
const route = useRoute()

const carregando = ref(true)
const cliente = ref(null)
const situacao = ref({ totalVendido: 0, totalRecebido: 0, devido: 0 })

onMounted(async () => {
  try {
    // Busca o cliente e a situação financeira dele em paralelo (mais rápido)
    const [dadosCliente, dadosSituacao] = await Promise.all([
      getCustomer(route.params.id),
      situacaoCliente(route.params.id)
    ])
    
    if (!dadosCliente) {
      // Se não achar, volta pra lista
      router.replace({ name: 'clientes' })
      return
    }
    
    cliente.value = dadosCliente
    situacao.value = dadosSituacao
  } catch (error) {
    console.error(error)
    alert('Erro ao carregar cliente.')
  } finally {
    carregando.value = false
  }
})

// Propriedade computada: o link do WhatsApp se atualiza sozinho se o telefone mudar
const linkWhatsApp = computed(() => {
  if (!cliente.value) return null
  return gerarLinkWhatsApp(cliente.value.telefone, `Olá ${cliente.value.nome}, tudo bem?`)
})

// Navegações
const irParaReceber = () => router.push({ name: 'receber-cliente', params: { id: cliente.value.id } })
const irParaNovaVenda = () => router.push({ name: 'venda-nova', query: { clienteId: cliente.value.id } })
const irParaHistorico = () => router.push({ name: 'cliente-historico', params: { id: cliente.value.id } })
</script>