 

const CACHE = 'axiomate-hub-v16';
const SHELL = ['/assets/cursor.js?v=1', '/assets/shadow.css?v=4', '/hub', '/hub/hub.css?v=10', '/hub/hub.js?v=11', '/assets/vendor/qrcode.js', '/hub/icon-192.png', '/hub/icon-512.png', '/assets/favicon.svg', '/hub/icons.json?v=3'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/staff')) return;
   
  if (url.pathname === '/hub') {
    e.respondWith(fetch(e.request).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put('/hub', copy)); return r; }).catch(() => caches.match('/hub')));
    return;
  }
  if (SHELL.includes(url.pathname + url.search)) e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
});
