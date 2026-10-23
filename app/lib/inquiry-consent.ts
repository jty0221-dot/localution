// app/lib/inquiry-consent.ts
// 문의 접수(/api/inquiry POST) 개인정보 수집 · 이용 동의 판정 (LU-018)
//   · 화면 체크 상자만으로는 API 직접 호출을 막지 못한다 → 서버도 같은 값을 본다
//   · 정확히 불리언 true 만 동의로 본다 ('true' 문자열 · 1 · 'on' 은 동의 아님)
export function hasPrivacyConsent(value: unknown): boolean {
  return value === true
}
