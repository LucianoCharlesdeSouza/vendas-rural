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

<style scoped>
.topbar {
  background: var(--primary);
  color: white;
  padding: 16px;
  padding-top: max(16px, env(safe-area-inset-top));
  position: sticky;
  top: 0;
  z-index: 50;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
}

.topbar h1 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  flex: 1;
}
</style>