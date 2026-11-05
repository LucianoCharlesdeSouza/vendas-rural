<template>
  <form @submit.prevent="salvar">
    <div class="field">
      <label>Nome *</label>
      <input v-model="form.nome" required placeholder="Nome do cliente">
    </div>
    
    <div class="field">
      <label>Telefone</label>
      <input v-model="form.telefone" placeholder="(47) 99999-9999">
    </div>
    
    <div class="field">
      <label>Endereço</label>
      <input v-model="form.endereco" placeholder="Rua, número...">
    </div>
    
    <div class="field">
      <label>Observação</label>
      <textarea v-model="form.observacao"></textarea>
    </div>
    
    <button class="btn" type="submit" :disabled="salvando">
      {{ salvando ? 'Salvando...' : 'Salvar' }}
    </button>
  </form>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getCustomer, saveCustomer } from '@/domain/customers.js'

const router = useRouter()
const route = useRoute()
const salvando = ref(false)

// Objeto reativo do formulário
const form = ref({
  id: null,
  nome: '',
  telefone: '',
  endereco: '',
  observacao: ''
})

// Se vier um ID na URL, é edição. Carrega os dados.
onMounted(async () => {
  if (route.params.id) {
    const c = await getCustomer(route.params.id)
    if (c) form.value = { ...c }
  }
})

const salvar = async () => {
  salvando.value = true
  try {
    await saveCustomer(form.value)
    // replace: true evita que o usuário volte para o formulário após salvar
    router.replace({ name: 'clientes' }) 
  } catch (err) {
    alert(err.message)
  } finally {
    salvando.value = false
  }
}
</script>