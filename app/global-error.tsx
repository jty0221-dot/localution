'use client'

/**
 * app/global-error.tsx
 *
 * Next.js 14 루트 레이아웃(root layout) 자체가 throw할 때 Next.js가 이 파일을 렌더링한다.
 * app/error.tsx는 layout 하위 에러만 잡기 때문에, 루트 layout.tsx 내부에서 예외가 터지면
 * global-error.tsx가 없을 경우 Vercel 기본 흰 화면이 표출된다.
 *
 * 본 파일은 <html>/<body>까지 포함해서 자체 렌더링해야 한다 (layout이 동작 불능 상태 가정).
 */

import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { reportError } from './lib/telemetry'

export default function GlobalError({
 error,
 reset,
}: {
 error: Error & { digest?: string }
 reset: () => void
}) {
 useEffect(() => {
 // 루트 레이아웃 에러 — fatal 레벨로 리포팅
 reportError(error, {
 level: 'fatal',
 digest: error.digest,
 route: typeof window !== 'undefined' ? window.location.pathname : undefined,
 tags: { boundary: 'global-error' },
 })
 }, [error])

 return (
 <html lang="ko">
 <head>
 <style>{`@font-face { font-family: 'Pretendard Variable'; src: url('/fonts/pretendard/PretendardVariable.woff2') format('woff2'); font-weight: 100 900; font-style: normal; font-display: swap; } button { font-family: inherit; }`}</style>
 </head>
 <body style={{ margin: 0, padding: 0, fontFamily: '"Pretendard Variable", Pretendard, sans-serif' }}>
 <div
 style={{
 minHeight: '100vh',
 width: '100%',
 boxSizing: 'border-box',
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'center',
 background: '#F3F5F4',
 padding: 24,
 }}
 >
 <div
 style={{
 maxWidth: 480,
 boxSizing: 'border-box',
 width: '100%',
 background: '#fff',
 borderRadius: 16,
 padding: '40px 28px',
 boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
 textAlign: 'center',
 }}
 >
 <div
 style={{
 width: 72,
 height: 72,
 borderRadius: 6,
 background: 'linear-gradient(135deg, #EF4444, #E11D48)',
 margin: '0 auto 20px',
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'center',
 boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
 }}
 aria-hidden="true"
 >
 <AlertCircle size={28} color="white" strokeWidth={2.5} />
 </div>
 <h1 style={{ fontSize: 22, fontWeight: 700, color: '#172B2F', margin: '0 0 8px' }}>
 시스템 오류가 발생했어요
 </h1>
 <p style={{ fontSize: 14, color: '#53656A', lineHeight: 1.6, margin: '0 0 8px' }}>
 화면을 불러오지 못했어요.
 <br />잠시 후 다시 시도해주세요.
 </p>
 {error.digest && (
 <p style={{ fontSize: 12, color: '#53656A', overflowWrap: 'anywhere', margin: '0 0 24px' }}>
 문의 시 알려주세요: {error.digest}
 </p>
 )}

 <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
 <button
 type="button"
 onClick={() => reset()}
 style={{
 padding: '14px 20px',
 borderRadius: 6,
 background: '#16685D',
 color: '#fff',
 border: 'none',
 fontSize: 14,
 fontWeight: 600,
 cursor: 'pointer',
 }}
 >
 다시 시도
 </button>
 <a
 href="/"
 style={{
 padding: '14px 20px',
 borderRadius: 6,
 background: '#F3F5F4',
 color: '#53656A',
 textDecoration: 'none',
 fontSize: 14,
 fontWeight: 600,
 }}
 >
 홈으로 돌아가기
 </a>
 </div>

 <p style={{ fontSize: 11, color: '#53656A', marginTop: 24, lineHeight: 1.6 }}>
 문제가 계속되면 <a href="/inquiry" style={{ color: '#16685D', display: 'inline-flex', alignItems: 'center', minHeight: 44, textDecoration: 'underline' }}>문의하기</a>에서 알려주세요.
 </p>
 </div>
 </div>
 </body>
 </html>
 )
}
