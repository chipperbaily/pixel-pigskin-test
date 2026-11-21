/* PP LINK TEST service worker (the test copy at /pixel-pigskin-test/). Its cache name must NOT start with 'pixel-pigskin-' (the real game's worker deletes those on the same site) and it only ever deletes names starting with 'ppt-link-test-'.
   BUMP CACHE_VERSION whenever you change sw.js, the manifest, an icon or the font (anything in PRECACHE other than index.html).
   index.html itself is fetched network-first, so a new index.html reaches players on their next online visit even without a bump;
   bumping on every release is still harmless and keeps the cache tidy. */
const CACHE_VERSION = 'v1';
const CACHE = 'ppt-link-test-' + CACHE_VERSION;
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png',
  './fonts/press-start-2p-latin-400-normal.woff2'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(PRECACHE.map(u =>
    fetch(new Request(u, { cache: 'reload' })).then(r => { if (!r.ok) throw new Error(u + ' ' + r.status); return c.put(u, r) })
  ))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith('ppt-link-test-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;               /* never touch other origins */
  const isPage = req.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname === new URL('./', location).pathname;
  if (isPage) {
    /* network first so updates arrive, cache fallback so it works offline */
    e.respondWith(fetch(req, { cache: 'no-cache' }).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)) }
      return r;
    }).catch(() => caches.match('./index.html').then(r => r || caches.match('./'))));
    return;
  }
  /* everything else (icons, font, manifest): cache first, then network, and remember what the network gave */
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)) }
    return r;
  })));
});
