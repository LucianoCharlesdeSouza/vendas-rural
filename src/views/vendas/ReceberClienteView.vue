<template>
  <div v-if="carregando" class="muted">Carregando...</div>
  
  <div v-else-if="cliente">
    <h2>{{ cliente.nome }}</h2>
    <div class="card">
      Deve: <span class="big" style="color: #c62828">{{ formatarDinheiro(situacao.devido) }}</span>
    </div>

    <form @submit.prevent="registrar">
      <div class="field">
        <label>Valor (R$)</label>
        <input v-model="valorInput" inputmode="decimal" required>
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

      <button class="btn" type="submit" :disabled="salvando">
        {{ salvando ? 'Registrando...' : 'Registrar' }}
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getCustomer } from '@/domain/customers.js'
import { situacaoCliente, receberPagamento } from '@/services/payment-service.js'
import { parseMoneyCentavos } from '@/db/database.js'
import { formatarDinheiro } from '@/utils.js'

const router = useRouter()
const route = useRoute()

const carregando = ref(true)
const salvando = ref(false)
const cliente = ref(null)
const situacao = ref({ devido: 0 })
const valorInput = ref('')
const formaPagamento = ref('dinheiro')

onMounted(async () => {
  cliente.value = await getCustomer(route.params.id)
  situacao.value = await situacaoCliente(route.params.id)
  
  // Preenche com o valor total devido
  valorInput.value = (situacao.value.devido / 100).toFixed(2).replace('.', ',')
  carregando.value = false
})

const registrar = async () => {
  const valor = parseMoneyCentavos(valorInput.value)
  if (valor <= 0) return alert('Informe um valor maior que zero.')

  salvando.value = true
  try {
    await receberPagamento(cliente.value.id, valor, formaPagamento.value, '')
    alert('Pagamento registrado.')
    router.replace({ name: 'home' })
  } catch (e) {
    alert(e.message)
  } finally {
    salvando.value = false
  }
}
</script>