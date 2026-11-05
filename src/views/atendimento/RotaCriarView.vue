<template>
  <h2>Criar Rota</h2>
  <div v-if="carregando" class="muted">Carregando clientes...</div>
  
  <div v-else>
    <div v-for="c in clientes" :key="c.id" class="checkline">
      <input type="checkbox" :id="c.id" v-model="selecionados" :value="c.id">
      <label :for="c.id" style="margin:0; flex:1;">{{ c.nome }}</label>
    </div>

    <div v-if="clientes.length === 0" class="card muted">
      Cadastre clientes antes de criar uma rota.
    </div>

    <button class="btn" @click="criar" :disabled="selecionados.length === 0 || salvando" style="margin-top: 20px">
      {{ salvando ? 'Criando...' : 'Criar Rota' }}
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { listCustomers } from '@/domain/customers.js'
import { criarRotaDeHoje } from '@/services/route-service.js'

const router = useRouter()
const carregando = ref(true)
const salvando = ref(false)
const clientes = ref([])
const selecionados = ref([]) // Array com os IDs marcados

onMounted(async () => {
  clientes.value = await listCustomers()
  carregando.value = false
})

const criar = async () => {
  salvando.value = true
  try {
    await criarRotaDeHoje(selecionados.value)
    router.replace({ name: 'rota' })
  } catch (e) {
    alert('Erro ao criar rota: ' + e.message)
  } finally {
    salvando.value = false
  }
}
</script>