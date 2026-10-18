'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Pause, Play } from 'lucide-react'

export default function OwnerHero() {
  const video = useRef<HTMLVideoElement>(null)
  const [motionAllowed, setMotionAllowed] = useState(false)
  const [pauseChoice, setPauseChoice] = useState<boolean | null>(null)
  const [failed, setFailed] = useState(false)
  const [playing, setPlaying] = useState(false)
  const paused = pauseChoice ?? !motionAllowed

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setMotionAllowed(!preference.matches)
    update()
    preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const element = video.current
    if (!element) return
    const sync = () => {
      if (paused || document.hidden || failed) element.pause()
      else void element.play().catch(() => setPlaying(false))
    }
    sync()
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [paused, failed])

  function togglePlayback() {
    const element = video.current
    if (!element) return
    if (playing) { setPauseChoice(true); element.pause(); return }
    setPauseChoice(false)
    setFailed(false)
    if (element.error) element.load()
    void element.play().catch(() => setPlaying(false))
  }

  return <section className="lu-owner-hero" aria-labelledby="home-title">
    <video ref={video} className="lu-owner-film" muted loop playsInline preload={motionAllowed ? 'metadata' : 'none'} poster="/hero/통합운영-20261018/unified-poster.jpg" onError={() => { setFailed(true); setPlaying(false) }} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} aria-hidden="true"><source src="/hero/통합운영-20261018/unified-hero.mp4" type="video/mp4" /></video>
    <div className="lu-owner-shade" aria-hidden="true" />
    <button type="button" onClick={togglePlayback} aria-label={playing ? '히어로 영상 일시정지' : '히어로 영상 재생'} className="lu-owner-play">{!playing ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}<span>{playing ? '일시정지' : '영상 재생'}</span></button>
    <div className="lu-owner-copy"><p className="lu-owner-eyebrow">사장님은 장사에 집중하세요</p><h1 id="home-title">흩어진 마케팅 업무를,<br />로컬루션 한곳에서.</h1><p className="lu-owner-description">리뷰 확인부터 콘텐츠 준비까지. <br className="hidden sm:block" />연결한 업무와 처리 결과를 한곳에서 확인하세요.</p><div className="lu-owner-actions"><Link href="/dashboard" className="lu-owner-primary">우리 가게 관리 시작하기<ArrowRight size={18} aria-hidden="true" /></Link><a href="/hero/통합운영-20261018/unified-story.mp4" target="_blank" rel="noopener noreferrer" className="lu-owner-secondary"><Play size={16} aria-hidden="true" />브랜드 영상 전체 보기<span className="sr-only"> · 새 창</span></a></div><p className="lu-owner-access">매장 관리는 로그인 후 이용해요. 공지·계산·홍보 링크는 로그인 없이 사용할 수 있어요.</p></div>
    <div className="lu-owner-bottom"><p>사장님의 시간을, 다시 가게로.</p><span>AI 상황 연출과 3D 영상 · 실제 고객 사례가 아닙니다.</span></div>
    {failed && <p role="status" className="lu-owner-fallback">영상 연결이 원활하지 않아 포스터로 안내하고 있어요. 아래 도구는 계속 사용할 수 있어요.</p>}
  </section>
}
