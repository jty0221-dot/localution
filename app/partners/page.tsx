'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { Handshake, Building2, ExternalLink, Download, Copy, ArrowRight } from 'lucide-react'
import TopNav from '../components/TopNav'
import Footer from '../components/Footer'
import PageHeader from '../components/PageHeader'
import { SUPPORT_DIRECTORY, SUPPORT_DIRECTORY_CHECKED_AT } from '../lib/support-directory'

const control = 'min-h-11 w-full rounded-md border border-[var(--lu-line)] bg-white px-3 py-2 text-base leading-6'
type Proposal = { kind: 'private' | 'public'; company: string; offering: string; audience: string; period: string; budget: string }
const initial: Proposal = { kind: 'private', company: '', offering: '', audience: '', period: '', budget: '' }
export default function PartnersPage() {
 const [form, setForm] = useState<Proposal>(initial)
 const [draft, setDraft] = useState('')
 const [error, setError] = useState('')
 const [notice, setNotice] = useState('')
 function update<K extends keyof Proposal>(key: K, value: Proposal[K]) { setForm(previous => ({ ...previous, [key]: value })); setDraft(''); setNotice(''); setError('') }
 function create(event: FormEvent) {
  event.preventDefault(); setError(''); setNotice('')
  if (form.company.trim().length < 2 || form.offering.trim().length < 10) { setDraft(''); setError('업체·기관명은 2자 이상, 제안 내용은 10자 이상 입력해주세요.'); return }
  setDraft([form.kind === 'private' ? '민간 제휴·광고 제안 초안' : '공공 광고·홍보 참여 검토 초안', '', `업체·기관: ${form.company.trim()}`, `제안 내용: ${form.offering.trim()}`, `전달 대상: ${form.audience.trim() || '협의 필요'}`, `희망 기간: ${form.period.trim() || '협의 필요'}`, `예산 범위: ${form.budget.trim() || '협의 필요'}`, '', '위 내용은 검토용 초안입니다. 발송·접수·계약·매체 등록·공공사업 선정이 완료된 상태가 아닙니다.'].join('\n'))
 }
 function download() {
  if (!draft) return
  const url = URL.createObjectURL(new Blob(['\uFEFF' + draft], { type: 'text/plain;charset=utf-8' }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = '로컬루션_제휴제안_초안.txt'; anchor.click(); URL.revokeObjectURL(url)
  setNotice('초안 파일 다운로드를 요청했습니다. 브라우저의 다운로드 목록에서 파일을 확인해주세요.')
 }
 async function copy() {
  if (!draft) return
  try { await navigator.clipboard.writeText(draft); setNotice('초안을 복사했습니다. 문의 내용에 붙여넣고 검토한 뒤 접수해주세요.') }
  catch { setNotice('자동 복사를 사용할 수 없습니다. 아래 초안 내용을 선택해서 직접 복사해주세요.') }
 }
 return <div className="min-h-screen bg-[var(--lu-canvas)] pt-16">
  <TopNav /><PageHeader icon={<Handshake size={20} />} title="제휴·광고 안내" subtitle="민간 제휴 제안과 공공 광고·홍보 참여 준비를 구분해서 확인하세요." badge="제안 준비" />
  <main className="mx-auto max-w-6xl space-y-8 px-4 py-6 md:px-6 md:py-8">
   <section className="grid gap-4 md:grid-cols-2" aria-label="제휴 참여 방식">
    <article className="rounded-[10px] border border-[var(--lu-line)] bg-white p-4 md:p-6"><Handshake size={22} className="text-[var(--lu-accent)]" /><h2 className="mt-4 text-xl font-semibold">민간 제휴·광고 제안</h2><p className="mt-3 text-sm leading-6 text-[var(--lu-muted)]">소상공인에게 소개하려는 상품·서비스, 전달 대상, 희망 기간과 예산 범위를 정리해 제안할 수 있습니다.</p><p className="mt-3 text-sm leading-6 text-[var(--lu-muted)]">광고 요금과 게재 조건은 제안 검토 후 협의합니다. 계약이나 광고 게재가 확정된 상태는 아닙니다.</p><a href="#proposal-draft" onClick={() => update('kind', 'private')} className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--lu-accent)]">민간 제안 초안 준비<ArrowRight size={16} /></a></article>
    <article className="rounded-[10px] border border-[var(--lu-line)] bg-white p-4 md:p-6"><Building2 size={22} className="text-[var(--lu-accent)]" /><h2 className="mt-4 text-xl font-semibold">공공 광고·홍보 참여 준비</h2><p className="mt-3 text-sm leading-6 text-[var(--lu-muted)]">기관의 공식 공고와 참여 절차를 확인하고, 제안 범위와 필요한 자료를 정리하는 경로입니다.</p><p className="mt-3 text-sm leading-6 text-[var(--lu-muted)]">정부 매체 등록, 기관 제휴, 수주 또는 참여 자격이 확정된 상태를 뜻하지 않습니다. 해당 절차와 자격은 공식 안내를 확인해야 합니다.</p><a href="#proposal-draft" onClick={() => update('kind', 'public')} className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--lu-accent)]">공공 참여 준비 초안<ArrowRight size={16} /></a></article>
   </section>
   <section aria-labelledby="public-links-title"><h2 id="public-links-title" className="text-xl font-semibold">공공 광고·조달 공식 안내</h2><p className="mt-2 text-xs text-[var(--lu-muted)]">공식 사이트 확인일 {SUPPORT_DIRECTORY_CHECKED_AT}</p><div className="mt-4 grid gap-4 md:grid-cols-2">{SUPPORT_DIRECTORY.filter(item => item.group === 'public').map(item => <a key={item.id} href={item.href} target="_blank" rel="noopener noreferrer" className="rounded-[10px] border border-[var(--lu-line)] bg-white p-5"><span className="flex min-h-11 items-center justify-between gap-3 font-semibold">{item.title}<ExternalLink size={16} /></span><p className="mt-2 text-sm leading-6 text-[var(--lu-muted)]">{item.description}</p></a>)}</div></section>
   <section id="proposal-draft" aria-labelledby="proposal-title" className="scroll-mt-24 rounded-[10px] border border-[var(--lu-line)] bg-white p-4 md:p-6">
    <h2 id="proposal-title" className="text-xl font-semibold">제안 초안 만들기</h2><p className="mt-2 text-sm leading-6 text-[var(--lu-muted)]">입력 내용은 이 화면에서만 사용하며 서버나 브라우저 저장소에 저장하지 않습니다. 초안 파일을 저장하거나 직접 복사한 후 문의 접수에서 검토해주세요.</p>
    <form onSubmit={create} className="mt-6 space-y-4">
     <fieldset><legend className="mb-2 text-xs font-semibold">제안 방식</legend><div className="flex flex-wrap gap-2">{([{ value: 'private', label: '민간 제휴·광고' }, { value: 'public', label: '공공 광고·홍보 준비' }] as const).map(item => <button key={item.value} type="button" aria-pressed={form.kind === item.value} onClick={() => update('kind', item.value)} className={`min-h-11 rounded-md border px-4 text-sm font-semibold ${form.kind === item.value ? 'border-[var(--lu-accent)] bg-[var(--lu-accent-soft)] text-[var(--lu-accent)]' : 'border-[var(--lu-line)] text-[var(--lu-muted)]'}`}>{item.label}</button>)}</div></fieldset>
     <div className="grid gap-4 md:grid-cols-2"><label className="space-y-2 text-xs font-semibold">업체·기관명<input className={control} value={form.company} onChange={e => update('company', e.target.value)} maxLength={80} required minLength={2} autoComplete="organization" /></label><label className="space-y-2 text-xs font-semibold">전달하고 싶은 대상<input className={control} value={form.audience} onChange={e => update('audience', e.target.value)} maxLength={160} /></label></div>
     <label className="block space-y-2 text-xs font-semibold">제안 내용<textarea className={control + ' min-h-36 resize-y'} rows={5} value={form.offering} onChange={e => update('offering', e.target.value)} maxLength={2000} minLength={10} required aria-describedby="proposal-content-hint" /></label><p id="proposal-content-hint" className="text-xs leading-5 text-[var(--lu-muted)]">상품·서비스와 협력하려는 내용을 적어주세요. 비밀번호, 계좌번호, 고객 명단 등 민감한 정보는 입력하지 마세요.</p>
     <div className="grid gap-4 md:grid-cols-2"><label className="space-y-2 text-xs font-semibold">희망 기간<input className={control} value={form.period} onChange={e => update('period', e.target.value)} maxLength={100} /></label><label className="space-y-2 text-xs font-semibold">예산 범위<input className={control} value={form.budget} onChange={e => update('budget', e.target.value)} maxLength={100} aria-describedby="proposal-budget-hint" /></label></div><p id="proposal-budget-hint" className="text-xs text-[var(--lu-muted)]">금액을 정하지 않았다면 비워두세요. 입력한 예산은 견적이나 확정 요금이 아닙니다.</p>
     {error && <p role="alert" className="text-sm text-[var(--lu-danger)]">{error}</p>}<button type="submit" className="lu-primary min-h-11">초안 만들기</button>
    </form>
    {draft && <section className="mt-6 border-t border-[var(--lu-line)] pt-6" aria-labelledby="proposal-result-title"><h3 id="proposal-result-title" className="text-base font-semibold">검토용 제안 초안</h3><textarea readOnly aria-label="제안 초안 내용" value={draft} rows={12} className={control + ' mt-3 resize-y'} /><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={download} className="lu-primary inline-flex min-h-11 items-center gap-2"><Download size={16} />TXT 내려받기</button><button type="button" onClick={copy} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[var(--lu-line)] px-4 text-sm font-semibold"><Copy size={16} />초안 복사</button><Link href="/inquiry" className="inline-flex min-h-11 items-center gap-2 px-3 text-sm font-semibold text-[var(--lu-accent)]">문의 접수로 이동<ArrowRight size={16} /></Link></div><p className="mt-3 text-xs leading-5 text-[var(--lu-muted)]">문의 화면에 자동으로 전송되지 않습니다. 복사한 초안을 붙여넣고, 접수 버튼을 직접 눌러주세요.</p></section>}
    {notice && <p role="status" className="mt-4 text-sm leading-6 text-[var(--lu-muted)]">{notice}</p>}
   </section>
   <p className="text-sm leading-6 text-[var(--lu-muted)]">소상공인 지원사업을 찾고 계신가요? <Link href="/support" className="inline-flex min-h-11 items-center font-semibold text-[var(--lu-accent)] underline">공식 지원정보 보기</Link></p>
  </main><Footer />
 </div>
}
