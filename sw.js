const CACHE_VERSION = 'venda-rural-v4';

const CACHE_PREFIX = 'venda-rural-';

const PRECACHE_ASSETS = [
    './',
    './index.html',
    './manifest.webmanifest',

    // Estilos
    './css/app.css',

    // Ícones PWA
    './icons/vendarural-192.png',
    './icons/vendarural-512.png',
    './icons/favicon.svg',
    './icons/favicon.ico',
    './icons/favicon-96x96.png',
    './icons/vendarural-maskable-192.png',
    './icons/vendarural-maskable-512.png',    

    // Aplicação
    './js/app.js',
    './js/utils.js',

    // Banco de dados
    './js/db/database.js',

    // Domínio
    './js/domain/customers.js',
    './js/domain/products.js',
    './js/domain/orders.js',
    './js/domain/sales.js',
    './js/domain/payments.js',
    './js/domain/routes.js',
    './js/domain/production.js',

    // Serviços
    './js/services/sale-service.js',
    './js/services/payment-service.js',
    './js/services/backup-service.js',
    './js/services/route-service.js',

    // Interface
    './js/ui/home.js',
    './js/ui/customers.js',
    './js/ui/products.js',
    './js/ui/orders.js',
    './js/ui/sales.js',
    './js/ui/routes.js',
    './js/ui/reports.js',
    './js/ui/production.js'
];

const BASE_URL = self.registration.scope;

const INDEX_URL = new URL('./index.html', BASE_URL).href;

const CACHE_URLS = PRECACHE_ASSETS.map(
    path => new URL(path, BASE_URL).href
);

/**
 * Verifica se a requisição pertence à aplicação.
 */
function isSameOrigin(request) {
    return new URL(request.url).origin === self.location.origin;
}

/**
 * Verifica se a URL pertence ao escopo do PWA.
 */
function isWithinScope(request) {
    return request.url.startsWith(BASE_URL);
}

/**
 * Verifica se a resposta pode ser armazenada.
 */
function isCacheable(response) {
    return (
        response &&
        response.status === 200 &&
        response.type === 'basic'
    );
}

/**
 * Instalação:
 * Pré-carrega os recursos essenciais.
 */
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then(cache => cache.addAll(CACHE_URLS))
            .then(() => self.skipWaiting())
    );
});

/**
 * Ativação:
 * Remove versões antigas dos caches da aplicação.
 */
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(name =>
                            name.startsWith(CACHE_PREFIX) &&
                            name !== CACHE_VERSION
                        )
                        .map(name => caches.delete(name))
                );
            })
            .then(() => self.clients.claim())
    );
});

/**
 * Navegação:
 * Network First.
 *
 * Tenta obter a versão atual da página.
 * Se estiver offline, utiliza o index.html armazenado.
 */
async function handleNavigation(request) {
    try {
        const response = await fetch(request);

        if (isCacheable(response)) {
            const cache = await caches.open(CACHE_VERSION);

            await cache.put(request, response.clone());
        }

        return response;

    } catch {
        const cachedPage = await caches.match(request);

        if (cachedPage) {
            return cachedPage;
        }

        const offlinePage = await caches.match(INDEX_URL);

        if (offlinePage) {
            return offlinePage;
        }

        return new Response(
            'Você está offline e a página não está disponível.',
            {
                status: 503,
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8'
                }
            }
        );
    }
}

/**
 * Recursos estáticos:
 * Cache First.
 *
 * Prioriza o cache e consulta a rede quando necessário.
 */
async function handleStaticResource(request) {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const response = await fetch(request);

        if (isCacheable(response)) {
            const cache = await caches.open(CACHE_VERSION);

            await cache.put(request, response.clone());
        }

        return response;

    } catch {
        return new Response(
            'Recurso indisponível offline.',
            {
                status: 503,
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8'
                }
            }
        );
    }
}

/**
 * Interceptação das requisições.
 */
self.addEventListener('fetch', event => {
    const request = event.request;

    // Somente requisições GET.
    if (request.method !== 'GET') {
        return;
    }

    // Ignora requisições externas.
    if (!isSameOrigin(request)) {
        return;
    }

    // Ignora recursos fora do escopo da aplicação.
    if (!isWithinScope(request)) {
        return;
    }

    // Navegação entre páginas.
    if (request.mode === 'navigate') {
        event.respondWith(handleNavigation(request));
        return;
    }

    // Recursos estáticos.
    event.respondWith(handleStaticResource(request));
});
