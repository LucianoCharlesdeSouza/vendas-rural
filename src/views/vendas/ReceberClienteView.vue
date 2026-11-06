<template>
  <div v-if="carregando" class="muted">Carregando...</div>
  
  <div v-else-if="cliente">
    <h2>{{ cliente.nome }}</h2>
    
    <!-- Cartão de Dívida -->
    <div class="card" style="text-align: center; padding: 24px 16px;">
      <div class="muted" style="margin-bottom: 8px;">Saldo Devedor</div>
      <div class="big" style="color: var(--danger); font-size: 32px;">
        {{ formatarDinheiro(situacao.devido) }}
      </div>
    </div>

    <form @submit.prevent="registrar">
      <!-- Atalhos de Valor -->
      <div class="grid2" style="margin-top: 16px;">
        <button type="button" class="btn sec" @click="preencherValor(situacao.devido)">
          Pagar Tudo
        </button>
        <button type="button" class="btn sec" @click="preencherValor(Math.floor(situacao.devido / 2))">
          Pagar Metade
        </button>
      </div>

      <!-- Input de Valor -->
      <div class="field" style="margin-top: 16px;">
        <label>Valor recebido (R$)</label>
        <input 
          v-model="valorInput" 
          inputmode="decimal" 
          required 
          style="font-size: 24px; font-weight: bold; padding: 16px;"
        >
      </div>

      <!-- Radio Buttons Grandes para Forma de Pagamento -->
      <div class="field">
        <label>Forma de Pagamento</label>
        <div class="payment-grid">
          <label class="payment-option" :class="{ active: formaPagamento === 'dinheiro' }">
            <input type="radio" value="dinheiro" v-model="formaPagamento" class="hidden-radio">
            <span class="icon">💵</span>
            <span>Dinheiro</span>
          </label>

          <label class="payment-option" :class="{ active: formaPagamento === 'pix' }">
            <input type="radio" value="pix" v-model="formaPagamento" class="hidden-radio">
            <span class="icon">⚡</span>
            <span>PIX</span>
          </label>

          <label class="payment-option" :class="{ active: formaPagamento === 'cartao' }">
            <input type="radio" value="cartao" v-model="formaPagamento" class="hidden-radio">
            <span class="icon">💳</span>
            <span>Cartão</span>
          </label>

          <label class="payment-option" :class="{ active: formaPagamento === 'outro' }">
            <input type="radio" value="outro" v-model="formaPagamento" class="hidden-radio">
            <span class="icon">🔄</span>
            <span>Outro</span>
          </label>
        </div>
      </div>

      <button class="btn" type="submit" :disabled="salvando" style="margin-top: 24px;">
        {{ salvando ? 'Registrando...' : 'Confirmar Recebimento' }}
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
  
  // Preenche com o valor total devido inicialmente
  valorInput.value = (situacao.value.devido / 100).toFixed(2).replace('.', ',')
  carregando.value = false
})

// Função para os botões de atalho
const preencherValor = (centavos) => {
  valorInput.value = (centavos / 100).toFixed(2).replace('.', ',')
}

const registrar = async () => {
  const valor = parseMoneyCentavos(valorInput.value)
  if (valor <= 0) return alert('Informe um valor maior que zero.')

  salvando.value = true
  try {
    await receberPagamento(cliente.value.id, valor, formaPagamento.value, '')
    alert('Pagamento registrado com sucesso!')
    router.replace({ name: 'home' })
  } catch (e) {
    alert(e.message)
  } finally {
    salvando.value = false
  }
}
</script>

<style scoped>
/* Esconde o radio button nativo, mas mantém ele acessível para o formulário */
.hidden-radio {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

/* Cria o grid de 2x2 para os botões de pagamento */
.payment-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

/* O visual do botão de pagamento */
.payment-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  background: var(--bg-card);
  border: 2px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 600;
  color: var(--text-muted);
}

/* O visual do botão quando está selecionado (classe active do Vue) */
.payment-option.active {
  border-color: var(--primary);
  background: #ecfdf5; /* Fundo verde bem claro */
  color: var(--primary-dark);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
}

.payment-option .icon {
  font-size: 28px;
}
</style>