'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Compass, Search, RotateCcw } from 'lucide-react'
import { BUSINESS_AUDIENCES, BUSINESS_STARTS, TASK_ACTIONS, findBusinessTasks, type BusinessAudience, type BusinessTask } from '../../lib/tool-catalog'

const EXAMPLES = ['휴무 공지', '예약', '리뷰 답글', '수업 소개', '매장 검색', '원가 계산기', '할인', 'UTM']

function TaskCard({ task }: { task: BusinessTask }) {
  const action = TASK_ACTIONS[task.id]
  return (
    <article className="flex min-w-0 flex-col rounded-2xl border border-[#E5E8EB] bg-[#F8F9FA] p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-medium text-[#4E5968]">
        <span>{task.category}</span>
        <span className="rounded-lg bg-white px-2 py-1">{task.access === 'browser' ? '로그인 없이 사용' : task.access === 'account' ? '로그인과 이용 준비 필요' : '도구에서 실행 조건 확인'}</span>
      </div>
      <h3 className="text-base font-bold text-[#191F28]">{task.title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#4E5968]">{task.problem}</p>
      <dl className="my-4 space-y-2 text-sm leading-6">
        <div><dt className="font-semibold text-[#191F28]">준비할 정보</dt><dd className="text-[#4E5968]">{task.preparation}</dd></div>
        <div><dt className="font-semibold text-[#191F28]">얻는 결과</dt><dd className="text-[#4E5968]">{task.result}</dd></div>
        <div><dt className="font-semibold text-[#191F28]">다음 행동</dt><dd className="text-[#4E5968]">{action.next}</dd></div>
      </dl>
      <Link href={task.href} className="mt-auto inline-flex min-h-[44px] items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-[#3182F6] hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3182F6]">{action.label}<ArrowRight size={16} className="shrink-0" aria-hidden="true" /></Link>
    </article>
  )
}

export default function TaskFinder() {
  const [audience, setAudience] = useState<BusinessAudience>('all')
  const [query, setQuery] = useState('')
  const tasks = useMemo(() => findBusinessTasks(query, audience), [query, audience])
  const start = BUSINESS_STARTS[audience]
  const searching = query.trim().length > 0
  const recommended = start.tasks.map(id => tasks.find(task => task.id === id)).filter((task): task is BusinessTask => Boolean(task))
  const otherTasks = tasks.filter(task => !start.tasks.includes(task.id))
  const reset = () => { setAudience('all'); setQuery('') }

  return (
    <section id="find-tools" aria-labelledby="find-tools-title" className="scroll-mt-24 rounded-2xl border border-[#E5E8EB] bg-white p-4 shadow-sm md:p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#3182F6] to-[#1B64DA] shadow-sm"><Compass size={16} className="text-white" strokeWidth={2.5} aria-hidden="true" /></div>
        <div className="min-w-0">
          <h2 id="find-tools-title" className="text-lg font-bold text-[#191F28]">내 가게에 필요한 일부터 찾아보세요</h2>
          <p className="mt-1 text-sm leading-6 text-[#4E5968]">업종을 고르거나 짧은 검색어로 필요한 작업을 찾아보세요.</p>
        </div>
      </div>
      <fieldset className="mb-5">
        <legend className="mb-2 text-sm font-semibold text-[#191F28]">어떤 일을 하고 계신가요?</legend>
        <div className="flex flex-wrap gap-2">{BUSINESS_AUDIENCES.map(item => (
          <button key={item.id} type="button" aria-pressed={audience === item.id} onClick={() => setAudience(item.id)} className={`min-h-[44px] rounded-xl border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3182F6] ${audience === item.id ? 'border-[#3182F6] bg-blue-50 text-[#3182F6]' : 'border-[#E5E8EB] text-[#4E5968] hover:border-[#3182F6]'}`}>{item.label}</button>
        ))}</div>
      </fieldset>
      <label htmlFor="business-task-search" className="mb-2 block text-sm font-semibold text-[#191F28]">작업 검색</label>
      <div className="flex min-h-[48px] items-center gap-2 rounded-xl border border-[#E5E8EB] px-3 focus-within:border-[#3182F6] focus-within:ring-2 focus-within:ring-blue-100">
        <Search size={18} className="shrink-0 text-[#8B95A1]" aria-hidden="true" />
        <input id="business-task-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="예: 휴무" aria-describedby="task-search-hint" className="min-w-0 flex-1 bg-transparent py-3 text-base text-[#191F28] outline-none" />
      </div>
      <p id="task-search-hint" className="mt-2 text-xs leading-5 text-[#8B95A1]">휴무, 예약처럼 짧은 단어로 찾아보세요. 아래 예시를 눌러도 돼요.</p>
      <div className="mt-2 flex flex-wrap gap-2">{EXAMPLES.map(example => <button key={example} type="button" onClick={() => setQuery(example)} className="min-h-[44px] rounded-xl bg-[#F8F9FA] px-3 py-2 text-sm text-[#4E5968] hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3182F6]">{example}</button>)}</div>
      <div className="my-4 flex flex-wrap items-center justify-between gap-2">
        <p role="status" aria-live="polite" className="text-sm text-[#4E5968]">찾은 작업 <span className="font-semibold tabular-nums text-[#191F28]">{tasks.length}개</span></p>
        {(query || audience !== 'all') && <button type="button" onClick={reset} className="inline-flex min-h-[44px] items-center gap-1 rounded-xl px-3 text-sm font-semibold text-[#3182F6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3182F6]"><RotateCcw size={14} aria-hidden="true" />선택 초기화</button>}
      </div>
      {searching ? (
        tasks.length ? <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{tasks.map(task => <TaskCard key={task.id} task={task} />)}</div> : (
          <div className="rounded-2xl border border-dashed border-[#E5E8EB] p-6 text-center">
            <h3 className="font-semibold text-[#191F28]">일치하는 작업을 찾지 못했어요</h3>
            <p className="mt-2 text-sm leading-6 text-[#4E5968]">검색어를 짧게 바꾸거나 전체 업종에서 찾아보세요. 찾는 기능이 없으면 문의로 알려주세요.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={reset} className="min-h-[44px] rounded-xl bg-[#3182F6] px-4 py-2 text-sm font-semibold text-white">전체 작업 보기</button>
              <Link href="/inquiry" className="inline-flex min-h-[44px] items-center rounded-xl border border-[#E5E8EB] px-4 py-2 text-sm font-semibold text-[#4E5968]">필요한 기능 문의하기</Link>
            </div>
          </div>
        )
      ) : (
        <div>
          <h3 className="mb-2 font-bold text-[#191F28]">먼저 해볼 일</h3>
          <p className="mb-4 text-sm leading-6 text-[#4E5968]">{start.description}</p>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">{recommended.map(task => <TaskCard key={task.id} task={task} />)}</div>
          <details key={audience} className="mt-4 rounded-xl border border-[#E5E8EB] p-3">
            <summary className="min-h-[44px] cursor-pointer rounded-lg px-1 py-3 text-sm font-semibold text-[#3182F6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3182F6]">다른 작업 {otherTasks.length}개 모두 보기</summary>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">{otherTasks.map(task => <TaskCard key={task.id} task={task} />)}</div>
          </details>
        </div>
      )}
      <p className="mt-4 text-xs leading-5 text-[#8B95A1]">업종별 목록은 시작 순서를 제안해요. 다른 업종의 작업도 모두 둘러볼 수 있어요. 조회와 생성 기능은 계정, 플랫폼 연결 또는 이용 조건에 따라 달라질 수 있으니 결과를 확인한 뒤 다음 작업을 진행해주세요.</p>
    </section>
  )
}
