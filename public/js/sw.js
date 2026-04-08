// Service Worker - 离线缓存
const CACHE_NAME = 'campus-match-v1';
const urlsToCache = [
  '/',
  '/square.html',
  '/party.html',
  '/profile.html',
  '/chat.html',
  '/css/style.css',
  '/js/square.js',
  '/js/party.js',
  '/js/profile.js',
  '/js/chat.js'
];

// 安装时缓存资源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// 拦截请求，优先使用缓存
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

// 更新缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
});