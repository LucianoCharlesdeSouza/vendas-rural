<template>
  <div class="header-actions">
    <button class="btn" @click="irParaNovo">+ Novo Produto</button>
  </div>

  <!-- Barra de Busca -->
  <div class="search-box" v-if="produtos.length > 0">
    <span class="search-icon">🔍</span>
    <input 
      v-model="busca" 
      type="text" 
      placeholder="Buscar produto..." 
      class="search-input"
    >
  </div>

  <div v-if="carregando" class="muted" style="text-align: center; margin-top: 20px;">
    Carregando produtos...
  </div>

  <div v-else-if="produtosFiltrados.length === 0" class="card empty-state">
    <div style="font-size: 40px; margin-bottom: 12px;">🧀</div>
    <h3 style="margin: 0;">{{ busca ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado' }}</h3>
    <div class="muted" style="margin-top: 8px;">
      {{ busca ? 'Tente buscar por outro nome.' : 'Clique em "+ Novo Produto" para começar.' }}
    </div>
  </div>

  <ul class="list" v-else>
    <li v-for="produto in produtosFiltrados" :key="produto.id" @click="abrirProduto(produto.id)">
      <div class="product-row">
        <!-- Ícone por Unidade -->
        <div class="product-icon">
          {{ getIcone(produto.unidade) }}
        </div>
        
        <!-- Info -->
        <div class="product-info">
          <strong>{{ produto.nome }}</strong>
          <div class="muted" style="margin-top: 2px;">
            Vendido por <strong>{{ produto.unidade }}</strong>
          </div>
        </div>

        <!-- Preço -->
        <div class="product-price">
          <span class="price-value">{{ formatarDinheiro(produto.preco) }}</span>
          <span class="muted" style="font-size: 13px;">/ {{ produto.unidade }}</span>
        </div>
      </div>
    </li>
  </ul>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { listProducts } from '@/domain/products.js'
import { formatarDinheiro } from '@/utils.js'

const router = useRouter()
const carregando = ref(true)
const produtos = ref([])
const busca = ref('')

onMounted(async () => {
  produtos.value = await listProducts()
  carregando.value = false
})

// Filtro de busca reativo
const produtosFiltrados = computed(() => {
  if (!busca.value.trim()) return produtos.value
  const termo = busca.value.toLowerCase().trim()
  return produtos.value.filter(p => 
    p.nome.toLowerCase().includes(termo)
  )
})

// Retorna um emoji baseado na unidade
const getIcone = (unidade) => {
  const icones = {
    'kg': '⚖️',
    'un': '📦',
    'pote': '🫙',
    'litro': '🧴'
  }
  return icones[unidade] || '🧀'
}

const irParaNovo = () => router.push({ name: 'produto-form' })
const abrirProduto = (id) => router.push({ name: 'produto-form', params: { id } })
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

/* Linha do Produto */
.product-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

/* Ícone da Unidade */
.product-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.product-info {
  flex: 1;
  min-width: 0;
}

.product-info strong {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
  font-size: 16px;
}

/* Preço */
.product-price {
  text-align: right;
  flex-shrink: 0;
}

.price-value {
  display: block;
  font-weight: 700;
  font-size: 17px;
  color: var(--primary-dark);
}

/* Estado vazio */
.empty-state {
  text-align: center;
  padding: 40px 20px;
}
</style>