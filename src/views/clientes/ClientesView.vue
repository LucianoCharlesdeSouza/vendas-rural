<template>
  <button class="btn" @click="irParaNovo">+ Novo Cliente</button>
  
  <ul class="list" v-if="clientes.length > 0">
    <!-- O v-for repete a <li> para cada cliente -->
    <li v-for="cliente in clientes" :key="cliente.id" @click="abrirCliente(cliente.id)">
      <strong>{{ cliente.nome }}</strong>
      <div class="muted">{{ cliente.telefone }}</div>
    </li>
  </ul>
  
  <div v-else class="muted" style="margin-top: 20px;">
    Nenhum cliente cadastrado.
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
// Importando a função real do seu banco de dados
import { listCustomers } from '@/domain/customers.js'

const router = useRouter()
const clientes = ref([]) // Estado reativo que guarda a lista

// Busca os dados no IndexedDB
const carregarClientes = async () => {
  clientes.value = await listCustomers()
}

// Roda automaticamente quando a tela é montada
onMounted(() => {
  carregarClientes()
})

// Navegação
const irParaNovo = () => router.push({ name: 'cliente-form' })
const abrirCliente = (id) => router.push({ name: 'cliente-detalhe', params: { id } })
</script>