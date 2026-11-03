const CACHE = 'venda-rural-v2';
const ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/db/database.js',
  './js/domain/customers.js','./js/domain/products.js','./js/domain/orders.js',
  './js/domain/sales.js','./js/domain/payments.js','./js/domain/routes.js',
  './js/domain/production.js',
  './js/services/sale-service.js','./js/services/payment-service.js',
  './js/services/backup-service.js','./js/services/route-service.js',
  './js/ui/home.js','./js/ui/customers.js','./js/ui/products.js',
  './js/ui/orders.js','./js/ui/sales.js','./js/ui/routes.js',
  './js/ui/reports.js','./js/ui/production.js'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{});
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});