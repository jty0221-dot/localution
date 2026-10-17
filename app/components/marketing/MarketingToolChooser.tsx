'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Calculator, Megaphone, Search, ArrowRight, Link2 } from 'lucide-react'
import { BUSINESS_AUDIENCES, BUSINESS_STARTS, BUSINESS_TASKS, TASK_ACTIONS, type BusinessAudience } from '../../lib/tool-catalog'

const primaryTools = [
  { id: 'cost-calculator', Icon: Calculator, title: '원가·손익분기 계산기', badge: '로그인 없이 계산', preparation: '판매가·비용·판매량·영업일', result: '입력 조건에 따른 예상 이익과 목표 판매량', action: '계산 조건 입력하기' },
  { id: 'notice', Icon: Megaphone, title: '가게 공지 작성', badge: '로그인 없이 작성', preparation: '안내 유형·날짜·직접 확인한 내용', result: '확인하고 복사하거나 내려받는 공지 문안', action: '공지 문안 준비하기' },
  { id: 'business-search', Icon: Search, title: '매장·콘텐츠 검색', badge: '검색 실행 시 로그인 필요', preparation: '지역·검색어·검색할 내용', result: '출처를 확인할 수 있는 매장·게시글 검색 결과', action: '검색 조건 살펴보기' },
] as const
const secondaryTools = [
  { id: 'promotion-profit', Icon: Calculator, title: '할인·행사 수익 비교', badge: '로그인 없이 계산', preparation: '판매가·할인 조건·비용·예상 판매량·홍보비', result: '같은 한 달 가정의 행사 전후 예상 이익과 필요 판매량', action: '할인 조건 비교하기', note: '수수료는 할인 후 판매가 기준이며 할인액은 매장이 전액 부담하는 가정이에요.' },
  { id: 'campaign-url', Icon: Link2, title: 'UTM 홍보 링크 만들기', badge: '로그인 없이 링크 작성', preparation: '도착 주소·유입 출처·홍보 방식·캠페인 이름', result: '게시처를 구분하는 UTM 주소', action: '홍보 링크 만들기', note: '방문·문의 집계에는 도착 사이트의 별도 측정 설정이 필요해요.' },
] as const
const primaryIds = new Set<string>([...primaryTools, ...secondaryTools].map(tool => tool.id))
const linkClass = 'inline-flex min-h-[44px] items-center justify-between gap-2 rounded-[6px] px-3 py-2 text-sm font-semibold text-[var(--lu-accent)] hover:bg-[var(--lu-accent-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lu-accent)]'

export default function MarketingToolChooser() {
  const [audience, setAudience] = useState<BusinessAudience>('all')
  const start = BUSINESS_STARTS[audience]
  const recommended = start.tasks.filter(id => !primaryIds.has(id)).map(id => BUSINESS_TASKS.find(task => task.id === id)).filter(task => task !== undefined)
  const recommendedIds = new Set(recommended.map(task => task.id))
  const other = BUSINESS_TASKS.filter(task => !primaryIds.has(task.id) && !recommendedIds.has(task.id))
  return <section id="marketing-tools" aria-labelledby="marketing-tools-title" className="mb-8 scroll-mt-24 space-y-5">
    <div className="lu-tools-header"><h2 id="marketing-tools-title" className="text-lg font-bold text-[var(--lu-ink)] md:text-2xl">오늘 필요한 작업부터 시작하세요</h2><p className="mt-2 text-sm leading-6 text-[var(--lu-muted)]">준비할 정보와 얻는 결과를 확인하고 골라보세요.</p></div>
    <fieldset><legend className="mb-2 text-sm font-semibold text-[var(--lu-ink)]">내 업종</legend><div className="flex flex-wrap gap-2">{BUSINESS_AUDIENCES.map(item => <button key={item.id} type="button" aria-pressed={audience === item.id} onClick={() => setAudience(item.id)} className={`min-h-[44px] rounded-[6px] border px-3 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lu-accent)] ${audience === item.id ? 'border-[var(--lu-accent)] bg-[var(--lu-accent-soft)] text-[var(--lu-accent)]' : 'border-[var(--lu-line)] bg-white text-[var(--lu-muted)] hover:border-[var(--lu-accent)]'}`}>{item.label}</button>)}</div></fieldset>
    <p role="status" className="rounded-[6px] bg-[var(--lu-accent-soft)] p-3 text-sm leading-6 text-[var(--lu-accent-hover)]">{start.description}</p>
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">{primaryTools.map(tool => {
      const task = BUSINESS_TASKS.find(item => item.id === tool.id)!
      const Icon = tool.Icon
      return <article key={tool.id} className="flex min-w-0 flex-col rounded-[10px] border border-[var(--lu-line)] bg-white p-4 shadow-none md:p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] bg-[var(--lu-accent-soft)] shadow-none"><Icon size={18} className="text-[var(--lu-accent)]" strokeWidth={1.8} aria-hidden="true" /></span><span className="rounded-lg bg-[var(--lu-canvas)] px-2 py-1 text-xs font-medium text-[var(--lu-muted)]">{tool.badge}</span></div>
        <h3 className="break-words text-base font-bold text-[var(--lu-ink)]">{tool.title}</h3>
        <dl className="my-4 space-y-3 text-sm leading-6"><div><dt className="font-semibold text-[var(--lu-ink)]">준비할 정보</dt><dd className="text-[var(--lu-muted)]">{tool.preparation}</dd></div><div><dt className="font-semibold text-[var(--lu-ink)]">얻는 결과</dt><dd className="text-[var(--lu-muted)]">{tool.result}</dd></div></dl>
        {tool.id === 'business-search' && <p className="mb-3 text-xs leading-5 text-[var(--lu-muted)]">네이버·Google Maps 연결 설정에 따라 이용할 수 있어요.</p>}
        <Link href={task.href} className={`${linkClass} mt-auto w-full bg-[var(--lu-canvas)]`}>{tool.action}<ArrowRight size={16} className="shrink-0" aria-hidden="true" /></Link>
      </article>
    })}</div>
    <section aria-labelledby="promotion-tools-title" className="space-y-3"><h3 id="promotion-tools-title" className="text-base font-bold text-[var(--lu-ink)] md:text-lg">홍보 전에 한 번 더 확인하세요</h3><p className="text-sm text-[var(--lu-muted)]">이 브라우저에서 계산하고 작성해요.</p><div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{secondaryTools.map(tool => {
      const task = BUSINESS_TASKS.find(item => item.id === tool.id)!
      const Icon = tool.Icon
      return <article key={tool.id} className="flex min-w-0 flex-col rounded-[10px] border border-[var(--lu-line)] bg-white p-4 shadow-none md:p-5"><div className="mb-4 flex flex-wrap items-center gap-2"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] bg-[var(--lu-accent-soft)] shadow-none"><Icon size={18} className="text-[var(--lu-accent)]" strokeWidth={1.8} aria-hidden="true" /></span><span className="rounded-lg bg-[var(--lu-canvas)] px-2 py-1 text-xs text-[var(--lu-muted)]">{tool.badge}</span></div><h4 className="text-base font-bold text-[var(--lu-ink)]">{tool.title}</h4><dl className="my-4 space-y-3 text-sm leading-6"><div><dt className="font-semibold text-[var(--lu-ink)]">준비할 정보</dt><dd className="text-[var(--lu-muted)]">{tool.preparation}</dd></div><div><dt className="font-semibold text-[var(--lu-ink)]">얻는 결과</dt><dd className="text-[var(--lu-muted)]">{tool.result}</dd></div></dl><p className="mb-3 text-xs leading-5 text-[var(--lu-muted)]">{tool.note}</p><Link href={task.href} className={`${linkClass} mt-auto w-full bg-[var(--lu-canvas)]`}>{tool.action}<ArrowRight size={16} className="shrink-0" aria-hidden="true" /></Link></article>
    })}</div></section>
    {recommended.length > 0 && <nav aria-label="업종에 맞는 다음 작업" className="rounded-[10px] border border-[var(--lu-line)] bg-white p-4 shadow-none"><h3 className="font-semibold text-[var(--lu-ink)]">이어서 할 수 있는 일</h3><div className="mt-3 flex flex-wrap gap-2">{recommended.map(task => <Link key={task.id} href={task.href} className={linkClass}>{TASK_ACTIONS[task.id].label}<ArrowRight size={15} aria-hidden="true" /></Link>)}</div></nav>}
    <details key={audience} className="rounded-[10px] border border-[var(--lu-line)] bg-white p-4"><summary className="min-h-[44px] cursor-pointer py-3 font-semibold text-[var(--lu-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--lu-accent)]">다른 도구 {other.length}개 살펴보기</summary><div className="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-2">{other.map(task => <Link key={task.id} href={task.href} className={`${linkClass} border border-[var(--lu-line)]`}>{TASK_ACTIONS[task.id].label}<ArrowRight size={15} className="shrink-0" aria-hidden="true" /></Link>)}</div></details>
    <div className="flex flex-wrap gap-2"><Link href="/help#find-tools" className={linkClass}>업종별 전체 작업 찾기<ArrowRight size={16} aria-hidden="true" /></Link><Link href="/#tools" className={linkClass}>서비스 기능 안내<ArrowRight size={16} aria-hidden="true" /></Link></div>
  </section>
}
