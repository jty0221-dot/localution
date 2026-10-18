'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Search, Video, AlertCircle } from 'lucide-react'
import { FEATURE_GUIDES, FEATURE_CONDITIONS } from '../../lib/feature-guides'

function FeatureVideo({ id, title, video, poster, captions }: typeof FEATURE_GUIDES[number]) {
  const [failed, setFailed] = useState(false)
  return <div className="overflow-hidden rounded-[10px] border border-[var(--lu-line)] bg-[var(--lu-canvas)]"><video controls playsInline preload="none" poster={poster} aria-label={`${title} 절차 설명 영상`} className="aspect-video w-full bg-[#172B2F]" onError={() => setFailed(true)}><source src={video} type="video/mp4" /><track kind="captions" src={captions} srcLang="ko" label="한국어" default />영상 재생을 지원하는 브라우저에서 확인해 주세요.</video>{failed && <div className="flex gap-2 p-4 text-sm text-[var(--lu-muted)]" role="status"><AlertCircle size={18} className="shrink-0" />영상을 불러오지 못했어요. 아래 단계별 설명으로 계속 확인하거나 페이지를 새로고침해 주세요.</div>}</div>
}

function accessLabel(guide: typeof FEATURE_GUIDES[number]) {
  return guide.id === 'customers' ? '게스트 기기 보관 · 로그인 시 서버 관리' : guide.access === 'browser' ? '로그인 없이 사용' : guide.access === 'account' ? '로그인과 연결 확인 필요' : '서비스 설정 확인 필요'
}

export default function FeatureVideoLibrary() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('전체')
  const [selectedId, setSelectedId] = useState(FEATURE_GUIDES[0]?.id ?? '')
  const categories = ['전체', ...Array.from(new Set(FEATURE_GUIDES.map(item => item.category)))]
  const results = FEATURE_GUIDES.filter(item => (category === '전체' || item.category === category) && `${item.title} ${item.problem} ${item.searchTerms.join(' ')}`.normalize('NFKC').toLowerCase().includes(query.normalize('NFKC').trim().toLowerCase()))
  const guide = results.find(item => item.id === selectedId) ?? results[0]

  return <>
    <div className="lu-panel mb-5 p-4 md:p-6">
      <label className="mb-2 block text-sm font-semibold" htmlFor="feature-video-search">어떤 기능이 궁금하세요?</label>
      <div className="relative"><Search size={18} className="absolute left-3 top-3.5 text-[var(--lu-muted)]" aria-hidden="true" /><input id="feature-video-search" type="search" value={query} onChange={event => setQuery(event.target.value)} className="lu-control pl-10" placeholder="공지, 원가, 리뷰, QR 등으로 찾아보세요" /></div>
      <div className="mt-4 flex flex-wrap gap-2" aria-label="영상 분류">{categories.map(item => <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)} className={`min-h-11 rounded-md border px-3 text-sm ${category === item ? 'border-[var(--lu-accent)] bg-[var(--lu-accent-soft)] text-[var(--lu-accent)]' : 'border-[var(--lu-line)] bg-white text-[var(--lu-muted)]'}`}>{item}</button>)}</div>
      <p role="status" className="mt-3 text-xs text-[var(--lu-muted)]">설명 {results.length}개{guide ? ` · 선택한 영상: ${guide.title}` : ''}</p>
    </div>
    {guide ? <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(240px,0.8fr)_minmax(0,2fr)]">
      <nav aria-label="기능 설명 선택" className="lu-panel max-h-72 min-w-0 overflow-y-auto p-2 lg:max-h-[640px]"><ul className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-1">{results.map(item => <li key={item.id} className="min-w-0"><button type="button" aria-pressed={guide.id === item.id} aria-controls="selected-feature-video" onClick={() => setSelectedId(item.id)} className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-3 py-3 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lu-accent)] ${guide.id === item.id ? 'bg-[var(--lu-accent-soft)] font-semibold text-[var(--lu-accent)]' : 'text-[var(--lu-ink)] hover:bg-[var(--lu-canvas)]'}`}><span className="min-w-0 break-words">{item.title}<span className="mt-1 block text-xs font-normal text-[var(--lu-muted)]">{item.category}</span></span><Video size={16} className="shrink-0" aria-hidden="true" /></button></li>)}</ul></nav>
      <article id="selected-feature-video" aria-labelledby="selected-feature-title" className="lu-panel min-w-0 scroll-mt-24 p-4 md:p-6">
        <p className="lu-label">{guide.category} · {accessLabel(guide)}</p><h2 id="selected-feature-title" className="mb-4 mt-2 text-xl font-semibold text-[var(--lu-ink)]">{guide.title}</h2>
        <FeatureVideo key={guide.id} {...guide} />
        <p className="mt-2 text-xs leading-5 text-[var(--lu-muted)]">출처: 로컬루션 자체 제작 무음 모션 그래픽. 입력과 사용 순서를 설명하며, 실시간 수집·발행 성공을 보여주는 영상은 아니에요. 영상의 자막 메뉴에서 한국어를 선택할 수 있어요.</p>
        <div className="mt-5 border-t border-[var(--lu-line)] pt-5"><h3 className="text-sm font-semibold">시작 전에 준비해 주세요</h3><p className="mt-2 text-sm leading-6 text-[var(--lu-muted)]">{guide.preparation}</p><ol className="my-5 space-y-3">{guide.steps.map((step, index) => <li key={step} className="flex gap-3 text-sm leading-6"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--lu-accent-soft)] text-xs font-semibold text-[var(--lu-accent)]">{index + 1}</span><span>{step}</span></li>)}</ol><p className="mb-4 text-sm leading-6 text-[var(--lu-muted)]">{guide.result}</p>{FEATURE_CONDITIONS[guide.id] && <p className="mb-4 rounded-md border border-[var(--lu-line)] bg-[var(--lu-canvas)] p-3 text-xs leading-6 text-[var(--lu-muted)]">{FEATURE_CONDITIONS[guide.id]}</p>}<Link href={guide.href} className="lu-primary inline-flex min-h-11 items-center gap-2">이 기능 열기<ArrowRight size={16} aria-hidden="true" /></Link></div>
      </article>
    </div> : <div className="lu-panel p-8 text-center"><h2 className="font-semibold">맞는 설명을 찾지 못했어요.</h2><p className="mt-2 text-sm text-[var(--lu-muted)]">검색어를 줄이거나 전체 분류에서 다시 찾아보세요.</p><button type="button" className="mt-4 min-h-11 rounded-md px-4 text-[var(--lu-accent)]" onClick={() => { setQuery(''); setCategory('전체') }}>전체 설명 다시 보기</button></div>}
  </>
}
