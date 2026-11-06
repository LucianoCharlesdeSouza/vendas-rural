<template>
  <div v-if="carregando" class="muted">Carregando...</div>
  <div v-else>
    <div class="field">
      <label>Cliente</label>
      <select v-model="clienteId">
        <option v-for="c in clientes" :key="c.id" :value="c.id">{{ c.nome }}</option>
      </select>
    </div>
    
    <div class="field">
      <label>Data da Entrega</label>
      <input type="date" v-model="dataEntrega">
    </div>

    <!-- Adicionar Produtos -->
    <div class="card">
      <div class="field">
        <label class="muted">Produto</label>
        <select v-model="produtoId">
          <option v-for="p in produtos" :key="p.id" :value="p.id">
            {{ p.nome }} ({{ formatarDinheiro(p.preco) }}/{{ p.unidade }})
          </option>
        </select>
      </div>

      <div class="grid2">
        <div class="field" style="margin: 0;">
          <label class="muted">Qtd</label>
          <input v-model="qtdInput" inputmode="decimal" placeholder="1">
        </div>
        <div class="field" style="margin: 0; display: flex; align-items: flex-end;">
          <button class="btn" style="margin: 0; width: 100%; padding: 14px 8px;" @click="adicionarItem">
            Adicionar
          </button>
        </div>
      </div>
    </div>

    <!-- Lista do Carrinho Inteligente -->
    <div id="itens" v-if="carrinho.length > 0">
      <h3 style="margin-top: 24px;">Itens do Pedido</h3>
      
      <div v-for="(item, index) in carrinho" :key="item.produtoId" class="card" style="padding: 12px; margin: 8px 0;">
        <div class="row" style="align-items: flex-start;">
          <!-- Info do Produto -->
          <div style="flex: 1;">
            <strong>{{ item.produtoNome }}</strong>
            <div class="muted" style="font-size: 14px; margin-top: 4px;">
              {{ formatarDinheiro(item.precoUnitario) }} / {{ item.unidade }}
            </div>
          </div>
          
          <!-- Subtotal -->
          <div class="right" style="text-align: right;">
            <strong>{{ formatarDinheiro(item.subtotal) }}</strong>
          </div>
        </div>

        <!-- Controles de Quantidade -->
        <div class="row" style="margin-top: 12px; align-items: center;">
          <div style="display: flex; align-items: center; gap: 10px; background: #f3f4f6; border-radius: 8px; padding: 4px;">
            <button class="btn-qty" @click="diminuirItem(index)">−</button>
            <span style="font-weight: bold; min-width: 30px; text-align: center;">
              {{ formatarQtd(item.quantidade) }}
            </span>
            <button class="btn-qty" @click="aumentarItem(index)">+</button>
          </div>
          
          <button class="btn small danger" style="margin: 0;" @click="removerItem(index)">
            Remover
          </button>
        </div>
      </div>
    </div>

    <!-- Total -->
    <div class="tot" style="margin-top: 24px;">
      <span>TOTAL</span>
      <span style="color: var(--primary);">{{ formatarDinheiro(totalCarrinho) }}</span>
    </div>

    <button class="btn" @click="salvarPedido" :disabled="salvando || carrinho.length === 0">
      {{ salvando ? 'Salvando...' : 'Salvar Pedido' }}
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { listCustomers } from '@/domain/customers.js'
import { listProducts } from '@/domain/products.js'
import { saveOrder } from '@/domain/orders.js'
import { calcSubtotalCentavos, parseDecimal } from '@/db/database.js'
import { formatarDinheiro, formatarQtd } from '@/utils.js'

const router = useRouter()
const carregando = ref(true)
const salvando = ref(false)

const clientes = ref([])
const produtos = ref([])
const clienteId = ref('')
const dataEntrega = ref(new Date().toISOString().slice(0, 10))
const produtoId = ref('')
const qtdInput = ref('1')
const carrinho = ref([])

const totalCarrinho = computed(() => carrinho.value.reduce((soma, item) => soma + item.subtotal, 0))

onMounted(async () => {
  clientes.value = await listCustomers()
  produtos.value = await listProducts()
  
  if (clientes.value.length) clienteId.value = clientes.value[0].id
  if (produtos.value.length) produtoId.value = produtos.value[0].id
  carregando.value = false
})

const adicionarItem = () => {
  const p = produtos.value.find(x => x.id === produtoId.value)
  const q = parseDecimal(qtdInput.value)
  if (!p || q <= 0) return alert('Quantidade inválida.')

  // LÓGICA NOVA: Verifica se o produto já está no carrinho
  const itemExistente = carrinho.value.find(i => i.produtoId === p.id)

  if (itemExistente) {
    itemExistente.quantidade += q
    itemExistente.subtotal = calcSubtotalCentavos(itemExistente.quantidade, itemExistente.precoUnitario)
  } else {
    carrinho.value.push({
      produtoId: p.id,
      produtoNome: p.nome,
      unidade: p.unidade,
      quantidade: q,
      precoUnitario: p.preco,
      subtotal: calcSubtotalCentavos(q, p.preco)
    })
  }
  
  qtdInput.value = '1'
}

const aumentarItem = (index) => {
  const item = carrinho.value[index]
  const incremento = item.unidade === 'kg' ? 0.5 : 1
  item.quantidade += incremento
  item.subtotal = calcSubtotalCentavos(item.quantidade, item.precoUnitario)
}

const diminuirItem = (index) => {
  const item = carrinho.value[index]
  const decremento = item.unidade === 'kg' ? 0.5 : 1
  
  if (item.quantidade - decremento <= 0) {
    removerItem(index)
  } else {
    item.quantidade -= decremento
    item.subtotal = calcSubtotalCentavos(item.quantidade, item.precoUnitario)
  }
}

const removerItem = (index) => carrinho.value.splice(index, 1)

const salvarPedido = async () => {
  if (carrinho.value.length === 0) return alert('Adicione pelo menos um item.')
  
  salvando.value = true
  try {
    await saveOrder({
      clienteId: clienteId.value,
      data: new Date(dataEntrega.value).toISOString(),
      itens: carrinho.value
    })
    router.replace({ name: 'pedidos' })
  } catch (e) {
    alert(e.message)
  } finally {
    salvando.value = false
  }
}
</script>

<style scoped>
/* Estilo dos botões de + e - do carrinho */
.btn-qty {
  background: white;
  border: 1px solid var(--border);
  border-radius: 6px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: bold;
  color: var(--text-main);
  cursor: pointer;
}
.btn-qty:active {
  background: #e5e7eb;
}
</style>