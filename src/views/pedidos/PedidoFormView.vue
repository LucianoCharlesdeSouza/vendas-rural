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

    <div class="card">
      <div class="grid2">
        <div>
          <label class="muted">Produto</label>
          <select v-model="produtoId">
            <option v-for="p in produtos" :key="p.id" :value="p.id">
              {{ p.nome }} ({{ formatarDinheiro(p.preco) }}/{{ p.unidade }})
            </option>
          </select>
        </div>
        <div>
          <label class="muted">Qtd</label>
          <input v-model="qtdInput" inputmode="decimal">
        </div>
      </div>
      <button class="btn small" @click="adicionarItem">Adicionar</button>
    </div>

    <div v-for="(item, index) in carrinho" :key="index" class="item-row">
      <span>{{ formatarQtd(item.quantidade) }} {{ item.produtoNome }}</span>
      <span>
        {{ formatarDinheiro(item.subtotal) }}
        <button class="btn small danger" @click="removerItem(index)">x</button>
      </span>
    </div>

    <div class="tot">
      <span>TOTAL</span>
      <span>{{ formatarDinheiro(totalCarrinho) }}</span>
    </div>

    <button class="btn" @click="salvarPedido" :disabled="salvando">
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

  carrinho.value.push({
    produtoId: p.id,
    produtoNome: p.nome,
    quantidade: q,
    precoUnitario: p.preco,
    subtotal: calcSubtotalCentavos(q, p.preco)
  })
  qtdInput.value = '1'
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