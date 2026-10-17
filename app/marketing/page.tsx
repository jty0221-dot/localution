'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import PageHeader from '../components/PageHeader'
import MarketingToolChooser from '../components/marketing/MarketingToolChooser'
import {
 Search, TrendingUp, ClipboardCheck, Users, Sparkles, ArrowRight, FileText,
 ArrowUp, ArrowDown, Minus, CheckCircle2, AlertTriangle, XCircle,
 Layers, Zap, Rocket, Calculator,
} from 'lucide-react'
import Footer from '../components/Footer'
import HarangMarketingPopup from '../components/HarangMarketingPopup'

const mockRanks = [
 { keyword: '강남 맛집', rank: 3, prev: 5, volume: 18200 },
 { keyword: '강남 삼겹살', rank: 7, prev: 7, volume: 9400 },
 { keyword: '강남역 고기집', rank: 12, prev: 15, volume: 6700 },
 { keyword: '강남 회식', rank: 2, prev: 4, volume: 4200 },
 { keyword: '강남 점심 맛집', rank: 18, prev: 11, volume: 12300 },
 { keyword: '강남 삼겹살 맛집', rank: 5, prev: 8, volume: 7600 },
]

const mockInflow = [
 { keyword: '강남 맛집', visits: 342, pct: 28.4, change: 12 },
 { keyword: '강남 삼겹살', visits: 218, pct: 18.1, change: -3 },
 { keyword: '강남역 맛집', visits: 187, pct: 15.5, change: 5 },
 { keyword: '강남 고기집', visits: 143, pct: 11.9, change: 0 },
 { keyword: '강남 회식 장소', visits: 98, pct: 8.1, change: 22 },
 { keyword: '강남 점심', visits: 76, pct: 6.3, change: -8 },
 { keyword: '강남역 삼겹살', visits: 61, pct: 5.1, change: 14 },
 { keyword: '강남 고기 맛집', visits: 82, pct: 6.8, change: 3 },
]

const diagData = [
 { category: '기본 정보', items: [
 { label: '업체명', status: 'ok' as const, desc: '정확하게 등록됨', score: 10 },
 { label: '주소', status: 'ok' as const, desc: '정확하게 등록됨', score: 10 },
 { label: '전화번호', status: 'ok' as const, desc: '정확하게 등록됨', score: 10 },
 { label: '영업시간', status: 'warn' as const, desc: '휴일 시간 미등록', score: 5 },
 { label: '메뉴/가격', status: 'warn' as const, desc: '메뉴 이미지 3개 부족', score: 6 },
 ]},
 { category: '사진/영상', items: [
 { label: '대표 사진', status: 'ok' as const, desc: '고화질 1장 등록됨', score: 10 },
 { label: '내부 사진', status: 'warn' as const, desc: '권장 10장 중 4장', score: 4 },
 { label: '음식 사진', status: 'bad' as const, desc: '미등록 · 방문자 전환에 영향', score: 0 },
 { label: '외부/간판 사진', status: 'ok' as const, desc: '등록됨', score: 10 },
 ]},
 { category: '리뷰 관리', items: [
 { label: '리뷰 수', status: 'ok' as const, desc: '127개 (업종 평균 이상)', score: 10 },
 { label: '평균 평점', status: 'ok' as const, desc: '4.6점', score: 10 },
 { label: '사장님 답글률', status: 'warn' as const, desc: '62% · 80% 이상 권장', score: 6 },
 { label: '최근 리뷰 답변', status: 'bad' as const, desc: '14일 이상 미답변', score: 2 },
 ]},
 { category: 'SNS 연동', items: [
 { label: '인스타그램 연동', status: 'ok' as const, desc: '연동됨', score: 10 },
 { label: '블로그 리뷰 수', status: 'warn' as const, desc: '23개 (30개 이상 권장)', score: 7 },
 { label: '공식 홈페이지', status: 'bad' as const, desc: '미등록', score: 0 },
 ]},
]

// ── 키워드 순위 탭
function RankTab() {
 const [rows, setRows] = useState(mockRanks)
 const [adding, setAdding] = useState(false)
 const [newKw, setNewKw] = useState('')
 const [sort, setSort] = useState<'rank'|'volume'>('rank')

 const sorted = [...rows].sort((a, b) => sort === 'rank' ? a.rank - b.rank : b.volume - a.volume)

 function rankBadge(r: number) {
 if (r <= 3) return <span className="inline-block bg-[var(--lu-accent)] text-white text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap">{r}위</span>
 if (r <= 10) return <span className="inline-block bg-[var(--lu-accent-soft)] text-[var(--lu-accent)] text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap">{r}위</span>
 return <span className="inline-block bg-[var(--lu-canvas)] text-[var(--lu-muted)] text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap">{r}위</span>
 }

 function diffEl(curr: number, prev: number) {
 const d = curr - prev
 if (d < 0) return <span className="inline-flex items-center gap-0.5 text-[#2DB400] font-semibold text-xs whitespace-nowrap"><ArrowUp size={11} strokeWidth={2.75} />{Math.abs(d)}</span>
 if (d > 0) return <span className="inline-flex items-center gap-0.5 text-[#F04452] font-semibold text-xs whitespace-nowrap"><ArrowDown size={11} strokeWidth={2.75} />{Math.abs(d)}</span>
 return <span className="inline-flex items-center gap-0.5 text-[var(--lu-muted)] text-xs whitespace-nowrap"><Minus size={11} strokeWidth={2.75} />-</span>
 }

 function gradeLabel(r: number) {
 if (r <= 3) return <span className="text-xs font-semibold text-[#2DB400] whitespace-nowrap">최상위</span>
 if (r <= 10) return <span className="text-xs font-semibold text-[var(--lu-accent)] whitespace-nowrap">상위</span>
 if (r <= 20) return <span className="text-xs font-semibold text-[#F5A623] whitespace-nowrap">중위</span>
 return <span className="text-xs font-semibold text-[#F04452] whitespace-nowrap">하위</span>
 }

 function gradePill(r: number) {
 if (r <= 3) return <span className="inline-block text-[10px] font-bold text-[#2DB400] bg-[#F0FBF0] px-2 py-0.5 rounded-md whitespace-nowrap">최상위</span>
 if (r <= 10) return <span className="inline-block text-[10px] font-bold text-[var(--lu-accent)] bg-[var(--lu-accent-soft)] px-2 py-0.5 rounded-md whitespace-nowrap">상위</span>
 if (r <= 20) return <span className="inline-block text-[10px] font-bold text-[#F5A623] bg-[#FEF9E8] px-2 py-0.5 rounded-md whitespace-nowrap">중위</span>
 return <span className="inline-block text-[10px] font-bold text-[#F04452] bg-[#FEF0F1] px-2 py-0.5 rounded-md whitespace-nowrap">하위</span>
 }

 function handleAdd() {
 if (!newKw.trim()) return
 const rank = Math.floor(Math.random() * 25) + 1
 setRows(prev => [...prev, { keyword: newKw, rank, prev: rank + Math.floor(Math.random() * 5) - 2, volume: Math.floor(Math.random() * 12000) + 1000 }])
 setNewKw('')
 setAdding(false)
 }

 return (
 <div>
 <div className="flex items-center gap-2 mb-3">
 <span className="inline-block text-[10px] font-semibold bg-[#FEF9E8] text-[#CA8A04] border border-[#FCD34D] px-2 py-0.5 rounded-full">예시 데이터 · 실제 연동 시 내 매장 순위가 표시됩니다</span>
 </div>
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-2">
 <span className="text-sm text-[var(--lu-muted)]">정렬:</span>
 <button onClick={() => setSort('rank')} className={['text-xs px-3 py-1.5 rounded-lg font-medium', sort === 'rank' ? 'bg-[var(--lu-accent)] text-white' : 'bg-white text-[var(--lu-muted)] border border-[var(--lu-line)]'].join(' ')}>순위순</button>
 <button onClick={() => setSort('volume')} className={['text-xs px-3 py-1.5 rounded-lg font-medium', sort === 'volume' ? 'bg-[var(--lu-accent)] text-white' : 'bg-white text-[var(--lu-muted)] border border-[var(--lu-line)]'].join(' ')}>검색량순</button>
 </div>
 <button onClick={() => setAdding(true)} className="min-h-11 text-xs bg-[var(--lu-accent)] text-white px-3 py-1.5 rounded-lg font-medium hover:bg-[var(--lu-accent-hover)] transition-colors">+ 키워드 추가</button>
 </div>

 {adding && (
 <div className="flex gap-2 mb-4">
 <input value={newKw} onChange={e => setNewKw(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()}
 placeholder="키워드 입력 후 Enter" className="flex-1 border border-[var(--lu-accent)] rounded-lg px-3 py-2 text-sm outline-none" autoFocus/>
 <button onClick={handleAdd} className="min-h-11 bg-[var(--lu-accent)] text-white px-4 py-2 rounded-lg text-sm font-medium">추가</button>
 <button onClick={() => setAdding(false)} className="min-h-11 bg-[var(--lu-canvas)] text-[var(--lu-muted)] px-4 py-2 rounded-lg text-sm">취소</button>
 </div>
 )}

 <div className="bg-white rounded-[10px] border border-[var(--lu-line)] overflow-hidden">
 {/* 모바일: 카드형 리스트 */}
 <div className="block md:hidden divide-y divide-[var(--lu-canvas)]">
 {sorted.map((row, i) => (
 <div key={i} className="px-4 py-3.5 hover:bg-[#FAFBFF] transition-colors">
 <div className="flex items-center justify-between gap-2 mb-2">
 <span className="text-sm font-bold text-[var(--lu-ink)] truncate min-w-0">{row.keyword}</span>
 <div className="flex items-center gap-1.5 flex-shrink-0">
 {rankBadge(row.rank)}
 {gradePill(row.rank)}
 </div>
 </div>
 <div className="flex items-center justify-between text-xs">
 <span className="inline-flex items-center gap-1 text-[var(--lu-muted)] whitespace-nowrap">
 월 <span className="font-semibold text-[var(--lu-muted)]">{row.volume.toLocaleString()}</span>
 </span>
 <span className="inline-flex items-center gap-1 whitespace-nowrap">
 <span className="text-[var(--lu-muted)]">변화</span>
 {diffEl(row.rank, row.prev)}
 </span>
 </div>
 </div>
 ))}
 </div>
 {/* 데스크탑: 테이블 */}
 <table className="hidden md:table w-full">
 <thead>
 <tr className="bg-[var(--lu-canvas)] border-b border-[var(--lu-line)]">
 <th className="text-left text-xs text-[var(--lu-muted)] font-medium px-5 py-3 whitespace-nowrap">키워드</th>
 <th className="text-center text-xs text-[var(--lu-muted)] font-medium px-4 py-3 whitespace-nowrap">현재 순위</th>
 <th className="text-center text-xs text-[var(--lu-muted)] font-medium px-4 py-3 whitespace-nowrap">변화</th>
 <th className="text-center text-xs text-[var(--lu-muted)] font-medium px-4 py-3 whitespace-nowrap">월 검색량</th>
 <th className="text-center text-xs text-[var(--lu-muted)] font-medium px-4 py-3 whitespace-nowrap">노출 등급</th>
 </tr>
 </thead>
 <tbody>
 {sorted.map((row, i) => (
 <tr key={i} className="border-b border-[var(--lu-canvas)] hover:bg-[#FAFBFF] transition-colors">
 <td className="px-5 py-3.5 text-sm font-medium text-[var(--lu-ink)] whitespace-nowrap">{row.keyword}</td>
 <td className="px-4 py-3.5 text-center">{rankBadge(row.rank)}</td>
 <td className="px-4 py-3.5 text-center">{diffEl(row.rank, row.prev)}</td>
 <td className="px-4 py-3.5 text-center text-sm text-[var(--lu-muted)] whitespace-nowrap">{row.volume.toLocaleString()}</td>
 <td className="px-4 py-3.5 text-center">{gradeLabel(row.rank)}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 <p className="text-xs text-[var(--lu-muted)] mt-3">* 네이버 플레이스 기준 / 매일 오전 6시 업데이트</p>
 </div>
 )
}

// ── 키워드 점수 분석 탭
interface ScoreResult {
 keyword: string
 totalScore: number
 competition: number
 volume: number
 places: number
 optimizeScore: number
 reviewScore: number
 photoScore: number
 updateScore: number
 relatedKeywords: string[]
}

function ScoreTab() {
 const [keyword, setKeyword] = useState('')
 const [result, setResult] = useState<ScoreResult | null>(null)
 const [loading, setLoading] = useState(false)

 function analyze(kw?: string) {
 const q = kw || keyword
 if (!q.trim()) return
 if (kw) setKeyword(kw)
 setLoading(true)
 setResult(null)
 setTimeout(() => {
 // 키워드 해시 기반 고정 점수 (같은 키워드 → 항상 동일한 결과)
 function hashScore(seed: string, min: number, max: number) {
 let h = 0
 for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffff
 return min + (h % (max - min + 1))
 }
 const total = hashScore(q + '_t', 40, 78)
 setResult({
 keyword: q,
 totalScore: total,
 competition: hashScore(q + '_c', 20, 95),
 volume: hashScore(q + '_v', 800, 18000),
 places: hashScore(q + '_p', 30, 480),
 optimizeScore: hashScore(q + '_o', 30, 78),
 reviewScore: hashScore(q + '_r', 25, 78),
 photoScore: hashScore(q + '_ph', 30, 78),
 updateScore: hashScore(q + '_u', 25, 88),
 relatedKeywords: [q + ' 맛집', q + ' 추천', q + ' 맛집 추천', '근처 ' + q, q + ' 저렴한'],
 })
 setLoading(false)
 }, 1200)
 }

 function getGrade(s: number) {
 if (s >= 80) return { label: 'A+', color: '#2DB400', bg: '#F0FBF0' }
 if (s >= 65) return { label: 'B', color: 'var(--lu-accent)', bg: 'var(--lu-accent-soft)' }
 if (s >= 50) return { label: 'C', color: '#F5A623', bg: '#FEF9E8' }
 return { label: 'D', color: '#F04452', bg: '#FEF0F1' }
 }

 function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
 return (
 <div>
 <div className="flex justify-between text-xs mb-1">
 <span className="text-[var(--lu-muted)]">{label}</span>
 <span className="font-semibold text-[var(--lu-ink)]">{value}점</span>
 </div>
 <div className="h-2 bg-[var(--lu-canvas)] rounded-full overflow-hidden">
 <div className="h-full rounded-full transition-colors duration-700" style={{ width: value + '%', backgroundColor: color }}/>
 </div>
 </div>
 )
 }

 return (
 <div>
 <div className="bg-white rounded-[10px] border border-[var(--lu-line)] p-5 mb-5">
 <p className="text-sm font-semibold text-[var(--lu-ink)] mb-3">키워드 분석</p>
 <div className="flex gap-3">
 <input value={keyword} onChange={e => setKeyword(e.target.value)} onKeyDown={e => e.key === 'Enter' && analyze()}
 placeholder="예: 강남 삼겹살, 홍대 카페"
 className="flex-1 border border-[var(--lu-line)] rounded-[6px] px-4 py-2.5 text-sm outline-none focus:border-[var(--lu-accent)] transition-colors"/>
 <button onClick={() => analyze()} disabled={loading}
 className="min-h-11 bg-[var(--lu-accent)] text-white px-5 py-2.5 rounded-[6px] text-sm font-semibold hover:bg-[var(--lu-accent-hover)] transition-colors disabled:opacity-60 inline-flex items-center gap-2">
 {loading ? '분석 중...' : <><Search size={16} strokeWidth={2.25} /> 분석하기</>}
 </button>
 </div>
 </div>

 {result && (() => {
 const g = getGrade(result.totalScore)
 const compText = result.competition > 70 ? '매우 높음' : result.competition > 40 ? '보통' : '낮음'
 const compColor = result.competition > 70 ? '#F04452' : result.competition > 40 ? '#F5A623' : '#2DB400'
 return (
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="flex flex-col gap-4">
 <div className="bg-white rounded-[10px] border border-[var(--lu-line)] p-5 text-center">
 <p className="text-xs text-[var(--lu-muted)] mb-3">종합 노출 점수</p>
 <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border-4 mb-2"
 style={{ borderColor: g.color, backgroundColor: g.bg }}>
 <span className="text-2xl font-semibold" style={{ color: g.color }}>{result.totalScore}</span>
 </div>
 <p className="text-lg font-semibold" style={{ color: g.color }}>등급 {g.label}</p>
 </div>
 <div className="bg-white rounded-[10px] border border-[var(--lu-line)] p-5">
 <p className="text-xs font-semibold text-[var(--lu-muted)] mb-3">키워드 현황</p>
 <div className="space-y-3">
 <div className="flex justify-between">
 <span className="text-xs text-[var(--lu-muted)]">월 검색량</span>
 <span className="text-xs font-bold text-[var(--lu-ink)]">{result.volume.toLocaleString()}회</span>
 </div>
 <div className="flex justify-between">
 <span className="text-xs text-[var(--lu-muted)]">경쟁 업체 수</span>
 <span className="text-xs font-bold text-[var(--lu-ink)]">{result.places}개</span>
 </div>
 <div className="flex justify-between">
 <span className="text-xs text-[var(--lu-muted)]">경쟁 강도</span>
 <span className="text-xs font-bold" style={{ color: compColor }}>{compText}</span>
 </div>
 </div>
 </div>
 </div>
 <div className="col-span-2 flex flex-col gap-4">
 <div className="bg-white rounded-[10px] border border-[var(--lu-line)] p-5">
 <p className="text-xs font-semibold text-[var(--lu-muted)] mb-4">항목별 점수</p>
 <div className="space-y-4">
 <ScoreBar label="플레이스 최적화" value={result.optimizeScore} color="var(--lu-accent)"/>
 <ScoreBar label="리뷰 점수" value={result.reviewScore} color="#2DB400"/>
 <ScoreBar label="사진 풍부도" value={result.photoScore} color="#F5A623"/>
 <ScoreBar label="업데이트 활성도" value={result.updateScore} color="#8B5CF6"/>
 </div>
 </div>
 <div className="bg-white rounded-[10px] border border-[var(--lu-line)] p-5">
 <p className="text-xs font-semibold text-[var(--lu-muted)] mb-3">연관 키워드 추천</p>
 <div className="flex flex-wrap gap-2">
 {result.relatedKeywords.map((kw, i) => (
 <button key={i} onClick={() => analyze(kw)}
 className="min-h-11 text-xs bg-[var(--lu-canvas)] text-[var(--lu-muted)] px-3 py-1.5 rounded-lg hover:bg-[var(--lu-accent-soft)] hover:text-[var(--lu-accent)] transition-colors">
 {kw}
 </button>
 ))}
 </div>
 </div>
 </div>
 </div>
 )
 })()}
 </div>
 )
}

// ── 플레이스 진단 탭
function DiagTab() {
 const allItems = diagData.flatMap(c => c.items)
 const totalScore = allItems.reduce((s, i) => s + i.score, 0)
 const maxScore = allItems.length * 10
 const pct = Math.round((totalScore / maxScore) * 100)
 const okCount = allItems.filter(i => i.status === 'ok').length
 const warnCount = allItems.filter(i => i.status === 'warn').length
 const badCount = allItems.filter(i => i.status === 'bad').length

 const gradeLabel = pct >= 80 ? '우수' : pct >= 60 ? '보통' : '개선필요'
 const gradeColor = pct >= 80 ? '#2DB400' : pct >= 60 ? '#F5A623' : '#F04452'

 const circumference = 251.2
 const dashArray = ((pct / 100) * circumference).toFixed(1) + ' ' + circumference

 const statusMap = {
 ok: { bg: 'bg-[#F0FBF0]', text: 'text-[#2DB400]', label: '양호', Icon: CheckCircle2, barColor: '#2DB400' },
 warn: { bg: 'bg-[#FEF9E8]', text: 'text-[#F5A623]', label: '주의', Icon: AlertTriangle, barColor: '#F5A623' },
 bad: { bg: 'bg-[#FEF0F1]', text: 'text-[#F04452]', label: '개선필요', Icon: XCircle, barColor: '#F04452' },
 }

 return (
 <div>
 <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
 <div className="bg-white rounded-[10px] border border-[var(--lu-line)] p-5 text-center flex flex-col items-center justify-center">
 <p className="text-xs text-[var(--lu-muted)] mb-2">종합 진단 점수</p>
 <div className="relative w-24 h-24 mb-2">
 <svg viewBox="0 0 100 100" className="w-24 h-24" style={{ transform: 'rotate(-90deg)' }}>
 <circle cx="50" cy="50" r="40" fill="none" stroke="var(--lu-canvas)" strokeWidth="10"/>
 <circle cx="50" cy="50" r="40" fill="none" stroke={gradeColor} strokeWidth="10"
 strokeDasharray={dashArray} strokeLinecap="round"/>
 </svg>
 <div className="absolute inset-0 flex flex-col items-center justify-center">
 <span className="text-2xl font-semibold text-[var(--lu-ink)]">{pct}</span>
 <span className="text-xs text-[var(--lu-muted)]">/ 100</span>
 </div>
 </div>
 <span className="text-sm font-bold" style={{ color: gradeColor }}>{gradeLabel}</span>
 </div>
 <div className="col-span-3 grid grid-cols-1 md:grid-cols-3 gap-3">
 <div className="bg-[#F0FBF0] rounded-[10px] p-5 flex flex-col items-center justify-center">
 <span className="text-3xl font-semibold text-[#2DB400]">{okCount}</span>
 <span className="text-xs font-medium text-[var(--lu-muted)] mt-1">양호 항목</span>
 </div>
 <div className="bg-[#FEF9E8] rounded-[10px] p-5 flex flex-col items-center justify-center">
 <span className="text-3xl font-semibold text-[#F5A623]">{warnCount}</span>
 <span className="text-xs font-medium text-[var(--lu-muted)] mt-1">주의 항목</span>
 </div>
 <div className="bg-[#FEF0F1] rounded-[10px] p-5 flex flex-col items-center justify-center">
 <span className="text-3xl font-semibold text-[#F04452]">{badCount}</span>
 <span className="text-xs font-medium text-[var(--lu-muted)] mt-1">개선 필요</span>
 </div>
 </div>
 </div>

 <div className="space-y-4">
 {diagData.map((cat, ci) => (
 <div key={ci} className="bg-white rounded-[10px] border border-[var(--lu-line)] overflow-hidden">
 <div className="bg-[var(--lu-canvas)] px-5 py-3 border-b border-[var(--lu-line)]">
 <span className="text-sm font-bold text-[var(--lu-ink)]">{cat.category}</span>
 </div>
 <div className="divide-y divide-[var(--lu-canvas)]">
 {cat.items.map((item, ii) => {
 const st = statusMap[item.status]
 const StIcon = st.Icon
 return (
 <div key={ii} className="px-5 py-3.5 flex items-center justify-between hover:bg-[#FAFBFF]">
 <div className="flex items-center gap-3">
 <span className={[st.bg, st.text, 'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg w-24 justify-center'].join(' ')}>
 <StIcon size={12} strokeWidth={2.5} />
 {st.label}
 </span>
 <div>
 <p className="text-sm font-medium text-[var(--lu-ink)]">{item.label}</p>
 <p className="text-xs text-[var(--lu-muted)]">{item.desc}</p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <div className="w-16 h-1.5 bg-[var(--lu-canvas)] rounded-full overflow-hidden">
 <div className="h-full rounded-full" style={{ width: (item.score * 10) + '%', backgroundColor: st.barColor }}/>
 </div>
 <span className="text-xs font-semibold text-[var(--lu-muted)] w-8 text-right">{item.score}/10</span>
 </div>
 </div>
 )
 })}
 </div>
 </div>
 ))}
 </div>
 </div>
 )
}

// ── 유입 분석 탭
function InflowTab() {
 const total = mockInflow.reduce((s, k) => s + k.visits, 0)

 return (
 <div>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
 <div className="bg-white rounded-[10px] border border-[var(--lu-line)] p-5">
 <p className="text-xs text-[var(--lu-muted)] mb-1">이번 달 총 유입</p>
 <p className="text-2xl font-semibold text-[var(--lu-ink)]">{total.toLocaleString()}<span className="text-base ml-0.5 text-[var(--lu-muted)]">회</span></p>
 </div>
 <div className="bg-white rounded-[10px] border border-[var(--lu-line)] p-5">
 <p className="text-xs text-[var(--lu-muted)] mb-1">전월 대비</p>
 <p className="text-2xl font-semibold text-[#2DB400]">+12.4<span className="text-base ml-0.5 text-[var(--lu-muted)]">%</span></p>
 </div>
 <div className="bg-white rounded-[10px] border border-[var(--lu-line)] p-5">
 <p className="text-xs text-[var(--lu-muted)] mb-1">유입 키워드 수</p>
 <p className="text-2xl font-semibold text-[#8B5CF6]">{mockInflow.length}<span className="text-base ml-0.5 text-[var(--lu-muted)]">개</span></p>
 </div>
 </div>

 <div className="bg-white rounded-[10px] border border-[var(--lu-line)] overflow-hidden">
 <div className="bg-[var(--lu-canvas)] px-5 py-3 border-b border-[var(--lu-line)] flex items-center justify-between">
 <span className="text-sm font-bold text-[var(--lu-ink)]">검색어별 유입 현황</span>
 <span className="text-xs text-[var(--lu-muted)]">2026년 4월 기준</span>
 </div>
 <div className="divide-y divide-[var(--lu-canvas)]">
 {mockInflow.map((row, i) => (
 <div key={i} className="px-5 py-4 hover:bg-[#FAFBFF] transition-colors">
 <div className="flex items-center justify-between mb-2">
 <div className="flex items-center gap-2">
 <span className="text-xs font-bold text-[var(--lu-muted)] w-5">{i + 1}</span>
 <span className="text-sm font-semibold text-[var(--lu-ink)]">{row.keyword}</span>
 </div>
 <div className="flex items-center gap-4">
 <span className={['inline-flex items-center gap-0.5 text-xs font-semibold', row.change > 0 ? 'text-[#2DB400]' : row.change < 0 ? 'text-[#F04452]' : 'text-[var(--lu-muted)]'].join(' ')}>
 {row.change > 0
 ? <ArrowUp size={11} strokeWidth={2.75} />
 : row.change < 0
 ? <ArrowDown size={11} strokeWidth={2.75} />
 : <Minus size={11} strokeWidth={2.75} />}
 {Math.abs(row.change)}%
 </span>
 <span className="text-sm font-bold text-[var(--lu-ink)]">{row.visits.toLocaleString()}회</span>
 <span className="text-xs text-[var(--lu-muted)] w-10 text-right">{row.pct}%</span>
 </div>
 </div>
 <div className="ml-7">
 <div className="h-1.5 bg-[var(--lu-canvas)] rounded-full overflow-hidden">
 <div className="h-full bg-[var(--lu-accent)] rounded-full" style={{ width: row.pct + '%' }}/>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 <p className="text-xs text-[var(--lu-muted)] mt-3">* 네이버 플레이스 API 연동 시 실제 데이터로 업데이트됩니다</p>
 </div>
 )
}

// ── 메인
export default function MarketingPage() {
 const [tab, setTab] = useState<'rank'|'score'|'diag'|'inflow'>('rank')

 const tabs = [
 { id: 'rank' as const, label: '키워드 순위', Icon: TrendingUp },
 { id: 'score' as const, label: '키워드 점수 분석', Icon: Search },
 { id: 'diag' as const, label: '플레이스 진단', Icon: ClipboardCheck },
 { id: 'inflow' as const, label: '유입 분석', Icon: Users },
 ]

 return (
 <div className="min-h-screen bg-[var(--lu-canvas)]">
 <div className="flex flex-1">
 <Sidebar/>
 <main className="flex-1 ml-0 md:ml-[220px] pt-4 md:pt-0 min-w-0">
 <PageHeader
 icon={<Rocket size={28} className="text-white" strokeWidth={2.5} />}
 title="마케팅"
 subtitle="네이버 플레이스·블로그·인스타를 한 곳에서 · 자영업자 올인원"
 variant="accent"
 />
 <div className="max-w-5xl mx-auto p-4 md:p-8">
 <MarketingToolChooser />
 <h2 className="mb-2 text-lg font-bold text-[var(--lu-ink)]">기존 분석 예시 살펴보기</h2>
 <p className="mb-4 text-sm leading-6 text-[var(--lu-muted)]">아래 예시로 분석 화면을 살펴보세요. 실제 매장 자료와 구분해 확인해 주세요.</p>
 <div className="flex gap-1 bg-white border border-[var(--lu-line)] rounded-[10px] p-1 mb-6 overflow-x-auto whitespace-nowrap max-w-full md:w-fit -mx-1 px-1 scrollbar-hide">
 {tabs.map(t => {
 const Icon = t.Icon
 return (
 <button key={t.id} onClick={() => setTab(t.id)}
 className={['inline-flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-[6px] text-sm font-medium transition-colors flex-shrink-0 whitespace-nowrap', tab === t.id ? 'bg-[var(--lu-accent)] text-white shadow-none' : 'text-[var(--lu-muted)] hover:text-[var(--lu-ink)]'].join(' ')}>
 <Icon size={16} strokeWidth={2.25} />
 {t.label}
 </button>
 )
 })}
 </div>

 {tab === 'rank' && <RankTab/>}
 {tab === 'score' && <ScoreTab/>}
 {tab === 'diag' && <DiagTab/>}
 {tab === 'inflow' && <InflowTab/>}
 </div>
 </main>
 </div>
 <Footer />
 <HarangMarketingPopup />
 </div>
 )
}
