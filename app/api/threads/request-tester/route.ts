// app/api/threads/request-tester/route.ts
// Threads 테스터 등록 신청 — 어떤 업체든 신청 가능
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/adminAuth'
import { requireUser } from '@/app/lib/userAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// 테이블 존재 확인만 한다 (LU-018)
//   · 예전에는 테이블이 없으면 서비스 키를 Authorization 헤더에 직접 붙여 Supabase 관리 API 에 DDL 을 보냈다.
//     관리 API 는 서비스 키(JWT 든 새 sb_secret_ 키든)를 받지 않아 동작한 적이 없고, 운영 코드가 실행 중 DDL 을
//     시도하는 것 자체를 막는다. 테이블은 migrations/threads_tester_requests.sql 로 만든다(운영 적용은 결재).
//   · Supabase 접근은 supabase-js 서비스 클라이언트(createServiceClient)만 쓴다 → 키 형식이 바뀌어도 동작.
async function tableReady(svc: ReturnType<typeof createServiceClient>): Promise<boolean> {
 const { error } = await svc.from('threads_tester_requests').select('id').limit(1)
 if (error) console.error('[threads/request-tester] threads_tester_requests 사용 불가 · migrations/threads_tester_requests.sql 적용 필요:', error.message)
 return !error
}

const NOT_READY = { ok: false, error: '테스터 신청 기능을 준비하고 있어요. 잠시 뒤 다시 시도해 주세요.' }

export async function POST(req: NextRequest) {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

 const body = await req.json() as {
 instagram_id?: string
 store_name?: string
 contact?: string
 }

 const instagramId = body.instagram_id?.trim().replace(/^@/, '')
 if (!instagramId) {
 return NextResponse.json({ ok: false, error: 'Instagram 아이디를 입력해주세요.' }, { status: 400 })
 }

 const svc = createServiceClient()
 if (!(await tableReady(svc))) return NextResponse.json(NOT_READY, { status: 503 })

 // 이미 신청한 경우 중복 방지
 const { data: existing } = await svc
 .from('threads_tester_requests')
 .select('id, status')
 .eq('user_id', auth.userId)
 .order('created_at', { ascending: false })
 .limit(1)
 .maybeSingle()

 if (existing && existing.status !== 'rejected') {
 return NextResponse.json({
 ok: true,
 already: true,
 status: existing.status,
 message: existing.status === 'done'
 ? '이미 테스터 등록이 완료된 계정입니다.'
 : '이미 신청이 접수되어 처리 중입니다.',
 })
 }

 const { error } = await svc.from('threads_tester_requests').insert({
 user_id: auth.userId,
 instagram_id: instagramId,
 store_name: body.store_name?.trim() || null,
 contact: body.contact?.trim() || null,
 })

 if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

 return NextResponse.json({ ok: true, already: false })
}

export async function GET() {
 const auth = await requireUser()
 if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })

 const svc = createServiceClient()
 if (!(await tableReady(svc))) return NextResponse.json({ ...NOT_READY, request: null }, { status: 503 })

 const { data } = await svc
 .from('threads_tester_requests')
 .select('id, status, instagram_id, created_at')
 .eq('user_id', auth.userId)
 .order('created_at', { ascending: false })
 .limit(1)
 .maybeSingle()

 return NextResponse.json({ ok: true, request: data ?? null })
}
