<template>
  <h2>A Receber</h2>
  
  <div v-if="carregando" class="muted">Calculando dívidas...</div>

  <div v-else>
    <div v-for="dev in devedores" :key="dev.cliente.id" class="card" @click="irParaReceber(dev.cliente.id)">
      <div class="row">
        <span>{{ dev.cliente.nome }}</span>
        <span>{{ formatarDinheiro(dev.devido) }}</span>
      </div>
    </div>

    <div v-if="devedores.length === 0" class="card muted">
      Nenhum cliente devendo no momento.
    </div>

    <div v-else class="tot">
      <span>TOTAL</span>
      <span>{{ formatarDinheiro(totalGeral) }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { listCustomers } from '@/domain/customers.js'
import { situacaoCliente } from '@/services/payment-service.js'
import { formatarDinheiro } from '@/utils.js'

const router = useRouter()
const carregando = ref(true)
const devedores = ref([])

onMounted(async () => {
  const clientes = await listCustomers()
  const lista = []
  
  for (const c of clientes) {
    const s = await situacaoCliente(c.id)
    if (s.devido > 0) {
      lista.push({ cliente: c, devido: s.devido })
    }
  }
  
  // Ordena do maior devedor para o menor
  devedores.value = lista.sort((a, b) => b.devido - a.devido)
  carregando.value = false
})

const totalGeral = computed(() => devedores.value.reduce((soma, d) => soma + d.devido, 0))
const irParaReceber = (id) => router.push({ name: 'receber-cliente', params: { id } })
</script>