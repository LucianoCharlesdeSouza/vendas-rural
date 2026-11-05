export const DB_NAME = 'venda-rural';
export const DB_VERSION = 1;

export function openDB(){
  return new Promise((resolve,reject)=>{
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      const stores = [
        ['customers','id'],['products','id'],['orders','id'],['orderItems','id'],
        ['sales','id'],['payments','id'],['routes','id'],['production','id'],['settings','key']
      ];
      for (const [name,keyPath] of stores){
        if (!db.objectStoreNames.contains(name)){
          const s = db.createObjectStore(name,{keyPath});
          if (['sales','payments','orders','orderItems'].includes(name)){
            s.createIndex('byCliente','clienteId',{unique:false});
          }
          if (name === 'orderItems') s.createIndex('byPedido','pedidoId',{unique:false});
          if (name === 'payments') s.createIndex('byVenda','vendaId',{unique:false});
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const getAll = (store) => new Promise(async (res,rej)=>{
  const db = await openDB();
  const t = db.transaction(store,'readonly');
  const req = t.objectStore(store).getAll();
  req.onsuccess = () => res(req.result);
  req.onerror = () => rej(req.error);
});

export const getOne = (store, id) => new Promise(async (res,rej)=>{
  const db = await openDB();
  const t = db.transaction(store,'readonly');
  const req = t.objectStore(store).get(id);
  req.onsuccess = () => res(req.result);
  req.onerror = () => rej(req.error);
});

export const put = (store, obj) => new Promise(async (res,rej)=>{
  const db = await openDB();
  const t = db.transaction(store,'readwrite');
  t.objectStore(store).put(obj);
  t.oncomplete = () => res(obj);
  t.onerror = () => rej(t.error);
});

export const del = (store, id) => new Promise(async (res,rej)=>{
  const db = await openDB();
  const t = db.transaction(store,'readwrite');
  t.objectStore(store).delete(id);
  t.oncomplete = () => res();
  t.onerror = () => rej(t.error);
});

export async function clearAll(){
  const db = await openDB();
  const names = ['customers','products','orders','orderItems','sales','payments','routes','production','settings'];
  return new Promise((res,rej)=>{
    const t = db.transaction(names,'readwrite');
    names.forEach(n => t.objectStore(n).clear());
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
  });
}

export async function multiPut(pairs){
  const db = await openDB();
  const stores = [...new Set(pairs.map(p=>p[0]))];
  return new Promise((res,rej)=>{
    const t = db.transaction(stores,'readwrite');
    pairs.forEach(([store,obj]) => t.objectStore(store).put(obj));
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
  });
}

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() :
  'id-'+Date.now()+'-'+Math.random().toString(36).slice(2));

/** Arredonda centavos de quantidade × preço unitário em centavos. */
export function calcSubtotalCentavos(quantidade, precoUnitarioCentavos){
  const q = Number(quantidade);
  const p = Math.round(Number(precoUnitarioCentavos));
  if (!isFinite(q) || q <= 0) return 0;
  if (!isFinite(p) || p < 0) return 0;
  return Math.round(q * p);
}

/** Converte string decimal (aceita vírgula ou ponto) para Number. */
export function parseDecimal(str){
  if (typeof str === 'number') return str;
  if (!str) return 0;
  const s = String(str).trim().replace(/\s/g,'').replace(',', '.');
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}

/** Converte string de dinheiro (aceita vírgula/ponto) para centavos (inteiro). */
export function parseMoneyCentavos(str){
  const n = parseDecimal(str);
  return Math.max(0, Math.round(n * 100));
}