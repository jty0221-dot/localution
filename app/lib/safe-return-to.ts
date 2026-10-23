// app/lib/safe-return-to.ts
// ============================================================
// 오픈 리다이렉트 방지 공용 함수 (LU-018 · SEC-L13)
//   · 제어문자(탭 · 줄바꿈 등)를 먼저 지운다 — URL 파서는 이것들을 조용히 버려서
//     '/\t/evil.com' 이 '//evil.com'(외부)로 풀린다.
//   · 그 다음 '/' 로 시작 · '//' 아님 · 백슬래시 없음 · new URL(v, origin).origin === origin 일 때만 허용.
//   · 허용되면 같은 출처의 경로+쿼리+해시를, 아니면 fallback 을 돌려준다.
//   · SEC-L23: 정규화가 끝난 최종 경로가 '//' · '/' 로 시작하거나(퍼센트 인코딩 풀어도) 출처가 바뀌면 fallback.
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
    // SEC-L23: 경로 정규화('..' · '.' 제거) 뒤에 '//evil.com' 이 될 수 있다 → 최종 값으로 다시 검사
    let decodedPath: string
    try { decodedPath = decodeURIComponent(u.pathname).replace(CONTROL_CHARS, '') } catch { return fallback }
    if (u.pathname.startsWith('//') || decodedPath.includes('//') ||decodedPath.includes('\\')) return fallback
    const out = u.pathname + u.search + u.hash
    if (!out.startsWith('/') || out.startsWith('//') || out.startsWith('/\\')) return fallback
    if (new URL(out, base).origin !== base.origin) return fallback
    return out
  } catch {
    return fallback
  }
}
