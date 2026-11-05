import { getAll, clearAll, multiPut, put } from '../db/database.js';

export const BACKUP_STORES = [
  'customers','products','orders','orderItems',
  'sales','payments','routes','production'
];

const VERSION = 1;

export async function gerarBackupObjeto(){
  const data = { version: VERSION, createdAt: new Date().toISOString() };
  for (const s of BACKUP_STORES) data[s] = await getAll(s);
  return data;
}
export async function gerarBackupJSON(){
  return JSON.stringify(await gerarBackupObjeto(), null, 2);
}

function nomeArquivo(ext){
  return `venda-rural-${new Date().toISOString().slice(0,10)}.${ext}`;
}

/** Download direto do arquivo .vrbackup (sempre funciona). */
export async function baixarBackup(){
  const json = await gerarBackupJSON();
  const blob = new Blob([json], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nomeArquivo('vrbackup');
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  await put('settings', {key:'lastBackupAt', value:new Date().toISOString()});
}

/**
 * Tenta compartilhar via Web Share API.
 * Usa extensão .json no File compartilhado (mais aceito que .vrbackup).
 * Se indisponível ou rejeitado, cai automaticamente para download .vrbackup.
 */
export async function compartilharOuBaixarBackup(){
  const json = await gerarBackupJSON();
  const file = new File([json], nomeArquivo('json'), {type:'application/json'});
  if (navigator.canShare && navigator.canShare({files:[file]})){
    try {
      await navigator.share({ files:[file], title:'Backup Venda Rural', text:'Backup do Venda Rural' });
      await put('settings', {key:'lastBackupAt', value:new Date().toISOString()});
      return 'share';
    } catch(e){
      // usuário cancelou ou share falhou → fallback download
    }
  }
  await baixarBackup();
  return 'download';
}

export async function restaurarBackup(file){
  const text = await file.text();
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error('Arquivo inválido (não é JSON).'); }
  if (!data || typeof data !== 'object') throw new Error('Arquivo inválido.');
  if (data.version !== VERSION) throw new Error(`Versão de backup incompatível (encontrada ${data.version??'?'}, esperada ${VERSION}).`);
  const temAlguma = BACKUP_STORES.some(s => Array.isArray(data[s]));
  if (!temAlguma) throw new Error('Backup não contém dados reconhecíveis.');
  await clearAll();
  const pairs = [];
  for (const s of BACKUP_STORES){
    const arr = data[s];
    if (Array.isArray(arr)) for (const item of arr) pairs.push([s, item]);
  }
  await multiPut(pairs);
  await put('settings', {key:'lastRestoreAt', value:new Date().toISOString()});
  return {
    clientes: data.customers?.length||0,
    produtos: data.products?.length||0,
    pedidos: data.orders?.length||0,
    vendas: data.sales?.length||0,
    pagamentos: data.payments?.length||0,
    rotas: data.routes?.length||0,
    producao: data.production?.length||0
  };
}

export async function ultimoBackup(){
  const all = await getAll('settings');
  return all.find(x=>x.key==='lastBackupAt')?.value || null;
}
export async function ultimoRestore(){
  const all = await getAll('settings');
  return all.find(x=>x.key==='lastRestoreAt')?.value || null;
}
export async function estimativaArmazenamento(){
  if (!navigator.storage || !navigator.storage.estimate) return null;
  try { return await navigator.storage.estimate(); } catch { return null; }
}