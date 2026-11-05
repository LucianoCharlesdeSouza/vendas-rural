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
      <div class="grid2">
        <div>
          <label class="muted">Produto</label>
          <select v-model="produtoSelecionadoId">
            <option v-for="p in produtos" :key="p.id" :value="p.id">
              {{ p.nome }} ({{ formatarDinheiro(p.preco) }}/{{ p.unidade }})
            </option>
          </select>
        </div>
        <div>
          <label class="muted">Quantidade</label>
          <input v-model="quantidadeInput" inputmode="decimal" placeholder="1">
        </div>
      </div>
      <button class="btn small" @click="adicionarItem">Adicionar</button>
    </div>

    <!-- Lista do Carrinho -->
    <div id="itens">
      <div v-for="(item, index) in carrinho" :key="index" class="item-row">
        <span>{{ formatarQtd(item.quantidade) }} {{ item.produtoNome }}</span>
        <span>
          {{ formatarDinheiro(item.subtotal) }}
          <button class="btn small danger" @click="removerItem(index)">x</button>
        </span>
      </div>
    </div>

    <!-- Total e Observação -->
    <div class="tot">
      <span>TOTAL</span>
      <span>{{ formatarDinheiro(totalCarrinho) }}</span>
    </div>

    <div class="field">
      <label>Observação</label>
      <textarea v-model="observacao"></textarea>
    </div>

    <button class="btn" @click="finalizarVenda">Finalizar Venda</button>
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
  
  // Pega o clienteId se vier da tela de detalhes do cliente
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

  carrinho.value.push({
    produtoId: produto.id,
    produtoNome: produto.nome,
    quantidade: qtd,
    precoUnitario: produto.preco,
    subtotal: calcSubtotalCentavos(qtd, produto.preco)
  })

  // Limpa o campo de quantidade
  quantidadeInput.value = '1'
}

const removerItem = (index) => {
  carrinho.value.splice(index, 1)
}

const finalizarVenda = () => {
  if (carrinho.value.length === 0) {
    alert('Adicione ao menos um item.')
    return
  }
  
  // Salva temporariamente os dados da venda no navegador
  sessionStorage.setItem('venda_temporaria', JSON.stringify({
    clienteId: clienteSelecionadoId.value,
    itens: carrinho.value,
    obs: observacao.value,
    rotaId: route.query.rotaId // <-- Guarda o ID da rota se existir
  }))
  
  router.push({ name: 'venda-pagamento' })
}

const irParaCadastro = () => {
  if (!clientes.value.length) router.push({ name: 'cliente-form' })
  else router.push({ name: 'produto-form' })
}
</script>