'use client'
export const dynamic = 'force-dynamic'

import { useState, useRef, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Camera, Image as ImageIcon, CheckCircle2, AlertTriangle, ClipboardList, Sparkles, Check, UtensilsCrossed, X, Star } from 'lucide-react'

const BLUE = '#3182F6'
const BLUE_DARK = '#1B64DA'
const BLUE_BG = '#EFF6FF'
const BLACK = '#191F28'
const GRAY = '#8B95A1'
const BORDER = '#E5E8EB'

type Store = {
 slug: string; name: string; category: string; address: string
 keywords: string[]; naverUrl: string; greeting: string; signatures: string[]
}

type MenuItem = {
 name: string
 price?: number | null
 desc?: string | null
 is_signature?: boolean
}

// 하드코딩 데모 매장 제거됨 — 실제 매장 정보는 /api/stores/[slug] 또는 props로 주입
// 매장을 찾지 못하면 "매장을 찾을 수 없습니다" 안내 표시
const STORES: Record<string, Store> = {}

function sanitizeStoreId(raw: string | string[] | undefined): string {
 if (!raw) return 'default'
 let s = Array.isArray(raw) ? raw[0] : raw
 for (let i = 0; i < 2; i++) {
 try { const dec = decodeURIComponent(s); if (dec === s) break; s = dec } catch { break }
 }
 s = s.replace(/^\[+|\]+$/g, '').trim()
 if (/^\[.*\]$/.test(s)) s = s.replace(/^\[|\]$/g, '').trim()
 const lc = s.toLowerCase()
 if (!s || lc === 'storeid' || lc === 'storeid%5d' || lc.includes('[storeid]')) return 'default'
 return s
}

// 네이버 플레이스 URL에서 Place ID를 추출해 리뷰 작성 페이지 URL 반환
function getNaverReviewUrl(naverUrl: string): string {
 if (!naverUrl) return ''
 // https://m.place.naver.com/place/12345678
 // https://map.naver.com/v5/entry/place/12345678
 // https://m.place.naver.com/restaurant/12345678/home
 const parts = naverUrl.split('/')
 for (let i = 0; i < parts.length; i++) {
 const seg = parts[i]
 if (seg === 'place' || seg === 'restaurant' || seg === 'cafe' ||
 seg === 'beauty' || seg === 'hospital' || seg === 'hotel' ||
 seg === 'mart' || seg === 'pharmacy' || seg === 'accommodation') {
 const next = parts[i + 1]
 if (next && /^\d+$/.test(next)) {
 return 'https://m.place.naver.com/place/' + next + '/review/visitor/write'
 }
 }
 }
 // place ID를 찾지 못한 경우 원래 URL 반환
 return naverUrl
}

function toReadableName(storeId: string): string {
 if (!storeId || storeId === 'default') return '우리 매장'
 return storeId.replace(/-+/g, ' ').replace(/\s+/g, ' ').trim() || '우리 매장'
}

function getStore(storeId: string): Store {
 if (STORES[storeId]) return STORES[storeId]
 const readable = toReadableName(storeId)
 const isGeneric = readable === '우리 매장'
 return {
 slug: storeId, name: readable, category: '', address: '',
 keywords: ['맛있는 곳', '분위기 좋은 곳', '재방문 의사 있음'],
 naverUrl: 'https://m.place.naver.com/',
 greeting: isGeneric ? '방문해 주셔서 감사합니다' : (readable + '을(를) 방문해주셔서 감사합니다'),
 signatures: ['대표 메뉴'],
 }
}

type Photo = { id: string; cat: 'receipt' | 'photo'; url: string; label: string }
type LengthKey = 'short' | 'mid' | 'long'
type ReceiptStatus = 'idle' | 'checking' | 'ok' | 'warning' | 'confirm'

// ⭐ 2-C: 손님 활동 추적 (best-effort, 실패해도 사용자 흐름 유지)
function trackEvent(slug: string, event: string, meta?: any) {
 if (!slug) return
 try {
 fetch('/api/qr/track', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ slug, event, meta }),
 keepalive: true, // 페이지 닫혀도 fetch 완료 보장
 }).catch(() => null)
 } catch (_) {}
}

export default function ReviewPage() {
 const params = useParams<{ storeId: string }>()
 const searchParams = useSearchParams()
 const storeId = sanitizeStoreId(params?.storeId)
 const baseStore = getStore(storeId)

 const qpName = searchParams?.get('n') || ''
 const qpCat = searchParams?.get('t') || ''
 const qpAddr = searchParams?.get('a') || ''
 const qpKw = searchParams?.get('kw') || ''
 const qpNaver = searchParams?.get('naver') || ''
 const qpPid = searchParams?.get('pid') || ''

 const [store, setStore] = useState<Store>(() => {
 const hasQp = qpName || qpCat || qpAddr || qpNaver || qpPid
 if (hasQp) {
 const finalName = qpName || baseStore.name
 return {
 ...baseStore,
 name: finalName,
 category: qpCat || baseStore.category,
 address: qpAddr || baseStore.address,
 naverUrl: qpNaver || (qpPid ? `https://m.place.naver.com/place/${qpPid}/review/visitor/write` : baseStore.naverUrl),
 keywords: qpKw ? [qpKw, ...baseStore.keywords.slice(0, 3)] : baseStore.keywords,
 greeting: qpName ? (finalName + '을(를) 방문해주셔서 감사합니다') : baseStore.greeting,
 }
 }
 return baseStore
 })

 useEffect(() => {
 if (qpName || qpAddr || qpNaver || qpPid) return
 try {
 const raw = window.localStorage.getItem('localution.store_info')
 if (!raw) return
 const info = JSON.parse(raw)
 if (!info || !info.connected) return
 let slug = ''
 const lower = (info.name || '').toLowerCase()
 for (let i = 0; i < lower.length; i++) {
 const c = lower.charCodeAt(i)
 const ok = (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || (c >= 0xAC00 && c <= 0xD7A3)
 slug += ok ? lower[i] : '-'
 }
 while (slug.includes('--')) slug = slug.split('--').join('-')
 if (slug.startsWith('-')) slug = slug.slice(1)
 if (slug.endsWith('-')) slug = slug.slice(0, -1)
 if (storeId === slug || storeId.includes(slug) || slug.includes(storeId) || !STORES[storeId]) {
 setStore(prev => ({
 ...prev,
 name: info.name || prev.name,
 category: info.category || prev.category,
 address: info.location || prev.address,
 naverUrl: info.naverUrl || prev.naverUrl,
 greeting: info.name ? (info.name + '을(를) 방문해주셔서 감사합니다') : prev.greeting,
 }))
 }
 } catch (_) {}
 }, [storeId, qpName, qpAddr, qpNaver, qpPid])

 // 2-A: 공개 매장 정보 API 우선 — 손님 페이지에서 정확한 매장 식별
 // /api/qr/store/{slug} (인증 불필요, 공개 정보만)
 // → 사장님이 매장 정보 변경해도 QR URL 그대로 자동 반영
 useEffect(() => {
 if (!storeId || storeId === 'default') return
 let alive = true
 ;(async () => {
 try {
 // 1차: 새 공개 API (slug 기반, 인증 X)
 const qrRes = await fetch('/api/qr/store/' + encodeURIComponent(storeId), { cache: 'no-store' })
 if (qrRes.ok) {
 const qj = await qrRes.json()
 if (!alive || !qj?.ok || !qj.store) return
 const s = qj.store
 setStore(prev => ({
 ...prev,
 name: s.name || prev.name,
 category: s.category || prev.category,
 address: s.address || prev.address,
 naverUrl: s.naverUrl || (s.naverPlaceId
 ? `https://m.place.naver.com/place/${s.naverPlaceId}/review/visitor/write`
 : (s.naverExternalPlaceId
 ? `https://m.place.naver.com/place/${s.naverExternalPlaceId}/review/visitor/write`
 : prev.naverUrl)),
 greeting: s.name ? (s.name + '을(를) 방문해주셔서 감사합니다') : prev.greeting,
 }))
 return
 }

 // 2차 fallback: 기존 (인증된 사장님 자기 매장 조회 — 호환용)
 if (qpName || qpAddr || qpNaver || qpPid) return
 const res = await fetch('/api/stores/' + encodeURIComponent(storeId), { cache: 'no-store' })
 if (!res.ok) return
 const j = await res.json()
 if (!alive || !j?.ok || !j.store) return
 const s = j.store
 setStore(prev => ({
 ...prev,
 name: s.name || prev.name,
 category: s.category || prev.category,
 address: s.address || s.location || prev.address,
 naverUrl: s.naver_url || (s.naver_place_id ? `https://m.place.naver.com/place/${s.naver_place_id}/review/visitor/write` : prev.naverUrl),
 keywords: (s.main_keyword || (s.sub_keywords && s.sub_keywords.length))
 ? [s.main_keyword, ...(s.sub_keywords || []), ...prev.keywords.slice(0, 2)].filter(Boolean)
 : prev.keywords,
 greeting: s.name ? (s.name + '을(를) 방문해주셔서 감사합니다') : prev.greeting,
 }))
 } catch (_) {}
 })()
 return () => { alive = false }
 }, [storeId, qpName, qpAddr, qpNaver, qpPid])

 // 매장 메뉴 가져오기 (사장님이 등록한 메뉴 — AI가 실제 메뉴만 언급)
 useEffect(() => {
 let alive = true
 ;(async () => {
 try {
 const r = await fetch('/api/menu/public?slug=' + encodeURIComponent(storeId), { cache: 'no-store' })
 if (!r.ok) return
 const j = await r.json()
 if (!alive || !j?.ok || !Array.isArray(j.items)) return
 const menu: MenuItem[] = j.items.map((it: any) => ({
 name: it.name_ko || it.name_en || '',
 price: typeof it.price === 'number' ? it.price : null,
 desc: it.desc_ko || null,
 is_signature: !!it.is_signature,
 })).filter((m: MenuItem) => m.name)
 setStoreMenu(menu)
 } catch {}
 })()
 return () => { alive = false }
 }, [storeId])

 const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(0)
 const [photos, setPhotos] = useState<Photo[]>([])
 const [receiptStatus, setReceiptStatus] = useState<ReceiptStatus>('idle')
 const [gender, setGender] = useState<'F' | 'M' | '-'>('-')
 const [age, setAge] = useState<string>('30s')
 const [tone, setTone] = useState<string>('warm')
 const [rating, setRating] = useState<number>(5) // 기본 5점 · 손님이 바꿀 수 있다
 const [length, setLength] = useState<LengthKey>('mid')
 const [drafting, setDrafting] = useState(false)
 const [advancing, setAdvancing] = useState(false)
 const [draft, setDraft] = useState('')
 const [final, setFinal] = useState('')
 // ⭐ 2-B: 영수증 OCR 결과 + AI 진행 상태
 const [receiptInfo, setReceiptInfo] = useState<{ items: string[]; storeName?: string; total?: string; matched?: boolean } | null>(null)
 const [storeMenu, setStoreMenu] = useState<MenuItem[]>([])
 const [aiSource, setAiSource] = useState<'ai' | 'fallback' | null>(null)
 const [aiHashtags, setAiHashtags] = useState<string[]>([])
 const [copied, setCopied] = useState(false)

 const albumRef = useRef<HTMLInputElement>(null)
 const cameraRef = useRef<HTMLInputElement>(null)
 const [uploadCat, setUploadCat] = useState<'receipt' | 'photo'>('receipt')

 // ⭐ 2-C: 페이지 진입 = QR 스캔 이벤트 (storeId 가 default 가 아닐 때만)
 useEffect(() => {
 if (!storeId || storeId === 'default') return
 trackEvent(storeId, 'scan', { has_qp: !!(qpName || qpAddr || qpNaver || qpPid) })
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [storeId])

 // ── 2-B: 영수증 OCR 검증 — 서버 Claude OCR 우선 + TextDetector fallback ──
 useEffect(() => {
 const receipt = photos.find(p => p.cat === 'receipt')
 if (!receipt) { setReceiptStatus('idle'); setReceiptInfo(null); return }
 if (receiptStatus === 'ok') return // 이미 확인됨
 setReceiptStatus('checking')

 let alive = true
 ;(async () => {
 // 1차: 서버 Claude Vision OCR (정확도 최고, items 추출도 가능)
 try {
 const ocrController = new AbortController()
 const ocrTimer = setTimeout(() => ocrController.abort(), 25000) // 25초 (서버 20s + 여유)
 const ocrRes = await fetch('/api/qr-review-generate', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 action: 'ocr',
 receiptImage: receipt.url,
 expectedStoreName: store.name,
 // 매장 등록 메뉴 — OCR 오타 보정에 사용
 storeMenu: storeMenu.slice(0, 30).map(m => ({ name: m.name })),
 }),
 signal: ocrController.signal,
 })
 clearTimeout(ocrTimer)
 if (ocrRes.ok) {
 const j = await ocrRes.json()
 const info = j?.receiptInfo
 if (alive && info) {
 setReceiptInfo({
 items: Array.isArray(info.items) ? info.items.slice(0, 5) : [],
 storeName: info.storeName || undefined,
 total: info.total || undefined,
 matched: !!info.matched,
 })
 // matched 가 명시되면 그것 우선, 아니면 storeName 비교
 const ocrName = String(info.storeName || '').toLowerCase()
 const ourName = store.name.toLowerCase()
 const fuzzyMatch = ocrName && ourName && (
 ocrName.includes(ourName.split(' ')[0]) ||
 ourName.includes(ocrName.split(' ')[0])
 )
 const ok = info.matched === true || (info.matched !== false && fuzzyMatch)
 setReceiptStatus(ok ? 'ok' : 'warning')
 // 2-C 추적: 영수증 업로드 + 일치 여부
 trackEvent(storeId, 'receipt_uploaded', {
 items_count: Array.isArray(info.items) ? info.items.length : 0,
 total: info.total || null,
 })
 if (ok) trackEvent(storeId, 'receipt_verified', { ocr_store: info.storeName || null })
 return
 }
 }
 } catch (_) {}

 // 2차 fallback: 클라이언트 TextDetector (Chrome 만 지원)
 if (typeof window !== 'undefined' && 'TextDetector' in window) {
 try {
 const detector = new (window as any).TextDetector()
 const img = new Image()
 img.src = receipt.url
 await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej })
 const results = await detector.detect(img)
 const ocrText = results.map((r: any) => r.rawValue).join(' ').toLowerCase()
 const nameWords = store.name.toLowerCase().split(/[\s\-]+/).filter((w: string) => w.length >= 2)
 const found = nameWords.some((w: string) => ocrText.includes(w))
 if (!alive) return
 setReceiptStatus(found ? 'ok' : 'warning')
 return
 } catch (_) {}
 }

 // 3차 fallback: 사용자에게 수동 확인 요청
 if (!alive) return
 setReceiptStatus('confirm')
 })()
 return () => { alive = false }
 }, [photos, store.name, storeMenu])

 // 이미지 압축 — Vision API 속도 향상 핵심 (4MB → 200KB, 1024px max)
 const compressImage = (file: File, maxSize = 1024, quality = 0.82): Promise<string> => {
 return new Promise((resolve, reject) => {
 const reader = new FileReader()
 reader.onload = () => {
 const img = new Image()
 img.onload = () => {
 const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1)
 const w = Math.round(img.width * ratio)
 const h = Math.round(img.height * ratio)
 const canvas = document.createElement('canvas')
 canvas.width = w; canvas.height = h
 const ctx = canvas.getContext('2d')
 if (!ctx) { resolve(String(reader.result)); return }
 ctx.drawImage(img, 0, 0, w, h)
 try {
 resolve(canvas.toDataURL('image/jpeg', quality))
 } catch {
 resolve(String(reader.result))
 }
 }
 img.onerror = () => resolve(String(reader.result))
 img.src = String(reader.result)
 }
 reader.onerror = reject
 reader.readAsDataURL(file)
 })
 }

 const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const files = e.target.files
 if (!files || files.length === 0) return
 const arr = Array.from(files)
 const buffer: Photo[] = []
 // 영수증은 OCR 정확도 위해 큰 해상도 + 고품질 유지 (작은 글자)
 // 일반 사진은 분위기만 파악하면 되므로 작게 압축
 const isReceipt = uploadCat === 'receipt'
 const maxDim = isReceipt ? 1800 : 1024
 const quality = isReceipt ? 0.92 : 0.82
 for (const f of arr) {
 try {
 const url = await compressImage(f, maxDim, quality)
 buffer.push({ id: Date.now() + '-' + Math.random().toString(36).slice(2, 8), cat: uploadCat, url, label: f.name })
 } catch {
 // 압축 실패 시 원본 사용
 const reader = new FileReader()
 const url = await new Promise<string>(r => { reader.onload = () => r(String(reader.result)); reader.readAsDataURL(f) })
 buffer.push({ id: Date.now() + '-' + Math.random().toString(36).slice(2, 8), cat: uploadCat, url, label: f.name })
 }
 }
 setPhotos(prev => [...prev, ...buffer])
 if (uploadCat === 'receipt') setReceiptStatus('checking')
 if (uploadCat === 'photo') {
 trackEvent(storeId, 'photo_uploaded', { count: buffer.length })
 }
 e.target.value = ''
 }

 const openAlbum = (cat: 'receipt' | 'photo') => { setUploadCat(cat); setTimeout(() => albumRef.current?.click(), 0) }
 const openCamera = (cat: 'receipt' | 'photo') => { setUploadCat(cat); setTimeout(() => cameraRef.current?.click(), 0) }

 const removePhoto = (id: string) => {
 setPhotos(prev => {
 const next = prev.filter(p => p.id !== id)
 if (!next.some(p => p.cat === 'receipt')) setReceiptStatus('idle')
 return next
 })
 }

 const recordSubmission = () => {
 if (typeof window === 'undefined') return
 try {
 const key = 'localution.review_stats'
 const raw = window.localStorage.getItem(key)
 const arr: any[] = raw ? (JSON.parse(raw) || []) : []
 arr.push({ ts: Date.now(), storeId, storeName: store.name, gender, age, tone, length, photoCount: photos.length, hasReceipt: photos.some(p => p.cat === 'receipt'), hasPhoto: photos.some(p => p.cat === 'photo') })
 if (arr.length > 1000) arr.splice(0, arr.length - 1000)
 window.localStorage.setItem(key, JSON.stringify(arr))
 } catch (_) {}
 }

 // 2-B: 서버 AI 리뷰 생성 · 실패하면 손님이 직접 작성 (지어낸 대체문 없음)
 // tone 매핑: page.tsx 의 'warm/short/detail/casual/funny' → API 의 'mom/honest/insta/friend/z'
 const TONE_MAP: Record<string, string> = {
 warm: 'mom', // 따뜻한 → 맘카페 스타일
 detail: 'gourmet', // 상세 → 미식가 (전문)
 short: 'honest', // 짧고 정확 → 솔직담백
 casual: 'z', // 캐주얼 → Z세대
 funny: 'friend', // 유쾌한 → 친구 카톡
 }
 const startGenerate = async () => {
 setDrafting(true)
 setAiSource(null)
 setAiHashtags([])
 recordSubmission()

 try {
 // 사진 url (data:base64 형식) 모음 — 서버에 sample 3장만
 const photoUrls = photos
 .filter(p => p.cat === 'photo')
 .map(p => p.url)
 .slice(0, 3)
 const receiptUrl = photos.find(p => p.cat === 'receipt')?.url

 const apiTone = TONE_MAP[tone] || 'mom'

 // 클라이언트 타임아웃 45초 — 서버 maxDuration(50s) 직전 fallback
 const controller = new AbortController()
 const timer = setTimeout(() => controller.abort(), 45000)

 const res = await fetch('/api/qr-review-generate', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 action: 'generate',
 images: receiptUrl ? [receiptUrl, ...photoUrls].slice(0, 3) : photoUrls,
 storeName: store.name,
 storeType: store.category,
 mainKeyword: store.keywords?.[0] || '',
 comment: '',
 tone: apiTone,
 rating,
 receiptItems: receiptInfo?.items || [],
 // 매장이 등록한 실제 메뉴 — AI 가 가짜 메뉴 만드는 것 방지
 storeMenu: storeMenu.slice(0, 30).map(m => ({
 name: m.name,
 price: m.price,
 signature: m.is_signature,
 })),
 }),
 signal: controller.signal,
 })
 clearTimeout(timer)

 if (res.ok) {
 const j = await res.json()
 if (j?.review && typeof j.review === 'string' && j.review.length > 20) {
 setDraft(j.review)
 if (Array.isArray(j.hashtags)) setAiHashtags(j.hashtags.slice(0, 5))
 setAiSource('ai')
 setDrafting(false)
 // 2-C 추적
 trackEvent(storeId, 'ai_generated', {
 tone: apiTone, length, ai_source: 'ai',
 char_count: j.review.length,
 has_receipt: photos.some(p => p.cat === 'receipt'),
 has_photo: photos.some(p => p.cat === 'photo'),
 })
 setStep(3)
 return
 }
 }
 } catch (_) {}

 // AI 실패 시: 손님이 하지 않은 경험을 지어낸 대체문을 넣지 않는다(허위 리뷰 방지) → 빈 칸에 직접 작성
 setDraft('')
 setAiSource('fallback')
 setDrafting(false)
 setStep(3)
 }

 const advance = () => {
 setAdvancing(true)
 setTimeout(() => { setFinal(draft.trim()); setAdvancing(false); setStep(4) }, 600)
 }

 // 모든 동작을 탭 직후 동기로 처리한다: 기다린 뒤 창을 열면 iOS · 카톡 · 네이버 앱 브라우저가 막는다
 const copyAndGoNaver = () => {
 const el = document.createElement('textarea')
 el.value = final
 el.setAttribute('readonly', '')
 el.style.position = 'fixed'
 el.style.opacity = '0'
 document.body.appendChild(el)
 el.select()
 el.setSelectionRange(0, 99999) // iOS 는 select() 만으로 선택되지 않는다
 let ok = false
 try { ok = document.execCommand('copy') } catch {}
 document.body.removeChild(el)
 navigator.clipboard?.writeText(final).catch(() => {})
 setCopied(true)
 setTimeout(() => setCopied(false), 2500)
 if (!ok && !navigator.clipboard) alert('복사가 안 됐어요. 리뷰 글을 길게 눌러 직접 복사해 주세요.')
 // 2-C 추적: 네이버 등록 클릭
 trackEvent(storeId, 'submitted_naver', {
 char_count: final.length,
 tone, length, rating,
 has_receipt: photos.some(p => p.cat === 'receipt'),
 has_photo: photos.some(p => p.cat === 'photo'),
 })
 const reviewUrl = getNaverReviewUrl(store.naverUrl)
 const win = window.open(reviewUrl, '_blank')
 if (!win) window.location.href = reviewUrl // 새 창이 막힌 앱 브라우저는 같은 창으로 이동
 }

 const reset = () => { setStep(0); setRating(5); setPhotos([]); setReceiptStatus('idle'); setDraft(''); setFinal('') }

 const toneOptions = [
 { k: 'warm', l: '따뜻하게', d: '감성적이고 다정한' },
 { k: 'casual', l: '친근하게', d: '친구에게 말하듯' },
 { k: 'short', l: '심플하게', d: '핵심만 깔끔하게' },
 { k: 'detail', l: '자세하게', d: '구체적인 경험 중심' },
 { k: 'funny', l: '유머러스하게', d: '재치있고 재미있게' },
 { k: 'emotional', l: '감성 충만', d: '여운과 감동 중심' },
 { k: 'pro', l: '꼼꼼하게', d: '전문적이고 상세하게' },
 { k: 'honest', l: '솔직하게', d: '장단점 균형있게' },
 ]

 const hasReceipt = photos.some(p => p.cat === 'receipt')

 return (
 <div style={{ background: '#F7F8FA', minHeight: '100vh', color: BLACK }}>
 <input ref={albumRef} type="file" accept="image/*" multiple hidden onChange={handleFile} />
 <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={handleFile} />

 <header className="px-5 pt-8 pb-6 text-white" style={{ background: `linear-gradient(180deg, ${BLUE} 0%, ${BLUE_DARK} 100%)` }}>
 <div className="max-w-[520px] mx-auto">
 <div className="flex items-center gap-2 text-xs opacity-90 mb-1">
 <span>{store.category}</span>
 {store.address && (<><span>·</span><span>{store.address}</span></>)}
 </div>
 <h1 className="text-2xl font-black mb-1">{store.name}</h1>
 <p className="text-sm opacity-95">{store.greeting}</p>
 <div className="flex gap-1.5 mt-5">
 {[0, 1, 2, 3, 4].map(i => (
 <div key={i} className="flex-1 h-1.5 rounded-full" style={{ background: i <= step ? '#ffffff' : 'rgba(255,255,255,0.3)' }} />
 ))}
 </div>
 </div>
 </header>

 <main className="max-w-[520px] mx-auto px-5 py-6">

 {/* ── Step 0: 소개 ── */}
 {step === 0 && (
 <div className="space-y-4">
 <div className="bg-white rounded-2xl p-5 shadow-sm">
 <h2 className="text-xl font-black mb-2">1분만에 네이버 리뷰 작성</h2>
 {store.naverUrl && store.naverUrl !== 'https://m.place.naver.com/' && (
 <div className="flex items-center gap-1.5 mb-2">
 <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-black" style={{ background: '#03C75A' }}>N</span>
 <span className="text-[11px] font-bold" style={{ color: '#03C75A' }}>네이버 플레이스 인증 매장</span>
 </div>
 )}
 <p className="text-sm leading-relaxed" style={{ color: GRAY }}>
 영수증과 사진을 올리면 AI가 방문 후기 초안을 써 드려요.<br />
 확인하고 마음대로 고쳐서 올리시면 돼요.
 </p>
 <div className="mt-5 space-y-2.5">
 {[
 { n: 1, t: '영수증 · 사진 업로드 (20초)' },
 { n: 2, t: '나이대 · 말투 · 길이 선택 (10초)' },
 { n: 3, t: 'AI 리뷰 생성 + 직접 수정 (20초)' },
 { n: 4, t: '복사 → 네이버 붙여넣기 (10초)' },
 ].map(s => (
 <div key={s.n} className="flex items-start gap-3 text-sm">
 <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0" style={{ background: BLUE }}>{s.n}</span>
 <span className="flex-1 pt-0.5" style={{ color: '#4E5968' }}>{s.t}</span>
 </div>
 ))}
 </div>
 </div>
 <div className="bg-white rounded-2xl p-4 shadow-sm">
 <p className="text-[11px] font-bold mb-2" style={{ color: BLUE }}>AI가 자동으로 처리해드리는 것</p>
 <ul className="text-xs space-y-1" style={{ color: '#4E5968' }}>
 <li>· 영수증 스캔으로 매장 일치 여부 자동 확인</li>
 <li>· 사진 AI 분석 (음식 · 서비스 · 전경 자동 구분)</li>
 <li>· {store.name} 맞춤 SEO 키워드 자동 삽입</li>
 <li>· 나이 · 말투 · 길이 기반 자연스러운 문장</li>
 <li>· 올리기 전에 손님이 직접 확인하고 고칠 수 있어요</li>
 </ul>
 </div>
 <button onClick={() => setStep(1)} className="w-full py-4 rounded-2xl font-black text-white text-base shadow-lg" style={{ background: BLUE }}>
 시작하기
 </button>
 </div>
 )}

 {/* ── Step 1: 업로드 ── */}
 {step === 1 && (
 <div className="space-y-4">
 <div>
 <h2 className="text-lg font-black mb-1">영수증과 사진을 올려주세요</h2>
 <p className="text-xs" style={{ color: GRAY }}>영수증 1장 + 사진 몇 장이면 AI가 알아서 분석해요</p>
 </div>

 <div className="space-y-2">
 {([
 { cat: 'receipt', label: '영수증', desc: '스캔으로 매장 자동 인식', Icon: ClipboardList },
 { cat: 'photo', label: '사진', desc: '음식 · 서비스 · 전경 등', Icon: Camera },
 ] as const).map(c => {
 const count = photos.filter(p => p.cat === c.cat).length
 const active = count > 0
 return (
 <div key={c.cat} className="p-4 rounded-2xl border-2 border-dashed bg-white transition-colors" style={{ borderColor: active ? BLUE : BORDER }}>
 <div className="flex items-center gap-3 mb-3">
 <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: BLUE_BG, color: BLUE }}>
 <c.Icon size={20} strokeWidth={2.5} />
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2">
 <span className="font-black text-sm" style={{ color: BLACK }}>{c.label}</span>
 {active && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: BLUE }}>{count}장</span>}
 </div>
 <p className="text-[11px] mt-0.5" style={{ color: GRAY }}>{c.desc}</p>
 </div>
 </div>
 <div className="grid grid-cols-2 gap-2">
 <button onClick={() => openCamera(c.cat)}
 className="py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-1.5 shadow-sm"
 style={{ background: BLUE }}>
 <Camera size={16} strokeWidth={2.5} /><span>바로 촬영</span>
 </button>
 <button onClick={() => openAlbum(c.cat)}
 className="py-3 rounded-xl text-sm font-bold border-2 flex items-center justify-center gap-1.5 bg-white"
 style={{ borderColor: BLUE, color: BLUE }}>
 <ImageIcon size={16} strokeWidth={2.5} /><span>앨범에서</span>
 </button>
 </div>
 </div>
 )
 })}
 </div>

 {/* ── 영수증 스캔 검증 UI ── */}
 {hasReceipt && (
 <div>
 {receiptStatus === 'checking' && (
 <div className="p-3.5 rounded-2xl flex items-center gap-3" style={{ background: BLUE_BG, border: `1px solid #BFDBFE` }}>
 <div className="w-4 h-4 rounded-full border-2 animate-spin flex-shrink-0" style={{ borderColor: '#BFDBFE', borderTopColor: BLUE }} />
 <p className="text-xs font-semibold" style={{ color: BLUE }}>영수증 스캔 중... {store.name} 일치 여부 확인하고 있어요</p>
 </div>
 )}
 {receiptStatus === 'ok' && (
 <div className="p-3.5 rounded-2xl" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
 <div className="flex items-center gap-3">
 <CheckCircle2 size={18} className="flex-shrink-0 text-[#059669]" strokeWidth={2.5} />
 <p className="text-xs font-bold" style={{ color: '#059669' }}>
 {store.name} 영수증 확인됐어요!
 {receiptInfo?.items && receiptInfo.items.length > 0 ? ' 메뉴 자동 인식 완료' : ' AI 가 분석할게요'}
 </p>
 </div>
 {receiptInfo?.items && receiptInfo.items.length > 0 && (
 <div className="mt-2 pl-7 flex flex-wrap gap-1">
 {receiptInfo.items.slice(0, 4).map((it, i) => (
 <span key={i} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-white border border-[#BBF7D0] text-[#059669] font-medium">
 <UtensilsCrossed size={10} strokeWidth={2.5} /> {it}
 </span>
 ))}
 </div>
 )}
 </div>
 )}
 {receiptStatus === 'warning' && (
 <div className="p-3.5 rounded-2xl" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
 <p className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: '#D97706' }}><AlertTriangle size={13} strokeWidth={2.5} /> 영수증에서 {store.name} 정보를 찾지 못했어요</p>
 <p className="text-[11px] mb-3" style={{ color: '#92400E' }}>{store.name}의 영수증이 맞나요? 맞으면 계속 진행할 수 있어요.</p>
 <div className="flex gap-2">
 <button onClick={() => setReceiptStatus('ok')}
 className="flex-1 py-2 rounded-xl text-xs font-bold text-white" style={{ background: '#059669' }}>
 맞아요, 계속할게요
 </button>
 <button onClick={() => { setPhotos(p => p.filter(x => x.cat !== 'receipt')); setReceiptStatus('idle') }}
 className="flex-1 py-2 rounded-xl text-xs font-bold border-2 bg-white" style={{ borderColor: BORDER, color: '#4E5968' }}>
 다시 올릴게요
 </button>
 </div>
 </div>
 )}
 {receiptStatus === 'confirm' && (
 <div className="p-3.5 rounded-2xl" style={{ background: BLUE_BG, border: `1px solid #BFDBFE` }}>
 <p className="text-xs font-bold mb-1 flex items-center gap-1.5" style={{ color: BLUE }}><ClipboardList size={13} strokeWidth={2.5} /> 영수증 확인</p>
 <p className="text-[11px] mb-3" style={{ color: '#1D4ED8' }}>이 영수증이 <strong>{store.name}</strong>에서 발행된 영수증이 맞나요?</p>
 <div className="flex gap-2">
 <button onClick={() => setReceiptStatus('ok')}
 className="flex-1 py-2 rounded-xl text-xs font-bold text-white" style={{ background: BLUE }}>
 <span className="inline-flex items-center gap-1 justify-center"><Check size={12} strokeWidth={3} /> 맞아요</span>
 </button>
 <button onClick={() => { setPhotos(p => p.filter(x => x.cat !== 'receipt')); setReceiptStatus('idle') }}
 className="flex-1 py-2 rounded-xl text-xs font-bold border-2 bg-white" style={{ borderColor: BORDER, color: '#4E5968' }}>
 다시 올릴게요
 </button>
 </div>
 </div>
 )}
 </div>
 )}

 {photos.length > 0 && (
 <div className="bg-white rounded-2xl p-3 space-y-2 shadow-sm">
 <p className="text-xs font-bold px-1" style={{ color: '#4E5968' }}>업로드된 파일 {photos.length}장</p>
 <div className="grid grid-cols-3 gap-2">
 {photos.map(p => (
 <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
 <img src={p.url} alt={p.label} className="w-full h-full object-cover" />
 <button onClick={() => removePhoto(p.id)} aria-label="사진 삭제" className="absolute top-1 right-1 w-8 h-8 min-h-0 rounded-full bg-black/60 text-white flex items-center justify-center"><X size={14} strokeWidth={3} /></button>
 <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 bg-black/50 text-[10px] text-white text-center">{p.cat === 'receipt' ? '영수증' : '사진'}</div>
 </div>
 ))}
 </div>
 </div>
 )}

 <div className="flex gap-2">
 <button onClick={() => setStep(0)} className="flex-1 py-4 rounded-2xl font-bold text-sm border-2 bg-white" style={{ borderColor: BLUE, color: BLUE }}>이전</button>
 <button
 onClick={() => setStep(2)}
 disabled={photos.length === 0 || (hasReceipt && receiptStatus === 'checking')}
 className="flex-[2] py-4 rounded-2xl font-black text-white text-base shadow-lg disabled:opacity-40"
 style={{ background: BLUE }}>
 {receiptStatus === 'checking' ? '영수증 확인 중...' : photos.length === 0 ? '파일을 올려주세요' : `다음 (${photos.length}장)`}
 </button>
 </div>
 </div>
 )}

 {/* ── Step 2: 스타일 선택 ── */}
 {step === 2 && (
 <div className="space-y-5">
 <div>
 <h2 className="text-lg font-black mb-1">리뷰 스타일을 골라주세요</h2>
 <p className="text-xs" style={{ color: GRAY }}>AI가 맞춤 리뷰 초안을 작성합니다</p>
 </div>

 {/* 별점 — 기본 5점, 탭해서 바꿀 수 있다 */}
 <div>
 <label className="text-sm font-bold mb-2 block">별점</label>
 <div className="flex items-center gap-1" role="radiogroup" aria-label="별점">
 {[1, 2, 3, 4, 5].map(n => (
 <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={n + '점'}
 onClick={() => setRating(n)} className="w-11 h-11 flex items-center justify-center">
 <Star size={30} strokeWidth={2} className={n <= rating ? 'text-[#F59E0B]' : 'text-[#D1D6DB]'} fill={n <= rating ? '#F59E0B' : 'none'} />
 </button>
 ))}
 <span className="ml-2 text-sm font-bold" style={{ color: '#4E5968' }}>{rating}점</span>
 </div>
 </div>

 {/* 성별 */}
 <div>
 <label className="text-sm font-bold mb-2 block">성별 (선택)</label>
 <div className="grid grid-cols-3 gap-2">
 {([['F', '여성'], ['M', '남성'], ['-', '미표시']] as [string, string][]).map(([k, l]) => (
 <button key={k} onClick={() => setGender(k as 'F' | 'M' | '-')}
 className="py-3 rounded-xl text-sm font-bold border-2 transition-colors"
 style={{ borderColor: gender === k ? BLUE : BORDER, background: gender === k ? BLUE : '#fff', color: gender === k ? '#fff' : '#4E5968' }}>
 {l}
 </button>
 ))}
 </div>
 </div>

 {/* 나이대 */}
 <div>
 <label className="text-sm font-bold mb-2 block">나이대</label>
 <div className="grid grid-cols-5 gap-1.5">
 {['10s', '20s', '30s', '40s', '50s+'].map(a => (
 <button key={a} onClick={() => setAge(a)}
 className="py-3 rounded-xl text-sm font-bold border-2 transition-colors"
 style={{ borderColor: age === a ? BLUE : BORDER, background: age === a ? BLUE : '#fff', color: age === a ? '#fff' : '#4E5968' }}>
 {a === '50s+' ? '50+' : a.replace('s', '')}
 </button>
 ))}
 </div>
 </div>

 {/* 말투 — 8종 */}
 <div>
 <label className="text-sm font-bold mb-2 block">말투</label>
 <div className="grid grid-cols-2 gap-2">
 {toneOptions.map(t => (
 <button key={t.k} onClick={() => setTone(t.k)}
 className="p-3 rounded-xl text-left border-2 transition-colors"
 style={{ borderColor: tone === t.k ? BLUE : BORDER, background: tone === t.k ? BLUE_BG : '#fff' }}>
 <div className="font-black text-sm" style={{ color: tone === t.k ? BLUE : BLACK }}>{t.l}</div>
 <div className="text-[11px] mt-0.5" style={{ color: GRAY }}>{t.d}</div>
 </button>
 ))}
 </div>
 </div>

 {/* 리뷰 길이 */}
 <div>
 <label className="text-sm font-bold mb-2 block">리뷰 길이</label>
 <div className="grid grid-cols-3 gap-2">
 {([
 { k: 'short', l: '짧음', d: '약 150자' },
 { k: 'mid', l: '중간', d: '약 250자' },
 { k: 'long', l: '길게', d: '약 400자' },
 ] as Array<{ k: LengthKey; l: string; d: string }>).map(x => (
 <button key={x.k} onClick={() => setLength(x.k)}
 className="p-3 rounded-xl text-center border-2 transition-colors"
 style={{ borderColor: length === x.k ? BLUE : BORDER, background: length === x.k ? BLUE_BG : '#fff' }}>
 <div className="font-black text-sm" style={{ color: length === x.k ? BLUE : BLACK }}>{x.l}</div>
 <div className="text-[11px] mt-0.5" style={{ color: GRAY }}>{x.d}</div>
 </button>
 ))}
 </div>
 </div>

 <div className="flex gap-2">
 <button onClick={() => setStep(1)} className="flex-1 py-4 rounded-2xl font-bold text-sm border-2 bg-white" style={{ borderColor: BLUE, color: BLUE }}>이전</button>
 <button onClick={startGenerate} disabled={drafting}
 className="flex-[2] py-4 rounded-2xl font-black text-white text-base shadow-lg disabled:opacity-60"
 style={{ background: BLUE }}>
 {drafting ? 'AI가 리뷰 작성 중...' : 'AI 리뷰 생성하기'}
 </button>
 </div>
 </div>
 )}

 {/* ── Step 3: 초안 확인 ── */}
 {step === 3 && (
 <div className="space-y-4">
 <div>
 <h2 className="text-lg font-black mb-1 flex items-center gap-1.5">
 {aiSource === 'ai' && <Sparkles size={16} className="text-[#7C3AED]" strokeWidth={2.5} />}
 {aiSource === 'fallback' ? '직접 적어 주세요' : aiSource === 'ai' ? 'AI가 사진과 영수증을 분석했어요' : 'AI 초안이 완성됐어요'}
 </h2>
 <p className="text-xs" style={{ color: GRAY }}>{aiSource === 'fallback' ? '드셔 보신 메뉴와 느낌을 한두 줄로 적으면 충분해요. 다 됐으면 아래 다음 버튼을 눌러주세요' : '내용을 직접 수정할 수도 있어요. 다 됐으면 아래 다음 버튼을 눌러주세요'}</p>
 </div>

 {/* 영수증 OCR 결과 — AI 가 메뉴 인식 시 노출 */}
 {receiptInfo && receiptInfo.items && receiptInfo.items.length > 0 && (
 <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-3">
 <p className="text-[11px] font-bold mb-1.5 text-[#92400E] flex items-center gap-1.5"><ClipboardList size={11} strokeWidth={2.5} /> 영수증에서 인식된 메뉴</p>
 <div className="flex flex-wrap gap-1.5">
 {receiptInfo.items.map((it, i) => (
 <span key={i} className="text-[11px] px-2.5 py-0.5 rounded-full bg-white text-[#92400E] font-medium border border-[#FDE68A]">
 {it}
 </span>
 ))}
 </div>
 {receiptInfo.total && (
 <p className="text-[11px] text-[#9A3412] mt-1.5">합계: <strong>{receiptInfo.total}</strong></p>
 )}
 </div>
 )}

 <div className="bg-white rounded-2xl p-5 shadow-sm">
 <div className="flex items-center gap-2 mb-3 flex-wrap">
 <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full text-white" style={{ background: aiSource === 'ai' ? '#7C3AED' : BLUE }}>
 {aiSource === 'ai' ? (<><Sparkles size={10} strokeWidth={2.5} /> AI 작성</>) : aiSource === 'fallback' ? '직접 작성' : 'AI 초안'}
 </span>
 <span className="text-[11px]" style={{ color: GRAY }}>{draft.length}자 · 직접 수정 가능</span>
 {aiSource === 'ai' && (
 <span className="text-[10px] text-[#7C3AED] font-medium">사진 · 영수증 · 매장 정보 분석 완료</span>
 )}
 </div>
 <textarea
 value={draft}
 onChange={e => setDraft(e.target.value)}
 placeholder="예) 점심에 칼국수 먹었는데 국물이 진하고 김치가 맛있었어요."
 className="w-full min-h-[240px] text-base leading-relaxed border-none outline-none resize-none bg-transparent"
 style={{ color: BLACK }}
 />
 </div>

 {/* AI 가 만든 해시태그 */}
 {aiHashtags.length > 0 && (
 <div className="bg-white rounded-xl p-3" style={{ border: '1px solid ' + BORDER }}>
 <p className="text-[11px] font-bold mb-2 text-[#7C3AED] flex items-center gap-1.5"><Sparkles size={11} strokeWidth={2.5} /> AI 추천 해시태그 (선택)</p>
 <div className="flex flex-wrap gap-1.5">
 {aiHashtags.map(h => (
 <button
 key={h}
 onClick={() => {
 // 클릭 시 본문 끝에 해시태그 토글 추가/제거
 if (draft.includes(h)) {
 setDraft(draft.replace(new RegExp(`\\s*${h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'), ''))
 } else {
 setDraft(draft.trim() + '\n\n' + h)
 }
 }}
 className={`text-[11px] px-2.5 py-1 rounded-full font-bold transition-colors ${
 draft.includes(h)
 ? 'bg-[#7C3AED] text-white'
 : 'bg-[#F3E8FF] text-[#7C3AED] hover:bg-[#E9D5FF]'
 }`}>
 {h}
 </button>
 ))}
 </div>
 <p className="text-[10px] text-[#8B95A1] mt-1.5">탭하면 본문에 추가/제거됩니다</p>
 </div>
 )}

 <div className="bg-white rounded-xl p-3" style={{ border: '1px solid ' + BORDER }}>
 <p className="text-[11px] font-bold mb-2" style={{ color: BLUE }}>포함된 SEO 키워드</p>
 <div className="flex flex-wrap gap-1.5">
 {store.keywords.map(k => (
 <span key={k} className="text-[11px] px-2.5 py-1 rounded-full font-bold" style={{ background: BLUE_BG, color: BLUE }}>{k}</span>
 ))}
 </div>
 </div>
 <div className="flex gap-2">
 <button onClick={() => setStep(2)} className="flex-1 py-4 rounded-2xl font-bold text-sm border-2 bg-white" style={{ borderColor: BLUE, color: BLUE }}>이전</button>
 <button onClick={advance} disabled={advancing || draft.trim().length === 0}
 className="flex-[2] py-4 rounded-2xl font-black text-white text-sm shadow-lg disabled:opacity-60"
 style={{ background: BLUE }}>
 {advancing ? '준비 중...' : '다음'}
 </button>
 </div>
 </div>
 )}

 {/* ── Step 4: 최종 ── */}
 {step === 4 && (
 <div className="space-y-4">
 <div>
 <h2 className="text-lg font-black mb-1">리뷰 준비 완료</h2>
 <p className="text-xs" style={{ color: GRAY }}>아래 버튼 한 번이면 복사 + 네이버 이동까지 끝나요</p>
 </div>
 <div className="bg-white rounded-2xl p-5 shadow-sm">
 <div className="flex items-center gap-2 mb-3">
 <span className="text-[11px] font-bold px-2 py-1 rounded-full text-white" style={{ background: BLUE }}>최종본</span>
 <span className="text-[11px]" style={{ color: GRAY }}>{final.length}자</span>
 </div>
 <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: BLACK }}>{final}</p>
 </div>
 <button onClick={copyAndGoNaver} className="w-full py-4 rounded-2xl font-black text-white text-base shadow-lg" style={{ background: BLUE }}>
 {copied ? (<span className="inline-flex items-center gap-1.5 justify-center"><Check size={14} strokeWidth={3} /> 복사 완료 · 네이버로 이동 중</span>) : '네이버 리뷰 등록하기'}
 </button>
 <div className="bg-white rounded-xl p-4" style={{ border: '1px solid ' + BORDER }}>
 <p className="text-xs font-bold mb-2" style={{ color: BLUE }}>사용 방법</p>
 <ol className="text-xs space-y-1 list-decimal pl-4" style={{ color: '#4E5968' }}>
 <li>아래 버튼 클릭 → 리뷰가 자동으로 복사돼요</li>
 <li>네이버 리뷰 작성 페이지로 바로 이동해요</li>
 <li>영수증 인증 + 사진 첨부 (필수)</li>
 <li>빈 리뷰 칸에 붙여넣기 → 등록</li>
 </ol>
 </div>
 <button onClick={reset} className="w-full py-3 text-xs underline" style={{ color: GRAY }}>
 처음부터 다시 작성
 </button>
 </div>
 )}
 </main>

 <footer className="text-center py-6 text-[11px]" style={{ color: GRAY }}>
 Powered by <span className="font-bold" style={{ color: BLUE }}>로컬루션</span>
 </footer>

 {(drafting || advancing) && (
 <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm px-6">
 <div className="bg-white rounded-2xl p-6 max-w-[300px] w-full text-center shadow-2xl">
 <div className="w-12 h-12 mx-auto mb-4 rounded-full border-4 animate-spin" style={{ borderColor: BLUE_BG, borderTopColor: BLUE }} />
 <p className="font-black text-sm mb-1" style={{ color: BLACK }}>{drafting ? 'AI가 리뷰를 작성 중' : '마무리 중'}</p>
 <p className="text-[11px] mb-4" style={{ color: GRAY }}>{drafting ? '15~30초 정도 걸려요' : '잠시만 기다려주세요'}</p>
 {drafting && (
 <button
 onClick={() => {
 // AI 없이 직접 작성 — 빈 칸으로 진행
 setDraft('')
 setAiSource('fallback')
 setDrafting(false)
 setStep(3)
 }}
 className="text-[11px] underline"
 style={{ color: GRAY }}
 >
 AI 건너뛰고 직접 작성하기
 </button>
 )}
 </div>
 </div>
 )}

 {copied && (
 <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50">
 <div className="px-5 py-3 bg-[#191F28] text-white rounded-full text-xs font-bold shadow-2xl flex items-center gap-1.5">
 <Check size={12} strokeWidth={3} /> 복사 완료 · 네이버 이동 중
 </div>
 </div>
 )}
 </div>
 )
}
