'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { Copy, Download, Megaphone } from 'lucide-react'
import TopNav from '../../components/TopNav'
import Footer from '../../components/Footer'
import { ToolNavigation, ToolNextSteps } from '../../components/marketing/ToolWorkflow'
import PageHeader from '../../components/PageHeader'
import AnswerBlock from '../../components/seo/AnswerBlock'
import { EMPTY_NOTICE, generateNotice, NOTICE_TYPES, type NoticeErrors, type NoticeInput, type NoticeType } from '../../lib/business-notice'

export default function NoticePage() {
  const [input, setInput] = useState<NoticeInput>({ ...EMPTY_NOTICE })
  const [errors, setErrors] = useState<NoticeErrors>({})
  const [result, setResult] = useState('')
  const [snapshot, setSnapshot] = useState('')
  const [message, setMessage] = useState('')
  const preview = useRef<HTMLTextAreaElement>(null)
  const current = JSON.stringify(input)
  const stale = Boolean(result && snapshot !== current)
  const ready = Boolean(result && !stale)
  const period = ['holiday', 'hours', 'booking'].includes(input.type)
  const fieldClass = 'mt-2 block w-full min-h-[44px] rounded-[6px] border border-[#D1D6DB] bg-white px-3 py-2.5 text-base text-[var(--lu-ink)] outline-none focus:border-[var(--lu-accent)] focus:ring-2 focus:ring-blue-100'

  function update(key: keyof NoticeInput, value: string) {
    setInput(previous => ({ ...previous, [key]: value }))
    setMessage('')
  }
  function changeType(type: NoticeType) {
    setInput(previous => ({ ...EMPTY_NOTICE, store: previous.store, type }))
    setErrors({})
    setMessage('')
  }
  function build(event: React.FormEvent) {
    event.preventDefault()
    const generated = generateNotice(input)
    setErrors(generated.errors)
    setMessage('')
    if (!generated.text) {
      setResult('')
      requestAnimationFrame(() => document.getElementById(`notice-${Object.keys(generated.errors)[0]}`)?.focus())
      return
    }
    setResult(generated.text)
    setSnapshot(current)
    setMessage('공지 초안이 준비됐어요. 내용이 맞는지 확인해 주세요.')
  }
  async function copy() {
    if (!ready) return
    try {
      await navigator.clipboard.writeText(result)
      setMessage('공지 내용을 복사했어요.')
    } catch {
      preview.current?.focus()
      preview.current?.select()
      setMessage('자동 복사가 지원되지 않아요. 선택된 내용을 길게 누르거나 Ctrl+C로 복사해 주세요.')
    }
  }
  function download() {
    if (!ready) return
    const url = URL.createObjectURL(new Blob(['\uFEFF', result], { type: 'text/plain;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = '가게공지.txt'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setMessage('텍스트 파일 다운로드를 요청했어요.')
  }
  function field(key: keyof NoticeInput, label: string, type = 'text', optional = false, placeholder = '') {
    return <div><label htmlFor={`notice-${key}`} className="text-sm font-semibold">{label}{optional ? ' · 선택' : ' · 필수'}</label><input id={`notice-${key}`} type={type} value={input[key]} onChange={event => update(key, event.target.value)} required={!optional} maxLength={key === 'store' ? 60 : 300} placeholder={placeholder} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `error-${key}` : undefined} className={fieldClass} />{errors[key] && <p id={`error-${key}`} className="mt-2 text-sm text-red-700">{errors[key]}</p>}</div>
  }

  return <div className="min-h-screen bg-[var(--lu-canvas)] text-[var(--lu-ink)]">
    <TopNav />
    <PageHeader className="mt-16" icon={<Megaphone className="text-white" size={28} />} title="가게 공지 작성" subtitle="필요한 정보만 입력하고 고객에게 전할 공지를 준비하세요." />
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:px-6 md:py-8">
      <ToolNavigation />
      <p className="max-w-4xl text-sm leading-6 text-[var(--lu-muted)]">음식점·카페, 미용·생활서비스, 교육, 소매점과 1인 사업장 모두 사용할 수 있어요. 로그인이나 AI 연결 없이 이 브라우저에서 문안을 만듭니다. 입력값을 서버로 보내거나 자동으로 저장하지 않아요. 페이지를 나가면 작성 내용이 사라집니다.</p>
      <div className="grid min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <form onSubmit={build} noValidate className="min-w-0 space-y-5 rounded-[10px] border border-[var(--lu-line)] bg-white p-4 shadow-none md:p-6">
          <h2 className="text-lg font-bold">어떤 소식을 전할까요?</h2>
          <div><label htmlFor="notice-type" className="text-sm font-semibold">공지 종류</label><select id="notice-type" className={fieldClass} value={input.type} onChange={event => changeType(event.target.value as NoticeType)}>{Object.entries(NOTICE_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><p className="mt-2 text-sm text-[var(--lu-muted)]">공지 종류를 바꾸면 매장명을 제외한 입력 내용은 초기화돼요.</p></div>
          {field('store', '매장명', 'text', false, '예: 동네공방')}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{field('startDate', input.type === 'move' ? '이전 후 운영 시작일' : input.type === 'launch' ? '시작일' : '시작 날짜', 'date')}{period && field('endDate', '종료 날짜', 'date', true)}</div>
          {period && <p className="text-sm text-[var(--lu-muted)]">휴무는 종료 날짜를 비우면 하루 휴무로 안내해요. 영업시간과 예약은 종료 날짜를 비우면 시작일부터 적용하는 공지를 만듭니다.</p>}
          {input.type === 'hours' && <><div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{field('openTime', '영업 시작', 'time')}{field('closeTime', '영업 마감', 'time')}</div><p className="text-sm text-[var(--lu-muted)]">마감이 시작보다 이르면 다음 날 마감으로 안내해요. 24시간 영업은 추가 내용에 직접 적어 주세요.</p></>}
          {input.type === 'booking' && field('bookingMethod', '예약 방법', 'text', false, '예: 네이버 예약에서 날짜 선택')}
          {input.type === 'move' && field('address', '새 매장 주소')}
          <div><label htmlFor="notice-details" className="text-sm font-semibold">{input.type === 'launch' ? '새 메뉴·서비스 내용 · 필수' : '추가로 전할 내용 · 선택'}</label><textarea id="notice-details" value={input.details} onChange={event => update('details', event.target.value)} maxLength={1000} rows={4} required={input.type === 'launch'} aria-invalid={Boolean(errors.details)} aria-describedby={errors.details ? 'error-details' : 'details-hint'} className={fieldClass} /><p id="details-hint" className="mt-2 text-sm text-[var(--lu-muted)]">확정한 정보만 적어 주세요. 가격이나 연락처는 입력한 경우에만 포함돼요.</p>{errors.details && <p id="error-details" className="mt-2 text-sm text-red-700">{errors.details}</p>}</div>
          {Object.keys(errors).length > 0 && <p role="alert" className="rounded-[6px] bg-red-50 p-3 text-sm text-red-700">입력 내용을 확인해 주세요. 표시된 항목을 수정하면 공지를 만들 수 있어요.</p>}
          <button type="submit" className="min-h-[48px] w-full rounded-[6px] bg-[var(--lu-accent)] px-4 py-3 font-semibold text-white hover:bg-[var(--lu-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">{stale ? '바뀐 내용으로 공지 만들기' : '공지 미리보기 만들기'}</button>
        </form>
        <section aria-labelledby="preview-heading" className="min-w-0 space-y-4 rounded-[10px] border border-[var(--lu-line)] bg-white p-4 shadow-none md:p-6">
          <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-[6px] bg-[var(--lu-accent-soft)] shadow-none ring-1 ring-blue-100"><Megaphone size={16} className="text-[var(--lu-accent)]" strokeWidth={1.8} /></span><h2 id="preview-heading" className="text-lg font-bold">고객에게 보여줄 공지</h2></div>
          {stale && <p role="status" className="rounded-[6px] bg-amber-50 p-3 text-sm text-amber-900">입력이 바뀌었어요. 아래는 이전 초안입니다. 공지를 다시 만들면 복사와 다운로드를 사용할 수 있어요.</p>}
          <label htmlFor="notice-preview" className="sr-only">공지 미리보기</label><textarea id="notice-preview" ref={preview} readOnly value={result} placeholder="정보를 입력한 뒤 공지 미리보기를 만들어 주세요." rows={15} className={`${fieldClass} resize-y leading-7`} />
          <p className="text-sm leading-6 text-[var(--lu-muted)]">날짜, 시간, 주소와 예약 방법을 확인한 뒤 원하는 채널에 직접 붙여 넣으세요. 자동으로 게시되지는 않아요.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><button type="button" onClick={copy} disabled={!ready} className="flex min-h-[44px] items-center justify-center gap-2 rounded-[6px] border border-[#D1D6DB] px-4 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-40"><Copy size={16} />공지 복사</button><button type="button" onClick={download} disabled={!ready} className="flex min-h-[44px] items-center justify-center gap-2 rounded-[6px] border border-[#D1D6DB] px-4 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-40"><Download size={16} />텍스트 다운로드</button></div>
          <p role="status" aria-live="polite" className="min-h-[24px] text-sm text-[var(--lu-accent-hover)]">{message}</p>
        </section>
      </div>
      {ready && <ToolNextSteps current="notice" />}
      <AnswerBlock question="가게 공지 작성 도우미는 어떻게 쓰나요?" answer="공지 종류를 고르고 매장명과 날짜 등 필요한 정보를 입력하면 공지 초안을 만들 수 있어요. 내용을 확인한 뒤 복사하거나 텍스트 파일로 내려받아 원하는 채널에 직접 게시하세요." facts={['휴무, 영업시간, 예약, 새 메뉴·서비스, 이전 공지를 지원해요.', '입력한 정보만 사용하며 예약 조건이나 가격을 임의로 만들지 않아요.', '작성한 내용은 브라우저 안에서만 처리하고 자동 저장하지 않아요.']} />
    </main>
    <Footer />
  </div>
}
