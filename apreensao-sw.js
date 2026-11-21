// Guarda a página da apreensão no celular para abrir sem internet (só vale para apreensao*.html).
const CACHE = 'apreensao-v5';
const JSPDF = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all([
    c.add('apreensao.html').catch(() => {}),
    fetch(JSPDF, { mode: 'no-cors' }).then((r) => c.put(JSPDF, r)).catch(() => {})
  ])));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // o servidor da lista nunca passa por aqui
  const url = new URL(req.url);
  if (url.href === JSPDF) { e.respondWith(caches.match(JSPDF).then((r) => r || fetch(req))); return; }
  if (url.origin !== location.origin || !url.pathname.includes('/apreensao')) return;
  // internet primeiro (pega a versão nova); sem internet, a cópia guardada
  e.respondWith(fetch(req).then((r) => { const c = r.clone(); caches.open(CACHE).then((k) => k.put('apreensao.html', c)); return r; })
    .catch(() => caches.match('apreensao.html')));
});
