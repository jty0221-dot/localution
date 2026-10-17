'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, FileText, Layers3, Pause, Play, SlidersHorizontal } from 'lucide-react'

const scenes = [
  { title: '필요한 정보를 준비해요', detail: '매장명과 날짜, 판매가처럼 실제로 확인한 정보를 입력해요.', label: '01 · 입력', Icon: FileText },
  { title: '조건을 바꾸고 비교해요', detail: '행사 비용과 판매량을 바꾸며 결과가 어떻게 달라지는지 살펴봐요.', label: '02 · 확인', Icon: SlidersHorizontal },
  { title: '검토한 결과를 사용해요', detail: '공지와 홍보 링크, 계산 결과를 확인하고 필요한 파일로 보관해요.', label: '03 · 활용', Icon: Layers3 },
]

export default function WorkflowMotion() {
  const [active, setActive] = useState(0)
  const [playing, setPlaying] = useState(false)
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setPlaying(!preference.matches)
    update()
    preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => setActive(value => (value + 1) % scenes.length), 4200)
    return () => window.clearInterval(timer)
  }, [playing])
  const scene = scenes[active]
  return <section className="lu-motion-section" aria-labelledby="workflow-motion-title">
    <div className="lu-motion-copy"><p className="lu-label">먼저 흐름을 살펴보세요</p><h2 id="workflow-motion-title">어려운 기능 이름보다<br />하는 일을 보여드릴게요.</h2><p>준비할 정보부터 결과를 사용하는 방법까지. 짧은 영상과 단계별 안내를 보고 직접 시작해 보세요.</p><Link className="lu-primary inline-flex items-center gap-2" href="/help/videos">기능별 설명 영상 보기<ArrowRight size={17} aria-hidden="true" /></Link></div>
    <div className={`lu-motion-stage ${playing ? 'is-playing' : ''}`}>
      <div className="lu-motion-stack" aria-hidden="true"><div className="lu-motion-sheet lu-motion-sheet-back" /><div className="lu-motion-sheet lu-motion-sheet-mid" /><div className="lu-motion-sheet lu-motion-sheet-front"><scene.Icon size={36} strokeWidth={1.3} /><span>{scene.label}</span><strong>{scene.title}</strong><div className="lu-motion-bars"><i /><i /><i /></div></div></div>
      <div className="lu-motion-caption"><p className="font-semibold text-[var(--lu-ink)]">{scene.title}</p><p className="mt-1 text-sm text-[var(--lu-muted)]">{scene.detail}</p><p className="mt-2 text-xs text-[var(--lu-muted)]">기능 흐름을 설명하는 모션 그래픽입니다.</p></div>
      <div className="flex flex-wrap items-center justify-center gap-2 pt-3">{scenes.map((item, index) => <button key={item.label} type="button" onClick={() => { setActive(index); setPlaying(false) }} aria-pressed={active === index} className={`min-h-11 rounded-md border px-3 text-xs font-semibold ${active === index ? 'border-[var(--lu-accent)] bg-[var(--lu-accent-soft)] text-[var(--lu-accent)]' : 'border-[var(--lu-line)] bg-white text-[var(--lu-muted)]'}`}>{item.label}</button>)}<button type="button" onClick={() => setPlaying(value => !value)} className="inline-flex min-h-11 items-center gap-1 rounded-md border border-[var(--lu-line)] px-3 text-xs" aria-label={playing ? '모션 일시정지' : '모션 재생'}>{playing ? <Pause size={14} /> : <Play size={14} />}{playing ? '일시정지' : '재생'}</button></div>
    </div>
  </section>
}
