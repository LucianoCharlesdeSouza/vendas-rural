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
        Armazenamento protegido: <strong>{{ persistido ? 'Sim' : 'Não' }}</strong>
      </div>
    </div>

    <!-- NOVO CARD: Armazenamento -->
    <div v-if="estimativa" class="card" style="background: #f0fdf4; border: 1px solid #bbf7d0;">
      <div style="font-weight: bold; color: #166534; margin-bottom: 4px;">
        Espaço no celular
      </div>
      <div style="font-size: 15px; color: #15803d;">
        Seu app está usando <strong>{{ formatarMB(estimativa.usage) }}</strong> de 
        <strong>{{ formatarGB(estimativa.quota) }}</strong> disponíveis no celular.
      </div>
      <div class="muted" style="margin-top: 8px; font-size: 13px;">
        Fique tranquilo: o Venda Rural guarda apenas textos e números. Você precisaria de milhares de vendas para chegar a 1 GB.
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
    
    <div class="card muted" style="margin-top: 15px">
      Os dados ficam somente neste celular. Se o celular for perdido, os dados podem ser perdidos. 
      Faça backups periódicos.
    </div>

    <!-- NOVA SEÇÃO: ARQUIVAMENTO -->
    <h2 style="margin-top: 30px;">Arquivar Histórico</h2>
    <div class="card" style="border: 1px solid #ddd;">
      <div style="margin-bottom: 10px; font-size: 15px;">
        Se o celular está ficando lento ou cheio, você pode limpar as vendas antigas que já foram pagas.
        <strong>Seus clientes, produtos, quem está devendo e os pedidos pendentes não serão apagados.</strong>
      </div>
      <button class="btn danger" @click="limparHistorico" :disabled="processando">
        Arquivar e Limpar Vendas Antigas
      </button>
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
  arquivarDadosResolvidos,
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

const formatarMB = (bytes) => {
  if (!bytes) return '0 MB'
  const mb = bytes / (1024 * 1024)
  // Se for muito pequeno (ex: 0.5 MB), mostra em KB para não parecer zerado
  if (mb < 1) return (bytes / 1024).toFixed(0) + ' KB'
  return mb.toFixed(1) + ' MB'
}

const formatarGB = (bytes) => {
  if (!bytes) return '0 GB'
  const gb = bytes / (1024 * 1024 * 1024)
  if (gb < 1) return (bytes / (1024 * 1024)).toFixed(0) + ' MB'
  return gb.toFixed(1) + ' GB'
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

const limparHistorico = async () => {
  // Aviso 1: Lembrar do backup
  const aviso1 = confirm(
    "ATENÇÃO!\n\nVocê já fez um backup recente?\n\n" +
    "Recomendamos fazer um backup AGORA antes de continuar, pois o histórico será removido do celular."
  )
  if (!aviso1) return

  // Aviso 2: Confirmação final
  const aviso2 = confirm(
    "Confirmar limpeza?\n\n" +
    "Vendas já pagas, pedidos entregues e rotas antigas serão apagados do celular.\n" +
    "Seus clientes, produtos e dívidas em aberto serão mantidos."
  )
  if (!aviso2) return

  processando.value = true
  try {
    await arquivarDadosResolvidos()
    alert('Limpeza concluída com sucesso! O histórico foi arquivado e o app está mais leve.')
    router.replace({ name: 'home' })
  } catch (e) {
    alert('Erro ao limpar: ' + e.message)
  } finally {
    processando.value = false
  }
}
</script>