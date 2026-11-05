<template>
  <header class="topbar">
    <!-- v-if: só mostra o botão se não estivermos na Home -->
    <button v-if="!isHome" @click="voltar" class="back" aria-label="Voltar">‹</button>
    <h1>{{ tituloPagina }}</h1>
  </header>

  <main id="app-content">
    <!-- O componente da rota atual é injetado aqui -->
    <router-view />
  </main>

  <div id="toast" class="toast" v-if="toastMensagem">
    {{ toastMensagem }}
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

// Verifica se estamos na rota inicial
const isHome = computed(() => route.name === 'home')

// Pega o título da rota (definiremos isso no router)
const tituloPagina = computed(() => route.meta.title || 'Vendas Rural')

// Função simples para voltar
const voltar = () => {
  router.back()
}

// Simulando um toast global (opcional por enquanto)
import { ref } from 'vue'
const toastMensagem = ref('')
</script>