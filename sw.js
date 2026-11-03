/* 题灵录 · Service Worker：应用壳预缓存，飞行模式离线可用 */
/* 缓存名里的数字必须与 index.html 的 APP_BUILD 一致；改版本时两边一起改 */
const CACHE = 'qt-shell-v38';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-180.png',
  './js/store.js',
  './js/ui.js',
  './js/core.js',
  './js/pages/home.js',
  './js/pages/quiz.js',
  './js/pages/exam.js',
  './js/pages/detail.js',
  './js/pages/import.js',
  './js/pages/study.js',
  './js/pages/admin.js',
  './js/pages/misc.js',
  './js/app.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // 带查询参数的请求 = 版本探测 / 强制刷新，一律走网络，不读也不写缓存
  const bust = url.search.length > 1;

  // 页面导航：缓存优先（离线可用），后台更新
  if (e.request.mode === 'navigate' || e.request.destination === 'document') {
    if (bust) return;
    e.respondWith(
      caches.match('./index.html').then(r => r || fetch(e.request)).catch(() => fetch(e.request))
    );
    e.waitUntil(
      fetch('./index.html').then(r => caches.open(CACHE).then(c => c.put('./index.html', r))).catch(() => {})
    );
    return;
  }

  // 同源静态资源（图标等）：缓存优先，后台更新
  if (url.origin === location.origin) {
    if (bust) return;
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request).then(r2 => {
        const cp = r2.clone();
        caches.open(CACHE).then(c => c.put(e.request, cp)).catch(() => {});
        return r2;
      })).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 解析库 CDN（mammoth / pdfjs）：缓存优先，首次联网使用后即可离线
  if (/cdn\.jsdelivr\.net/.test(url.hostname)) {
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request).then(r2 => {
        const cp = r2.clone();
        caches.open(CACHE).then(c => c.put(e.request, cp)).catch(() => {});
        return r2;
      }))
    );
    return;
  }

  // 其余跨域（用户的云端题库地址等）：直接走网络
});
