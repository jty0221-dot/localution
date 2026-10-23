// app/lib/safe-return-to.ts
// ============================================================
// 오픈 리다이렉트 방지 공용 함수 (LU-018 · SEC-L13)
//   · 제어문자(탭 · 줄바꿈 등)를 먼저 지운다 — URL 파서는 이것들을 조용히 버려서
//     '/\t/evil.com' 이 '//evil.com'(외부)로 풀린다.
//   · 그 다음 '/' 로 시작 · '//' 아님 · 백슬래시 없음 · new URL(v, origin).origin === origin 일 때만 허용.
//   · 허용되면 같은 출처의 경로+쿼리+해시를, 아니면 fallback 을 돌려준다.
//   · 외부 import 없음 → 서버 라우트 · 클라이언트 화면 · node 테스트 어디서나 쓴다.
// ============================================================

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g

export function safeReturnTo(raw: string | null | undefined, origin: string, fallback: string): string {
  const v = String(raw ?? '').replace(CONTROL_CHARS, '').trim()
  if (!v.startsWith('/') || v.startsWith('//') || v.includes('\\')) return fallback
  try {
    const base = new URL(origin)
    const u = new URL(v, base)
    if (u.origin !== base.origin) return fallback
    return u.pathname + u.search + u.hash
  } catch {
    return fallback
  }
}
