<template>
  <div v-if="carregando" class="muted">Carregando produção...</div>

  <div v-else>
    <h2>Produção de Hoje</h2>
    <div v-if="produtos.length > 0" class="card">
      <div v-for="p in produtos" :key="p.id" class="field">
        <label>{{ p.nome }} ({{ p.unidade }})</label>
        <input v-model="quantidadesHoje[p.id]" inputmode="decimal" placeholder="0">
      </div>
      <button class="btn" @click="salvarProducao" :disabled="salvando">
        {{ salvando ? 'Salvando...' : 'Salvar' }}
      </button>
    </div>
    <div v-else class="card muted">
      Cadastre produtos primeiro.
    </div>

    <h2>Histórico</h2>
    <div v-if="historico.length === 0" class="card muted">
      Nenhum registro.
    </div>
    <div v-for="reg in historico" :key="reg.id" class="card">
      <div class="row">
        <strong>{{ formatarData(reg.data) }}</strong>
      </div>
      <div class="muted">
        {{ reg.itens.map(i => `${formatarQtd(i.quantidade)} ${i.unidade} ${i.produtoNome}`).join(', ') }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { listProducts } from '@/domain/products.js'
import { getProductionByDate, saveProduction, listProduction } from '@/domain/production.js'
import { parseDecimal } from '@/db/database.js'
import { formatarQtd } from '@/utils.js'

const router = useRouter()
const carregando = ref(true)
const salvando = ref(false)

const produtos = ref([])
const historico = ref([])
const quantidadesHoje = ref({}) // Objeto reativo: { [produtoId]: quantidade }

onMounted(async () => {
  produtos.value = await listProducts()
  await carregarHistorico()
  
  // Carrega o que já foi salvo hoje
  const hoje = new Date().toISOString().slice(0, 10)
  const registroHoje = await getProductionByDate(hoje)
  
  if (registroHoje) {
    // Popula o objeto de quantidades
    registroHoje.itens.forEach(item => {
      quantidadesHoje.value[item.produtoId] = item.quantidade
    })
  }
  
  carregando.value = false
})

const carregarHistorico = async () => {
  historico.value = await listProduction()
}

const salvarProducao = async () => {
  salvando.value = true
  try {
    const itens = []
    
    // Transforma o objeto { id: quantidade } em uma lista de itens
    for (const p of produtos.value) {
      const qtd = parseDecimal(quantidadesHoje.value[p.id] || 0)
      if (qtd > 0) {
        itens.push({
          produtoId: p.id,
          produtoNome: p.nome,
          unidade: p.unidade,
          quantidade: qtd
        })
      }
    }

    const hoje = new Date().toISOString().slice(0, 10)
    await saveProduction({ data: hoje, itens })
    
    // Atualiza o histórico na hora
    await carregarHistorico()
    alert('Produção salva!')
  } catch (e) {
    alert(e.message)
  } finally {
    salvando.value = false
  }
}

const formatarData = (dataIso) => {
  // Adiciona T12:00:00 para evitar problema de fuso horário
  return new Date(dataIso + 'T12:00:00').toLocaleDateString('pt-BR')
}
</script>