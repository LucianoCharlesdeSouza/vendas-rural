<template>
  <form @submit.prevent="salvar">
    <div class="field">
      <label>Nome</label>
      <input v-model="form.nome" required placeholder="Ex: Queijo duro">
    </div>
    
    <div class="field">
      <label>Unidade</label>
      <select v-model="form.unidade">
        <option v-for="u in unidades" :key="u" :value="u">{{ u }}</option>
      </select>
    </div>
    
    <div class="field">
      <label>Preço (R$)</label>
      <!-- Usamos type="text" e inputmode="decimal" para permitir vírgula no celular -->
      <input v-model="precoFormatado" inputmode="decimal" required placeholder="0,00">
    </div>
    
    <button class="btn" type="submit" :disabled="salvando">
      {{ salvando ? 'Salvando...' : 'Salvar' }}
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
const unidades = UNIDADES

// O formulário guarda o preço em centavos (igual ao banco)
const form = ref({
  id: null,
  nome: '',
  unidade: 'un',
  preco: 0,
  ativo: true
})

// Variável computada só para o input do preço (mostra 42,50 e não 4250)
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
})

const salvar = async () => {
  salvando.value = true
  try {
    // Converte o 42,50 digitado de volta para 4250 centavos
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