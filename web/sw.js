// Service worker: makes the app installable and usable offline.
// Strategy: network first (so updates arrive immediately), falling back to the
// cache when offline. Bump VERSION when the file list changes.
const VERSION = 'gl-trainer-v1';
const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/app.js',
  'js/editor.js',
  'js/helpers.js',
  'js/mat4.js',
  'js/reference.js',
  'js/runner.js',
  'js/lessons/index.js',
  'js/lessons/01-clear.js',
  'js/lessons/02-triangle.js',
  'js/lessons/03-varyings.js',
  'js/lessons/04-uniforms.js',
  'js/lessons/05-fragment-art.js',
  'js/lessons/06-transforms.js',
  'js/lessons/07-3d.js',
  'js/lessons/08-textures.js',
  'js/lessons/09-lighting.js',
  'js/lessons/10-framebuffers.js',
  'js/lessons/11-instancing.js',
  'js/lessons/12-desktop.js',
  'js/lessons/playground.js',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('index.html'))),
  );
});
