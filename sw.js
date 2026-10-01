// スロットカウンター Service Worker
// 方針: ネットワーク優先（Network First）
//   - オンライン時は常にサーバーから最新のファイルを取得し、キャッシュを更新
//   - オフライン時だけキャッシュを使う
// ファイルを更新したら CACHE_VERSION を上げると、古いキャッシュが確実に消えます。
const CACHE_VERSION = 'v1';
const CACHE_NAME = `slot-counter-${CACHE_VERSION}`;
const PRECACHE = [
  './',
  './index.html',
  './toloveru-counter.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE.map((u) => new Request(u, { cache: 'reload' }))))
      .catch(() => {})
  );
  self.skipWaiting(); // 新しいSWをすぐ有効化
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('slot-counter-') && k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()) // 開いているページもすぐ管理下に
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 外部リクエストは触らない

  event.respondWith(
    // GitHub Pages の HTTPキャッシュ（約10分）を避けるため、毎回サーバーに確認する
    fetch(new Request(req.url, { cache: 'no-cache', credentials: 'same-origin' }))
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req, { ignoreSearch: true }).then((hit) =>
          hit || (req.mode === 'navigate' ? caches.match('./toloveru-counter.html') : Response.error())
        )
      )
  );
});
