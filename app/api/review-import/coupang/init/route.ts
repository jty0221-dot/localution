// app/api/review-import/coupang/init/route.ts
// ============================================================
// 쿠팡이츠 리뷰 북마클릿 초기화
// POST → token 생성 (HMAC 서명, 30분 유효)
// 사장님이 token을 북마클릿으로 store.coupangeats.com 리뷰 페이지에서 사용
// DB 마이그레이션 불필요 — 토큰 자체가 user_id 담음
// ============================================================
import { NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { signImportToken } from '@/app/lib/coupang-import-token'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

 if (!process.env.LOCALUTION_COOKIE_SECRET) return NextResponse.json({ ok: false, error: 'not_configured', message: '리뷰 가져오기 인증 설정을 관리자에게 확인해 주세요.' }, { status: 503 })
 const token = signImportToken(auth.userId)
 return NextResponse.json({ ok: true, token, expires_in_minutes: 30 })
}
