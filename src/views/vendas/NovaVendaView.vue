<template>
  <!-- Se não houver clientes ou produtos, mostra aviso -->
  <div v-if="!carregando && (!clientes.length || !produtos.length)">
    <div class="card">
      {{ !clientes.length ? 'Cadastre um cliente antes de vender.' : 'Cadastre um produto antes de vender.' }}
    </div>
    <button class="btn" @click="irParaCadastro">
      {{ !clientes.length ? 'Cadastrar Cliente' : 'Cadastrar Produto' }}
    </button>
  </div>

  <div v-else-if="!carregando">
    <!-- Seleção de Cliente -->
    <div class="field">
      <label>Cliente</label>
      <select v-model="clienteSelecionadoId">
        <option v-for="c in clientes" :key="c.id" :value="c.id">{{ c.nome }}</option>
      </select>
    </div>

    <!-- Adicionar Produtos -->
    <div class="card">
      <div class="field">
        <label class="muted">Produto</label>
        <select v-model="produtoSelecionadoId">
          <option v-for="p in produtos" :key="p.id" :value="p.id">
            {{ p.nome }} ({{ formatarDinheiro(p.preco) }}/{{ p.unidade }})
          </option>
        </select>
      </div>

      <div class="grid2">
        <div class="field" style="margin: 0;">
          <label class="muted">Qtd</label>
          <input v-model="quantidadeInput" inputmode="decimal" placeholder="1">
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
      <h3 style="margin-top: 24px;">Carrinho</h3>
      
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

    <!-- Total e Observação -->
    <div class="tot" style="margin-top: 24px;">
      <span>TOTAL</span>
      <span style="color: var(--primary);">{{ formatarDinheiro(totalCarrinho) }}</span>
    </div>

    <div class="field">
      <label>Observação (opcional)</label>
      <textarea v-model="observacao" placeholder="Ex: Entregar à tarde"></textarea>
    </div>

    <button class="btn" @click="finalizarVenda" :disabled="carrinho.length === 0">
      Finalizar Venda
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { listCustomers } from '@/domain/customers.js'
import { listProducts } from '@/domain/products.js'
import { calcSubtotalCentavos, parseDecimal } from '@/db/database.js'
import { formatarDinheiro, formatarQtd } from '@/utils.js'

const router = useRouter()
const route = useRoute()

const carregando = ref(true)
const clientes = ref([])
const produtos = ref([])

// Estados do formulário
const clienteSelecionadoId = ref('')
const produtoSelecionadoId = ref('')
const quantidadeInput = ref('1')
const observacao = ref('')

// O array mágico do carrinho
const carrinho = ref([])

// O total se atualiza sozinho se o carrinho mudar
const totalCarrinho = computed(() => {
  return carrinho.value.reduce((soma, item) => soma + item.subtotal, 0)
})

onMounted(async () => {
  clientes.value = await listCustomers()
  produtos.value = await listProducts()
  
  if (route.query.clienteId) {
    clienteSelecionadoId.value = route.query.clienteId
  } else if (clientes.value.length > 0) {
    clienteSelecionadoId.value = clientes.value[0].id
  }

  if (produtos.value.length > 0) {
    produtoSelecionadoId.value = produtos.value[0].id
  }
  
  carregando.value = false
})

const adicionarItem = () => {
  const produto = produtos.value.find(p => p.id === produtoSelecionadoId.value)
  const qtd = parseDecimal(quantidadeInput.value)

  if (!produto || qtd <= 0) {
    alert('Quantidade inválida.')
    return
  }

  // LÓGICA NOVA: Verifica se o produto já está no carrinho
  const itemExistente = carrinho.value.find(i => i.produtoId === produto.id)

  if (itemExistente) {
    // Se já existe, apenas soma a quantidade
    itemExistente.quantidade += qtd
    itemExistente.subtotal = calcSubtotalCentavos(itemExistente.quantidade, itemExistente.precoUnitario)
  } else {
    // Se não existe, adiciona um novo item
    carrinho.value.push({
      produtoId: produto.id,
      produtoNome: produto.nome,
      unidade: produto.unidade,
      quantidade: qtd,
      precoUnitario: produto.preco,
      subtotal: calcSubtotalCentavos(qtd, produto.preco)
    })
  }

  // Limpa o campo de quantidade
  quantidadeInput.value = '1'
}

const aumentarItem = (index) => {
  const item = carrinho.value[index]
  // Incrementa 1 (ou 0.5 se for kg, para facilitar)
  const incremento = item.unidade === 'kg' ? 0.5 : 1
  item.quantidade += incremento
  item.subtotal = calcSubtotalCentavos(item.quantidade, item.precoUnitario)
}

const diminuirItem = (index) => {
  const item = carrinho.value[index]
  const decremento = item.unidade === 'kg' ? 0.5 : 1
  
  if (item.quantidade - decremento <= 0) {
    // Se for chegar a zero, remove o item
    removerItem(index)
  } else {
    item.quantidade -= decremento
    item.subtotal = calcSubtotalCentavos(item.quantidade, item.precoUnitario)
  }
}

const removerItem = (index) => {
  carrinho.value.splice(index, 1)
}

const finalizarVenda = () => {
  if (carrinho.value.length === 0) {
    alert('Adicione ao menos um item.')
    return
  }
  
  sessionStorage.setItem('venda_temporaria', JSON.stringify({
    clienteId: clienteSelecionadoId.value,
    itens: carrinho.value,
    obs: observacao.value,
    rotaId: route.query.rotaId
  }))
  
  router.push({ name: 'venda-pagamento' })
}

const irParaCadastro = () => {
  if (!clientes.value.length) router.push({ name: 'cliente-form' })
  else router.push({ name: 'produto-form' })
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