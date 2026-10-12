/* Service worker: keeps the app shell so Solat opens instantly and offline. Only same-origin files are cached;
   prayer-time, place and audio requests to other sites always go to the network. Bump CACHE after any change. */
var CACHE = 'solat-v1';
var CORE = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys()
    .then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); })
    .then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  if (new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(caches.open(CACHE).then(function (cache) {
    return cache.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) { if (res && res.ok && res.type === 'basic') cache.put(req, res.clone()); return res; }).catch(function () { return null; });
      if (hit) return hit;
      return net.then(function (res) { return res || (req.mode === 'navigate' ? cache.match('index.html') : Response.error()); });
    });
  }));
});
