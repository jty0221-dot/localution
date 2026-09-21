// ═══════════════════════════════════════════════════════════
// JsonLd · 구조화 데이터 한 덩어리를 <script type="application/ld+json"> 로 찍는다.
// 서버 컴포넌트에서 쓴다. '<' 를 < 로 바꿔 스크립트 조기 종료(XSS) 를 막는다.
// ═══════════════════════════════════════════════════════════

type Props = { data: Record<string, unknown>; id?: string }

export default function JsonLd({ data, id }: Props) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c')
  return (
    <script
      type="application/ld+json"
      id={id}
      dangerouslySetInnerHTML={{ __html: json }}
    />
  )
}
