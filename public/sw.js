/*
 * Service worker do app de campo Maquim.
 * Guarda no aparelho os arquivos do app para que ele abra e funcione mesmo
 * sem internet. Os dados das OSs ficam no IndexedDB (não passam por aqui).
 *
 * Estratégia:
 *  - Página (navegação): tenta a rede; sem rede, usa a cópia guardada.
 *  - Arquivos do app (/assets/*, ícones, fontes): usa a cópia guardada e
 *    atualiza em segundo plano.
 *  - A cada abertura com internet, confere a lista de arquivos do build
 *    (/precache-manifest.json) e baixa o que faltar, para uma nova versão
 *    publicada também ficar disponível offline.
 */
const CACHE = 'maquim-campo-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

async function precacheAll() {
  const cache = await caches.open(CACHE);
  await cache.addAll(APP_SHELL).catch(() => undefined);
  try {
    const r = await fetch('/precache-manifest.json', { cache: 'no-store' });
    if (!r.ok) return;
    const m = await r.json();
    const files = m.files || [];
    await Promise.all(files.map((f) => cache.match(f, { ignoreVary: true }).then((hit) => hit || cache.add(f).catch(() => undefined))));
    // Remove arquivos de versões antigas do app (mantém só os do build atual)
    const atuais = new Set(files);
    const keys = await cache.keys();
    await Promise.all(
      keys
        .filter((req) => {
          const u = new URL(req.url);
          return u.origin === self.location.origin && u.pathname.startsWith('/assets/') && !atuais.has(u.pathname);
        })
        .map((req) => cache.delete(req))
    );
  } catch {
    // sem internet: mantém o que já está guardado
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheAll().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// A página envia a lista de arquivos que já carregou (primeira visita, antes do SW existir)
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'CACHE_URLS' && Array.isArray(data.urls)) {
    event.waitUntil(
      caches.open(CACHE).then((cache) =>
        Promise.all(data.urls.map((u) => cache.match(u, { ignoreVary: true }).then((hit) => hit || cache.add(u).catch(() => undefined))))
      )
    );
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Navegação: rede primeiro, cópia local quando estiver sem internet
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/index.html', copy));
          event.waitUntil(precacheAll());
          return res;
        })
        .catch(() => caches.match('/index.html', { ignoreVary: true }).then((r) => r || caches.match('/', { ignoreVary: true })))
    );
    return;
  }

  if (url.pathname === '/precache-manifest.json') return;

  const mesmoSite = url.origin === self.location.origin;
  const fonte = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!mesmoSite && !fonte) return;

  // Arquivos estáticos: cópia local primeiro, atualiza em segundo plano
  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req, { ignoreVary: true }).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    )
  );
});
