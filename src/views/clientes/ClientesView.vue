<template>
  <div class="header-actions">
    <button class="btn" @click="irParaNovo">+ Novo Cliente</button>
  </div>

  <!-- Barra de Busca -->
  <div class="search-box" v-if="clientes.length > 0">
    <span class="search-icon">🔍</span>
    <input 
      v-model="busca" 
      type="text" 
      placeholder="Buscar cliente pelo nome..." 
      class="search-input"
    >
  </div>

  <div v-if="carregando" class="muted" style="text-align: center; margin-top: 20px;">
    Carregando clientes...
  </div>

  <div v-else-if="clientesFiltrados.length === 0" class="card empty-state">
    <div style="font-size: 40px; margin-bottom: 12px;">👥</div>
    <h3 style="margin: 0;">{{ busca ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado' }}</h3>
    <div class="muted" style="margin-top: 8px;">
      {{ busca ? 'Tente buscar por outro nome.' : 'Clique em "+ Novo Cliente" para começar.' }}
    </div>
  </div>

  <ul class="list" v-else>
    <li v-for="cliente in clientesFiltrados" :key="cliente.id" @click="abrirCliente(cliente.id)">
      <div class="client-row">
        <!-- Avatar -->
        <div class="avatar">{{ getInicial(cliente.nome) }}</div>
        
        <!-- Info -->
        <div class="client-info">
          <div style="display: flex; align-items: center; gap: 8px;">
            <strong>{{ cliente.nome }}</strong>
            <span v-if="cliente.devido > 0" class="pill debt-pill">
              Deve {{ formatarDinheiro(cliente.devido) }}
            </span>
          </div>
          <div class="muted" style="margin-top: 2px;">
            {{ cliente.telefone || 'Sem telefone' }}
          </div>
        </div>

        <!-- Botão WhatsApp -->
        <button 
          v-if="cliente.telefone" 
          class="btn-icon wpp" 
          @click.stop="enviarWhatsApp(cliente)"
          title="Conversar no WhatsApp"
        >
          💬
        </button>
      </div>
    </li>
  </ul>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { listCustomers } from '@/domain/customers.js'
import { situacaoCliente } from '@/services/payment-service.js'
import { gerarLinkWhatsApp } from '@/services/whatsapp-service.js'
import { formatarDinheiro } from '@/utils.js'

const router = useRouter()
const carregando = ref(true)
const clientes = ref([])
const busca = ref('')

const carregarClientes = async () => {
  carregando.value = true
  const lista = await listCustomers()
  
  // Para cada cliente, busca a situação da dívida
  const clientesComDivida = []
  for (const c of lista) {
    const s = await situacaoCliente(c.id)
    clientesComDivida.push({
      ...c,
      devido: s.devido
    })
  }
  
  clientes.value = clientesComDivida
  carregando.value = false
}

onMounted(carregarClientes)

// Filtro de busca reativo
const clientesFiltrados = computed(() => {
  if (!busca.value.trim()) return clientes.value
  const termo = busca.value.toLowerCase().trim()
  return clientes.value.filter(c => 
    c.nome.toLowerCase().includes(termo) || 
    (c.telefone && c.telefone.includes(termo))
  )
})

// Auxiliares
const getInicial = (nome) => nome ? nome.charAt(0).toUpperCase() : '?'

const irParaNovo = () => router.push({ name: 'cliente-form' })
const abrirCliente = (id) => router.push({ name: 'cliente-detalhe', params: { id } })

const enviarWhatsApp = (cliente) => {
  const link = gerarLinkWhatsApp(cliente.telefone, `Olá ${cliente.nome}, tudo bem?`)
  if (link) window.open(link, '_blank')
}
</script>

<style scoped>
/* Barra de Busca */
.search-box {
  position: relative;
  margin: 12px 0 16px;
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 18px;
  color: var(--text-muted);
  pointer-events: none;
}

.search-input {
  padding-left: 44px;
  background: var(--bg-card);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}

/* Linha do Cliente */
.client-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Avatar */
.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #ecfdf5; /* Fundo verde claro */
  color: var(--primary-dark);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 20px;
  flex-shrink: 0; /* Impede de amassar */
}

.client-info {
  flex: 1;
  min-width: 0; /* Permite o truncamento de texto */
}

.client-info strong {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Etiqueta de dívida */
.debt-pill {
  background: #fee2e2;
  color: #991b1b;
  font-size: 11px;
  padding: 2px 8px;
  white-space: nowrap;
}

/* Botão de WhatsApp */
.btn-icon.wpp {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: #dcfce7;
  color: #166534;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;
  flex-shrink: 0;
}
.btn-icon.wpp:active { background: #bbf7d0; }

/* Estado vazio */
.empty-state {
  text-align: center;
  padding: 40px 20px;
}
</style>