'use client'

// ============================================================
// /marketing/instagram-feed — 인스타그램 피드 작성 발행
// · 매장 사진 업로드 → AI 캡션 초안 생성 및 검토
// · 브라우저 초안과 계정 연결 후 명시적 게시
// · 스레드·카드뉴스와 동일 발행 채널 패턴
// ============================================================
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { readCaptionResult } from '../../lib/instagram-caption'
import Sidebar from '../../components/Sidebar'
import PageHeader from '../../components/PageHeader'
import Footer from '../../components/Footer'
import {
 Instagram, Upload, Sparkles, Hash, Calendar, Send, Image as ImageIcon,
 AlertCircle, X, Plus, ArrowRight, Lightbulb, Camera,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

type FeedDraft = {
 caption: string
 hashtags: string[]
 scheduledAt: string | null
 imageDataUrls: string[]
}

const STORAGE_KEY = 'localution.instagram_feed_drafts'
const MAX_IMAGES = 10
const MAX_CAPTION = 2200
const TONE_OPTIONS = [
 { id: 'casual', label: '편안한', desc: '동네 단골에게 말하듯' },
 { id: 'inspirational', label: '감성', desc: '은은한 무드로' },
 { id: 'energetic', label: '에너지', desc: '활기차게' },
 { id: 'professional', label: '전문', desc: '메뉴/서비스 강조' },
] as const

export default function InstagramFeedPage() {
 const [images, setImages] = useState<string[]>([])
 const [caption, setCaption] = useState('')
 const [hashtags, setHashtags] = useState<string[]>([])
 const [tone, setTone] = useState<typeof TONE_OPTIONS[number]['id']>('casual')
 const [topic, setTopic] = useState('')
 const [generating, setGenerating] = useState(false)
 const [generationError, setGenerationError] = useState('')
 const [generatedDraft, setGeneratedDraft] = useState<{ caption: string; hashtags: string[] } | null>(null)
 const requestRef = useRef<{ id: number; controller: AbortController } | null>(null)
 const sequenceRef = useRef(0)
 useEffect(() => {
   requestRef.current?.controller.abort()
   requestRef.current = null
   sequenceRef.current += 1
   setGenerating(false)
   setGeneratedDraft(null)
   setGenerationError('')
 }, [topic, tone])
 useEffect(() => () => { requestRef.current?.controller.abort(); sequenceRef.current += 1 }, [])
 const [scheduledAt, setScheduledAt] = useState('')
 const [drafts, setDrafts] = useState<FeedDraft[]>([])

 useEffect(() => {
 if (typeof window !== 'undefined') {
 try { setDrafts(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')) } catch {}
 }
 }, [])

 function addImage(file: File) {
 if (images.length >= MAX_IMAGES) return
 const reader = new FileReader()
 reader.onload = () => setImages(prev => [...prev, reader.result as string])
 reader.readAsDataURL(file)
 }
 function removeImage(idx: number) {
 setImages(prev => prev.filter((_, i) => i !== idx))
 }

 async function generateCaption() {
   if (requestRef.current) return
   if (!topic.trim()) { setGenerationError('실제로 알릴 매장 소식을 먼저 입력해주세요.'); return }
   const id = ++sequenceRef.current
   const controller = new AbortController()
   requestRef.current = { id, controller }
   setGenerating(true)
   setGenerationError('')
   setGeneratedDraft(null)
   try {
     const response = await fetch('/api/marketing/instagram-caption', {
       method: 'POST', credentials: 'same-origin', signal: controller.signal,
       headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic, tone }),
     })
     const data = await response.json()
     if (sequenceRef.current !== id) return
     if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : '초안을 생성하지 못했어요.')
     const result = readCaptionResult(JSON.stringify(data))
     if (!result) throw new Error('초안 형식을 확인하지 못했어요. 다시 시도해주세요.')
     setGeneratedDraft(result)
   } catch (error) {
     if (sequenceRef.current === id && !controller.signal.aborted) setGenerationError(error instanceof Error ? error.message : '연결을 확인하고 다시 시도해주세요.')
   } finally {
     if (sequenceRef.current === id) { requestRef.current = null; setGenerating(false) }
   }
 }

 function addHashtag(tag: string) {
 const clean = tag.replace(/^#?/, '#').replace(/\s+/g, '')
 if (clean.length < 2 || hashtags.includes(clean)) return
 setHashtags(prev => [...prev, clean])
 }
 function removeHashtag(t: string) {
 setHashtags(prev => prev.filter(x => x !== t))
 }

 function saveDraft() {
 const draft: FeedDraft = { caption, hashtags, scheduledAt: scheduledAt || null, imageDataUrls: images }
 const next = [draft, ...drafts].slice(0, 10)
 try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setDrafts(next); alert('이 브라우저에 초안을 저장했어요.') } catch { alert('초안을 저장하지 못했어요. 내용을 복사해서 보관해주세요.') }
 }

 const charCount = caption.length + (hashtags.length ? 2 + hashtags.join(' ').length : 0)

 return (
 <div className="min-h-screen bg-[var(--lu-canvas)]">
 <Sidebar />
 <div className="lu-channel-shell pt-[57px] md:pt-0 md:ml-[220px] flex flex-col min-h-screen">
 <PageHeader
 icon={<Instagram size={28} className="text-white" strokeWidth={2.5} />}
 title="인스타그램 피드 작성"
 subtitle="실제 매장 사진과 소식으로 초안을 작성하고 직접 게시하세요."
 variant="pink"
 />

 <main className="flex-1 px-4 md:px-6 py-4 md:py-6 max-w-6xl mx-auto w-full space-y-4 md:space-y-6">

 {/* 베타 안내 */}
 <div className="rounded-[10px] border border-[var(--lu-accent)] bg-[var(--lu-accent)] p-3 md:p-4 flex items-start gap-2.5">
 <AlertCircle size={14} className="text-white flex-shrink-0 mt-0.5" strokeWidth={2.5} />
 <div className="flex-1 min-w-0">
 <p className="text-sm font-bold text-white mb-0.5">인스타그램 피드 작성 발행 베타</p>
 <p className="text-xs md:text-sm text-white/90 leading-relaxed">
 입력한 실제 매장 소식으로 AI 초안을 만들고 검토할 수 있습니다. 사진은 AI로 분석하지 않습니다. 초안은 이 브라우저에 저장됩니다.
 아래에서 계정을 연결하면 사진 한 장 또는 릴스를 확인 후 게시할 수 있습니다. 예약 시간은 초안 메모이며 자동 예약은 실행되지 않습니다.
 </p>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 md:gap-6">
 {/* 메인 작성 영역 */}
 <div className="min-w-0 space-y-4 md:space-y-6">
 {/* 1) 사진 업로드 */}
 <Section
 step="1"
 title="사진 업로드"
 desc={`최대 ${MAX_IMAGES}장 · 정사각형 1:1 또는 세로 4:5 권장`}
 >
 <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
 {images.map((src, i) => (
 <div key={i} className="relative aspect-square rounded-[6px] overflow-hidden bg-[var(--lu-canvas)] group">
 <img src={src} alt="" className="w-full h-full object-cover" />
 <button onClick={() => removeImage(i)}
 className="min-h-11 absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
 <X size={11} strokeWidth={2.5} />
 </button>
 </div>
 ))}
 {images.length < MAX_IMAGES && (
 <label className="aspect-square rounded-[6px] border-2 border-dashed border-[var(--lu-line)] hover:border-[#EC4899] hover:bg-[#FCE7F3]/30 flex flex-col items-center justify-center cursor-pointer transition-colors">
 <Plus size={20} className="text-[var(--lu-muted)] mb-1" strokeWidth={2.5} />
 <span className="text-[10px] text-[var(--lu-muted)] font-bold">사진 추가</span>
 <input type="file" accept="image/*" className="min-h-11 hidden"
 onChange={(e) => {
 const f = e.target.files?.[0]
 if (f) addImage(f)
 e.target.value = ''
 }} />
 </label>
 )}
 </div>
 </Section>

 {/* 2) 캡션 자동 생성 */}
 <Section
 step="2"
 title="AI 캡션 + 해시태그"
 desc="확인된 매장 소식만 입력하세요"
 >
 <div className="space-y-3">
 <div>
 <label className="text-[11px] font-bold text-[var(--lu-muted)] mb-1.5 block">톤</label>
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
 {TONE_OPTIONS.map(t => (
 <button key={t.id}
 onClick={() => setTone(t.id)}
 className={`py-2 px-2 rounded-lg border text-left transition-colors ${tone === t.id ? 'border-[#EC4899] bg-[#FCE7F3]' : 'border-[var(--lu-line)] hover:bg-[var(--lu-canvas)]'}`}>
 <p className="text-xs font-bold text-[var(--lu-ink)]">{t.label}</p>
 <p className="text-[9px] text-[var(--lu-muted)] truncate">{t.desc}</p>
 </button>
 ))}
 </div>
 </div>
 <div>
 <label htmlFor="instagram-caption-topic" className="text-[11px] font-bold text-[var(--lu-muted)] mb-1 block">실제 매장 소식 (필수)</label>
 <input id="instagram-caption-topic" type="text" maxLength={2000} value={topic} onChange={e => setTopic(e.target.value)}
 placeholder="예: 신메뉴 출시, 단골 감사 이벤트, 매장 인테리어 리뉴얼"
 className="min-h-11 w-full px-2.5 py-2 border border-[var(--lu-line)] rounded-lg text-base focus:outline-none focus:border-[#EC4899]" />
 </div>
 <button onClick={generateCaption} disabled={generating || !topic.trim()}
 className="min-h-11 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--lu-accent)] text-white rounded-[6px] text-sm font-bold hover:opacity-90 disabled:opacity-50 shadow-none">
 {generating ? (
 <>
 <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
 생성 중...
 </>
 ) : (
 <>
 <Sparkles size={14} strokeWidth={2.5} />
 AI 캡션 생성
 </>
 )}
 </button>
 <p className="text-xs text-[var(--lu-muted)]">입력 내용이 AI 서비스로 전달됩니다. 고객 개인정보는 넣지 마세요. 생성 후 사실을 확인하고 적용하세요.</p>
 {generationError && <p role="alert" className="text-sm text-red-700">{generationError}</p>}
 <div aria-live="polite">{generating ? '초안을 만들고 있어요. 기존 편집 내용은 유지됩니다.' : ''}</div>
 {generatedDraft && <div className="min-w-0 break-words [overflow-wrap:anywhere] border border-[var(--lu-line)] rounded-[6px] p-3 space-y-3">
   <p className="text-sm font-semibold">검토할 AI 초안</p>
   <p className="text-sm whitespace-pre-wrap">{generatedDraft.caption}</p>
   <p className="text-xs text-[var(--lu-muted)]">{generatedDraft.hashtags.join(' ')}</p>
   <p className="text-xs text-[var(--lu-muted)]">적용하면 아래 편집 내용과 해시태그가 이 초안으로 바뀝니다. 실제 게시나 예약은 실행되지 않습니다.</p>
   <button type="button" className="min-h-11 px-3 rounded-[6px] bg-[var(--lu-accent)] text-white text-sm" onClick={() => { setCaption(generatedDraft.caption); setHashtags(generatedDraft.hashtags); setGeneratedDraft(null) }}>검토한 초안을 편집에 적용</button>
 </div>}

 </div>
 </Section>

 {/* 3) 캡션 / 해시태그 편집 */}
 <Section step="3" title="편집" desc={`${charCount} / ${MAX_CAPTION}자`}>
 <label htmlFor="instagram-caption-editor" className="sr-only">게시할 캡션 편집</label>
 <textarea id="instagram-caption-editor" value={caption} onChange={e => setCaption(e.target.value)}
 placeholder="직접 작성하거나 검토한 AI 초안을 적용하세요."
 className="w-full px-3 py-2.5 border border-[var(--lu-line)] rounded-[6px] text-base focus:outline-none focus:border-[#EC4899] resize-y min-h-[140px] leading-relaxed" />
 <div className="mt-3">
 <label htmlFor="instagram-caption-hashtag" className="text-[11px] font-bold text-[var(--lu-muted)] mb-1.5 block flex items-center gap-1">
 <Hash size={11} strokeWidth={2.5} /> 해시태그 ({hashtags.length}개)
 </label>
 <div className="flex flex-wrap gap-1.5 mb-2">
 {hashtags.map(t => (
 <span key={t} className="inline-flex items-center gap-1 text-xs font-semibold text-[#7C3AED] bg-[#F3E8FF] px-2 py-1 rounded-lg">
 {t}
 <button onClick={() => removeHashtag(t)} className="min-h-11 hover:text-[#5B21B6]">
 <X size={10} strokeWidth={2.5} />
 </button>
 </span>
 ))}
 </div>
 <input id="instagram-caption-hashtag" type="text"
 placeholder="태그 직접 추가 (Enter)"
 onKeyDown={(e) => {
 if (e.key === 'Enter') {
 e.preventDefault()
 addHashtag(e.currentTarget.value)
 e.currentTarget.value = ''
 }
 }}
 className="min-h-11 w-full px-2.5 py-1.5 border border-[var(--lu-line)] rounded-lg text-base focus:outline-none focus:border-[#EC4899]" />
 </div>
 </Section>

 {/* 4) 발행 */}
 <Section step="4" title="발행" desc="즉시 또는 예약">
 <div className="space-y-2.5">
 <div>
 <label className="text-[11px] font-bold text-[var(--lu-muted)] mb-1 block flex items-center gap-1">
 <Calendar size={11} strokeWidth={2.5} /> 예약 시간 (비워두면 초안만 저장)
 </label>
 <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
 className="min-h-11 w-full px-2.5 py-2 border border-[var(--lu-line)] rounded-lg text-base focus:outline-none focus:border-[#EC4899]" />
 </div>
 <div className="flex flex-col sm:flex-row gap-2">
 <button onClick={saveDraft} disabled={!caption.trim() || charCount > MAX_CAPTION}
 className="min-h-11 flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 border border-[var(--lu-line)] text-[var(--lu-muted)] rounded-[6px] text-sm font-bold hover:bg-[var(--lu-canvas)] disabled:opacity-40">
 초안 저장
 </button>
 <a href="#instagram-publish"
 className="min-h-11 flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[var(--lu-accent)] text-white rounded-[6px] text-sm font-bold">
 <Send size={14} strokeWidth={2.5} />
 계정 연결하고 게시
 </a>
 </div>
 <p className="text-[10px] text-[var(--lu-muted)] leading-relaxed">
 초안 사진과 실제 게시할 미디어를 확인한 뒤 아래 게시 영역에서 진행해주세요.
 </p>
 </div>
 </Section>
 <InstagramPublisher caption={caption + (hashtags.length ? '\n\n' + hashtags.join(' ') : '')} />
 </div>

 {/* 우측 사이드 */}
 <div className="space-y-3 md:space-y-4">
 {/* 미리보기 */}
 <div className="bg-white rounded-[10px] shadow-none overflow-hidden sticky top-4">
 <div className="px-4 py-3 border-b border-[var(--lu-canvas)]">
 <h3 className="text-sm font-bold text-[var(--lu-ink)]">미리보기</h3>
 </div>
 <div className="p-3">
 {images[0] ? (
 <div className="aspect-square rounded-[6px] overflow-hidden bg-[var(--lu-canvas)] mb-2">
 <img src={images[0]} alt="" className="w-full h-full object-cover" />
 </div>
 ) : (
 <div className="aspect-square rounded-[6px] bg-[var(--lu-canvas)] flex items-center justify-center mb-2">
 <Camera size={32} className="text-[#D1D5DB]" strokeWidth={2} />
 </div>
 )}
 <p className="text-xs text-[var(--lu-ink)] whitespace-pre-wrap leading-relaxed line-clamp-6">
 {caption || '캡션이 여기에 미리보기로 나타납니다.'}
 </p>
 {hashtags.length > 0 && (
 <p className="text-xs text-[var(--lu-accent)] mt-1.5">
 {hashtags.join(' ')}
 </p>
 )}
 </div>
 </div>

 {/* 도움말 */}
 <div className="bg-white rounded-[10px] shadow-none p-4">
 <h3 className="text-sm font-bold text-[var(--lu-ink)] mb-2 flex items-center gap-1.5">
 <Lightbulb size={13} className="text-[#F59E0B]" strokeWidth={2.5} /> 인스타 발행 팁
 </h3>
 <ul className="space-y-1.5 text-xs text-[var(--lu-muted)]">
 <li>· 첫 사진은 매장 분위기가 잘 드러나는 컷으로</li>
 <li>· 캡션 첫 1-2줄이 핵심 (그 이후는 더보기)</li>
 <li>· 사진과 매장 소식에 맞는 해시태그를 직접 선택하세요.</li>
 <li>· 게시 후 실제 계정의 인사이트에서 반응을 확인하세요.</li>
 </ul>
 </div>

 {/* 다른 채널 발행 */}
 <div className="bg-white rounded-[10px] shadow-none p-4">
 <h3 className="text-sm font-bold text-[var(--lu-ink)] mb-2">다른 채널도 함께</h3>
 <div className="space-y-1.5">
 <Link href="/marketing/threads" className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-[var(--lu-canvas)] text-xs font-bold text-[var(--lu-muted)]">
 <span className="w-5 h-5 rounded-md bg-slate-900 flex items-center justify-center">
 <span className="text-white text-[8px] font-semibold">@</span>
 </span>
 스레드 자동 발행
 <ArrowRight size={11} className="text-[var(--lu-muted)] ml-auto" strokeWidth={2.5} />
 </Link>
 <Link href="/marketing/card-news" className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-[var(--lu-canvas)] text-xs font-bold text-[var(--lu-muted)]">
 <span className="w-5 h-5 rounded-md bg-[var(--lu-accent)] flex items-center justify-center">
 <ImageIcon size={11} className="text-white" strokeWidth={2.5} />
 </span>
 카드뉴스 캐러셀
 <ArrowRight size={11} className="text-[var(--lu-muted)] ml-auto" strokeWidth={2.5} />
 </Link>
 <Link href="/marketing/reels" className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-[var(--lu-canvas)] text-xs font-bold text-[var(--lu-muted)]">
 <span className="w-5 h-5 rounded-md bg-[var(--lu-accent)] flex items-center justify-center">
 <span className="text-white text-[8px] font-semibold">RE</span>
 </span>
 릴스 대본
 <ArrowRight size={11} className="text-[var(--lu-muted)] ml-auto" strokeWidth={2.5} />
 </Link>
 </div>
 </div>
 </div>
 </div>
 </main>
 <Footer />
 </div>
 </div>
 )
}

type InstagramPublication = { id: string; status: string; caption?: string; media_url?: string; containerStatus?: string; media_id?: string; permalink?: string; verified?: boolean }
function InstagramPublisher({ caption }: { caption: string }) {
 const [account, setAccount] = useState<{ id: string; username: string } | null>(null)
 const [message, setMessage] = useState('계정 연결 상태를 확인하고 있어요.')
 const [mediaUrl, setMediaUrl] = useState('')
 const [mediaType, setMediaType] = useState('IMAGE')
 const [publication, setPublication] = useState<InstagramPublication | null>(null)
 const [busy, setBusy] = useState(false)
 const [confirmed, setConfirmed] = useState(false)
 const [preparedText, setPreparedText] = useState('')
 const [publicConsent, setPublicConsent] = useState(false)
 const requestId = useRef<string | null>(null)
 const busyRef = useRef(false)
 async function loadAccount() {
  try {
   const response = await fetch('/api/instagram/account', { cache: 'no-store' })
   const data = await response.json()
   setAccount(response.ok && data.connected ? data.account : null)
   setMessage(response.ok && data.connected ? `@${data.account.username} 계정 조회를 확인했어요. 게시 권한은 게시 준비 응답에서 확인하세요.` : data.error || '로그인한 뒤 계정을 연결해주세요.')
  } catch { setAccount(null); setMessage('연결 상태를 확인하지 못했어요. 다시 확인해주세요.') }
 }
 useEffect(() => { void loadAccount(); const query = new URLSearchParams(window.location.search); if (query.has('instagram_error')) setMessage('계정 연결을 마치지 못했어요. 연결 상태를 확인하고 다시 진행해주세요.') }, [])
 useEffect(() => { setConfirmed(false) }, [caption, mediaUrl, mediaType])
 useEffect(() => {
  if (!account) return
  try {
   const saved = localStorage.getItem(`localution.instagram.publication.${account.id}`)
   if (saved) { requestId.current = saved; setPublication({ id: saved, status: 'check_required' }); setMessage('이전 게시 요청이 있어요. 새로 게시하기 전에 상태와 실제 게시물을 확인해주세요.') }
  } catch { setMessage('이 브라우저에서 게시 요청을 복구하지 못했어요. 기존 게시물을 확인해주세요.') }
 }, [account?.id])
 async function uploadMedia(file: File | undefined) {
  if (!file || busyRef.current || !publicConsent) return
  const limit = file.type === 'image/jpeg' ? 8 * 1024 * 1024 : 100 * 1024 * 1024
  if (!['image/jpeg', 'video/mp4'].includes(file.type) || file.size > limit) { setMessage('JPEG 8MB 또는 MP4 100MB까지 업로드할 수 있어요.'); return }
  busyRef.current = true; setBusy(true)
  try {
   const signedResponse = await fetch('/api/instagram/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'sign', type: file.type, size: file.size, publicStorageConsent: true }) })
   const signed = await signedResponse.json()
   if (!signedResponse.ok || !signed.ok) throw new Error(signed.error || '업로드를 준비하지 못했어요.')
   const uploaded = await fetch(signed.signedUrl, { method: 'PUT', headers: { 'Content-Type': file.type, 'x-upsert': 'false' }, body: file })
   if (!uploaded.ok) throw new Error('파일 업로드에 실패했어요. 연결을 확인해주세요.')
   const checkedResponse = await fetch('/api/instagram/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'verify', path: signed.path, publicStorageConsent: true }) })
   const checked = await checkedResponse.json()
   if (!checkedResponse.ok || !checked.ok) throw new Error(checked.error || '업로드한 파일을 확인하지 못했어요.')
   setMediaUrl(checked.url); setMediaType(checked.type === 'image/jpeg' ? 'IMAGE' : 'REELS'); setMessage('업로드한 파일의 저장 결과를 확인했어요. 미디어 준비를 눌러주세요.')
  } catch (error) { setMessage(error instanceof Error ? error.message : '파일을 업로드하지 못했어요.') }
  finally { busyRef.current = false; setBusy(false) }
 }
 async function act(action: 'prepare' | 'publish' | 'verify') {
  if (busyRef.current) return
  busyRef.current = true; setBusy(true)
  try {
   if (action === 'prepare') {
    requestId.current ||= crypto.randomUUID()
    localStorage.setItem(`localution.instagram.publication.${account?.id}`, requestId.current)
   }
   const response = await fetch(action === 'verify' ? `/api/instagram/publications?id=${encodeURIComponent(publication?.id || requestId.current || '')}` : '/api/instagram/publications', action === 'verify' ? { cache: 'no-store' } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action === 'prepare' ? { action, requestId: requestId.current, mediaType, mediaUrl, caption } : { action, id: publication?.id, confirm: confirmed }) })
   const data = await response.json()
   if (!response.ok || !data.ok) { if (action === 'verify' && response.status === 404) setPublication(null); throw new Error(data.error || '요청 결과를 확인하지 못했어요.') }
   setPublication(data.publication)
   if (data.publication.caption !== undefined) setPreparedText(data.publication.caption)
   setMessage(data.publication.status === 'verified' ? 'Instagram 게시물을 다시 조회해 확인했어요.' : data.publication.status === 'reconciliation_required' || data.publication.status === 'publishing' ? '게시 결과를 확인해야 해요. 중복 게시하지 말고 상태를 조회해주세요.' : data.publication.media_id ? '게시 응답을 받았어요. 실제 게시물 확인을 눌러 최종 확인해주세요.' : `미디어 상태: ${data.publication.containerStatus || data.publication.status}. 내용을 확인한 뒤 게시해주세요.`)
  } catch (error) { setMessage(error instanceof Error ? error.message : '연결을 확인해주세요.') }
  finally { busyRef.current = false; setBusy(false) }
 }
 const locked = !!publication
 return <section id="instagram-publish" className="scroll-mt-20 rounded-2xl border border-[var(--lu-line)] bg-white p-4 md:p-5 space-y-4">
  <h2 className="text-lg font-semibold text-[var(--lu-ink)]">Instagram 계정 연결과 실제 게시</h2>
  <p className="text-sm text-[var(--lu-muted)]">비즈니스 또는 크리에이터 계정을 연결해주세요. 준비 단계에서는 공개 게시되지 않습니다. 마지막 게시 버튼을 누르면 연결한 계정에 게시됩니다.</p>
  <p role="status" className="text-sm break-words">{message}</p>
  <div className="flex flex-wrap gap-2"><a className="min-h-11 rounded-xl bg-[var(--lu-accent)] text-white px-4 py-3 text-sm" href="/api/oauth/instagram">{account ? '계정 다시 연결' : 'Instagram 연결'}</a><button type="button" onClick={loadAccount} disabled={busy} className="min-h-11 rounded-xl border px-4 text-sm">연결 상태 확인</button></div>
  <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={publicConsent} disabled={busy || locked} onChange={e => setPublicConsent(e.target.checked)} className="mt-1 h-5 w-5" /><span>게시할 파일을 공개 미디어 저장소에 업로드합니다. 링크를 아는 사람은 파일을 열 수 있습니다.</span></label>
  <label className="block text-sm font-semibold">휴대폰 또는 PC에서 게시 파일 선택<input type="file" accept="image/jpeg,video/mp4" disabled={!account || !publicConsent || busy || locked} onChange={e => { void uploadMedia(e.target.files?.[0]); e.target.value = '' }} className="block w-full mt-2 min-h-11 text-base" /></label>
  <label className="block text-sm font-semibold">게시 형식<select value={mediaType} disabled={busy || locked} onChange={e => setMediaType(e.target.value)} className="block mt-2 w-full min-h-11 rounded-xl border px-3 text-base"><option value="IMAGE">사진 한 장</option><option value="REELS">릴스 동영상</option></select></label>
  <label className="block text-sm font-semibold">게시할 미디어의 공개 HTTPS 주소<input type="url" value={mediaUrl} disabled={busy || locked} onChange={e => setMediaUrl(e.target.value)} placeholder="https://..." className="block mt-2 w-full min-h-11 rounded-xl border px-3 text-base" /></label>
  <p className="text-sm text-[var(--lu-muted)]">사진은 JPEG, 릴스는 Instagram 규격의 동영상 주소를 사용해주세요. 위 초안의 사진 파일은 자동 업로드되지 않습니다. 비공개 링크나 로그인해야 열리는 주소는 처리할 수 없습니다.</p>
  {preparedText && <div className="rounded-xl bg-[var(--lu-canvas)] p-3 whitespace-pre-wrap break-words text-sm"><p className="font-semibold mb-2">준비된 게시 문구</p>{preparedText}</div>}
  {publication?.media_url && <a href={publication.media_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline">준비된 실제 미디어 열기</a>}
  <div className="flex flex-wrap gap-2"><button disabled={busy || !account || locked || !mediaUrl || !caption.trim() || caption.length > 2200} onClick={() => act('prepare')} className="min-h-11 rounded-xl border px-4 disabled:opacity-40">미디어 준비</button><button disabled={busy || (!publication && !requestId.current)} onClick={() => act('verify')} className="min-h-11 rounded-xl border px-4 disabled:opacity-40">상태와 실제 게시물 확인</button></div>
  {publication?.status === 'prepared' && <><label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} disabled={busy} onChange={e => setConfirmed(e.target.checked)} className="mt-1 h-5 w-5" /><span>@{account?.username}에 위 준비된 문구와 미디어를 지금 공개 게시합니다.</span></label><button disabled={busy || !confirmed} onClick={() => act('publish')} className="min-h-11 w-full rounded-xl bg-[var(--lu-accent)] text-white font-semibold disabled:opacity-40">확인한 콘텐츠 지금 게시</button></>}
  {publication?.verified && publication.permalink && <a href={publication.permalink} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline font-semibold">확인된 Instagram 게시물 열기</a>}
  {['verified', 'prepare_failed'].includes(publication?.status || '') && <button className="block min-h-11 underline" onClick={() => { localStorage.removeItem(`localution.instagram.publication.${account?.id}`); setPublication(null); setPreparedText(''); requestId.current = null; setConfirmed(false); setMediaUrl('') }}>다음 게시물 작성</button>}
 </section>
}

function Section({ step, title, desc, children }: { step: string; title: string; desc?: string; children: React.ReactNode }) {
 return (
 <section className="bg-white rounded-[10px] shadow-none p-4 md:p-5">
 <div className="flex items-center gap-2 mb-3">
 <span className="w-6 h-6 rounded-lg bg-[var(--lu-accent)] text-white text-[11px] font-semibold flex items-center justify-center">{step}</span>
 <h2 className="text-sm md:text-base font-bold text-[var(--lu-ink)]">{title}</h2>
 {desc && <span className="text-[11px] text-[var(--lu-muted)] ml-auto truncate">{desc}</span>}
 </div>
 {children}
 </section>
 )
}

