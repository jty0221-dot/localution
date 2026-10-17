import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function unavailable() {
 return NextResponse.json({
  success: false,
  code: 'not_configured',
  error: '요기요 리뷰 조회와 답글 등록 연결이 준비되지 않았습니다.',
 }, { status: 503 })
}

export async function GET() { return unavailable() }
export async function POST() { return unavailable() }
