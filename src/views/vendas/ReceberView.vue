<template>
  <div v-if="carregando" class="muted" style="text-align: center; margin-top: 50px;">
    Calculando dívidas...
  </div>

  <div v-else>
    <!-- CARD DE RESUMO (Hero Card) -->
    <div v-if="devedores.length > 0" class="card hero-card">
      <div class="muted" style="color: rgba(255,255,255,0.8); text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">
        Total a Receber
      </div>
      <div class="big" style="font-size: 36px; color: white; margin-top: 8px;">
        {{ formatarDinheiro(totalGeral) }}
      </div>
      <div class="muted" style="color: rgba(255,255,255,0.8); margin-top: 4px; font-size: 14px;">
        {{ devedores.length }} cliente(s) pendente(s)
      </div>
    </div>

    <!-- LISTA DE DEVEDORES -->
    <h3 v-if="devedores.length > 0" style="margin-top: 24px;">Cobrar de:</h3>
    
    <div v-for="dev in devedores" :key="dev.cliente.id" class="card debt-card">
      <div class="row" style="align-items: center;">
        <!-- Avatar + Nome -->
        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="avatar">{{ getInicial(dev.cliente.nome) }}</div>
          <div>
            <strong style="font-size: 16px;">{{ dev.cliente.nome }}</strong>
            <div class="muted" style="color: var(--danger); font-weight: 600; margin-top: 2px;">
              {{ formatarDinheiro(dev.devido) }}
            </div>
          </div>
        </div>

        <!-- Ações -->
        <div style="display: flex; gap: 8px;">
          <!-- Botão de WhatsApp (só aparece se tiver telefone) -->
          <button 
            v-if="dev.cliente.telefone" 
            class="btn-icon wpp" 
            @click="enviarWhatsApp(dev.cliente, dev.devido)"
            title="Enviar cobrança pelo WhatsApp"
          >
            💬
          </button>
          
          <!-- Botão de Receber -->
          <button class="btn-icon primary" @click="irParaReceber(dev.cliente.id)" title="Registrar Pagamento">
            R$
          </button>
        </div>
      </div>
    </div>

    <!-- ESTADO VAZIO -->
    <div v-if="devedores.length === 0" class="card empty-state">
      <div style="font-size: 40px; margin-bottom: 12px;">🎉</div>
      <h3 style="margin: 0; color: var(--primary);">Tudo em dia!</h3>
      <div class="muted" style="margin-top: 8px;">Nenhum cliente devendo no momento.</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { listCustomers } from '@/domain/customers.js'
import { situacaoCliente } from '@/services/payment-service.js'
import { gerarLinkWhatsApp } from '@/services/whatsapp-service.js'
import { formatarDinheiro } from '@/utils.js'

const router = useRouter()
const carregando = ref(true)
const devedores = ref([])

onMounted(async () => {
  const clientes = await listCustomers()
  const lista = []
  
  for (const c of clientes) {
    const s = await situacaoCliente(c.id)
    if (s.devido > 0) {
      lista.push({ cliente: c, devido: s.devido })
    }
  }
  
  // Ordena do maior devedor para o menor
  devedores.value = lista.sort((a, b) => b.devido - a.devido)
  carregando.value = false
})

const totalGeral = computed(() => devedores.value.reduce((soma, d) => soma + d.devido, 0))

// Funções auxiliares
const getInicial = (nome) => nome ? nome.charAt(0).toUpperCase() : '?'

const irParaReceber = (id) => router.push({ name: 'receber-cliente', params: { id } })

const enviarWhatsApp = (cliente, valor) => {
  const mensagem = `Olá ${cliente.nome}, tudo bem?\n\nPassando para lembrar do valor de *${formatarDinheiro(valor)}* referente às suas compras.\n\nQuando puder, podemos acertar! Obrigado.`
  const link = gerarLinkWhatsApp(cliente.telefone, mensagem)
  if (link) window.open(link, '_blank')
}
</script>

<style scoped>
/* Card de Resumo Verde Escuro */
.hero-card {
  background: linear-gradient(135deg, var(--primary-dark), var(--primary));
  border: none;
  box-shadow: 0 10px 15px -3px rgba(4, 120, 87, 0.3);
  padding: 24px;
}

/* Card da Lista */
.debt-card {
  padding: 16px;
  transition: transform 0.2s;
}
.debt-card:active {
  transform: scale(0.98);
}

/* Avatar redondo */
.avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #f3f4f6;
  color: var(--text-main);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 18px;
  border: 2px solid var(--border);
}

/* Botões quadrados de ícone */
.btn-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-icon.wpp {
  background: #dcfce7;
  color: #166534;
  font-size: 20px;
}
.btn-icon.wpp:active { background: #bbf7d0; }

.btn-icon.primary {
  background: var(--primary);
  color: white;
}
.btn-icon.primary:active { background: var(--primary-dark); }

/* Estado Vazio */
.empty-state {
  text-align: center;
  padding: 40px 20px;
}
</style>