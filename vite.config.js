import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { VitePWA } from 'vite-plugin-pwa' // IMPORT

// https://vite.dev/config/
export default defineConfig({
  base: '/vendas-rural/',
  plugins: [
    vue(),
    vueDevTools(),
    VitePWA({
      registerType: 'autoUpdate', // Atualiza o SW automaticamente
      devOptions: {
        enabled: true // Permite testar o PWA em localhost
      },
      manifest: {
        id: '/vendas-rural',
        name: 'Vendas Rural',
        short_name: 'Vendas Rural',
        theme_color: '#2e7d32',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/vendas-rural/',
        scope: '/vendas-rural/',
        icons: [
          // Coloque seus ícones na pasta /public/icons/ e referencie aqui
          { src: 'icons/vendarural-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/vendarural-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/vendarural-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/vendarural-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })    
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
