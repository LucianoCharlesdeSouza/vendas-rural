import { getAll, clearAll, multiPut, put, del } from '../db/database.js'

export const BACKUP_STORES = [
  'customers', 'products', 'orders', 'orderItems',
  'sales', 'payments', 'routes', 'production'
]

const VERSION = 1

// Função para calcular o Hash SHA-256 nativo do navegador
async function calcularHash(texto) {
  const encoder = new TextEncoder()
  const data = encoder.encode(texto)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  // Converte o buffer para uma string hexadecimal
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function gerarBackupJSON() {
  const data = { version: VERSION, createdAt: new Date().toISOString() }
  for (const s of BACKUP_STORES) data[s] = await getAll(s)
  
  // Converte os dados do banco para string (para calcular o hash exato dos dados)
  const dadosString = JSON.stringify(data)
  
  // Gera o checksum e adiciona ao pacote final
  const checksum = await calcularHash(dadosString)
  
  // O arquivo final tem o formato: { checksum: "...", payload: "..." }
  return JSON.stringify({
    checksum,
    payload: dadosString
  }, null, 2)
}

function nomeArquivo(ext) {
  return `venda-rural-${new Date().toISOString().slice(0, 10)}.${ext}`
}

export async function baixarBackup() {
  const json = await gerarBackupJSON()
  const blob = new Blob([json], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = nomeArquivo('vrbackup')
  document.body.appendChild(a)
  a.click()
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000)
  await put('settings', { key: 'lastBackupAt', value: new Date().toISOString() })
}

export async function compartilharOuBaixarBackup() {
  const json = await gerarBackupJSON()
  const file = new File([json], nomeArquivo('json'), { type: 'application/json' })
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Backup Venda Rural', text: 'Backup do Venda Rural' })
      await put('settings', { key: 'lastBackupAt', value: new Date().toISOString() })
      return 'share'
    } catch (e) {
      console.warn("Share cancelado, usando fallback")
    }
  }
  await baixarBackup()
  return 'download'
}

export async function restaurarBackup(file) {
  const text = await file.text()
  let arquivo
  
  try {
    arquivo = JSON.parse(text)
  } catch {
    throw new Error('Arquivo inválido (não é um JSON válido).')
  }

  // Verifica se o arquivo tem a estrutura de segurança
  if (!arquivo.checksum || !arquivo.payload) {
    throw new Error('Formato de backup inválido ou arquivo não gerado pelo Venda Rural.')
  }

  // Recalcula o hash do conteúdo para ver se está intacto
  const hashCalculado = await calcularHash(arquivo.payload)
  
  if (hashCalculado !== arquivo.checksum) {
    throw new Error('O arquivo de backup está corrompido ou foi alterado. A restauração foi bloqueada para proteger seus dados atuais.')
  }

  // Se passou na validação, converte o payload de volta para objeto
  const data = JSON.parse(arquivo.payload)

  if (data.version !== VERSION) {
    throw new Error(`Versão de backup incompatível (encontrada ${data.version ?? '?'}, esperada ${VERSION}).`)
  }

  // Se a validação passou, limpa e restaura
  await clearAll()
  const pairs = []
  for (const s of BACKUP_STORES) {
    const arr = data[s]
    if (Array.isArray(arr)) for (const item of arr) pairs.push([s, item])
  }
  
  await multiPut(pairs)
  await put('settings', { key: 'lastRestoreAt', value: new Date().toISOString() })
  
  return {
    clientes: data.customers?.length || 0,
    produtos: data.products?.length || 0,
    pedidos: data.orders?.length || 0,
    vendas: data.sales?.length || 0,
    pagamentos: data.payments?.length || 0,
    rotas: data.routes?.length || 0,
    producao: data.production?.length || 0
  }
}

// Mantenha as outras funções (ultimoBackup, ultimoRestore, estimativaArmazenamento) iguais...
export async function ultimoBackup() {
  const all = await getAll('settings')
  return all.find(x => x.key === 'lastBackupAt')?.value || null
}
export async function ultimoRestore() {
  const all = await getAll('settings')
  return all.find(x => x.key === 'lastRestoreAt')?.value || null
}
export async function estimativaArmazenamento() {
  if (!navigator.storage || !navigator.storage.estimate) return null
  try { return await navigator.storage.estimate() } catch { return null }
}

export async function arquivarDadosResolvidos() {
  // 1. Apaga Vendas e seus Pagamentos (A não ser que o cliente ainda deva)
  const vendas = await getAll('sales')
  for (const v of vendas) {
    const pagamentos = await getAll('payments')
    const pago = pagamentos.filter(p => p.vendaId === v.id).reduce((s, p) => s + p.valor, 0)
    
    // Só apaga se a venda NÃO foi cancelada E já foi totalmente paga
    if (!v.cancelada && pago >= v.total) {
      // Apaga os pagamentos atrelados a ela
      const pagamentosVenda = pagamentos.filter(p => p.vendaId === v.id)
      for (const p of pagamentosVenda) {
        await del('payments', p.id)
      }
      // Apaga a venda
      await del('sales', v.id)
    }
  }

  // 2. Apaga Pedidos Entregues ou Cancelados
  const pedidos = await getAll('orders')
  for (const p of pedidos) {
    if (p.status === 'entregue' || p.status === 'cancelado') {
      // Apaga os itens do pedido
      const itens = await getAll('orderItems')
      const itensPedido = itens.filter(i => i.pedidoId === p.id)
      for (const i of itensPedido) {
        await del('orderItems', i.id)
      }
      // Apaga o pedido
      await del('orders', p.id)
    }
  }

  // 3. Apaga Rotas antigas (de hoje para trás)
  const rotas = await getAll('routes')
  const hoje = new Date().toISOString().slice(0, 10)
  for (const r of rotas) {
    if ((r.data || '').slice(0, 10) < hoje) {
      await del('routes', r.id)
    }
  }

  return true
}