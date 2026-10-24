'use client'

// ============================================================
// 41차-8 · 리뷰 관리 허브 — 전 플랫폼 통합
// · /api/stores/me 에서 review_count / unreplied_count / rating_avg 표시
// · /api/place/reviews 기반 통합 피드 (구 apiPath 제거)
// · 리뷰만 있는 플랫폼도 "관리하기" 버튼 표시
// ============================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import Sidebar from '../components/Sidebar'
import Footer from '../components/Footer'
import PageHeader from '../components/PageHeader'
import HarangMarketingPopup from '../components/HarangMarketingPopup'
import { MessageSquare, Inbox, Star } from 'lucide-react'
import PlatformHealthStatus from './components/PlatformHealthStatus'
import { isReviewReplied, parseInboxFilter, readPlatformCounts, sumKnown, formatCount, filterFeed, type InboxFilter } from '../lib/review-inbox'

export const dynamic = 'force-dynamic'

// ─────────────────────────────────────────
// 로고 컴포넌트
// ─────────────────────────────────────────
function BaeminLogo({ size = 28 }: { size?: number }) {
 return (
 <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
 <rect width="48" height="48" rx="12" fill="#2DDDC8"/>
 <text x="24" y="32" fontSize="19" fontWeight="900" fill="white"
 fontFamily="Pretendard, sans-serif"
 textAnchor="middle" letterSpacing="-0.5">배민</text>
 </svg>
 )
}
function YogiyoLogo({ size = 28 }: { size?: number }) {
 return (
 <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
 <rect width="48" height="48" rx="12" fill="#E5007F"/>
 <text x="24" y="32" textAnchor="middle" fontSize="16" fontWeight="900"
 fill="white" fontFamily="Pretendard, sans-serif"
 letterSpacing="-0.8">요기요</text>
 </svg>
 )
}
function CoupangEatsLogo({ size = 28 }: { size?: number }) {
 return (
 <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
 <rect width="48" height="48" rx="10" fill="white" stroke="#E5E7EB" strokeWidth="1.5"/>
 <text x="24" y="19" textAnchor="middle" fontSize="9" fontWeight="800"
 fontFamily="Pretendard, sans-serif" letterSpacing="0.3">
 <tspan fill="#E31837">c</tspan><tspan fill="#F4A900">o</tspan><tspan fill="#E31837">u</tspan>
 <tspan fill="#5BAD48">p</tspan><tspan fill="#3B79BE">a</tspan><tspan fill="#E31837">n</tspan>
 <tspan fill="#F4A900">g</tspan>
 </text>
 <text x="24" y="35" textAnchor="middle" fontSize="14" fontWeight="900"
 fill="#5C3317" fontFamily="Pretendard, sans-serif">eats</text>
 </svg>
 )
}

// ─────────────────────────────────────────
// 상수
// ─────────────────────────────────────────
const ALL_PLATFORMS = ['naver', 'baemin', 'yogiyo', 'coupang', 'kakao', 'google'] as const
type PlatformKey = typeof ALL_PLATFORMS[number]

// hub key → stores/me slug 매핑
const HUB_TO_SLUG: Record<PlatformKey, string> = {
 naver: 'naver_place',
 baemin: 'baemin',
 yogiyo: 'yogiyo',
 coupang: 'coupangeats',
 kakao: 'kakao_map',
 google: 'google',
}

type LogoFC = React.FC<{ size?: number }>
const PLATFORM_META: Record<PlatformKey, {
 label: string; color: string; bg: string; textColor: string; icon: string
 Logo?: LogoFC
 detailPath: string
}> = {
 naver: { label: '네이버 플레이스', color: '#03C75A', bg: '#E8FBF0', textColor: '#015C2C', icon: 'N', detailPath: '/review-admin/naver' },
 baemin: { label: '배달의민족', color: '#2AC1BC', bg: '#E6F9F8', textColor: '#0B7B78', icon: 'B', Logo: BaeminLogo, detailPath: '/review-admin/baemin' },
 yogiyo: { label: '요기요', color: '#E5007F', bg: '#FEF0EB', textColor: '#B32B00', icon: 'Y', Logo: YogiyoLogo, detailPath: '/review-admin/yogiyo' },
 coupang: { label: '쿠팡이츠', color: '#FF5A00', bg: '#FFF3F0', textColor: '#900000', icon: 'C', Logo: CoupangEatsLogo, detailPath: '/review-admin/coupang' },
 kakao: { label: '카카오맵', color: '#FEE500', bg: '#FFFBE0', textColor: '#1A1A1A', icon: 'K', detailPath: '/review-admin/kakao' },
 google: { label: '구글', color: '#4285F4', bg: '#EBF3FE', textColor: '#1A56B0', icon: 'G', detailPath: '/review-admin/google' },
}

interface PlatformStat {
 platform: PlatformKey
 connected: boolean
 externalName: string
 // LU-018 W2-9: 모르는 수는 null ('-' 로 표시 · 0 으로 바꾸지 않는다)
 reviewCount: number | null
 avgRating: number | null
 unreplied: number | null
 latestAt: string | null
}

interface FeedReview {
 id: string
 platform: PlatformKey
 rating: number | null
 author: string
 date: string
 text: string
 replied: boolean
}

function Stars({ n, color = '#F59E0B' }: { n: number; color?: string }) {
 const v = Math.max(0, Math.min(5, Math.round(n)))
 return (
 <span className="text-sm tracking-tight" style={{ color }}>
 {Array.from({ length: v }).map((_, i) => <Star key={'f' + i} size={12} className="inline fill-current" />)}{Array.from({ length: 5 - v }).map((_, i) => <Star key={'e' + i} size={12} className="inline text-[#E5E8EB]" />)}
 </span>
 )
}
function timeAgo(iso: string | null): string {
 if (!iso) return '-'
 const d = new Date(iso)
 if (isNaN(d.getTime())) return '-'
 const diff = Date.now() - d.getTime()
 const m = Math.floor(diff / 60000)
 if (m < 1) return '방금'
 if (m < 60) return `${m}분 전`
 const h = Math.floor(m / 60)
 if (h < 24) return `${h}시간 전`
 const dd = Math.floor(h / 24)
 if (dd < 30) return `${dd}일 전`
 return d.toLocaleDateString('ko-KR')
}

// ─────────────────────────────────────────
// 메인 페이지
// ─────────────────────────────────────────
export default function ReviewAdminHub() {
 const [stats, setStats] = useState<PlatformStat[]>(
 ALL_PLATFORMS.map(p => ({
 platform: p, connected: false, externalName: '',
 reviewCount: null, avgRating: null, unreplied: null, latestAt: null,
 }))
 )
 const [loadingStats, setLoadingStats] = useState(true)

 const [feed, setFeed] = useState<FeedReview[]>([])
 const [loadingFeed, setLoadingFeed] = useState(false)
 const [feedMode, setFeedMode] = useState<InboxFilter>('all')
 const feedSeqRef = React.useRef(0)
 const [filter, setFilter] = useState<'all' | PlatformKey>('all')
 // LU-018 W2-9: ?filter=unanswered 로 들어오면 답글 안 단 리뷰만 (대시보드 '미답변 N건 검토')
 const [replyFilter, setReplyFilter] = useState<InboxFilter>('all')
 const [replyFilterReady, setReplyFilterReady] = useState(false)
 const [countsKnown, setCountsKnown] = useState(false)
 useEffect(() => {
 try { setReplyFilter(parseInboxFilter(new URLSearchParams(window.location.search).get('filter'))) } catch { /* 기본값 유지 */ }
 setReplyFilterReady(true)
 }, [])
 const changeReplyFilter = useCallback((next: InboxFilter) => {
 setReplyFilter(next)
 try {
 const url = new URL(window.location.href)
 if (next === 'unanswered') url.searchParams.set('filter', 'unanswered')
 else url.searchParams.delete('filter')
 window.history.replaceState(null, '', url.pathname + (url.search || ''))
 } catch { /* 주소 갱신 실패는 화면 동작과 무관 */ }
 }, [])

 // ── 1) 플랫폼 통계 로드 (stores/me) ──────────────────────
 const [statsError, setStatsError] = useState<string | null>(null)
 const [statsReady, setStatsReady] = useState(false)
 const [loginRequired, setLoginRequired] = useState(false)
 const [feedError, setFeedError] = useState<string | null>(null)
 const loadStats = useCallback(async () => {
 setLoadingStats(true)
 setStatsError(null)
 setLoginRequired(false)
 try {
 const res = await fetch('/api/stores/me', { credentials: 'include', cache: 'no-store' })
 if (res.status === 401) { setLoginRequired(true); throw new Error('로그인이 필요해요. 로그인 후 연결 상태를 다시 확인해주세요.') }
 if (!res.ok) throw new Error('플랫폼 연결 상태를 불러오지 못했어요. 잠시 후 다시 확인해주세요.')
 const j = await res.json()
 if (!j?.ok || !Array.isArray(j.platforms)) throw new Error('플랫폼 연결 응답을 확인하지 못했어요.')
 // 리뷰 집계를 서버가 실제로 읽었을 때만 숫자를 믿는다 (실패해도 서버는 0 을 채워 보낸다)
 const reviewsRead = j?.source_states?.reviews === 'read'
 setCountsKnown(reviewsRead)
 setStats(ALL_PLATFORMS.map(platform => {
 const p = j.platforms.find((item: any) => item.platform === HUB_TO_SLUG[platform])
 const counts = readPlatformCounts(p, reviewsRead)
 return { platform, connected: !!p?.connected, externalName: p?.platform_store_name || '',
 reviewCount: counts.reviewCount, avgRating: reviewsRead && typeof p?.rating_avg === 'number' ? p.rating_avg : null,
 unreplied: counts.unreplied, latestAt: p?.latest_collected_at ?? null }
 }))
 setStatsReady(true)
 } catch (error) { setStatsError(error instanceof Error ? error.message : '연결 상태를 확인하지 못했어요. 인터넷 연결을 확인해주세요.') }
 finally { setLoadingStats(false) }
 }, [])
 useEffect(() => { void loadStats() }, [loadStats])
 const loadFeed = useCallback(async () => {
 const seq = ++feedSeqRef.current
 setLoadingFeed(true)
 setFeedError(null)
 const targets = stats.filter(s => s.connected || (s.reviewCount ?? 0) > 0)
 // 답글 안 단 리뷰 보기는 서버에서 같은 기준으로 걸러 받는다 (최근 100건 밖의 미답변도 놓치지 않게)
 const mode = replyFilter
 const query = mode === 'unanswered' ? 'limit=300&unreplied_only=1' : 'limit=100'
 const succeeded: PlatformKey[] = []
 const failed: PlatformKey[] = []
 const all: FeedReview[] = []
 await Promise.all(targets.map(async s => {
 try {
 const res = await fetch(`/api/place/reviews?platform=${HUB_TO_SLUG[s.platform]}&${query}`, { credentials: 'include', cache: 'no-store' })
 if (res.status === 401) setLoginRequired(true)
 if (!res.ok) throw new Error('request failed')
 const data = await res.json()
 if (!data?.ok || !Array.isArray(data.reviews)) throw new Error('invalid response')
 for (const r of data.reviews) all.push({ id: `${s.platform}-${r.id}`, platform: s.platform,
 rating: typeof r.rating === 'number' ? r.rating : null, author: r.author_mask || r.author_name || '익명',
 date: r.posted_at || r.collected_at || '', text: r.content || '', replied: isReviewReplied(r) })
 succeeded.push(s.platform)
 } catch { failed.push(s.platform) }
 }))
 // 필터를 빨리 바꿔 더 새 요청이 나갔으면 이 응답은 버린다
 if (seq !== feedSeqRef.current) return
 if (failed.length) setFeedError(`${failed.map(p => PLATFORM_META[p].label).join(' · ')} 리뷰를 확인하지 못했어요. 이전에 불러온 리뷰가 있으면 유지했어요. 다시 시도해주세요.`)
 if (succeeded.length || targets.length === 0) {
 setFeedMode(mode)
 setFeed(previous => {
 // 실패한 매체의 이전 자료는 같은 보기(전체/미답변)로 받은 것일 때만 남긴다
 const keep = feedMode === mode ? previous.filter(r => failed.includes(r.platform)) : []
 const next = [...keep, ...all]
 return next.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
 })
 }
 setLoadingFeed(false)
 }, [stats, replyFilter, feedMode])
 useEffect(() => {
 if (replyFilterReady && statsReady && !loadingStats && !statsError) void loadFeed()
 // feedMode 는 결과 기록용이라 다시 불러오는 조건에서 뺀다
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [replyFilterReady, statsReady, loadingStats, statsError, stats, replyFilter])

 const activeStats = stats.filter(s => s.connected || (s.reviewCount ?? 0) > 0)
 const activeCount = activeStats.length
 // 하나라도 모르면 합계도 모른다 → '-'
 const totalReviews = countsKnown ? sumKnown(stats.map(s => s.reviewCount)) : null
 const totalUnreplied = countsKnown ? sumKnown(stats.map(s => s.unreplied)) : null

 const filteredFeed = filterFeed(feed, { filter: replyFilter, platform: filter })

 return (
 <div className="min-h-screen bg-[#F8F9FA] flex flex-col overflow-x-hidden">
 <div className="flex flex-1">
 <Sidebar />
 <main className="flex-1 md:ml-[220px] pt-4 md:pt-0 min-w-0">
 <PageHeader
 icon={<MessageSquare size={28} className="text-white" strokeWidth={2.5} />}
 title="리뷰 관리 허브"
 subtitle="연결된 모든 플랫폼의 리뷰를 한 곳에서 관리하세요"
 variant="primary"
 />

 <div className="max-w-5xl mx-auto p-4 md:p-6 w-full">

 {/* ─── 플랫폼 자가점검 상태 ─── */}
 <PlatformHealthStatus />

 <div className="mb-5 flex flex-wrap items-center gap-3">
 <button type="button" onClick={loadStats} disabled={loadingStats} className="min-h-[44px] rounded-xl border border-[#E5E8EB] bg-white px-4 text-sm font-semibold disabled:opacity-50">{loadingStats ? '연결 확인 중' : '연결 상태 다시 확인'}</button>
 {loginRequired && <Link href="/login?next=/review-admin" className="min-h-[44px] py-3 text-sm font-semibold underline">로그인하기</Link>}
 </div>
 {statsError && <p role="alert" className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{statsError}{statsReady && ' 마지막으로 확인한 통계를 표시하고 있어요.'}</p>}
 {feedError && <p role="alert" className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{feedError}</p>}
 {statsReady && statsError && <p role="status" className="mb-3 text-sm text-[#4E5968]">현재 연결 상태와 다를 수 있어요.</p>}
 {/* ─── 요약 통계 ─── */}
 <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6">
 <div className="bg-white rounded-2xl p-3 md:p-5 border border-[#E5E8EB] min-w-0">
 <p className="text-[11px] md:text-xs text-[#8B95A1] font-medium mb-1">활성 플랫폼</p>
 <p className="text-lg md:text-2xl font-black break-keep text-[#191F28]">
 {statsReady ? activeCount : '확인 전'}<span className="text-sm text-[#8B95A1] font-medium">/{ALL_PLATFORMS.length}</span>
 </p>
 </div>
 <div className="bg-white rounded-2xl p-3 md:p-5 border border-[#E5E8EB] min-w-0">
 <p className="text-[11px] md:text-xs text-[#8B95A1] font-medium mb-1">전체 리뷰</p>
 <p className="text-lg md:text-2xl font-black break-keep text-[#191F28] tabular-nums">{statsReady ? formatCount(totalReviews) : '확인 전'}</p>
 {statsReady && totalReviews === null && <p className="text-[11px] text-[#8B95A1] mt-0.5">불러오지 못함</p>}
 </div>
 <div className="bg-white rounded-2xl p-3 md:p-5 border border-[#E5E8EB] min-w-0">
 <p className="text-[11px] md:text-xs text-[#8B95A1] font-medium mb-1">답글 안 단 리뷰</p>
 <p className="text-lg md:text-2xl font-black break-keep text-[#F59E0B] tabular-nums">{statsReady ? formatCount(totalUnreplied) : '확인 전'}</p>
 {statsReady && totalUnreplied === null && <p className="text-[11px] text-[#8B95A1] mt-0.5">불러오지 못함</p>}
 </div>
 </div>

 {/* ─── 플랫폼 카드 ─── */}
 <h2 className="text-base md:text-lg font-bold text-[#191F28] mb-3">플랫폼별 현황</h2>
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4 mb-8">
 {stats.map(stat => {
 const meta = PLATFORM_META[stat.platform]
 const hasData = stat.connected || (stat.reviewCount ?? 0) > 0
 return (
 <div key={stat.platform} className="bg-white rounded-2xl border border-[#E5E8EB] p-4 flex flex-col">
 {/* 헤더 */}
 <div className="flex items-center gap-2.5 mb-3">
 <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
 style={meta.Logo ? {} : { background: meta.color }}>
 {meta.Logo
 ? React.createElement(meta.Logo, { size: 36 })
 : <span className="text-white font-black text-sm">{meta.icon}</span>
 }
 </div>
 <div className="min-w-0 flex-1">
 <p className="text-sm font-bold text-[#191F28]">{meta.label}</p>
 {loadingStats ? (
 <p className="text-[10px] text-[#8B95A1]">확인 중...</p>
 ) : !statsReady ? (<p className="text-[10px] text-[#8B95A1]">연결 확인 필요</p>) : stat.connected ? (
 <p className="text-[10px] text-[#10B981] font-semibold flex items-center gap-1">
 <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />연결됨
 </p>
 ) : (stat.reviewCount ?? 0) > 0 ? (
 <p className="text-[10px] text-[#F59E0B] font-semibold">리뷰 수집됨</p>
 ) : (
 <p className="text-[10px] text-[#8B95A1]">미연결</p>
 )}
 </div>
 </div>

 {hasData ? (
 <>
 {stat.externalName && (
 <p className="text-xs font-semibold text-[#191F28] mb-2 truncate">{stat.externalName}</p>
 )}
 {/* 통계 */}
 <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#4E5968] mb-3">
 {typeof stat.avgRating === 'number' && (
 <span className="flex items-center gap-0.5">
 <Stars n={Math.round(stat.avgRating)} color={meta.color} />
 <span className="ml-0.5">{stat.avgRating.toFixed(1)}</span>
 </span>
 )}
 <span>리뷰 <b className="text-[#191F28] tabular-nums">{formatCount(stat.reviewCount)}</b></span>
 {stat.unreplied === null ? (
 <span className="text-[#8B95A1]">답글 안 단 리뷰 - · 불러오지 못함</span>
 ) : stat.unreplied > 0 && (
 <span className="text-[#F04452] font-bold">답글 안 단 리뷰 {formatCount(stat.unreplied)}</span>
 )}
 </div>
 {stat.latestAt && (
 <p className="text-[10px] text-[#8B95A1] mb-2">마지막 수집 {timeAgo(stat.latestAt)}</p>
 )}
 <div className="mt-auto">
 <Link href={meta.detailPath}
 className="block w-full text-center px-3 py-2 rounded-xl text-xs font-bold transition-all"
 style={{ background: meta.bg, color: meta.textColor }}>
 관리하기 →
 </Link>
 </div>
 </>
 ) : (
 <>
 <p className="text-xs text-[#8B95A1] mb-3 leading-relaxed">
 {statsReady ? '연결 정보가 없어요. 플랫폼별 관리에서 연결 상태를 확인해주세요.' : '연결 정보를 확인한 뒤 이용해주세요.'}
 </p>
 <div className="mt-auto flex flex-col gap-1.5">
 <Link href={meta.detailPath}
 className="block w-full text-center px-3 py-2 rounded-xl text-xs font-bold text-white transition-all"
 style={{ background: meta.color }}>
 리뷰 관리 →
 </Link>
 </div>
 </>
 )}
 </div>
 )
 })}
 </div>

 {/* ─── 통합 피드 ─── */}
 <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
 <h2 className="text-base md:text-lg font-bold text-[#191F28]">통합 리뷰 피드</h2>
 <button
 onClick={loadFeed}
 disabled={loadingFeed || activeCount === 0}
 className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#3182F6] text-white hover:bg-[#1C6FE0] disabled:bg-[#B0B8C1] transition-colors"
 >
 {loadingFeed ? '불러오는 중...' : '새로고침'}
 </button>
 </div>

 {/* 답글 상태 필터 (LU-018 W2-9) */}
 {activeCount > 0 && (
 <div role="group" aria-label="답글 상태" className="flex flex-wrap gap-2 mb-3">
 {([['all', '전체 리뷰'], ['unanswered', '답글 안 단 리뷰']] as Array<[InboxFilter, string]>).map(([key, label]) => (
 <button
 key={key}
 type="button"
 aria-pressed={replyFilter === key}
 onClick={() => changeReplyFilter(key)}
 className={`min-h-[44px] px-4 rounded-xl text-sm font-semibold border transition-colors ${replyFilter === key ? 'bg-[var(--lu-accent)] border-[var(--lu-accent)] text-white' : 'bg-white border-[var(--lu-line)] text-[var(--lu-ink)]'}`}
 >
 {label}{key === 'unanswered' && statsReady ? ` ${formatCount(totalUnreplied)}` : ''}
 </button>
 ))}
 </div>
 )}

 {/* 매체 필터 탭 */}
 {activeCount > 0 && (
 <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
 <button
 onClick={() => setFilter('all')}
 className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${filter === 'all' ? 'bg-[#191F28] text-white' : 'bg-white text-[#4E5968] border border-[#E5E8EB]'}`}
 >
 전체 ({filterFeed(feed, { filter: replyFilter, platform: 'all' }).length})
 </button>
 {activeStats.map(s => {
 const meta = PLATFORM_META[s.platform]
 const count = filterFeed(feed, { filter: replyFilter, platform: s.platform }).length
 return (
 <button
 key={s.platform}
 onClick={() => setFilter(s.platform)}
 className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${filter === s.platform ? 'text-white' : 'bg-white text-[#4E5968] border border-[#E5E8EB]'}`}
 style={filter === s.platform ? { background: meta.color } : {}}
 >
 {meta.label} ({count})
 </button>
 )
 })}
 </div>
 )}

 {/* 피드 본문 */}
 {!statsReady ? (
 <div role="status" className="rounded-2xl border border-[#E5E8EB] bg-white p-8 text-sm text-[#4E5968]">{loadingStats ? '플랫폼 연결 상태를 확인하고 있어요.' : '연결 상태를 확인하지 못했어요. 위에서 로그인하거나 다시 확인해주세요.'}</div>
 ) : activeCount === 0 ? (
 <div className="bg-white rounded-2xl border border-[#E5E8EB] p-8 md:p-12 text-center">
 <div className="w-14 h-14 rounded-2xl bg-[#F2F4F6] flex items-center justify-center mx-auto mb-3">
 <Inbox size={26} className="text-[#8B95A1]" strokeWidth={2} />
 </div>
 <p className="text-sm font-bold text-[#191F28] mb-1">아직 수집된 리뷰가 없어요</p>
 <p className="text-xs text-[#8B95A1] mb-4">각 플랫폼 관리 화면에서 연결 상태를 확인해주세요.</p>
 </div>
 ) : loadingFeed ? (
 <div className="bg-white rounded-2xl border border-[#E5E8EB] p-12 text-center text-sm text-[#8B95A1]">
 리뷰 불러오는 중...
 </div>
 ) : filteredFeed.length === 0 ? (
 <div className="bg-white rounded-2xl border border-[#E5E8EB] p-8 text-center text-sm text-[#8B95A1]">
 {replyFilter === 'unanswered' ? '답글 안 단 리뷰가 없어요. 불러온 리뷰에는 모두 답글이 달려 있어요.' : '표시할 리뷰가 없어요'}
 </div>
 ) : (
 <div className="space-y-3">
 {filteredFeed.slice(0, 50).map(r => {
 const meta = PLATFORM_META[r.platform]
 return (
 <div key={r.id} className="bg-white rounded-2xl border border-[#E5E8EB] p-4 md:p-5 hover:border-[#D1D5DB] transition-colors">
 <div className="flex items-start gap-3">
 <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
 style={meta.Logo ? {} : { background: meta.color }}>
 {meta.Logo
 ? React.createElement(meta.Logo, { size: 32 })
 : <span className="text-white font-black text-xs">{meta.icon}</span>
 }
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-1 flex-wrap">
 <span className="text-xs font-bold text-[#191F28]">{r.author}</span>
 {typeof r.rating === 'number' && <Stars n={r.rating} color={meta.color} />}
 <span className="text-[10px] text-[#8B95A1]">{timeAgo(r.date)}</span>
 {r.replied ? (
 <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#ECFDF5] text-[#059669] font-semibold">답글 완료</span>
 ) : (
 <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FEF3C7] text-[#92400E] font-semibold">미답변</span>
 )}
 <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
 style={{ background: meta.bg, color: meta.textColor }}>
 {meta.label}
 </span>
 </div>
 <p className="text-xs md:text-sm text-[#4E5968] leading-relaxed mb-2 break-words">
 {r.text || '(내용 없음)'}
 </p>
 <Link href={meta.detailPath}
 className="inline-block text-[11px] font-semibold hover:underline"
 style={{ color: meta.color }}>
 {meta.label}에서 답글 작성 →
 </Link>
 </div>
 </div>
 </div>
 )
 })}
 {filteredFeed.length > 50 && (
 <p className="text-center text-xs text-[#8B95A1] py-2">최근 50개 표시 중 (총 {filteredFeed.length}개)</p>
 )}
 </div>
 )}
 </div>
 </main>
 </div>
 <Footer />
 <HarangMarketingPopup />
 </div>
 )
}
