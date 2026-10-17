'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Sidebar from '../components/Sidebar'
import Footer from '../components/Footer'
import PageHeader from '../components/PageHeader'
import {
 LayoutGrid, Lightbulb, HelpCircle, PartyPopper, MessageCircle,
 Heart, Bookmark, Pencil, Megaphone, Search, Flame, BarChart3,
 X, Plus, ArrowRight, Play, LucideIcon, MapPin, Coins, Trophy,
 Navigation, Loader2, Store,
} from 'lucide-react'
import {
 COMMUNITY_REGIONS, regionLabel, groupedRegions, nearestRegions,
 type CommunityRegion,
} from '../lib/regions-community'
import {
 readMyEmailFromCookie, FEATURED_THRESHOLD,
} from '../lib/points'
import {
 INDUSTRY_CATALOG, INDUSTRY_LABELS, DEFAULT_INDUSTRY_GROUP_ID, findIndustryGroup,
} from '../lib/industry-catalog'
import SlideAdBanner from '../components/SlideAdBanner'
import HarangMarketingPopup from '../components/HarangMarketingPopup'

// ─── 카테고리 ─────────────────────────────────────────────────────
type Category = { id: string; label: string; Icon: LucideIcon; color: string }

const CATEGORIES: Category[] = [
 { id: 'all', label: '전체', Icon: LayoutGrid, color: '#8B95A1' },
 { id: 'tip', label: '마케팅 팁', Icon: Lightbulb, color: '#F59E0B' },
 { id: 'qna', label: '질문/답변', Icon: HelpCircle, color: '#16685D' },
 { id: 'success', label: '성공사례', Icon: PartyPopper, color: '#10B981' },
 { id: 'free', label: '자유게시판',Icon: MessageCircle, color: '#8B5CF6' },
]

// 공개 게시판 서버가 연결되기 전에는 게시글을 생성해서 채우지 않는다.
const INITIAL_POSTS: any[] = []

// ─── 작은 UI 헬퍼 ─────────────────────────────────────────────────
function CatBadge({ cat, size = 'sm' }: { cat: Category | undefined; size?: 'xs' | 'sm' | 'md' }) {
 if (!cat) return null
 const iconSize = size === 'xs' ? 10 : size === 'sm' ? 12 : 14
 return (
 <span className="inline-flex items-center gap-1">
 <cat.Icon size={iconSize} strokeWidth={2.25} style={{ color: cat.color }} />
 {cat.label}
 </span>
 )
}

function RegionPill({ region_id }: { region_id?: string }) {
 return (
 <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-[var(--lu-canvas)] text-[var(--lu-muted)] px-2 py-0.5 rounded-full">
 <MapPin size={10} strokeWidth={2.25} className="text-[var(--lu-accent)]" />
 {regionLabel(region_id)}
 </span>
 )
}

function IndustryPill({ industry }: { industry?: string }) {
 if (!industry) return null
 const grp = findIndustryGroup(industry)
 return (
 <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-[#FFF7ED] text-[#C2410C] px-2 py-0.5 rounded-full">
 <span>{grp?.emoji || ''}</span>
 {industry}
 </span>
 )
}


// ─── 글쓰기 모달 ──────────────────────────────────────────────────
function WriteModal({ onClose, onSubmit, defaultRegion }: {
 onClose: () => void
 onSubmit: (post: any) => void
 defaultRegion: string
}) {
 const [title, setTitle] = useState('')
 const [content, setContent] = useState('')
 const [category, setCategory] = useState('free')
 const [regionId, setRegionId] = useState(defaultRegion || 'nationwide')
 const [industry, setIndustry] = useState<string>('')
 const [industryGroup, setIndustryGroup] = useState<string>(DEFAULT_INDUSTRY_GROUP_ID)
 const [industrySearch, setIndustrySearch] = useState('')
 const [media, setMedia] = useState<{ type: 'image'|'video'; url: string; name: string }[]>([])

 const handleFilesPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
 const files = e.target.files
 if (!files) return
 Array.from(files).slice(0, 10).forEach(file => {
 const isImage = file.type.startsWith('image/')
 const isVideo = file.type.startsWith('video/')
 if (!isImage && !isVideo) return
 if (isImage && file.size < 5 * 1024 * 1024) {
 const reader = new FileReader()
 reader.onload = () => setMedia(prev => [...prev, { type: 'image', url: reader.result as string, name: file.name }])
 reader.readAsDataURL(file)
 } else {
 const url = URL.createObjectURL(file)
 setMedia(prev => [...prev, { type: isVideo ? 'video' : 'image', url, name: file.name }])
 // 메모리 누수 방지: 컴포넌트 언마운트 또는 미디어 제거 시 URL 해제는 removeMedia에서 처리
 }
 })
 e.target.value = ''
 }
 const removeMedia = (i: number) => setMedia(prev => {
 const item = prev[i]
 if (item && item.url.startsWith('blob:')) URL.revokeObjectURL(item.url)
 return prev.filter((_, idx) => idx !== i)
 })

 const handleSubmit = () => {
 if (!title.trim() || !content.trim()) return
 onSubmit({ title, content, category, region_id: regionId, industry: industry || undefined, media })
 onClose()
 }

 const grouped = useMemo(() => groupedRegions(), [])

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
 <div className="bg-white rounded-[10px] w-full max-w-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
 <div className="flex items-center justify-between p-6 border-b border-[var(--lu-canvas)] sticky top-0 bg-white z-10">
 <h2 className="text-lg font-bold text-[var(--lu-ink)]">글쓰기 <span className="text-xs text-[var(--lu-muted)] font-medium">· 공개 전송되지 않는 초안</span></h2>
 <button onClick={onClose} className="min-h-11 text-[var(--lu-muted)] hover:text-[var(--lu-ink)] transition-colors">
 <X size={22} strokeWidth={2} />
 </button>
 </div>
 <div className="p-6 space-y-4">
 {/* 지역 선택 */}
 <div>
 <label className="block text-sm font-medium text-[var(--lu-ink)] mb-2">지역 게시판</label>
 <select
 value={regionId}
 onChange={e => setRegionId(e.target.value)}
 className="min-h-11 w-full border border-[var(--lu-line)] rounded-[6px] px-4 py-3 text-base focus:outline-none focus:border-[var(--lu-accent)] transition-colors bg-white"
 >
 {grouped.map(g => (
 <optgroup key={g.parent ?? 'nationwide'} label={g.parent ?? '전국'}>
 {g.items.map(r => (
 <option key={r.id} value={r.id}>
 {r.parent_label ? `${r.parent_label} ${r.label}` : r.label}
 </option>
 ))}
 </optgroup>
 ))}
 </select>
 <p className="text-[11px] text-[var(--lu-muted)] mt-1.5">같은 지역 사장님들만 서로 볼 수 있어요 · 전국 게시판은 누구나 열람 가능</p>
 </div>

 {/* 업종 게시판 (선택) */}
 <div>
 <label className="block text-sm font-medium text-[var(--lu-ink)] mb-2">
 업종 게시판 <span className="text-xs text-[var(--lu-muted)] font-normal">(선택 · 미지정 가능)</span>
 {industry && (
 <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFF7ED] text-[#C2410C] text-[11px] font-bold">
 {findIndustryGroup(industry)?.emoji || ''} {industry}
 <button type="button" onClick={() => setIndustry('')} className="min-h-11 ml-1 hover:text-[#9A3412]">×</button>
 </span>
 )}
 </label>

 {/* 대분류 탭 */}
 <div className="flex flex-wrap gap-1 mb-2 pb-2 border-b border-[#F1F3F5]">
 {INDUSTRY_CATALOG.map(g => (
 <button
 key={g.id}
 type="button"
 onClick={() => { setIndustryGroup(g.id); setIndustrySearch('') }}
 title={g.desc}
 className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${industryGroup === g.id ? 'border-[#EA580C] bg-[#EA580C] text-white' : 'border-[var(--lu-line)] text-[var(--lu-muted)] hover:border-[#EA580C] hover:text-[#EA580C]'}`}
 >
 <span className="mr-0.5">{g.emoji}</span>{g.label}
 </button>
 ))}
 </div>

 {/* 소분류 pills */}
 {!industrySearch && (
 <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto pr-1">
 {(INDUSTRY_CATALOG.find(g => g.id === industryGroup)?.items || []).map(item => (
 <button
 key={item}
 type="button"
 onClick={() => setIndustry(item)}
 className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${industry === item ? 'border-[#EA580C] bg-[#FFF7ED] text-[#C2410C]' : 'border-[var(--lu-line)] text-[var(--lu-muted)] hover:border-[#FED7AA]'}`}
 >
 {item}
 </button>
 ))}
 </div>
 )}

 {/* 업종 검색 */}
 <div className="mt-2 relative">
 <input
 type="text"
 value={industrySearch}
 onChange={e => setIndustrySearch(e.target.value)}
 placeholder="업종 직접 검색 (예: 치과, 필라테스)"
 className="min-h-11 w-full border border-[var(--lu-line)] rounded-lg px-3 py-2 text-base focus:outline-none focus:border-[#EA580C] transition-colors"
 />
 {industrySearch && (
 <div className="mt-2 flex flex-wrap gap-1 max-h-32 overflow-y-auto pr-1">
 {INDUSTRY_LABELS
 .filter(l => l.toLowerCase().includes(industrySearch.toLowerCase()))
 .slice(0, 30)
 .map(l => {
 const grp = findIndustryGroup(l)
 return (
 <button
 key={l}
 type="button"
 onClick={() => {
 setIndustry(l)
 if (grp) setIndustryGroup(grp.id)
 setIndustrySearch('')
 }}
 className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${industry === l ? 'border-[#EA580C] bg-[#FFF7ED] text-[#C2410C]' : 'border-[var(--lu-line)] text-[var(--lu-muted)] hover:border-[#FED7AA]'}`}
 >
 {grp?.emoji} {l}
 </button>
 )
 })}
 </div>
 )}
 </div>
 </div>

 {/* 카테고리 */}
 <div>
 <label className="block text-sm font-medium text-[var(--lu-ink)] mb-2">카테고리</label>
 <div className="flex gap-2 flex-wrap">
 {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
 <button
 key={cat.id}
 onClick={() => setCategory(cat.id)}
 className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
 category === cat.id ? 'bg-[var(--lu-accent)] text-white' : 'bg-[var(--lu-canvas)] text-[var(--lu-muted)] hover:bg-[var(--lu-line)]'
 }`}
 >
 <cat.Icon size={12} strokeWidth={2.25} />
 {cat.label}
 </button>
 ))}
 </div>
 </div>

 {/* 제목 */}
 <div>
 <label className="block text-sm font-medium text-[var(--lu-ink)] mb-2">제목</label>
 <input type="text" value={title} onChange={e => setTitle(e.target.value)}
 placeholder="제목을 입력하세요"
 className="min-h-11 w-full border border-[var(--lu-line)] rounded-[6px] px-4 py-3 text-base focus:outline-none focus:border-[var(--lu-accent)] transition-colors" />
 </div>

 {/* 내용 */}
 <div>
 <label className="block text-sm font-medium text-[var(--lu-ink)] mb-2">내용</label>
 <textarea value={content} onChange={e => setContent(e.target.value)}
 placeholder="소상공인 이웃들과 경험을 나눠보세요!"
 rows={6}
 className="w-full border border-[var(--lu-line)] rounded-[6px] px-4 py-3 text-base focus:outline-none focus:border-[var(--lu-accent)] transition-colors resize-none" />
 </div>

 {/* 사진/영상 업로드 */}
 <div>
 <label className="block text-sm font-medium text-[var(--lu-ink)] mb-2">사진·영상 (선택 · 최대 10개)</label>
 <div className="flex flex-wrap gap-2">
 {media.map((m, i) => (
 <div key={i} className="relative w-20 h-20 rounded-[6px] overflow-hidden bg-[var(--lu-canvas)] group">
 {m.type === 'image'
 ? <img src={m.url} alt={m.name} className="w-full h-full object-cover" />
 : <video src={m.url} className="w-full h-full object-cover" muted />}
 <button type="button" onClick={() => removeMedia(i)}
 className="min-h-11 absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black transition-colors">
 <X size={10} strokeWidth={2.5} />
 </button>
 </div>
 ))}
 {media.length < 10 && (
 <label className="w-20 h-20 rounded-[6px] border-2 border-dashed border-[var(--lu-line)] flex flex-col items-center justify-center cursor-pointer hover:border-[var(--lu-accent)] hover:bg-[#F2F8FF] transition-colors text-[var(--lu-muted)] hover:text-[var(--lu-accent)]">
 <Plus size={18} strokeWidth={2.25} />
 <span className="text-[10px] mt-0.5">사진/영상</span>
 <input type="file" accept="image/*,video/*" multiple onChange={handleFilesPicked} className="min-h-11 hidden" />
 </label>
 )}
 </div>
 </div>
 </div>

 <div className="flex gap-3 p-6 pt-0">
 <button onClick={onClose} className="min-h-11 flex-1 py-3 rounded-[6px] border border-[var(--lu-line)] text-[var(--lu-muted)] font-semibold text-sm hover:bg-[var(--lu-canvas)] transition-colors">
 취소
 </button>
 <button onClick={handleSubmit} disabled={!title.trim() || !content.trim()}
 className="min-h-11 flex-1 py-3 rounded-[6px] bg-[var(--lu-accent)] text-white font-semibold text-sm hover:bg-[var(--lu-accent-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
 이 브라우저에 초안 저장
 </button>
 </div>
 </div>
 </div>
 )
}

// ─── 글 상세 모달 ─────────────────────────────────────────────────
function PostModal({ post, onClose, onLike, onBookmark, onComment }: any) {
 const [comment, setComment] = useState('')
 const cat = CATEGORIES.find(c => c.id === post.category)

 const submitComment = () => {
 if (!comment.trim()) return
 onComment(post.id, comment.trim())
 setComment('')
 }

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
 <div className="bg-white rounded-[10px] w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
 <div className="flex items-center justify-between p-6 border-b border-[var(--lu-canvas)] flex-shrink-0">
 <div className="flex items-center gap-2">
 <span className="inline-flex items-center gap-1.5 text-sm font-medium bg-[var(--lu-accent-soft)] text-[var(--lu-accent)] px-3 py-1 rounded-full">
 {cat && <cat.Icon size={12} strokeWidth={2.25} />}
 {cat?.label}
 </span>
 <RegionPill region_id={post.region_id} />
 <IndustryPill industry={post.industry} />
 {post.featured && (
 <span className="inline-flex items-center gap-1 text-xs font-bold bg-[var(--lu-accent)] text-white px-2 py-1 rounded-full">
 <Trophy size={10} strokeWidth={2.5} />인기글
 </span>
 )}
 </div>
 <button onClick={onClose} className="min-h-11 text-[var(--lu-muted)] hover:text-[var(--lu-ink)] transition-colors">
 <X size={22} strokeWidth={2} />
 </button>
 </div>

 <div className="overflow-y-auto flex-1 p-6">
 <div className="flex items-center gap-3 mb-4">
 <div className="w-10 h-10 rounded-full bg-[var(--lu-accent)] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
 {post.avatar}
 </div>
 <div>
 <div className="font-semibold text-[var(--lu-ink)]">{post.author}</div>
 <div className="text-xs text-[var(--lu-muted)]">{post.time}</div>
 </div>
 </div>
 <h2 className="text-xl font-bold text-[var(--lu-ink)] mb-4">{post.title}</h2>
 <p className="text-[var(--lu-muted)] leading-relaxed whitespace-pre-wrap mb-6">{post.content}</p>

 {post.media && post.media.length > 0 && (
 <div className="grid grid-cols-2 gap-2 mb-6">
 {post.media.map((m: any, i: number) => (
 <div key={i} className="rounded-[6px] overflow-hidden bg-[var(--lu-canvas)]">
 {m.type === 'image'
 ? <img src={m.url} alt={m.name} className="w-full h-48 object-cover" />
 : <video src={m.url} controls className="w-full h-48 object-cover bg-black" />}
 </div>
 ))}
 </div>
 )}

 <div className="flex items-center gap-4 pb-6 border-b border-[var(--lu-canvas)]">
 <button onClick={() => onLike(post.id)}
 className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${post.liked ? 'text-[#FF3B30]' : 'text-[var(--lu-muted)] hover:text-[#FF3B30]'}`}>
 <Heart size={16} strokeWidth={post.liked ? 0 : 2} fill={post.liked ? 'currentColor' : 'none'} />
 {post.likes}
 </button>
 <button onClick={() => onBookmark(post.id)}
 className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${post.bookmarked ? 'text-[var(--lu-accent)]' : 'text-[var(--lu-muted)] hover:text-[var(--lu-accent)]'}`}>
 <Bookmark size={16} strokeWidth={post.bookmarked ? 0 : 2} fill={post.bookmarked ? 'currentColor' : 'none'} />
 저장
 </button>
 {post.likes >= FEATURED_THRESHOLD - 5 && !post.featured && (
 <span className="ml-auto text-[11px] text-[#FB8500] font-medium">
 이 브라우저에서만 확인하는 초안입니다.
 </span>
 )}
 </div>

 <div className="mt-4">
 <div className="text-sm font-semibold text-[var(--lu-ink)] mb-4">댓글 {post.comments.length}개</div>
 {post.comments.length === 0 && (
 <div className="text-center text-[var(--lu-muted)] text-sm py-6">이 초안에 메모를 남길 수 있습니다.</div>
 )}
 <div className="space-y-4">
 {post.comments.map((c: any, i: number) => (
 <div key={i} className="flex gap-3">
 <div className="w-8 h-8 rounded-full bg-[var(--lu-canvas)] text-[var(--lu-muted)] flex items-center justify-center font-bold text-xs flex-shrink-0">
 {c.author[0]}
 </div>
 <div className="flex-1">
 <div className="flex items-center gap-2 mb-1">
 <span className="text-sm font-semibold text-[var(--lu-ink)]">{c.author}</span>
 <span className="text-xs text-[var(--lu-muted)]">{c.time}</span>
 </div>
 <p className="text-sm text-[var(--lu-muted)]">{c.text}</p>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>

 <div className="p-4 border-t border-[var(--lu-canvas)] flex-shrink-0">
 <div className="flex gap-2">
 <input type="text" value={comment} onChange={e => setComment(e.target.value)}
 onKeyDown={e => e.key === 'Enter' && submitComment()}
 placeholder="댓글을 입력하세요... (+50P)"
 className="min-h-11 flex-1 border border-[var(--lu-line)] rounded-[6px] px-4 py-2.5 text-base focus:outline-none focus:border-[var(--lu-accent)] transition-colors" />
 <button onClick={submitComment}
 className="min-h-11 px-4 py-2.5 bg-[var(--lu-accent)] text-white text-sm font-semibold rounded-[6px] hover:bg-[var(--lu-accent-hover)] transition-colors">
 등록
 </button>
 </div>
 </div>
 </div>
 </div>
 )
}

// ─── 메인 ─────────────────────────────────────────────────────────
export default function Community() {
 const [posts, setPosts] = useState<any[]>(INITIAL_POSTS)
 const [activeCategory, setActiveCategory] = useState('all')
 const [activeRegion, setActiveRegion] = useState<string>('nationwide')
 const [activeIndustryGroup, setActiveIndustryGroup] = useState<string>('all') // 'all' | IndustryGroup id
 const [activeIndustry, setActiveIndustry] = useState<string>('all') // 'all' | 특정 업종 라벨
 const [selectedPost, setSelectedPost] = useState<any>(null)
 const [showWrite, setShowWrite] = useState(false)
 const [searchQuery, setSearchQuery] = useState('')
 const [myEmail, setMyEmail] = useState<string>('')

 // 위치기반 (당근식)
 const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'ok' | 'denied' | 'unavailable' | 'timeout' | 'unsupported'>('idle')
 const [nearRegions, setNearRegions] = useState<Array<CommunityRegion & { distance_km: number }>>([])

 const requestGeoLocation = () => {
 if (typeof navigator === 'undefined' || !navigator.geolocation) {
 setGeoStatus('unsupported')
 return
 }
 setGeoStatus('loading')
 // 1차 시도: 고정밀 요청 (GPS/WiFi 기반, 정확도 ↑)
 navigator.geolocation.getCurrentPosition(
 (pos) => {
 try {
 const list = nearestRegions(pos.coords.latitude, pos.coords.longitude, 6)
 setNearRegions(list)
 setGeoStatus('ok')
 // 가장 가까운 지역으로 자동 선택(전국 제외 첫 번째)
 const top = list[0]
 if (top) setActiveRegion(top.id)
 try {
 window.localStorage.setItem('localution.community_geo', JSON.stringify({
 lat: pos.coords.latitude, lng: pos.coords.longitude, ts: Date.now(),
 }))
 } catch (_) {}
 } catch (_) {
 setGeoStatus('unavailable')
 }
 },
 (err) => {
 // 고정밀 실패 시 저정밀로 2차 시도 (IP 기반, 커버리지 ↑)
 if (err && err.code === 3 /* TIMEOUT */) {
 navigator.geolocation.getCurrentPosition(
 (pos) => {
 try {
 const list = nearestRegions(pos.coords.latitude, pos.coords.longitude, 6)
 setNearRegions(list)
 setGeoStatus('ok')
 const top = list[0]
 if (top) setActiveRegion(top.id)
 try {
 window.localStorage.setItem('localution.community_geo', JSON.stringify({
 lat: pos.coords.latitude, lng: pos.coords.longitude, ts: Date.now(),
 }))
 } catch (_) {}
 } catch (_) {
 setGeoStatus('unavailable')
 }
 },
 (err2) => {
 if (err2 && err2.code === 1) setGeoStatus('denied')
 else if (err2 && err2.code === 3) setGeoStatus('timeout')
 else setGeoStatus('unavailable')
 },
 { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 },
 )
 return
 }
 if (err && err.code === 1) setGeoStatus('denied')
 else if (err && err.code === 2) setGeoStatus('unavailable')
 else setGeoStatus('unavailable')
 },
 { enableHighAccuracy: true, timeout: 12000, maximumAge: 10 * 60 * 1000 },
 )
 }

 // 캐시된 좌표 있으면 자동 로드
 useEffect(() => {
 try {
 const raw = window.localStorage.getItem('localution.community_geo')
 if (!raw) return
 const g = JSON.parse(raw)
 if (typeof g?.lat !== 'number' || typeof g?.lng !== 'number') return
 const list = nearestRegions(g.lat, g.lng, 6)
 setNearRegions(list)
 setGeoStatus('ok')
 } catch (_) {}
 }, [])

 // 로그인 이메일 + 포인트 잔액 읽기
 useEffect(() => {
 const email = readMyEmailFromCookie() || 'guest@example.com'
 setMyEmail(email)

 }, [])

 // 이 브라우저에 사용자가 작성한 초안만 복구한다. 공개 게시글이 아니다.
 useEffect(() => {
 try {
 const raw = window.localStorage.getItem('localution.community_posts')
 if (!raw) return
 const saved = JSON.parse(raw)
 if (Array.isArray(saved)) setPosts(saved.filter((post: any) => post?.author === '나' && typeof post.title === 'string' && typeof post.content === 'string').map((post: any) => ({ ...post, featured: false })))
 } catch (_) {}
 }, [])

 const filteredPosts = useMemo(() => posts.filter(p => {
 const matchCat = activeCategory === 'all' || p.category === activeCategory
 const matchRegion = activeRegion === 'nationwide' || p.region_id === activeRegion
 const matchSearch = !searchQuery || p.title.includes(searchQuery) || p.content.includes(searchQuery)
 // 업종 필터: 전체면 통과. 특정 업종이면 정확 매칭. 대분류 그룹만 선택된 경우 그룹 내 업종 모두 매칭
 let matchIndustry = true
 if (activeIndustry !== 'all') {
 matchIndustry = p.industry === activeIndustry
 } else if (activeIndustryGroup !== 'all') {
 const grp = INDUSTRY_CATALOG.find(g => g.id === activeIndustryGroup)
 matchIndustry = !!(p.industry && grp && grp.items.includes(p.industry))
 }
 return matchCat && matchRegion && matchSearch && matchIndustry
 }), [posts, activeCategory, activeRegion, activeIndustryGroup, activeIndustry, searchQuery])

 const hotPosts = useMemo(() => posts.slice(0, 3), [posts])


 const handleLike = (id: number) => {
 setPosts(prev => prev.map(p => {
 if (p.id !== id) return p
 const newLikes = p.liked ? p.likes - 1 : p.likes + 1
 const next = { ...p, liked: !p.liked, likes: newLikes }
 return next
 }))
 if (selectedPost?.id === id) {
 setSelectedPost((prev: any) => prev ? { ...prev, liked: !prev.liked, likes: prev.liked ? prev.likes - 1 : prev.likes + 1 } : null)
 }
 }

 const handleBookmark = (id: number) => {
 setPosts(prev => prev.map(p => p.id === id ? { ...p, bookmarked: !p.bookmarked } : p))
 if (selectedPost?.id === id) {
 setSelectedPost((prev: any) => prev ? { ...prev, bookmarked: !prev.bookmarked } : null)
 }
 }

 const handleNewPost = (data: any) => {
 const newId = Date.now()
 const newPost = {
 id: newId, ...data,
 author: '나', avatar: '나', author_email: myEmail,
 time: '방금', likes: 0, comments: [],
 liked: false, bookmarked: false, featured: false,
 media: data.media || [],
 }
 setPosts(prev => {
 const next = [newPost, ...prev]
 try {
 const mine = next.filter((p: any) => p.author === '나').slice(0, 50)
 window.localStorage.setItem('localution.community_posts', JSON.stringify(mine))
 } catch (_) {}
 return next
 })

 }

 const handleComment = (postId: number, text: string) => {
 setPosts(prev => prev.map(p => p.id === postId
 ? { ...p, comments: [...p.comments, { author: '나', text, time: '방금' }] }
 : p))
 setSelectedPost((prev: any) => prev && prev.id === postId
 ? { ...prev, comments: [...prev.comments, { author: '나', text, time: '방금' }] }
 : prev)

 }

 const regionGroups = useMemo(() => groupedRegions(), [])

 return (
 <div className="min-h-screen bg-[var(--lu-canvas)] flex">
 <Sidebar />
 <main className="flex-1 md:ml-[220px] pt-4 md:pt-0 min-w-0">
 <PageHeader
 icon=""
 title="커뮤니티"
 subtitle="공개 게시판 연결 준비 중입니다. 작성한 내용은 이 브라우저에 초안으로만 저장됩니다."
 variant="promo"
 right={
 <div className="hidden md:flex items-center gap-2">
 <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur px-3 py-1.5 rounded-full text-sm font-bold">
 <Coins size={14} strokeWidth={2.5} />
 브라우저 초안
 </div>
 <button onClick={() => setShowWrite(true)}
 className="min-h-11 inline-flex items-center gap-1.5 bg-white text-[#EA580C] font-bold px-4 py-2 rounded-full text-sm shadow hover:shadow-none transition-all">
 <Pencil size={14} strokeWidth={2.5} />
 글쓰기
 </button>
 </div>
 }
 />

 <div className="max-w-5xl mx-auto p-4 md:p-6 w-full">
 {/* 모바일 상단 바 */}
 <div className="md:hidden flex items-center justify-between mb-4 gap-2">
 <div className="flex items-center gap-1.5 bg-[var(--lu-accent)] text-white px-3 py-1.5 rounded-full text-sm font-bold shadow">
 <Coins size={14} strokeWidth={2.5} />
 브라우저 초안
 </div>
 <button onClick={() => setShowWrite(true)}
 className="min-h-11 inline-flex items-center gap-1.5 bg-[var(--lu-accent)] text-white font-bold px-4 py-2 rounded-full text-sm shadow">
 <Pencil size={14} strokeWidth={2.5} />
 글쓰기
 </button>
 </div>

 {/* 슬라이드 광고 배너 — 최상단 (포인트·이용안내 위) */}
 <SlideAdBanner className="mb-4" />

 <div className="mb-4 rounded-[10px] border border-[var(--lu-line)] bg-white p-4 text-sm leading-6 text-[var(--lu-muted)]">공개 게시글 조회와 게시 기능은 아직 연결되지 않았습니다. 아래 목록은 이 브라우저에 직접 저장한 초안입니다. 다른 사용자에게 공유되거나 포인트가 적립되지 않습니다.</div>

 {/* 공지 배너 */}
 <div className="bg-[var(--lu-accent-soft)] border border-[#BFDBFE] rounded-[10px] px-5 py-3.5 mb-4 flex items-start gap-3">
 <span className="w-9 h-9 rounded-[6px] bg-white flex items-center justify-center flex-shrink-0">
 <Megaphone size={18} strokeWidth={2} className="text-[var(--lu-accent)]" />
 </span>
 <div>
 <p className="text-sm font-bold text-[var(--lu-accent)] mb-0.5">커뮤니티 이용 안내</p>
 <p className="text-xs text-[var(--lu-muted)] leading-relaxed">초안은 현재 브라우저에만 저장됩니다. 다른 기기나 다른 사용자에게 전송되지 않습니다.</p>
 </div>
 </div>

 {/* 모바일 · 태블릿 전용 지역 게시판 선택 (lg 이상은 우측 사이드바 카드로 표시) */}
 <div className="lg:hidden bg-white rounded-[10px] px-4 py-2.5 mb-4 shadow-none border border-[var(--lu-canvas)]">
 <div className="flex items-center gap-2">
 <MapPin size={13} strokeWidth={2.25} className="text-[var(--lu-accent)] flex-shrink-0" />
 <span className="text-xs font-bold text-[var(--lu-ink)] flex-shrink-0">지역</span>
 <select
 value={activeRegion}
 onChange={e => setActiveRegion(e.target.value)}
 className="min-h-11 flex-1 min-w-0 text-base bg-[var(--lu-canvas)] border-none rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--lu-accent)]/30 font-semibold text-[var(--lu-ink)]"
 >
 {regionGroups.map(g => (
 <optgroup key={g.parent ?? 'nationwide'} label={g.parent ?? '전국'}>
 {g.items.map(r => (
 <option key={r.id} value={r.id}>
 {r.parent_label ? `${r.parent_label} ${r.label}` : r.label}
 </option>
 ))}
 </optgroup>
 ))}
 </select>
 <button
 onClick={requestGeoLocation}
 disabled={geoStatus === 'loading'}
 className="min-h-11 flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-[var(--lu-accent-soft)] text-[var(--lu-accent)] hover:bg-[#DBEAFE] transition-colors disabled:opacity-60"
 >
 {geoStatus === 'loading'
 ? <Loader2 size={11} strokeWidth={2.5} className="animate-spin" />
 : <Navigation size={11} strokeWidth={2.5} />}
 내 위치
 </button>
 </div>
 {(geoStatus === 'denied' || geoStatus === 'unavailable' || geoStatus === 'timeout' || geoStatus === 'unsupported') && (
 <p className="text-[10px] text-[#FB8500] mt-1.5 leading-snug">
 {geoStatus === 'denied' && '위치 권한이 차단돼 있어요. 브라우저 설정에서 허용해 주세요'}
 {geoStatus === 'unavailable' && '위치를 확인할 수 없어요. WiFi/모바일 데이터 확인 후 다시 시도'}
 {geoStatus === 'timeout' && '위치 찾기가 너무 오래 걸려요. 다시 시도해 주세요'}
 {geoStatus === 'unsupported' && '이 브라우저는 위치 기능을 지원하지 않아요'}
 </p>
 )}
 </div>

 {/* 모바일 · 태블릿 전용 업종 게시판 선택 (lg 이상은 우측 사이드바 카드로 표시) */}
 <div className="lg:hidden bg-white rounded-[10px] px-4 py-2.5 mb-4 shadow-none border border-[var(--lu-canvas)]">
 <div className="flex items-center gap-2 mb-2">
 <Store size={13} strokeWidth={2.25} className="text-[#EA580C] flex-shrink-0" />
 <span className="text-xs font-bold text-[var(--lu-ink)] flex-shrink-0">업종</span>
 <select
 value={activeIndustryGroup}
 onChange={e => { setActiveIndustryGroup(e.target.value); setActiveIndustry('all') }}
 className="min-h-11 flex-1 min-w-0 text-base bg-[#FFF7ED] border-none rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#EA580C]/30 font-semibold text-[#9A3412]"
 >
 <option value="all">전체 업종</option>
 {INDUSTRY_CATALOG.map(g => (
 <option key={g.id} value={g.id}>{g.emoji} {g.label}</option>
 ))}
 </select>
 {(activeIndustryGroup !== 'all' || activeIndustry !== 'all') && (
 <button
 onClick={() => { setActiveIndustryGroup('all'); setActiveIndustry('all') }}
 className="min-h-11 flex-shrink-0 text-[10px] text-[var(--lu-muted)] hover:text-[var(--lu-muted)] px-1.5 py-0.5"
 >초기화</button>
 )}
 </div>
 {activeIndustryGroup !== 'all' && (
 <div className="flex gap-1 overflow-x-auto pb-1">
 <button
 type="button"
 onClick={() => setActiveIndustry('all')}
 className={`flex-shrink-0 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-colors ${activeIndustry === 'all' ? 'border-[#EA580C] bg-[#FFF7ED] text-[#C2410C]' : 'border-[var(--lu-line)] text-[var(--lu-muted)]'}`}
 >
 전체
 </button>
 {(INDUSTRY_CATALOG.find(g => g.id === activeIndustryGroup)?.items || []).slice(0, 12).map(item => (
 <button
 key={item}
 type="button"
 onClick={() => setActiveIndustry(item)}
 className={`flex-shrink-0 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-colors ${activeIndustry === item ? 'border-[#EA580C] bg-[#FFF7ED] text-[#C2410C]' : 'border-[var(--lu-line)] text-[var(--lu-muted)]'}`}
 >
 {item}
 </button>
 ))}
 </div>
 )}
 </div>

 {/* 광고 문의 라인 */}
 <div className="mb-5 flex items-center justify-between bg-white rounded-[10px] px-4 py-2.5 shadow-none border border-[var(--lu-canvas)]">
 <p className="text-xs text-[var(--lu-muted)]">
 이 공간은 매장·서비스 홍보 배너로도 활용됩니다
 </p>
 <Link href="/inquiry?category=ad"
 className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FFF4E5] text-[#EA580C] hover:bg-[#FFE8CC] transition-colors">
 광고 문의 <ArrowRight size={12} strokeWidth={2.5} />
 </Link>
 </div>

 {/* 검색 */}
 <div className="relative mb-5">
 <Search size={16} strokeWidth={2} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--lu-muted)]" />
 <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
 placeholder="궁금한 내용을 검색해보세요..."
 className="min-h-11 w-full bg-white border border-[var(--lu-line)] rounded-[6px] pl-10 pr-4 py-3 text-base focus:outline-none focus:border-[var(--lu-accent)] transition-colors shadow-none" />
 </div>

 <div className="flex gap-6">
 <div className="flex-1 min-w-0">
 {/* 카테고리 탭 */}
 <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
 {CATEGORIES.map(cat => {
 const active = activeCategory === cat.id
 return (
 <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
 className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
 active ? 'bg-[var(--lu-accent)] text-white shadow-none'
 : 'bg-white text-[var(--lu-muted)] border border-[var(--lu-line)] hover:border-[var(--lu-accent)] hover:text-[var(--lu-accent)]'
 }`}>
 <cat.Icon size={14} strokeWidth={2.25} style={active ? undefined : { color: cat.color }} />
 {cat.label}
 </button>
 )
 })}
 </div>

 {/* 현재 필터 요약 */}
 <div className="text-xs text-[var(--lu-muted)] mb-3">
 {regionLabel(activeRegion)} ·
 {activeIndustry !== 'all'
 ? ` ${findIndustryGroup(activeIndustry)?.emoji || ''} ${activeIndustry}`
 : activeIndustryGroup !== 'all'
 ? ` ${INDUSTRY_CATALOG.find(g => g.id === activeIndustryGroup)?.emoji || ''} ${INDUSTRY_CATALOG.find(g => g.id === activeIndustryGroup)?.label}`
 : ' 전체 업종'} ·
 {' '}{CATEGORIES.find(c => c.id === activeCategory)?.label} · 총 {filteredPosts.length}건
 </div>

 {/* 게시글 목록 */}
 {filteredPosts.length === 0 ? (
 <div className="bg-white rounded-[10px] p-12 text-center shadow-none">
 <div className="w-14 h-14 rounded-[10px] bg-[var(--lu-canvas)] mx-auto mb-3 flex items-center justify-center">
 <Search size={26} strokeWidth={1.75} className="text-[var(--lu-muted)]" />
 </div>
 <div className="font-semibold text-[var(--lu-ink)] mb-1">게시글이 없어요</div>
 <div className="text-sm text-[var(--lu-muted)]">이 브라우저에 저장한 초안이 없습니다.</div>
 </div>
 ) : (
 <div className="space-y-3">
 {filteredPosts.map(post => {
 const cat = CATEGORIES.find(c => c.id === post.category)
 return (
 <div key={post.id} onClick={() => setSelectedPost(post)}
 className="bg-white rounded-[10px] p-5 shadow-none hover:shadow-md transition-all cursor-pointer group">
 <div className="flex items-start justify-between gap-3">
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-2 flex-wrap">
 <span className="text-xs font-medium bg-[var(--lu-canvas)] text-[var(--lu-muted)] px-2 py-0.5 rounded-full">
 <CatBadge cat={cat} size="xs" />
 </span>
 <RegionPill region_id={post.region_id} />
 <IndustryPill industry={post.industry} />
 {post.featured && (
 <span className="inline-flex items-center gap-1 text-xs font-bold bg-[var(--lu-accent)] text-white px-2 py-0.5 rounded-full">
 <Trophy size={10} strokeWidth={2.5} />인기
 </span>
 )}
 {post.bookmarked && (
 <span className="inline-flex items-center gap-1 text-xs text-[var(--lu-accent)]">
 <Bookmark size={10} strokeWidth={0} fill="currentColor" />
 저장됨
 </span>
 )}
 </div>
 <h3 className="font-semibold text-[var(--lu-ink)] group-hover:text-[var(--lu-accent)] transition-colors mb-1 truncate">
 {post.title}
 </h3>
 <p className="text-sm text-[var(--lu-muted)] line-clamp-2 leading-relaxed">
 {post.content}
 </p>
 {post.media && post.media.length > 0 && (
 <div className="flex gap-1.5 mt-2">
 {post.media.slice(0, 3).map((m: any, i: number) => (
 <div key={i} className="w-14 h-14 rounded-lg overflow-hidden bg-[var(--lu-canvas)] relative">
 {m.type === 'image'
 ? <img src={m.url} alt="" className="w-full h-full object-cover" />
 : <>
 <video src={m.url} className="w-full h-full object-cover" muted />
 <span className="absolute inset-0 flex items-center justify-center text-white bg-black/30">
 <Play size={14} strokeWidth={0} fill="white" />
 </span>
 </>}
 </div>
 ))}
 {post.media.length > 3 && (
 <div className="w-14 h-14 rounded-lg bg-[var(--lu-canvas)] flex items-center justify-center text-xs text-[var(--lu-muted)] font-bold">+{post.media.length - 3}</div>
 )}
 </div>
 )}
 </div>
 <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--lu-accent-soft)] text-[var(--lu-accent)] flex items-center justify-center font-bold text-sm">
 {post.avatar}
 </div>
 </div>
 <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[var(--lu-canvas)]">
 <span className="text-xs text-[var(--lu-muted)]">{post.author}</span>
 <span className="text-xs text-[var(--lu-muted)]">{post.time}</span>
 <span className="ml-auto flex items-center gap-3 text-xs text-[var(--lu-muted)]">
 <span className={`inline-flex items-center gap-1 ${post.liked ? 'text-[#FF3B30]' : ''}`}>
 <Heart size={12} strokeWidth={post.liked ? 0 : 2} fill={post.liked ? 'currentColor' : 'none'} />
 {post.likes}
 </span>
 <span className="inline-flex items-center gap-1">
 <MessageCircle size={12} strokeWidth={2} />
 {post.comments.length}
 </span>
 </span>
 </div>
 </div>
 )
 })}
 </div>
 )}
 </div>

 {/* 데스크탑 사이드 — 슬림 버전 (w-64 → w-52, p-5 → p-4) */}
 <div className="hidden lg:block w-52 flex-shrink-0 space-y-3">
 {/* 지역 게시판 (최상단 · 메인 라인에서 제거된 것을 사이드바에 컴팩트화) */}
 <div className="bg-white rounded-[10px] p-3.5 shadow-none border border-[var(--lu-canvas)]">
 <div className="flex items-center gap-1.5 mb-2">
 <MapPin size={12} strokeWidth={2.25} className="text-[var(--lu-accent)]" />
 <h3 className="font-bold text-[var(--lu-ink)] text-xs">지역 게시판</h3>
 <button
 onClick={requestGeoLocation}
 disabled={geoStatus === 'loading'}
 title="내 위치 찾기"
 className="min-h-11 ml-auto inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--lu-accent-soft)] text-[var(--lu-accent)] hover:bg-[#DBEAFE] transition-colors disabled:opacity-60"
 >
 {geoStatus === 'loading'
 ? <Loader2 size={10} strokeWidth={2.5} className="animate-spin" />
 : <Navigation size={10} strokeWidth={2.5} />}
 </button>
 </div>
 <select
 value={activeRegion}
 onChange={e => setActiveRegion(e.target.value)}
 className="min-h-11 w-full text-[11px] font-semibold text-[var(--lu-ink)] bg-[var(--lu-canvas)] border-none rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--lu-accent)]/30"
 >
 {regionGroups.map(g => (
 <optgroup key={g.parent ?? 'nationwide'} label={g.parent ?? '전국'}>
 {g.items.map(r => (
 <option key={r.id} value={r.id}>
 {r.parent_label ? `${r.parent_label} ${r.label}` : r.label}
 </option>
 ))}
 </optgroup>
 ))}
 </select>
 <p className="text-[10px] text-[var(--lu-muted)] mt-1.5 leading-snug">선택한 지역만 보기 · 전국 누구나 열람</p>
 {geoStatus === 'denied' && (
 <p className="text-[10px] text-[#FB8500] mt-1 leading-snug">위치 권한이 차단돼 있어요. 브라우저 설정에서 허용해 주세요</p>
 )}
 {geoStatus === 'unavailable' && (
 <p className="text-[10px] text-[#FB8500] mt-1 leading-snug">위치를 확인할 수 없어요. WiFi/모바일 데이터 연결 확인 후 다시 시도</p>
 )}
 {geoStatus === 'timeout' && (
 <p className="text-[10px] text-[#FB8500] mt-1 leading-snug">위치 찾기가 너무 오래 걸려요. 다시 시도해 주세요</p>
 )}
 {geoStatus === 'unsupported' && (
 <p className="text-[10px] text-[#FB8500] mt-1 leading-snug">이 브라우저는 위치 기능을 지원하지 않아요</p>
 )}
 </div>

 {/* 업종 게시판 (지역 게시판 바로 아래) */}
 <div className="bg-white rounded-[10px] p-3.5 shadow-none border border-[var(--lu-canvas)]">
 <div className="flex items-center gap-1.5 mb-2">
 <Store size={12} strokeWidth={2.25} className="text-[#EA580C]" />
 <h3 className="font-bold text-[var(--lu-ink)] text-xs">업종 게시판</h3>
 {(activeIndustryGroup !== 'all' || activeIndustry !== 'all') && (
 <button
 onClick={() => { setActiveIndustryGroup('all'); setActiveIndustry('all') }}
 className="min-h-11 ml-auto text-[10px] text-[var(--lu-muted)] hover:text-[var(--lu-muted)]"
 >초기화</button>
 )}
 </div>

 {/* 대분류 셀렉트 */}
 <select
 value={activeIndustryGroup}
 onChange={e => { setActiveIndustryGroup(e.target.value); setActiveIndustry('all') }}
 className="min-h-11 w-full text-[11px] font-semibold text-[#9A3412] bg-[#FFF7ED] border-none rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#EA580C]/30"
 >
 <option value="all">전체 업종</option>
 {INDUSTRY_CATALOG.map(g => (
 <option key={g.id} value={g.id}>{g.emoji} {g.label}</option>
 ))}
 </select>

 {/* 선택된 그룹의 세부업종 pills */}
 {activeIndustryGroup !== 'all' && (
 <div className="mt-2 flex flex-wrap gap-1 max-h-40 overflow-y-auto pr-0.5">
 <button
 type="button"
 onClick={() => setActiveIndustry('all')}
 className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold border transition-colors ${activeIndustry === 'all' ? 'border-[#EA580C] bg-[#FFF7ED] text-[#C2410C]' : 'border-[var(--lu-line)] text-[var(--lu-muted)] hover:border-[#FED7AA]'}`}
 >
 전체
 </button>
 {(INDUSTRY_CATALOG.find(g => g.id === activeIndustryGroup)?.items || []).map(item => (
 <button
 key={item}
 type="button"
 onClick={() => setActiveIndustry(item)}
 className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold border transition-colors ${activeIndustry === item ? 'border-[#EA580C] bg-[#FFF7ED] text-[#C2410C]' : 'border-[var(--lu-line)] text-[var(--lu-muted)] hover:border-[#FED7AA]'}`}
 >
 {item}
 </button>
 ))}
 </div>
 )}
 <p className="text-[10px] text-[var(--lu-muted)] mt-1.5 leading-snug">
 같은 업종 사장님 글만 보기 · 총 {INDUSTRY_LABELS.length}개 업종
 </p>
 </div>

 {/* 저장 범위 */}
 <div className="bg-[var(--lu-accent)] rounded-[10px] p-3.5 border border-[#FED7AA]">
 <div className="flex items-center gap-1.5 mb-1">
 <Coins size={13} strokeWidth={2.25} className="text-[#EA580C]" />
 <h3 className="font-bold text-[#EA580C] text-[11px]">저장 범위</h3>
 </div>
 <p className="text-xl font-semibold text-[#9A3412] leading-tight">공개 연동 준비 중</p>
 <p className="text-[10px] text-[#78350F] mt-1 leading-snug opacity-90">이 브라우저에 직접 저장한 내용만 표시합니다.</p>
 </div>

 {/* 내 근처 지역 (geo OK 일 때만) */}
 {geoStatus === 'ok' && nearRegions.length > 0 && (
 <div className="bg-white rounded-[10px] p-3.5 shadow-none">
 <h3 className="font-bold text-[var(--lu-ink)] mb-2 flex items-center gap-1.5 text-xs">
 <Navigation size={12} strokeWidth={2.25} className="text-[#059669]" />
 내 근처
 </h3>
 <div className="space-y-1">
 {nearRegions.slice(0, 4).map(r => (
 <button
 key={r.id}
 onClick={() => setActiveRegion(r.id)}
 className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] transition-colors ${
 activeRegion === r.id
 ? 'bg-[#F0FDF4] text-[#059669] font-bold'
 : 'text-[var(--lu-muted)] hover:bg-[var(--lu-canvas)]'
 }`}
 >
 <span className="truncate">
 {r.parent_label ? `${r.parent_label} ${r.label}` : r.label}
 </span>
 <span className="opacity-70 text-[10px] flex-shrink-0 ml-1">
 {r.distance_km < 1 ? `${(r.distance_km * 1000).toFixed(0)}m` : `${r.distance_km.toFixed(1)}km`}
 </span>
 </button>
 ))}
 </div>
 </div>
 )}

 {/* 최근 브라우저 초안 */}
 <div className="bg-white rounded-[10px] p-3.5 shadow-none">
 <h3 className="font-bold text-[var(--lu-ink)] mb-2.5 flex items-center gap-1.5 text-xs">
 <Flame size={12} strokeWidth={2.25} className="text-[#FF3B30]" />
 최근 브라우저 초안
 </h3>
 <div className="space-y-2">
 {hotPosts.map((post, i) => (
 <div key={post.id} onClick={() => setSelectedPost(post)} className="cursor-pointer group">
 <div className="flex items-start gap-1.5">
 <span className={`text-xs font-bold flex-shrink-0 ${i === 0 ? 'text-[#FF3B30]' : i === 1 ? 'text-[#FF8C00]' : 'text-[var(--lu-muted)]'}`}>{i + 1}</span>
 <div className="min-w-0">
 <p className="text-[11px] font-medium text-[var(--lu-ink)] group-hover:text-[var(--lu-accent)] transition-colors line-clamp-2 leading-snug">{post.title}</p>
 <p className="inline-flex items-center gap-1 text-[10px] text-[var(--lu-muted)] mt-0.5">
 <Heart size={9} strokeWidth={0} fill="currentColor" className="text-[#FF3B30]" />
 {post.likes}
 <span className="text-[9px] opacity-75 truncate">· {regionLabel(post.region_id)}</span>
 </p>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* 카테고리별 게시글 */}
 <div className="bg-white rounded-[10px] p-3.5 shadow-none">
 <h3 className="font-bold text-[var(--lu-ink)] mb-2 flex items-center gap-1.5 text-xs">
 <BarChart3 size={12} strokeWidth={2.25} className="text-[var(--lu-accent)]" />
 카테고리별
 </h3>
 <div className="space-y-1">
 {CATEGORIES.filter(c => c.id !== 'all').map(cat => {
 const count = posts.filter(p => {
 if (p.category !== cat.id) return false
 if (activeRegion !== 'nationwide' && p.region_id !== activeRegion) return false
 if (activeIndustry !== 'all') return p.industry === activeIndustry
 if (activeIndustryGroup !== 'all') {
 const grp = INDUSTRY_CATALOG.find(g => g.id === activeIndustryGroup)
 return !!(p.industry && grp && grp.items.includes(p.industry))
 }
 return true
 }).length
 return (
 <div key={cat.id} className="flex items-center justify-between text-[11px]">
 <span className="inline-flex items-center gap-1 text-[var(--lu-muted)]">
 <cat.Icon size={12} strokeWidth={2.25} style={{ color: cat.color }} />
 {cat.label}
 </span>
 <span className="font-semibold text-[var(--lu-ink)]">{count}</span>
 </div>
 )
 })}
 </div>
 </div>
 </div>
 </div>

 <div className="-mx-4 md:-mx-6 mt-20">
 <Footer />
 </div>
 </div>
 </main>

 {showWrite && (
 <WriteModal onClose={() => setShowWrite(false)} onSubmit={handleNewPost} defaultRegion={activeRegion} />
 )}
 {selectedPost && (
 <PostModal
 post={selectedPost}
 onClose={() => setSelectedPost(null)}
 onLike={handleLike}
 onBookmark={handleBookmark}
 onComment={handleComment}
 />
 )}

 <HarangMarketingPopup />
 </div>
 )
}
