'use client'

// ============================================================
// /marketing/instagram-feed — 인스타그램 피드 작성 발행
// · 매장 사진 업로드 → AI 캡션 + 해시태그 자동 생성
// · 즉시 발행 / 예약 발행
// · 스레드·카드뉴스와 동일 발행 채널 패턴
// ============================================================
import { useState, useEffect } from 'react'
import Link from 'next/link'
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

 function generateCaption() {
 alert('AI 캡션 연결이 준비되지 않았어요. 실제 매장 소식을 직접 작성해주세요.')
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

 const charCount = caption.length + hashtags.join(' ').length

 return (
 <div className="min-h-screen bg-[var(--lu-canvas)]">
 <Sidebar />
 <div className="md:ml-[220px] flex flex-col min-h-screen">
 <PageHeader
 icon={<Instagram size={28} className="text-white" strokeWidth={2.5} />}
 title="인스타그램 피드 작성"
 subtitle="실제 매장 사진과 소식으로 초안을 작성하고 직접 게시하세요."
 variant="pink"
 />

 <main className="flex-1 px-4 md:px-6 py-4 md:py-6 max-w-6xl mx-auto w-full space-y-4 md:space-y-6">

 {/* 베타 안내 */}
 <div className="rounded-[10px] border border-[#E9D5FF] bg-[var(--lu-accent)] p-3 md:p-4 flex items-start gap-2.5">
 <AlertCircle size={14} className="text-[#7C3AED] flex-shrink-0 mt-0.5" strokeWidth={2.5} />
 <div className="flex-1 min-w-0">
 <p className="text-xs md:text-sm font-bold text-[#7C3AED] mb-0.5">인스타그램 피드 작성 발행 베타</p>
 <p className="text-[11px] md:text-xs text-[#7C3AED]/90 leading-relaxed">
 현재는 직접 작성한 캡션과 사진의 브라우저 초안 저장이 가능합니다. AI 생성과 자동 게시 연결은 준비 중입니다.
 자동 게시나 예약은 실행되지 않습니다.
 지금은 초안을 복사 → 인스타그램 앱에서 붙여넣기로 게시하세요.
 </p>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 md:gap-6">
 {/* 메인 작성 영역 */}
 <div className="space-y-4 md:space-y-6">
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
 desc="톤을 선택하고 주제를 1줄로 입력하세요"
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
 <label className="text-[11px] font-bold text-[var(--lu-muted)] mb-1 block">주제 (선택)</label>
 <input type="text" value={topic} onChange={e => setTopic(e.target.value)}
 placeholder="예: 신메뉴 출시, 단골 감사 이벤트, 매장 인테리어 리뉴얼"
 className="min-h-11 w-full px-2.5 py-2 border border-[var(--lu-line)] rounded-lg text-base focus:outline-none focus:border-[#EC4899]" />
 </div>
 <button onClick={generateCaption} disabled={generating}
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
 </div>
 </Section>

 {/* 3) 캡션 / 해시태그 편집 */}
 <Section step="3" title="편집" desc={`${charCount} / ${MAX_CAPTION}자`}>
 <textarea value={caption} onChange={e => setCaption(e.target.value)}
 placeholder="여기에 캡션이 자동 생성됩니다..."
 className="w-full px-3 py-2.5 border border-[var(--lu-line)] rounded-[6px] text-base focus:outline-none focus:border-[#EC4899] resize-y min-h-[140px] leading-relaxed" />
 <div className="mt-3">
 <label className="text-[11px] font-bold text-[var(--lu-muted)] mb-1.5 block flex items-center gap-1">
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
 <input type="text"
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
 <button onClick={saveDraft} disabled={!caption.trim()}
 className="min-h-11 flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 border border-[var(--lu-line)] text-[var(--lu-muted)] rounded-[6px] text-sm font-bold hover:bg-[var(--lu-canvas)] disabled:opacity-40">
 초안 저장
 </button>
 <button disabled
 className="min-h-11 flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[var(--lu-accent)] text-white rounded-[6px] text-sm font-bold opacity-60 cursor-not-allowed">
 <Send size={14} strokeWidth={2.5} />
 바로 발행 (준비중)
 </button>
 </div>
 <p className="text-[10px] text-[var(--lu-muted)] leading-relaxed">
 바로 발행은 메타 비즈니스 API 연동 후 활성화됩니다. 지금은 캡션 복사 → 인스타 앱에서 붙여넣기로 사용하세요.
 </p>
 </div>
 </Section>
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
