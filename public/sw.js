const CACHE_VERSION = 'v1.3.0';

// v38: 푸시 알림 핸들러 - sound + badge + click action
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (_) {
    data = { title: '로컬루션', body: event.data ? event.data.text() : '새 알림' }
  }

  const title = data.title || '로컬루션'
  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/icon-192.png',
    image: data.image,
    tag: data.tag || 'localution-notification',
    requireInteraction: data.priority === 'high',  // 부정 리뷰 등 중요 알림은 자동 안 사라짐
    silent: data.silent === true,
    vibrate: data.vibrate || [200, 100, 200],
    data: {
      url: data.url || '/dashboard',
      timestamp: Date.now(),
    },
    actions: data.actions || [
      { action: 'view', title: '보기' },
      { action: 'dismiss', title: '닫기' },
    ],
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

// 알림 클릭
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'dismiss') return
  const url = (event.notification.data && event.notification.data.url) || '/dashboard'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    })
  )
})

// ServiceWorkerRegistrar 가 새 버전을 발견하면 SKIP_WAITING 을 보낸다 → 바로 교체
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})

const CACHE_NAME = `localution-${CACHE_VERSION}`;
const OFFLINE_PAGE = '/offline.html';

// 앱 셸 (설치 시 미리 캐시)
const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// 로그인해야 보이는 화면 · 로그인 흐름. 캐시에 남기지 않는다 (공용 기기에서 남의 화면이 남는다)
// middleware.ts 의 보호 경로와 같은 목록 + /qr (개인 QR 화면) + /auth · /login
const PRIVATE_PREFIXES = [
  '/dashboard', '/admin', '/admin-biz', '/customers', '/crm', '/review-admin', '/reviews',
  '/qr-admin', '/settings', '/settlement', '/my', '/reservations', '/partner-points',
  '/qr', '/auth', '/login', '/logout',
];

const ASSET_EXT = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico',
  '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.webm'];

function isPrivatePath(pathname) {
  return PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

function isAsset(pathname) {
  if (pathname.startsWith('/_next/static/')) return true;
  return ASSET_EXT.some((ext) => pathname.endsWith(ext));
}

function offlineJson() {
  return new Response(JSON.stringify({ ok: false, error: 'offline', message: '인터넷 연결이 없어요' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function offlinePage() {
  return caches.match(OFFLINE_PAGE).then((r) => r || new Response('Offline', { status: 503 }));
}

// Install - 앱 셸 캐시
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((error) => {
        console.warn('PRECACHE_URLS failed, some files may not be available offline:', error);
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// Activate - 이전 버전 캐시 정리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName.startsWith('localution-')) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch - 경로별 전략
//   1) 같은 출처 GET 만 다룬다. Supabase · CDN 등 다른 출처는 브라우저에 맡긴다 (인증 응답을 캐시에 남기지 않는다)
//   2) /api · /auth · Next 데이터 요청 : 네트워크만. 오프라인이면 503 JSON
//   3) 정적 자산 (_next/static · 이미지 · 폰트) : 캐시 우선
//   4) 로그인 화면 (PRIVATE_PREFIXES) : 네트워크만 · 캐시 저장 없음 · 오프라인이면 offline.html
//   5) 공개 화면 : 네트워크 우선 · 성공하면 캐시 · 오프라인이면 캐시 → offline.html
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const pathname = url.pathname;

  if (pathname.startsWith('/api/') || pathname.startsWith('/auth/') || pathname.startsWith('/_next/data/')) {
    event.respondWith(fetch(request).catch(offlineJson));
    return;
  }

  if (isAsset(pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, copy));
          }
          return response;
        });
      })
    );
    return;
  }

  const isNavigation = request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');

  if (isPrivatePath(pathname)) {
    if (isNavigation) event.respondWith(fetch(request).catch(offlinePage));
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, copy));
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cached) => cached || (isNavigation ? offlinePage() : offlineJson()));
      })
  );
});
