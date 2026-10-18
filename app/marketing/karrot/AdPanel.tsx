'use client'
import { useEffect, useState } from 'react'
type Campaign = { id: string; title: string; status: string }
type Metric = { id: string; duration: string; impression?: number; click?: number; cost?: string }
export default function AdPanel() {
  const [advertiser, setAdvertiser] = useState(''), [key, setKey] = useState(''), [connected, setConnected] = useState(false)
  const [start, setStart] = useState(''), [end, setEnd] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState('연결 상태를 확인하고 있어요.')
  const [report, setReport] = useState<{ campaigns: Campaign[]; performances: Metric[]; queried_at: string } | null>(null)
  useEffect(() => { let active = true; fetch('/api/karrot/account', { cache: 'no-store' }).then(async res => { const data = await res.json(); if (!active) return; if (!res.ok || !data.ok) { setMessage(data.error || '연결 상태를 확인하지 못했어요.'); return } setConnected(data.connected); setAdvertiser(data.advertiser_id || ''); setMessage(data.connected ? '저장된 광고 계정이 있어요. 조회할 기간을 선택해 주세요.' : '광고주 ID와 해당 계정의 API 키로 연결해 주세요.') }).catch(() => { if (active) setMessage('연결 상태를 확인하지 못했어요.') }); return () => { active = false } }, [])
  const connect = async () => {
    setBusy(true); setReport(null)
    try { const res = await fetch('/api/karrot/account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ advertiser_id: advertiser, api_key: key }) }); const data = await res.json(); if (!res.ok || !data.ok) { setMessage(data.error || '연결하지 못했어요.'); return } setConnected(true); setKey(''); setMessage('당근 조회 권한을 확인하고 연결 정보를 암호화해 저장했어요.') } catch { setMessage('연결하지 못했어요. 입력 내용을 확인해 주세요.') } finally { setBusy(false) }
  }
  const query = async () => {
    setBusy(true); setReport(null)
    try { const res = await fetch(`/api/karrot/report?${new URLSearchParams({ start, end })}`, { cache: 'no-store' }); const data = await res.json(); if (!res.ok || !data.ok) { setMessage(data.error || '조회하지 못했어요.'); return } setReport(data); setMessage('당근에서 받은 광고 성과를 불러왔어요.') } catch { setMessage('조회하지 못했어요. 잠시 후 다시 시도해 주세요.') } finally { setBusy(false) }
  }
  const disconnect = async () => {
    if (!window.confirm('로컬루션에 저장된 당근 광고 연결을 해제할까요? 당근 광고 자체는 변경되지 않아요.')) return
    setBusy(true)
    try { const res = await fetch('/api/karrot/account', { method: 'DELETE' }); const data = await res.json(); if (!res.ok || !data.ok) { setMessage(data.error || '연결을 해제하지 못했어요.'); return } setConnected(false); setKey(''); setReport(null); setMessage(data.removed ? '저장된 광고 연결을 해제했어요.' : '저장된 광고 연결이 없어요.') } catch { setMessage('연결을 해제하지 못했어요.') } finally { setBusy(false) }
  }
  const input = 'mt-2 min-h-11 w-full rounded-md border border-[#D5DEDC] bg-white p-3 text-base font-normal'
  const button = 'min-h-11 rounded-md bg-[#16685D] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50'
  return <section className="space-y-4 rounded-lg border border-[#D5DEDC] bg-white p-5" aria-labelledby="karrot-ad-connect">
    <h2 id="karrot-ad-connect" className="text-lg font-semibold">당근 광고 계정 연결·성과 조회</h2>
    <p className="text-sm leading-6 text-[#53656A]">광고비를 변경하거나 새 광고를 게시하지 않고 캠페인과 성과를 조회해요. API 키는 계정별로 암호화해 저장해요.</p>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-semibold">광고주 ID<input className={input} inputMode="numeric" autoComplete="off" value={advertiser} disabled={busy} onChange={e => { setAdvertiser(e.target.value); setConnected(false); setReport(null) }} /></label>
      <label className="text-sm font-semibold">광고 API 키<input className={input} type="password" autoComplete="new-password" value={key} disabled={busy} onChange={e => setKey(e.target.value)} /></label>
    </div>
    <button className={button} onClick={connect} disabled={busy || !advertiser || !key}>조회 권한 확인 후 연결</button>
    {connected && <button className="ml-3 min-h-11 rounded-md border border-[#D5DEDC] px-4 py-2 text-sm font-semibold" onClick={disconnect} disabled={busy}>연결 해제</button>}
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">시작일<input className={input} type="date" value={start} onChange={e => { setStart(e.target.value); setReport(null) }} /></label><label className="text-sm font-semibold">종료일<input className={input} type="date" value={end} onChange={e => { setEnd(e.target.value); setReport(null) }} /></label></div>
    <p className="text-xs leading-5 text-[#53656A]">한국 시간 기준 최대 31일, 첫 페이지의 캠페인 최대 50개를 조회해요. 전체 광고 계정 합계가 아닐 수 있어요.</p>
    <button className={button} onClick={query} disabled={busy || !connected || !start || !end}>광고 성과 조회</button>
    <p role="status" aria-live="polite" className="text-sm leading-6">{busy ? '당근 응답을 확인하고 있어요.' : message}</p>
    {report && <div className="space-y-3"><p className="text-sm">조회 캠페인 {report.campaigns.length}개 · 조회 시각 {new Date(report.queried_at).toLocaleString('ko-KR')}</p>{!report.performances.length ? <p className="text-sm">선택한 기간에 반환된 성과가 없어요.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">당근 캠페인 일별 성과</caption><thead><tr>{['캠페인', '기간', '노출', '클릭', '비용'].map(t => <th key={t} className="whitespace-nowrap border-b p-2">{t}</th>)}</tr></thead><tbody>{report.performances.map((m, i) => <tr key={`${m.id}-${m.duration}-${i}`}><td className="min-w-32 border-b p-2">{report.campaigns.find(c => c.id === m.id)?.title || m.id}</td><td className="whitespace-nowrap border-b p-2">{m.duration}</td><td className="border-b p-2">{m.impression ?? '미제공'}</td><td className="border-b p-2">{m.click ?? '미제공'}</td><td className="border-b p-2">{m.cost ?? '미제공'}</td></tr>)}</tbody></table></div>}</div>}
  </section>
}
