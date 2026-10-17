'use client'
import { useRef, useState } from 'react'
import { Link2, Copy, Download } from 'lucide-react'
import TopNav from '../../components/TopNav'
import Footer from '../../components/Footer'
import { ToolNavigation, ToolNextSteps } from '../../components/marketing/ToolWorkflow'
import PageHeader from '../../components/PageHeader'
import { buildCampaignUrl, EMPTY_CAMPAIGN_INPUT, type CampaignInput } from '../../lib/campaign-url'

const fields: { key: keyof CampaignInput; label: string; hint: string; required?: boolean }[] = [
  { key: 'url', label: '도착할 홈페이지 주소', hint: 'https://로 시작하는 전체 주소', required: true },
  { key: 'source', label: '유입 출처', hint: '예: instagram, blog, kakao', required: true },
  { key: 'medium', label: '홍보 방식', hint: '예: social, referral, message', required: true },
  { key: 'campaign', label: '캠페인 이름', hint: '예: 봄맞이신메뉴. 같은 홍보에는 같은 이름을 써주세요.', required: true },
  { key: 'content', label: '게시물 구분', hint: '예: 프로필, 첫번째배너' },
  { key: 'term', label: '검색어 구분', hint: '검색 광고 키워드를 구분할 때 사용해요.' },
]
const presets = [{ label: '인스타그램', source: 'instagram', medium: 'social' }, { label: '네이버 블로그', source: 'naver_blog', medium: 'referral' }, { label: '카카오 채널', source: 'kakao', medium: 'message' }]
const button = 'min-h-[44px] rounded-xl border border-[#E5E8EB] bg-white px-4 py-2 text-sm font-semibold hover:bg-[#F8F9FA] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-[#3182F6]'
export default function CampaignUrlPage() {
  const [input, setInput] = useState<CampaignInput>({ ...EMPTY_CAMPAIGN_INPUT })
  const [generated, setGenerated] = useState<{ signature: string; url: string; auto: boolean } | null>(null)
  const [status, setStatus] = useState('')
  const [manual, setManual] = useState(false)
  const output = useRef<HTMLTextAreaElement>(null)
  const signature = JSON.stringify(input)
  const validation = buildCampaignUrl(input)
  const current = generated?.signature === signature ? generated : null
  const stale = !!generated && !current
  function update(values: Partial<CampaignInput>) { setInput(previous => ({ ...previous, ...values })); setStatus(''); setManual(false) }
  async function copy() {
    if (!current) return
    const captured = current.url
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable')
      await navigator.clipboard.writeText(captured)
      setStatus('생성한 링크를 복사했어요.')
    } catch { setManual(true); setStatus('자동 복사를 사용할 수 없어요. 아래 링크를 선택해 직접 복사해 주세요.'); output.current?.focus(); output.current?.select() }
  }
  function download() {
    if (!current) return
    const url = URL.createObjectURL(new Blob([current.url + '\r\n'], { type: 'text/plain;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = '홍보링크.txt'; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setStatus('링크 텍스트 파일 다운로드를 요청했어요.')
  }
  return <div className="min-h-screen bg-[#F8F9FA] text-[#191F28]"><TopNav /><main className="pt-16"><PageHeader icon={<Link2 size={28} aria-hidden="true" />} title="UTM 홍보 링크 생성기" subtitle="어디에 올린 홍보에서 방문했는지 구분할 수 있는 링크를 만들어 보세요." badge="무료 마케팅 도구" />
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-6 md:px-6">
      <ToolNavigation />
      <p className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-relaxed text-blue-900">링크 생성은 브라우저에서 처리해요. 외부 계정 연결이나 게시물 발송 없이 사용할 수 있어요.</p>
      <section className="rounded-2xl border border-[#E5E8EB] bg-white p-4 shadow-sm md:p-6" aria-labelledby="form-title"><div className="mb-4 flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-sm"><Link2 size={16} className="text-white" strokeWidth={2.5} aria-hidden="true" /></div><h2 id="form-title" className="text-lg font-bold">홍보 정보 입력</h2></div>
        <p className="mb-3 text-sm text-gray-600">자주 쓰는 출처를 선택하면 유입 출처와 홍보 방식만 채워져요.</p><div className="mb-6 flex flex-wrap gap-2">{presets.map(preset => <button key={preset.source} className={button} type="button" onClick={() => update({ source: preset.source, medium: preset.medium })}>{preset.label}</button>)}</div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">{fields.map(field => { const error = input[field.key] !== '' ? validation.errors[field.key] : undefined; return <div key={field.key} className={field.key === 'url' ? 'min-w-0 sm:col-span-2' : 'min-w-0'}><label htmlFor={`utm-${field.key}`} className="mb-2 block text-sm font-semibold">{field.label} · {field.required ? '필수' : '선택'}</label><input id={`utm-${field.key}`} type={field.key === 'url' ? 'url' : 'text'} autoComplete="off" spellCheck={false} required={field.required} value={input[field.key]} maxLength={field.key === 'url' ? 4096 : 200} aria-invalid={!!error} aria-describedby={`hint-${field.key}${error ? ` error-${field.key}` : ''}`} onChange={event => update({ [field.key]: event.target.value })} className={`min-h-[44px] w-full rounded-xl border px-3 text-base focus:outline-[#3182F6] ${error ? 'border-red-500' : 'border-[#E5E8EB]'}`} /><p id={`hint-${field.key}`} className="mt-1 text-xs leading-relaxed text-gray-500">{field.hint}</p>{error && <p id={`error-${field.key}`} className="mt-1 text-sm text-red-600">{error}</p>}</div> })}</div>
        <p className="mt-5 text-xs leading-relaxed text-gray-600">출처와 홍보 방식은 소문자로 자동 변환해요. 캠페인 이름과 선택 항목의 대소문자는 유지해요. 앞뒤 공백은 제외해요. 이름·전화번호·이메일 등 개인정보는 입력하지 마세요.</p>
        <div className="mt-5 flex flex-wrap gap-2"><button type="button" disabled={!validation.valid} className="min-h-[44px] rounded-xl bg-[#3182F6] px-5 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40" onClick={() => { setGenerated({ signature, url: validation.url, auto: validation.hasAutoTag }); setManual(false); setStatus('홍보 링크를 만들었어요. 연결할 홈페이지와 홍보 정보를 확인한 뒤 사용해 주세요.') }}>홍보 링크 만들기</button><button type="button" className={button} onClick={() => update({ url: 'https://example.com/menu?category=lunch#order', source: 'instagram', medium: 'social', campaign: '봄맞이신메뉴', content: '프로필', term: '' })}>예시 값 넣기</button><button type="button" className={button} onClick={() => { setInput({ ...EMPTY_CAMPAIGN_INPUT }); setGenerated(null); setStatus('입력값과 생성한 링크를 비웠어요.'); setManual(false) }}>입력 비우기</button></div>
      </section>
      <section aria-labelledby="output-title" className="rounded-2xl border border-[#E5E8EB] bg-white p-4 shadow-sm md:p-6"><h2 id="output-title" className="mb-3 text-lg font-bold">완성된 홍보 링크</h2>{!current ? <p className="rounded-xl bg-[#F8F9FA] p-4 text-sm leading-relaxed text-gray-600">{stale ? '입력값이 바뀌었어요. 홍보 링크 만들기를 다시 눌러 주세요. 이전 링크는 복사하거나 내려받을 수 없어요.' : '필수 항목을 채운 뒤 홍보 링크 만들기를 눌러 주세요.'}</p> : <><label htmlFor="generated-campaign-url" className="sr-only">생성한 홍보 링크</label><textarea ref={output} id="generated-campaign-url" readOnly rows={5} value={current.url} className="w-full rounded-xl border border-[#E5E8EB] bg-[#F8F9FA] p-3 text-base leading-relaxed" /><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={copy} className={button}><Copy size={16} className="mr-1 inline" aria-hidden="true" />링크 복사</button><button type="button" onClick={download} className={button}><Download size={16} className="mr-1 inline" aria-hidden="true" />TXT 내려받기</button>{manual && <button type="button" className={button} onClick={() => { output.current?.focus(); output.current?.select() }}>링크 전체 선택</button>}</div>{current.auto && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm leading-relaxed text-amber-900">이 주소에는 광고 자동 태그가 있어요. 태그는 유지했어요. 광고 플랫폼의 자동 태그 설정과 함께 사용할 때는 유입 분류가 달라질 수 있으니 분석 설정을 확인해 주세요.</p>}</>}
        <p className="mt-4 text-xs leading-relaxed text-gray-500">기존 UTM 항목은 새 입력값으로 교체해요. 다른 검색 조건과 페이지 위치는 유지해요.</p><p role="status" aria-live="polite" className="mt-3 min-h-[24px] text-sm text-[#3182F6]">{status}</p>
      </section>
      {current && <ToolNextSteps current="campaign-url" />}
      <section className="rounded-2xl border border-[#E5E8EB] bg-white p-4 text-sm leading-relaxed shadow-sm md:p-6"><h2 className="mb-3 text-base font-bold">만든 링크는 이렇게 사용해요</h2><ol className="list-decimal space-y-2 pl-5"><li>실제로 안내할 홈페이지 주소와 캠페인 이름을 확인해요.</li><li>생성한 링크를 프로필·블로그·채널 게시물의 링크 자리에 넣어요.</li><li>방문자가 클릭한 뒤 도착한 사이트의 GA4 등 분석 도구에서 유입을 확인해요.</li></ol><p className="mt-4 text-gray-600">링크를 붙이는 것만으로 측정이 완료되지는 않아요. 도착한 사이트에 분석 도구가 설정돼 있어야 해요. 이 도구는 단축 주소나 클릭 통계를 제공하지 않아요.</p><a href="https://support.google.com/analytics/answer/10917952" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-[44px] items-center text-[#3182F6] underline">Google Analytics 공식 안내</a></section>
    </div></main><Footer /></div>
}
