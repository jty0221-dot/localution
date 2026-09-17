// app/components/landing/HeroVideo.tsx
// ============================================================
// 히어로 배경 영상
//
// 설계 원칙:
//   1) 배경 영상은 '분위기' 용도다. 정보를 담지 않는다.
//      → 로딩 실패·저사양 기기에서 안 나와도 페이지 이해에 지장이 없어야 한다.
//   2) 자동재생 조건을 지킨다 — muted + playsInline 없으면 iOS/모바일에서 재생 안 됨
//   3) prefers-reduced-motion 존중 — 어지럼증·전정기관 민감 사용자를 위해
//      OS 에서 '동작 줄이기'를 켜면 정지 이미지로 대체한다 (접근성 필수)
//   4) 모바일에서는 아예 로드하지 않는다 — 사장님은 매장에서 LTE 로 본다.
//      수 MB 영상을 데이터로 태우면 안 된다.
//   5) poster 를 반드시 준다 — 영상이 준비되기 전 빈 화면이 보이면 LCP 가 나빠진다.
//
// 영상이 없으면(파일 미배치) 아무것도 렌더하지 않고 조용히 사라진다.
// ============================================================
'use client'

import { useEffect, useRef, useState } from 'react'

export default function HeroVideo({
  src = '/video/hero-loop.mp4',
  poster = '/video/hero-poster.jpg',
}: {
  src?: string
  poster?: string
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // 동작 줄이기 설정이면 영상을 띄우지 않는다
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // 모바일에서는 데이터 절약을 위해 로드하지 않는다
    const isDesktop = window.matchMedia('(min-width: 768px)').matches
    // 데이터 절약 모드 감지 (지원 브라우저에서만)
    const conn = (navigator as unknown as { connection?: { saveData?: boolean } }).connection
    const saveData = conn?.saveData === true

    setEnabled(!reduce && isDesktop && !saveData)
  }, [])

  useEffect(() => {
    if (!enabled) return
    const v = videoRef.current
    if (!v) return
    // 자동재생이 브라우저 정책으로 거부되면 조용히 포기 (에러 노출 안 함)
    v.play().catch(() => setFailed(true))
  }, [enabled])

  if (!enabled || failed) return null

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <video
        ref={videoRef}
        className="w-full h-full object-cover opacity-[0.28]"
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        preload="metadata"
        onError={() => setFailed(true)}
      />
      {/* 텍스트 가독성 확보 — 영상 위에 흰색 그라데이션을 덮는다 */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/60 to-white" />
    </div>
  )
}
