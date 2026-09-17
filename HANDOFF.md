# 인수인계 — 로컬루션 랜딩·순위 기능 작업

> **작성** 2026-08-22
> **왜 인수인계가 필요한가** 이 작업을 하던 세션이 `jty0221-del/localution` 에만
> 인증되어 있어, 계정 이전 후인 `jty0221-dot/localution` 으로 푸시가 불가능하다.
> GitHub 권한 문제가 아니라 **세션의 인증 저장소 목록 제약**이라 우회할 수 없다.
>
> ```
> remote: access denied by the git proxy:
>         jty0221-dot/localution is not in this session's authorized repository set,
>         so the proxy will not inject a credential for it.
> ```

---

## 0. 새 세션에서 가장 먼저 할 일

1. **`jty0221-dot/localution` 을 소스로 새 세션을 연다** (이게 핵심 — 세션 도중 저장소 주인 변경은 불가)
2. 아래 "1. 미푸시 작업 회수" 절차대로 커밋 3개를 가져온다
3. 푸시 → PR → 병합
4. "4. 다음 작업" 으로 이어간다

---

## 1. 미푸시 작업 회수

### 대상 브랜치
`claude/marketing-strategy-branding-aOpEj`

### 원격에 이미 올라가 있는 지점
```
4456f0f  refactor(ui): UI 이모지·비허용 기호를 lucide 아이콘으로 교체 (20개 파일)
```
여기까지는 `jty0221-dot/localution` 원격에도 존재한다. **그 위에 커밋 3개만 얹으면 된다.**

### 회수해야 할 커밋 3개 (오래된 순)
| 커밋 | 내용 |
|---|---|
| `0802b6b` | fix(landing): 자동 증가 통계 제거 + 제품 미리보기 추가 |
| `41cd68d` | feat(landing): 히어로 배경 영상 + 원티드식 타이포·여백 정리 |
| `de466cb` | feat(place-rank): 키워드 경쟁력 분석 조회 API |

### 변경 파일 (총 4개, +423 / -37)
```
app/page.tsx                                (수정)
app/components/landing/ProductPreview.tsx   (신규)
app/components/landing/HeroVideo.tsx        (신규)
app/api/place/keyword-competition/route.ts  (신규)
```

### 방법 A — git 번들 (권장, 커밋 이력까지 그대로)
이전 세션 채팅에 `localution-landing-work.bundle` 이 첨부되어 있다.
```bash
git checkout claude/marketing-strategy-branding-aOpEj
git fetch /받은경로/localution-landing-work.bundle
git merge FETCH_HEAD
git push origin claude/marketing-strategy-branding-aOpEj
```
번들은 `4456f0f` 를 기준으로 만들어졌으므로 그 커밋이 있는 상태에서 적용해야 한다.

> 주의: 이 번들에는 `de466cb`(경쟁력 API)가 **빠져 있다.** 번들을 만든 뒤에 커밋했다.
> 그 파일은 방법 B 로 따로 넣거나, 새 세션에서 이 문서의 "3-3" 을 보고 다시 만들면 된다.

### 방법 B — 파일 직접 배치 (간단)
이전 세션 채팅에 첨부된 `.tsx` 파일 2개를 그대로 저장하고,
`app/page.tsx` 수정은 아래 "3-1" 을 보고 다시 적용한다.

---

## 2. 이 브랜치에 이미 반영되어 있는 것 (원격에 있음)

계정 이전 전에 병합·푸시가 끝난 작업들. 참고용.

| 범위 | 내용 |
|---|---|
| P0 | 플레이스 키워드 순위 추적 파이프라인 (DB 2테이블 · 측정 라이브러리 · API 3종 · 일일 크론) |
| P1 | 플레이스 모니터링 카드 그리드 — `keyword-rank` 페이지 목업 → 실데이터 전환 |
| 디자인 | 공용 UI 키트 6종 (`app/components/ui/`) + `DESIGN_SYSTEM.md` |
| 정리 | UI 이모지·비허용 기호 20개 파일 → lucide 아이콘 |
| P2 (1/2) | 경쟁 매장 수집 + 네이버 `totalScore` 반영 (데이터 계층) |

---

## 3. 미푸시 커밋 3개 상세

### 3-1. `0802b6b` — 자동 증가 통계 제거 + 제품 미리보기

**문제 1: 사용자 수를 매일 자동으로 부풀리고 있었다**

`app/page.tsx` 의 기존 구현:
```js
const LAUNCH_DATE = new Date('2026-01-01').getTime()
const BASE_OWNERS = 412
function computeStats() {
  const days = (Date.now() - LAUNCH_DATE) / 86400000
  const owners = BASE_OWNERS + Math.floor(days * 1.4) + (days % 7)   // 매일 증가
  const replies = 52340 + days * 180 + ...
}
```
`예시 · 실제 데이터 연동 예정` 배지가 달려 있긴 했으나, 방문할 때마다 숫자가
커지는 것은 실제 성장을 흉내 내는 연출이라 배지가 있어도 오해를 만든다.
표시광고법상 거짓·과장 표시 소지도 있다.

**수정** — 자동 증가를 제거하고 검증 가능한 제품 사양으로 교체:
```js
function computeStats() {
  return [
    { num: '6곳',    label: '연결 가능 플랫폼' },
    { num: '4종',    label: 'AI 답글 말투' },
    { num: '24시간', label: '자동 수집 주기' },
    { num: '3분',    label: '매장 연결 소요' },
  ]
}
```
마운트 시 재계산하던 `useEffect` 도 제거했다 (날짜 의존이 사라졌으므로).
`/api/landing-stats` 가 실제 값을 반환하면 그대로 교체되는 구조는 유지.

**문제 2: 랜딩에 이미지가 단 한 장도 없었다**

`<img>` 0개, `next/image` 0개. 전부 추상 카드·애니메이션이라
사장님이 "이 제품이 실제로 어떻게 생겼는지" 볼 수 없었다.
SaaS 랜딩에서 전환을 가장 크게 깎는 요인.

**수정** — `app/components/landing/ProductPreview.tsx` 신설, 히어로 CTA 아래 배치.
브라우저 크롬 + 플레이스 모니터링 화면(매장 카드 · 키워드 칩 · 7일 순위 표).

스크린샷 이미지가 아니라 **HTML 목업**으로 만든 이유:
1. 실제 UI 가 바뀌어도 캡처를 다시 뜰 필요 없음
2. 레티나에서 뭉개지지 않음
3. 수백 KB 이미지 대신 마크업 몇 KB
4. 스크린리더가 읽고 텍스트 확대에 대응 (`figcaption sr-only`)

### 3-2. `41cd68d` — 히어로 배경 영상 + 타이포·여백

**원티드 디자인 언어 적용** (넉넉한 여백 · 큰 타이포 · 장식 최소화)
- 히어로 상하 여백 확대 `pt-24 → pt-28`, `md:pt-32 → md:pt-36`
- h1 `md 48px → 64px`, `leading-[1.1]`, `tracking-[-0.02em]`
- 본문–CTA 간격 `mb-8 → mb-10`
- 배경 장식 교체: dot-grid 패턴 + 블러 원 2개 → 은은한 광원 1개
  (점 패턴이 시각적 소음이라 타이포에 집중이 안 됐음)

> 원티드·하랑마케팅·청설모 사이트는 모두 egress 프록시에 막혀 접근하지 못했다.
> 디자인 **원칙만** 적용했고, 실제 반영을 원하면 스크린샷이 필요하다.

**`app/components/landing/HeroVideo.tsx` 신설**

배경 영상은 '분위기' 용도이므로 **없어도 페이지가 성립하도록** 설계:
1. 파일이 없거나 로드 실패 시 아무것도 렌더하지 않고 조용히 사라짐
2. `muted` + `playsInline` — 없으면 iOS/모바일에서 자동재생 자체가 차단됨
3. `prefers-reduced-motion` 존중 — OS '동작 줄이기' 켜면 재생 안 함 (접근성)
4. 모바일에서는 로드하지 않음 — 사장님은 매장에서 LTE 로 본다
5. `navigator.connection.saveData` 감지 — 데이터 절약 모드면 재생 안 함
6. 영상 위에 흰색 그라데이션을 덮어 텍스트 가독성 확보

**영상 파일 배치 필요** — 아래 "5. 남은 수동 작업" 참조.

### 3-3. `de466cb` — 키워드 경쟁력 분석 API

`app/api/place/keyword-competition/route.ts` 신설.
```
GET /api/place/keyword-competition?keyword_target_id={uuid}
```

최신 수집 배치의 경쟁 매장 목록(`place_keyword_competitors_latest` 뷰)을 읽어
`app/lib/place-competition.ts` 의 `computeCompetition()` 으로 지표를 계산해 반환한다.
수집 시점(크론)과 조회 시점(이 API)이 **같은 함수**를 쓰므로 값이 어긋나지 않는다.

응답 지표마다 `confidence` 가 붙는다:

| confidence | 의미 | 해당 지표 |
|---|---|---|
| `measured` (확정) | 네이버가 준 값으로만 계산 | 영수증 리뷰 경쟁률 · 블로그 콘텐츠 경쟁률 · 검색 깊이 위치 |
| `estimated` (추정) | 우리 해석이 섞인 점수 | 저장·리뷰 전환 신호 · 카테고리 연관 · 키워드 유불리 |

종합 지표는 `naver_score`(totalScore) 유무에 따라 자동 전환된다.
있으면 `네이버 노출 점수(확정)`, 없으면 `종합 경쟁력(추정)`.

수집 기록이 없으면 `collected: false` 로 응답해 화면이 빈 상태를 구분할 수 있게 했다.

---

## 4. 다음 작업 — P2 UI (미완성)

데이터 계층과 API 는 끝났고 **화면만 없다.**

### 4-1. 경쟁력 진단 카드
`/api/place/keyword-competition` 을 호출해 지표 7개를 카드로 렌더.
각 숫자 옆에 `ConfidenceBadge`(확정/추정)를 반드시 붙일 것 —
구분 없이 보여주면 사장님이 추정치를 사실로 믿고 잘못 판단한다.

사용할 공용 컴포넌트: `app/components/ui/ConfidenceBadge.tsx` (이미 있음)

각 지표에는 `description`(무엇인지)과 `action`(지금 할 행동)이 이미 계산되어 온다.
그대로 카드 하단에 뿌리면 된다.

### 4-2. 날짜 가로축 매트릭스 표
AdRank 스타일. 세로축 = 지표(순위/지수/블로그/방문자), 가로축 = 날짜.
`GET /api/place/keyword-history?target_id={uuid}&days=14` 로 데이터를 받는다.

현재 `keyword-rank` 페이지는 **날짜가 세로축**인 카드형이다.
탭으로 `카드 / 표` 를 전환하는 형태가 자연스럽다.

### 4-3. 이후 Phase
`PLACE_RANK_UPGRADE_PLAN.md` 에 P0~P7 전체 로드맵이 있다.
P3(진단 리뉴얼) · P4(경쟁 매장 정렬표) · P5(통합검색) · P6(파워링크) · P7(요금제).

---

## 5. 남은 수동 작업

### 5-1. Supabase 마이그레이션 (미실행)
```
supabase/migrations/2026_08_19_place_competitors.sql
```
**아직 실행되지 않았다.** Supabase Dashboard → SQL Editor 에서
파일 경로가 아니라 **파일 안의 SQL 본문**을 복사해 붙여넣고 Run.

이걸 실행해야 경쟁 매장 수집과 `/api/place/keyword-competition` 이 동작한다.

> 참고: `2026_08_04_place_keyword_ranks.sql`(P0)은 이미 실행 완료.

### 5-2. 히어로 영상 파일 배치
Higgsfield(seedance_2_5)로 5초 16:9 추상 브랜드 루프 2안을 생성했으나,
CloudFront 가 egress 프록시에 막혀 레포로 내려받지 못했다.

이전 세션 채팅의 Higgsfield 위젯에서 받아 아래 경로에 배치:
```
public/video/hero-loop.mp4
public/video/hero-poster.jpg   (선택 — 없어도 동작)
```
없는 동안에도 `HeroVideo` 가 스스로 숨으므로 배포에 지장 없다.

생성 프롬프트(재생성 필요 시):
> Minimal abstract 3D data visualization for a clean SaaS product website.
> Soft white and very light blue-gray background. Smooth rounded translucent
> glass bar-chart columns rising gently upward, calm cobalt blue (#3182F6)
> gradient. Floating rounded cards, shallow depth of field, airy negative space,
> premium corporate minimalism. Extremely slow calm camera drift, seamless loop.
> No text, no logos, no people, no shop interiors.

특정 업종·인물이 드러나지 않게 추상으로 갔다 —
꽃집·카페·미용실 어느 사장님이 봐도 이질감이 없어야 하므로.

### 5-3. P0 파이프라인 실전 검증 (아직 안 함)
배포 후 `/marketing/keyword-rank` 에서 키워드를 등록하고
**새로고침 버튼을 눌러 순위가 실제로 측정되는지** 확인해야 한다.

`POST /api/place/keyword-rank` 응답의 `method` 값이 파이프라인 건강도를 보여준다:

| method | 의미 | 조치 |
|---|---|---|
| `map_api` | 정상 — 깊은 순위까지 측정 | 없음 |
| `mobile_list` | map 막힘, HTML 파싱으로 대체 | 관찰 |
| `local_openapi` | **상위 5위까지만 측정 가능** | 개선 필요 |
| `none` | Vercel IP 가 네이버에 차단됨 | **worker(IPRoyal 프록시)로 이관 필요** |

`none` 이 지속되면 순위 수집을 Vercel 이 아니라 worker 로 옮겨야 한다.
worker 는 이미 IPRoyal 한국 주거용 프록시를 쓰고 있어 우회 가능.

---

## 6. 반드시 지켜야 할 규칙

`CLAUDE.md` 와 `DESIGN_SYSTEM.md` 를 먼저 읽을 것. 특히:

- **이모지 절대 금지** — UI · 코드 · 문서 · 채팅 답변 전부. `lucide-react` 만.
  기호는 `·` `→` `1)` `2)` 만 허용 (`✓` `★` `✕` 도 금지)
- 지표 숫자에 `tabular-nums` 필수 — 없으면 값 갱신 때마다 표가 흔들린다
- 순위 증감은 `Delta` 컴포넌트에 `invert` 를 줄 것
  (순위는 숫자가 줄어야 좋고, 리뷰수는 늘어야 좋다. 화면마다 따로 판단하면 색이 반대로 나온다)
- 새 화면은 `app/components/ui/` 를 먼저 확인 — hex 직접 쓰기 전에
- `app/dashboard/page.tsx` 수정 시 `CommunityWidget` 덮어쓰지 말 것 (CLAUDE.md 명시)

---

## 7. 운영 인프라 (결제 끊기면 전부 멈춤)

2026-07-31 에 세 개가 동시에 끊겨 답글 시스템 전체가 멈춘 적이 있다.

| 서비스 | 용도 | 끊기면 |
|---|---|---|
| Anthropic API | AI 답글 생성 | `HTTP 400 credit balance too low` |
| Railway | 워커 서버 (Playwright) | 답글 등록 큐 정체 |
| IPRoyal | 한국 주거용 프록시 | 네이버 접근 차단 (`HTTP 402`) |

**전부 자동 충전(auto top-up)을 켜둘 것.**
IPRoyal 은 "잔액 충전"과 "트래픽 구매"가 별개다 — 크레딧만 넣고 GB 를
안 사면 `Remaining Traffic 0GB` 상태가 되어 작동하지 않는다.

---

## 8. 접근 불가로 못 한 것

이 환경의 egress 프록시가 아래를 전부 차단해 반영하지 못했다.
새 세션에서도 동일할 가능성이 높으니, 필요하면 **스크린샷**으로 전달할 것.

- `harangmarketing.com` (하랑마케팅)
- `cheongsulmo.com` (청설모)
- `wanted.co.kr`, `montage.wanted.co.kr` (원티드 디자인 시스템)
- `naver.com` 계열 (순위 API 실측 검증 불가)
- CloudFront (Higgsfield 결과물 다운로드 불가)
