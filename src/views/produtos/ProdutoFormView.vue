<template>
  <div v-if="carregando" class="muted">Carregando...</div>

  <form v-else @submit.prevent="salvar">
    <!-- Nome -->
    <div class="field">
      <label>Nome do Produto</label>
      <input 
        v-model="form.nome" 
        required 
        placeholder="Ex: Queijo Duro" 
        style="font-size: 18px; padding: 16px;"
      >
    </div>
    
    <!-- Unidade (Radio Buttons grandes) -->
    <div class="field">
      <label>Como é vendido?</label>
      <div class="unit-grid">
        <label 
          v-for="u in unidades" 
          :key="u" 
          class="unit-option" 
          :class="{ active: form.unidade === u }"
        >
          <input type="radio" :value="u" v-model="form.unidade" class="hidden-radio">
          <span class="icon">{{ getIcone(u) }}</span>
          <span style="text-transform: capitalize;">{{ u }}</span>
        </label>
      </div>
    </div>
    
    <!-- Preço -->
    <div class="field" style="margin-top: 24px;">
      <label>Preço por {{ form.unidade }}</label>
      <div class="price-input-wrapper">
        <span class="currency-prefix">R$</span>
        <input 
          v-model="precoFormatado" 
          inputmode="decimal" 
          required 
          placeholder="0,00"
          class="price-input"
        >
      </div>
    </div>
    
    <button class="btn" type="submit" :disabled="salvando" style="margin-top: 32px;">
      {{ salvando ? 'Salvando...' : 'Salvar Produto' }}
    </button>
  </form>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getProduct, saveProduct, UNIDADES } from '@/domain/products.js'

const router = useRouter()
const route = useRoute()
const salvando = ref(false)
const carregando = ref(true)
const unidades = UNIDADES

// O formulário guarda o preço em centavos (igual ao banco)
const form = ref({
  id: null,
  nome: '',
  unidade: 'un',
  preco: 0,
  ativo: true
})

const precoFormatado = ref('')

onMounted(async () => {
  if (route.params.id) {
    const p = await getProduct(route.params.id)
    if (p) {
      form.value = { ...p }
      // Converte 4250 para 42,50 para exibir na tela
      precoFormatado.value = (p.preco / 100).toFixed(2).replace('.', ',')
    }
  }
  carregando.value = false
})

// Retorna um emoji baseado na unidade (igual à tela de listagem)
const getIcone = (unidade) => {
  const icones = {
    'kg': '⚖️',
    'un': '📦',
    'pote': '🫙',
    'litro': '🧴'
  }
  return icones[unidade] || '📦'
}

const salvar = async () => {
  salvando.value = true
  try {
    const precoLimpo = String(precoFormatado.value).replace(',', '.')
    form.value.preco = Math.round(parseFloat(precoLimpo) * 100) || 0
    
    await saveProduct(form.value)
    router.replace({ name: 'produtos' })
  } catch (err) {
    alert(err.message)
  } finally {
    salvando.value = false
  }
}
</script>

<style scoped>
/* Esconde o radio button nativo */
.hidden-radio {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

/* Grid para os botões de unidade */
.unit-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

/* Visual do botão de unidade */
.unit-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 4px;
  background: var(--bg-card);
  border: 2px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
}

.unit-option.active {
  border-color: var(--primary);
  background: #ecfdf5;
  color: var(--primary-dark);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
}

.unit-option .icon {
  font-size: 22px;
}

/* Preço com Prefixo R$ */
.price-input-wrapper {
  display: flex;
  align-items: center;
  background: var(--bg-card);
  border: 2px solid var(--border);
  border-radius: var(--radius);
  padding-left: 16px;
  transition: border-color 0.2s;
}

.price-input-wrapper:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

.currency-prefix {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-muted);
  padding-right: 8px;
}

.price-input {
  flex: 1;
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  font-size: 24px;
  font-weight: 700;
  color: var(--primary-dark);
  padding: 16px 16px 16px 0;
}

/* Remove as setinhas do input number no Chrome/Safari */
.price-input::-webkit-outer-spin-button,
.price-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>