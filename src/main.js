import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index.js'
import './assets/app.css' // Vamos criar esse arquivo


// Tenta garantir armazenamento persistente
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().catch(() => {})
}

const app = createApp(App)

app.use(router)

app.mount('#app')
