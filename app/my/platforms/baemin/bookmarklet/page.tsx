'use client'

// ============================================================
// /my/platforms/baemin/bookmarklet
// 배민 리뷰 북마크릿 — 브라우저 인증 세션으로 리뷰 직접 수집
// · 배민 페이지에서 북마크릿 클릭 → 리뷰 JSON 클립보드 복사
// · localution 페이지에서 paste → 업로드 (same-origin 으로 CORS 우회)
// ============================================================

import { useState, useEffect } from 'react'
import { Copy, Check, ExternalLink, BookmarkPlus, AlertTriangle, Sparkles, Upload, ClipboardPaste, Loader2 } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function BaeminBookmarkletPage() {
 const [origin, setOrigin] = useState('https://www.localution.co.kr')
 const [copied, setCopied] = useState(false)
 const [pasted, setPasted] = useState('')
 const [uploading, setUploading] = useState(false)
 const [result, setResult] = useState<any>(null)
 const [parsedCount, setParsedCount] = useState<number | null>(null)
 const [parseError, setParseError] = useState('')

 useEffect(() => {
 if (typeof window !== 'undefined') setOrigin(window.location.origin)
 }, [])

 // 북마크릿 본문 — 배민 origin 에서 실행, JSON 을 클립보드 복사
 const bookmarkletCode = `(async () => {
 const m = location.pathname.match(/\\/shops\\/(\\d+)/)
 if (!m) { alert('배민 매장 페이지에서 실행하세요. 예: self.baemin.com/shops/12345/reviews'); return }
 const shopNo = m[1]
 const out = []
 let lastErr = null
 for (let p = 1; p <= 20; p++) {
 try {
 const res = await fetch('/v1/review/shops/' + shopNo + '/reviews?pageNumber=' + p + '&pageSize=50', { credentials: 'include' })
 if (!res.ok) { lastErr = 'HTTP ' + res.status; break }
 const j = await res.json()
 const arr = j.contents || j.data?.contents || j.data || j.reviews || j.list || []
 if (!Array.isArray(arr) || arr.length === 0) break
 out.push(...arr)
 if (arr.length < 50) break
 await new Promise(r => setTimeout(r, 400))
 } catch (e) { lastErr = e.message; break }
 }
 if (out.length === 0) { alert('리뷰를 가져오지 못했어요. ' + (lastErr || '로그인 상태 확인')); return }
 const payload = { shop_no: shopNo, reviews: out }
 const text = JSON.stringify(payload)
 try { await navigator.clipboard.writeText(text) }
 catch { prompt('복사가 안 되면 아래 텍스트를 직접 복사하세요:', text) }
 alert('완료! ' + out.length + '건 가져옴 + 클립보드 복사 완료.\\n\\n로컬루션 사이트로 돌아가서 [붙여넣기] 버튼을 누르세요.')
})();`
 const bookmarkletUrl = 'javascript:' + encodeURIComponent(bookmarkletCode)

 function copyCode() {
 navigator.clipboard.writeText(bookmarkletUrl).then(() => {
 setCopied(true)
 setTimeout(() => setCopied(false), 2000)
 })
 }

 async function pasteFromClipboard() {
 try {
 const text = await navigator.clipboard.readText()
 setPasted(text)
 validateJson(text)
 } catch (e: any) {
 setParseError('클립보드 읽기 실패: ' + e.message + ' · 직접 텍스트 붙여넣기 해주세요')
 }
 }

 function validateJson(text: string) {
 setParseError(''); setParsedCount(null)
 if (!text.trim()) return
 try {
 const j = JSON.parse(text)
 if (!j || !Array.isArray(j.reviews)) {
 setParseError('형식이 올바르지 않아요. { shop_no, reviews: [...] } 구조여야 해요')
 return
 }
 setParsedCount(j.reviews.length)
 } catch (e: any) {
 setParseError('JSON 파싱 실패: ' + e.message)
 }
 }

 async function upload() {
 setUploading(true); setResult(null)
 try {
 const j = JSON.parse(pasted)
 const res = await fetch('/api/baemin/collect-reviews', {
 method: 'POST',
 credentials: 'include',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(j),
 })
 const data = await res.json()
 setResult(data)
 } catch (e: any) {
 setResult({ ok: false, error: e.message })
 }
 setUploading(false)
 }

 return (
 <div className="max-w-3xl mx-auto p-6 md:p-10">
 <div className="mb-6">
 <h1 className="text-2xl font-black text-[#191F28] mb-2 flex items-center gap-2">
 <Sparkles size={22} className="text-[#F59E0B]" strokeWidth={2.5} />
 배민 리뷰 직접 가져오기 (북마크릿)
 </h1>
 <p className="text-sm text-[#4E5968]">
 배민 API 가 외부 호출을 차단하고 있어, 사장님 브라우저의 정상 로그인 세션으로 직접 가져옵니다.
 한 번 설정해두면 클릭 두 번이면 동기화 완료.
 </p>
 </div>

 <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-2xl p-4 mb-6">
 <div className="flex items-start gap-2">
 <AlertTriangle size={16} className="text-[#92400E] mt-0.5 flex-shrink-0" strokeWidth={2.5} />
 <div className="text-xs text-[#92400E] leading-relaxed">
 현재 배민 self-api 가 외부 IP 를 Akamai WAF 로 즉시 403 차단합니다 (한국 프록시 거쳐도 마찬가지).
 아래 3단계로 한 번 설정하면, 사장님 브라우저로 정확한 리뷰 데이터를 받을 수 있어요.
 </div>
 </div>
 </div>

 {/* Step 1: 북마크 등록 */}
 <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
 <div className="flex items-center gap-2 mb-3">
 <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#3182F6] to-[#1B64DA] text-white text-xs font-black flex items-center justify-center shadow-sm">1</div>
 <span className="text-base font-bold text-[#191F28]">북마크바에 등록</span>
 </div>
 <p className="text-sm text-[#4E5968] mb-3">
 크롬·엣지 북마크바 (Ctrl+Shift+B 로 표시) 에 아래 버튼을 <strong>드래그해서 놓으세요</strong>.
 </p>
 <div className="flex items-center gap-3 flex-wrap">
 <a
 href={bookmarkletUrl}
 onClick={(e) => { e.preventDefault(); alert('이 버튼을 북마크바에 드래그해서 놓으세요. 클릭은 동작 안 합니다 (배민 페이지에서만 동작).') }}
 draggable
 className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-br from-[#2DDDC8] to-[#1BC7B3] text-white rounded-xl font-bold text-sm shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all"
 >
 <BookmarkPlus size={16} strokeWidth={2.5} />
 배민 리뷰 가져오기
 </a>
 <button
 onClick={copyCode}
 className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E5E8EB] rounded-xl text-xs font-bold text-[#4E5968] hover:bg-[#F2F4F6] transition-colors"
 >
 {copied ? <><Check size={12} strokeWidth={2.5} /> 복사됨</> : <><Copy size={12} strokeWidth={2.5} /> 코드 복사</>}
 </button>
 </div>
 <p className="text-[11px] text-[#8B95A1] mt-3">
 드래그 안 되면: 코드 복사 → 북마크 새로 만들기 → URL 칸에 붙여넣기 → 이름 "배민 리뷰 가져오기"
 </p>
 </div>

 {/* Step 2: 배민에서 실행 */}
 <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
 <div className="flex items-center gap-2 mb-3">
 <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#3182F6] to-[#1B64DA] text-white text-xs font-black flex items-center justify-center shadow-sm">2</div>
 <span className="text-base font-bold text-[#191F28]">배민 리뷰 페이지에서 북마크 클릭</span>
 </div>
 <p className="text-sm text-[#4E5968] mb-3">
 배민 사장님 페이지 로그인 → 매장 리뷰 페이지 이동 → <strong>북마크바의 "배민 리뷰 가져오기" 클릭</strong>.
 클립보드에 리뷰 데이터가 자동 복사돼요.
 </p>
 <a
 href="https://self.baemin.com/"
 target="_blank"
 rel="noopener"
 className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2DDDC8] text-white rounded-xl font-bold text-sm hover:bg-[#1BC7B3] transition-colors"
 >
 배민 사장님 사이트 열기 <ExternalLink size={14} strokeWidth={2.5} />
 </a>
 </div>

 {/* Step 3: 붙여넣기 + 업로드 */}
 <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
 <div className="flex items-center gap-2 mb-3">
 <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#3182F6] to-[#1B64DA] text-white text-xs font-black flex items-center justify-center shadow-sm">3</div>
 <span className="text-base font-bold text-[#191F28]">여기로 돌아와서 붙여넣기 + 업로드</span>
 </div>

 <div className="flex items-center gap-2 mb-3 flex-wrap">
 <button
 onClick={pasteFromClipboard}
 className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#3182F6] text-white rounded-xl text-xs font-bold hover:bg-[#1B64DA] transition-colors"
 >
 <ClipboardPaste size={12} strokeWidth={2.5} />
 클립보드에서 붙여넣기
 </button>
 {parsedCount !== null && (
 <span className="text-xs font-bold text-[#059669] bg-[#ECFDF5] px-2 py-1 rounded-lg">
 {parsedCount}건 인식됨
 </span>
 )}
 {parseError && (
 <span className="text-xs font-bold text-[#DC2626] bg-[#FEF2F2] px-2 py-1 rounded-lg">
 {parseError}
 </span>
 )}
 </div>

 <textarea
 value={pasted}
 onChange={(e) => { setPasted(e.target.value); validateJson(e.target.value) }}
 placeholder='북마크릿 실행 후 자동 복사된 JSON 이 여기 들어가요. 또는 직접 붙여넣기 가능.'
 className="w-full h-32 px-3 py-2 text-xs font-mono bg-[#F8F9FA] border border-[#E5E8EB] rounded-xl resize-none focus:outline-none focus:border-[#3182F6]"
 />

 <button
 onClick={upload}
 disabled={!parsedCount || uploading}
 className="mt-3 w-full px-4 py-2.5 bg-gradient-to-br from-[#2DDDC8] to-[#1BC7B3] text-white rounded-xl font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md inline-flex items-center justify-center gap-1.5 transition-all"
 >
 {uploading
 ? <><Loader2 size={14} strokeWidth={2.5} className="animate-spin" /> 업로드 중...</>
 : <><Upload size={14} strokeWidth={2.5} /> 로컬루션에 업로드</>}
 </button>

 {result && (
 <div className={'mt-3 p-3 rounded-xl text-xs ' +
 (result.ok ? 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]' : 'bg-[#FEF2F2] text-[#991B1B] border border-[#FCA5A5]')}>
 {result.ok ? (
 <>
 <p className="font-bold mb-1">업로드 성공! {result.count}건 저장</p>
 {result.skipped && (
 <p className="text-[10px] opacity-80">
 가비지 {result.skipped.garbage}건 / cutoff {result.skipped.cutoff}건 / ID없음 {result.skipped.noId}건 자동 제외
 </p>
 )}
 {result.sampleKeys?.length > 0 && (
 <p className="text-[10px] opacity-80 mt-1 font-mono">
 필드명: {result.sampleKeys.slice(0, 10).join(', ')}
 </p>
 )}
 </>
 ) : (
 <p className="font-bold">업로드 실패: {result.error}</p>
 )}
 </div>
 )}
 </div>

 {/* 코드 보기 */}
 <details className="bg-[#F8F9FA] rounded-xl p-4 text-xs text-[#4E5968]">
 <summary className="cursor-pointer font-bold">북마크릿 코드 보기 (개발자용)</summary>
 <pre className="mt-3 p-3 bg-white rounded-lg overflow-x-auto text-[10px] leading-relaxed">{bookmarkletCode}</pre>
 </details>

 <div className="mt-6">
 <Link
 href="/review-admin/baemin"
 className="text-xs text-[#3182F6] font-semibold hover:underline"
 >
 ← 배민 리뷰 관리로 돌아가기
 </Link>
 </div>
 </div>
 )
}
