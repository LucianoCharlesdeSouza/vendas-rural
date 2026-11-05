<template>
  <div v-if="carregando" class="muted">Carregando informações...</div>

  <div v-else>
    <!-- Status do Armazenamento -->
    <div class="card">
      <div class="muted">Último backup</div>
      <div class="big">{{ ultimoBackupData ? formatarDataHora(ultimoBackupData) : 'Nunca' }}</div>
      
      <div v-if="ultimoRestoreData" class="muted" style="margin-top: 6px">
        Última restauração: {{ formatarDataHora(ultimoRestoreData) }}
      </div>
      
      <div class="muted" style="margin-top: 6px">
        Armazenamento persistente: <strong>{{ persistido ? 'Sim' : 'Não' }}</strong>
      </div>
      
      <div v-if="estimativa" class="muted">
        Uso aproximado: {{ (estimativa.usage / 1024 / 1024).toFixed(1) }} MB 
        de {{ (estimativa.quota / 1024 / 1024).toFixed(0) }} MB
      </div>
    </div>

    <!-- Ações -->
    <button class="btn" @click="fazerBackup" :disabled="processando">
      {{ processando ? 'Gerando...' : 'Fazer Backup' }}
    </button>
    
    <button class="btn sec" @click="compartilharBackup" :disabled="processando">
      Compartilhar Backup
    </button>
    
    <button class="btn sec" @click="abrirSeletorArquivo">
      Restaurar Backup
    </button>
    
    <!-- Input escondido para selecionar o arquivo -->
    <input 
      type="file" 
      ref="fileInput" 
      accept=".vrbackup,.json,application/json" 
      style="display: none" 
      @change="restaurarBackup"
    >

    <!-- Aviso de Segurança -->
    <div class="card muted" style="margin-top: 15px">
      Os dados ficam somente neste celular. Se o celular for perdido, os dados podem ser perdidos. 
      Faça backups periódicos.
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { 
  baixarBackup, 
  compartilharOuBaixarBackup, 
  restaurarBackup as apiRestaurarBackup,
  ultimoBackup,
  ultimoRestore,
  estimativaArmazenamento
} from '@/services/backup-service.js'

const router = useRouter()

const carregando = ref(true)
const processando = ref(false)

const ultimoBackupData = ref(null)
const ultimoRestoreData = ref(null)
const estimativa = ref(null)
const persistido = ref(false)
const fileInput = ref(null)

onMounted(async () => {
  // Busca as informações iniciais
  ultimoBackupData.value = await ultimoBackup()
  ultimoRestoreData.value = await ultimoRestore()
  estimativa.value = await estimativaArmazenamento()
  
  try {
    if (navigator.storage && navigator.storage.persisted) {
      persistido.value = await navigator.storage.persisted()
    }
  } catch (e) {
    console.warn("Não foi possível verificar persistência", e)
  }
  
  carregando.value = false
})

const formatarDataHora = (iso) => {
  if (!iso) return ''
  return new Date(iso).toLocaleString('pt-BR')
}

const fazerBackup = async () => {
  processando.value = true
  try {
    await baixarBackup()
    // Atualiza a data na tela imediatamente
    ultimoBackupData.value = new Date().toISOString()
    alert('Backup gerado e baixado com sucesso!')
  } catch (e) {
    alert('Erro ao gerar backup: ' + e.message)
  } finally {
    processando.value = false
  }
}

const compartilharBackup = async () => {
  processando.value = true
  try {
    const modo = await compartilharOuBaixarBackup()
    ultimoBackupData.value = new Date().toISOString()
    
    if (modo === 'share') {
      alert('Backup compartilhado!')
    } else {
      alert('Compartilhamento indisponível. O backup foi baixado.')
    }
  } catch (e) {
    alert('Erro ao compartilhar: ' + e.message)
  } finally {
    processando.value = false
  }
}

const abrirSeletorArquivo = () => {
  fileInput.value.click()
}

const restaurarBackup = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  const confirmacao = confirm('A restauração substituirá todos os dados atuais. Deseja continuar?')
  if (!confirmacao) {
    event.target.value = '' // Limpa o input
    return
  }

  processando.value = true
  try {
    const resultado = await apiRestaurarBackup(file)
    
    ultimoRestoreData.value = new Date().toISOString()
    
    alert(
      `Backup restaurado com sucesso!\n\n` +
      `Clientes: ${resultado.clientes}\n` +
      `Produtos: ${resultado.produtos}\n` +
      `Pedidos: ${resultado.pedidos}\n` +
      `Vendas: ${resultado.vendas}\n` +
      `Pagamentos: ${resultado.pagamentos}\n` +
      `Rotas: ${resultado.rotas}\n` +
      `Produção: ${resultado.producao}`
    )
    
    // Recarrega o app para garantir que todas as telas puxem os novos dados
    router.replace({ name: 'home' })
    window.location.reload() 
  } catch (e) {
    alert('Erro ao restaurar: ' + e.message)
  } finally {
    processando.value = false
    event.target.value = '' // Limpa o input
  }
}
</script>