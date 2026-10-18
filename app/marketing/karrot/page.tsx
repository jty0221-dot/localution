'use client'

import { useEffect, useState } from 'react'
import { Copy, ExternalLink, ImagePlus, Share2, Store, Download } from 'lucide-react'
import Sidebar from '../../components/Sidebar'
import PageHeader from '../../components/PageHeader'
import Footer from '../../components/Footer'
import AdPanel from './AdPanel'
import { copyTextWithFallback } from '../../lib/clipboard'
import { buildKarrotText, KARROT_API_NOTICE, KARROT_BUSINESS_URL, shareKarrotDraft, validateKarrotImages } from '../../lib/karrot-handoff'

const control = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[#D5DEDC] bg-white px-4 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16685D] disabled:opacity-50'

export default function KarrotPage() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const text = buildKarrotText(title, body)
  useEffect(() => {
    const urls = files.map(file => URL.createObjectURL(file))
    setPreviews(urls)
    return () => urls.forEach(url => URL.revokeObjectURL(url))
  }, [files])
  const copy = async () => {
    if (!text) return
    setBusy(true)
    setMessage(await copyTextWithFallback(text) ? '원고를 복사했어요. 당근 비즈프로필에서 붙여넣고 사진을 첨부해 주세요.' : '복사하지 못했어요. 미리보기의 원고를 직접 선택해 복사해 주세요.')
    setBusy(false)
  }
  const share = async () => {
    setBusy(true)
    const result = await shareKarrotDraft(title, body, files, { share: navigator.share?.bind(navigator), canShare: navigator.canShare?.bind(navigator) })
    setMessage({ shared: '공유 창 전달을 마쳤어요. 당근의 실제 게시 여부는 비즈프로필에서 확인해 주세요.', cancelled: '공유를 취소했어요. 작성한 내용은 그대로 있어요.', unsupported: '이 브라우저에서는 공유를 지원하지 않아요. 원고 복사와 사진 첨부를 이용해 주세요.', 'files-unsupported': '이 기기에서는 선택한 사진을 함께 공유할 수 없어요. 원고를 복사하고 당근에서 원본 사진을 첨부해 주세요.', failed: '공유하지 못했어요. 원고 복사로 이어서 진행할 수 있어요.', empty: '제목과 내용을 먼저 입력해 주세요.' }[result])
    setBusy(false)
  }
  const download = () => {
    if (!text) return
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = '당근-소식-원고.txt'; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setMessage('원고 파일 다운로드를 요청했어요. 기기의 다운로드 목록에서 확인해 주세요.')
  }
  return <div className="min-h-screen bg-[#F3F5F4] text-[#172B2F]">
    <Sidebar />
    <div className="flex min-h-screen flex-col md:ml-[220px]">
      <PageHeader title="당근 소식·광고 관리" icon={<Store size={20} />} subtitle="소식을 준비하고 당근 광고 계정을 연결해 성과를 확인하세요." />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-6 md:px-6">
        <p className="rounded-lg border border-[#D5DEDC] bg-white p-4 text-sm leading-6">현재 제공: 원고 작성·복사·파일 저장·기기 공유. 비즈프로필 소식 자동 게시·반응 수집은 아직 제공하지 않아요. 광고 계정 연결과 성과 조회는 아래에서 이용하세요. 작성한 내용은 이 화면에만 유지되며, 새로고침하거나 페이지를 나가면 사라져요.</p>
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="space-y-4 rounded-lg border border-[#D5DEDC] bg-white p-5" aria-labelledby="karrot-draft">
            <h2 id="karrot-draft" className="text-lg font-semibold">1. 소식 준비하기</h2>
            <label className="block text-sm font-semibold">제목<input value={title} maxLength={200} onChange={event => { setTitle(event.target.value); setMessage('') }} className="mt-2 min-h-11 w-full rounded-md border border-[#D5DEDC] p-3 text-base font-normal" placeholder="이웃에게 전할 소식을 입력해 주세요" /></label>
            <label className="block text-sm font-semibold">내용<textarea value={body} maxLength={10000} rows={9} onChange={event => { setBody(event.target.value); setMessage('') }} className="mt-2 w-full rounded-md border border-[#D5DEDC] p-3 text-base font-normal" placeholder="가게의 소식, 이용 방법, 행사 기간을 적어 주세요" /></label>
            <label className="block text-sm font-semibold"><span className="flex items-center gap-2"><ImagePlus size={18} />사진 선택</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple className="mt-2 w-full text-sm" onChange={event => { const selected = Array.from(event.target.files || []); const error = validateKarrotImages(selected); if (error) { setMessage(error); event.target.value = ''; return } setFiles(selected); setMessage('') }} /></label>
            <p className="text-xs leading-5 text-[#53656A]">이 준비 화면은 사진 10장, 장당 10MB까지 지원해요. 사진은 서버에 업로드되지 않아요. 당근 게시 화면의 실제 첨부 기준도 확인해 주세요.</p>
          </section>
          <section className="space-y-4 rounded-lg border border-[#D5DEDC] bg-white p-5" aria-labelledby="karrot-preview">
            <h2 id="karrot-preview" className="text-lg font-semibold">2. 내용 확인하고 전달하기</h2>
            <div className="min-h-32 select-text whitespace-pre-wrap break-words rounded-md bg-[#F3F5F4] p-4 text-sm leading-7">{text || '제목과 내용을 입력하면 원고를 확인할 수 있어요.'}</div>
            {previews.length > 0 && <div className="grid grid-cols-3 gap-2">{previews.map((url, i) => <img key={url} src={url} alt={`선택한 소식 사진 ${i + 1}`} className="aspect-square w-full rounded-md object-cover" />)}</div>}
            <div className="flex flex-wrap gap-2">
              <button className={control} disabled={!text || busy} onClick={copy}><Copy size={16} />원고 복사</button>
              <button className={control} disabled={!text || busy} onClick={share}><Share2 size={16} />기기로 공유</button>
              <button className={control} disabled={!text || busy} onClick={download}><Download size={16} />원고 저장</button>
            </div>
            <p className="text-sm leading-6 text-[#53656A]">공유 대상 앱은 기기마다 달라요. 당근이 목록에 없으면 원고를 복사한 뒤 당근 앱에서 나의 당근 → 비즈프로필 → 소식 작성으로 이동해 주세요.</p>
            <p role="status" aria-live="polite" className="min-h-6 text-sm font-semibold leading-6 text-[#16685D]">{message}</p>
            <a href={KARROT_BUSINESS_URL} target="_blank" rel="noopener noreferrer" className={`${control} !bg-[#16685D] !text-white`}><ExternalLink size={16} />당근비즈니스 열기</a>
            <p className="text-xs leading-5 text-[#53656A]">새 창에서 게시를 완료해 주세요. 복사·공유는 게시 완료를 의미하지 않아요.</p>
          </section>
        </div>
        <AdPanel />
        <section className="space-y-3 rounded-lg border border-[#D5DEDC] bg-white p-5" aria-labelledby="karrot-ads">
          <h2 id="karrot-ads" className="text-lg font-semibold">광고 연동은 어디까지 가능한가요?</h2>
          <p className="text-sm leading-7">당근은 2026년 10월 16일 광고 OpenAPI 베타를 공개했어요. 광고 관리·성과 조회용 기능이며, 이 화면의 소식 자동 게시와는 별개예요. 위 광고 계정 연결에서 조회 권한을 확인하고 성과를 불러올 수 있어요.</p>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-6"><li>당근 전문가모드에서 고객센터 → 온라인 문의를 열어요.</li><li>문의하기 → 광고 도구 및 전환 → OpenAPI 키 발급을 선택해요.</li><li>연결할 광고 계정을 선택하고 발급 안내를 확인해요. 기존 키 재발급은 기존 연결에 영향을 줄 수 있어요.</li></ol>
          <p className="text-sm leading-6 text-[#53656A]">발급받은 키는 위 광고 API 키 입력란에 입력해 주세요. 소식 원고에는 넣지 마세요.</p>
          <a className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#16685D] underline" href={KARROT_API_NOTICE} target="_blank" rel="noopener noreferrer">당근 공식 API 안내 확인<ExternalLink size={16} /></a>
        </section>
      </main><Footer />
    </div>
  </div>
}
