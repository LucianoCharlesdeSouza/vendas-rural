<template>
  <button class="btn" @click="irParaNovo">+ Novo Produto</button>
  
  <ul class="list" v-if="produtos.length > 0">
    <li v-for="produto in produtos" :key="produto.id" @click="abrirProduto(produto.id)">
      <div class="row">
        <strong>{{ produto.nome }}</strong>
        <span>{{ formatarDinheiro(produto.preco) }} / {{ produto.unidade }}</span>
      </div>
    </li>
  </ul>
  
  <div v-else class="muted" style="margin-top: 20px;">
    Nenhum produto cadastrado.
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { listProducts } from '@/domain/products.js'
import { formatarDinheiro } from '@/utils.js'

const router = useRouter()
const produtos = ref([])

onMounted(async () => {
  produtos.value = await listProducts()
})

const irParaNovo = () => router.push({ name: 'produto-form' })
const abrirProduto = (id) => router.push({ name: 'produto-form', params: { id } })
</script>