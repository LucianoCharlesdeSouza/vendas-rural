<template>
  <div v-if="!dados">
    <div class="card">Sessão de venda expirada.</div>
    <button class="btn" @click="voltarParaVenda">Voltar para Venda</button>
  </div>

  <div v-else>
    <h2>Pagamento</h2>
    <div class="tot">
      <span>Total</span>
      <span>{{ formatarDinheiro(total) }}</span>
    </div>

    <div class="field">
      <label>Quanto recebeu agora?</label>
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

    <button class="btn" @click="confirmar" :disabled="salvando">
      {{ salvando ? 'Processando...' : 'Confirmar' }}
    </button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { finalizarVenda } from '@/services/sale-service.js'
import { parseMoneyCentavos } from '@/db/database.js'
import { formatarDinheiro } from '@/utils.js'
import { useRoute } from 'vue-router' // adicione no topo
import { marcarParadaConcluida } from '@/services/route-service.js' // adicione no topo

const route = useRoute() // adicione no setup
const router = useRouter()

const dados = ref(null)
const valorRecebidoInput = ref('')
const formaPagamento = ref('dinheiro')
const salvando = ref(false)

const total = computed(() => {
  if (!dados.value) return 0
  return dados.value.itens.reduce((soma, item) => soma + item.subtotal, 0)
})

onMounted(() => {
  // Tenta recuperar os dados salvos na tela anterior
  const json = sessionStorage.getItem('venda_temporaria')
  
  if (json) {
    try {
      dados.value = JSON.parse(json)
      // Preenche o input com o valor total por padrão
      valorRecebidoInput.value = (total.value / 100).toFixed(2).replace('.', ',')
    } catch (e) {
      console.error("Erro ao ler dados da venda", e)
    }
  }
})

const confirmar = async () => {
  if (!dados.value) return

  const valorCentavos = parseMoneyCentavos(valorRecebidoInput.value)
  
  if (valorCentavos > total.value) {
    alert('Pagamento maior que o total.')
    return
  }

  salvando.value = true
  try {
    const resultado = await finalizarVenda({
      clienteId: dados.value.clienteId,
      itens: dados.value.itens,
      valorRecebido: valorCentavos,
      formaPagamento: formaPagamento.value,
      observacao: dados.value.obs
    })
    
    // Limpa os dados temporários da memória
    sessionStorage.removeItem('venda_temporaria')

    alert(`Venda registrada.\nTotal: ${formatarDinheiro(resultado.saldo.total)}\nRecebido: ${formatarDinheiro(resultado.pago)}\nFalta: ${formatarDinheiro(resultado.saldo.restante)}`)

    // AQUI ESTÁ A MÁGICA:
    if (dados.value.rotaId) {
      await marcarParadaConcluida(dados.value.rotaId, dados.value.clienteId)
      router.replace({ name: 'rota' })
    } else {
      router.replace({ name: 'home' })
    }    
    // const rotaId = route.query.rotaId
    // if (rotaId) {
    //   await marcarParadaConcluida(rotaId, dados.value.clienteId)
    //   // Redireciona de volta para a rota em vez da home
    //   router.replace({ name: 'rota' })
    // } else {
    //   router.replace({ name: 'home' })
    // }
  } catch (err) {
    alert(err.message)
  } finally {
    salvando.value = false
  }
}

const voltarParaVenda = () => {
  router.replace({ name: 'venda-nova' })
}
</script>