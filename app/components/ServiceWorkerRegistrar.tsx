'use client'

// ═══════════════════════════════════════════════════════════
// ServiceWorkerRegistrar
// /sw.js 를 한 번만 등록한다 (오프라인 · 푸시 · 홈 화면 앱 준비).
// 프로덕션에서만 돈다 : 개발 중에 SW 캐시가 끼면 수정이 화면에 안 보인다.
// 설정 화면의 푸시 구독도 같은 /sw.js 를 쓴다 (sw-push.js 이중 등록 방지).
// ═══════════════════════════════════════════════════════════

import { useEffect } from 'react'

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          // 새 버전이 설치되면 바로 교체를 요청한다 (sw.js 의 SKIP_WAITING 메시지와 짝)
          reg.addEventListener('updatefound', () => {
            const sw = reg.installing
            if (!sw) return
            sw.addEventListener('statechange', () => {
              if (sw.state === 'installed' && navigator.serviceWorker.controller) {
                sw.postMessage({ type: 'SKIP_WAITING' })
              }
            })
          })
        })
        .catch(() => {
          // 등록 실패는 기능 차단이 아니다. 조용히 넘어간다.
        })
    }

    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register, { once: true })
  }, [])

  return null
}
