# 로컬루션 디자인 시스템

> **목적** 화면마다 제각각인 카드·간격·아이콘·숫자 표기를 하나로 통일해
> "전문적이고 깔끔한" 인상을 만든다.
> **대상 사용자** 디지털 도구에 익숙하지 않은 소상공인·자영업자
> **작성** 2026-08-19

---

## 0. 왜 지금 이 문서가 필요한가

레포를 실측한 결과 아래 3가지가 "아마추어처럼 보이는" 주된 원인이었다.

| 문제 | 실측 | 조치 |
|---|---|---|
| 그라데이션 아이콘 박스 복붙 | **78곳**에서 각자 다른 크기·라운드·아이콘 굵기 | `IconBadge` 하나로 통일 |
| 이모지 잔존 | **31개 파일** (CLAUDE.md 가 금지하는데도) | lucide 아이콘으로 교체 |
| Next.js 보일러플레이트 | `next.svg` `vercel.svg` `window.svg` `globe.svg` `file.svg` 방치 | 삭제 완료 |

---

## 1. 기본 원칙 5가지

### 1-1. 이모지 대신 아이콘
CLAUDE.md 절대 규칙. 이모지는 OS·브라우저마다 모양이 달라 통제가 안 되고,
크기·정렬이 텍스트에 종속돼 줄이 흔들린다. `lucide-react` 만 쓴다.

참고: 토스는 2026년 TDS 를 공개하면서 3D 이모지 라이브러리를 시그니처로 내세웠지만,
로컬루션은 이모지 금지가 상위 규칙이므로 **같은 인상을 그라데이션 아이콘 박스로 낸다.**

### 1-2. 숫자는 고정폭 (tabular-nums)
지표 숫자에 `tabular-nums` 를 반드시 건다.
없으면 값이 갱신될 때마다 자릿수 폭이 달라져 표·카드가 미세하게 흔들린다.
이 디테일 하나가 "정밀해 보이는지" 를 크게 좌우한다.

### 1-3. 그림자는 `shadow-sm` 하나만
그림자를 여러 단계로 쓰면 층위가 모호해진다.
카드는 전부 `shadow-sm` + `border border-[#E5E8EB]` 조합으로 통일.

### 1-4. 빈 화면을 그냥 두지 않는다
사장님은 "왜 비었는지" 를 모르면 바로 이탈한다.
빈 상태는 항상 3가지를 갖춘다 — 1) 지금 상황 2) 다음 행동 버튼 1개 3) 그러면 뭐가 좋아지는지.
`EmptyState` 컴포넌트가 이 구조를 강제한다.

### 1-5. 숫자에는 출처를 붙인다
순위 화면의 숫자는 출처가 두 가지로 완전히 다르다.

| 배지 | 의미 |
|---|---|
| **확정** | 네이버가 응답에 그대로 실어 보낸 값 (`totalScore`, 리뷰수, 순위) |
| **추정** | 로컬루션이 계산한 해석 점수 (경쟁률 가중합 등) |

구분 없이 보여주면 사장님이 추정치를 사실로 믿고 잘못된 판단을 한다.
`ConfidenceBadge` 를 숫자 옆에 항상 붙인다.

---

## 2. 토큰

### 2-1. 색상 (`app/lib/brand-colors.ts`)

| 용도 | 값 |
|---|---|
| 기본 (블루) | `#3182F6` / 진하게 `#1B64DA` |
| 액센트 (퍼플, AI 기능) | `#8B5CF6` / `#6D28D9` |
| 성공 | `#12B76A` / `#059669` |
| 주의 | `#F59E0B` / `#D97706` |
| 위험 | `#F04452` / `#DC2626` |
| 본문 텍스트 | `#191F28` |
| 보조 텍스트 | `#4E5968` |
| 흐린 텍스트 | `#8B95A1` |
| 경계선 | `#E5E8EB` (진함) / `#F2F4F6` (연함) |
| 배경 | `#F8F9FA` |

### 2-2. 라운드

| 대상 | 클래스 |
|---|---|
| 카드·섹션 | `rounded-2xl` |
| 버튼·입력·아이콘박스(md) | `rounded-xl` |
| 배지·작은 박스 | `rounded-lg` |
| 미니 배지 | `rounded-md` |

### 2-3. 타이포 스케일

**크기와 굵기는 그대로다.** 비어 있던 행간·자간만 채웠다 — 그 둘이 없어서
같은 크기라도 화면마다 다르게 앉고 있었다. 값은 원티드 사다리에서 그 크기에 해당하는 단계를 그대로 가져왔다.

| 역할 | 크기 | 원티드 단계 | 행간 | 자간 | 굵기 | Tailwind |
|---|---|---|---|---|---|---|
| 페이지 제목 | 22px / md:28px | Heading 1 / Title 2 | 30px / 38px | -0.0194em / -0.0236em | `font-black` | `text-heading1 md:text-title2` |
| 카드 제목 | 15px | Body 2 | 22px | +0.0096em | `font-bold` | `text-body2` |
| 대표 숫자 (KPI) | 22px | Heading 1 | 30px | -0.0194em | `font-black` + `tabular-nums` | `text-heading1` |
| 본문 | 13px | Label 2 | 18px | +0.0194em | `font-normal` | `text-label2` |
| 표 셀 | 12px | Caption 1 | 16px | +0.0252em | | `text-caption1` |
| 메타·캡션 | 11px | Caption 2 | 14px | +0.0311em | | `text-caption2` |
| 배지 | 10px | (사다리 밖) | 13px | +0.037em | `font-bold` | `text-[10px]` |

원티드 사다리는 11px(Caption 2)에서 끝난다. **배지 10px 은 우리 것이라 그대로 둔다.**

`text-*` 토큰은 **행간과 자간을 같이 물고 있다.** 그래서 `leading-*` · `tracking-*` 을 따로 붙이지 않는다 — 붙이면 스케일이 깨진다.

**긴 문단은 Reading 행간을 쓴다** — `text-body1-reading`(16/26) · `text-body2-reading`(15/24) · `text-label1-reading`(14/22).
세 줄을 넘어가면 2px 더 벌린다.

**자간은 크기에 반비례한다.** 17px 이 0 이고 그 위는 음수, 아래는 양수다 — 56px 에서 -3.19%, 11px 에서 +3.11% 로 거의 대칭이다.
큰 글자는 조여야 덩어리로 읽히고, 작은 글자는 벌려야 서로 붙지 않는다.

#### 랜딩·마케팅 화면에서 쓰는 상위 단계

대시보드는 22px 위로 올라가지 않는다. 랜딩(`app/page.tsx`)만 이 구간을 쓴다.

| 단계 | 크기 | 행간 | 자간 | Tailwind |
|---|---|---|---|---|
| Display 1 | 56px | 72px | -0.0319em | `text-display1` |
| Display 2 | 40px | 52px | -0.0282em | `text-display2` |
| Title 1 | 36px | 48px | -0.027em | `text-title1` |
| Title 2 | 28px | 38px | -0.0236em | `text-title2` |
| Title 3 | 24px | 32px | -0.023em | `text-title3` |
| Heading 2 | 20px | 28px | -0.012em | `text-heading2` |
| Headline 1 | 18px | 26px | -0.002em | `text-headline1` |
| Headline 2 | 17px | 24px | 0 | `text-headline2` |
| Body 1 | 16px | 24px | +0.0057em | `text-body1` |
| Label 1 | 14px | 20px | +0.0145em | `text-label1` |

**모바일 입력창은 Body 1(16px) 아래로 내리지 않는다** — 16px 미만이면 iOS 가 자동으로 확대한다.

### 2-3-1. 출처와 경계선

- 출처: Claude 디자인 시스템 · 프로젝트 **Wanted Design Library** 의 `tokens/typography.css` · `fonts.css` · `radius.css` · `elevation.css` (2026-08-25 (화) 확인)
- 코드 정본은 `app/lib/typography.ts`, Tailwind 사본은 `tailwind.config.ts` — **한쪽만 고치지 말 것**
- 서체는 **Pretendard JP** (한글·영문·일문이 한 얼굴). `app/globals.css` 첫 줄에서 불러온다
- **가져온 것**: 크기 · 행간 · 자간 · 라운드(`rounded-wd-*`) · 그림자(`shadow-wd-*`) · inset ring(`shadow-wd-ring`)
- **가져오지 않은 것**: 원티드 브랜드 색 `#0066FF` · "그라데이션 금지" 규칙 · 브랜드 서체 Wanted Sans
  로컬루션은 `#3182F6` 이고 **그라데이션 아이콘 박스가 필수**다. Wanted Sans 는 원티드 브랜드 자산이라 우리가 쓸 것이 아니다.
  두 기준을 섞으면 작업 거부 사유다
- 굵기도 우리 것을 지켰다. 원티드 본문 굵기는 Medium(500) 이고 상한이 Bold(700) 이지만,
  로컬루션은 본문 `font-normal` · 제목 `font-black`(900) 을 쓴다. **바꾸지 않았다 — 의도한 차이다**

### 2-4. 라운드 · 그림자 · 경계선 (원티드)

기존 2-2 절의 `rounded-2xl` / `rounded-xl` / `rounded-lg` 는 그대로 쓴다.
아래는 **더 세밀하게 잡아야 할 때** 쓰는 사다리다 — 원티드는 라운드를 하나로 고정하지 않고 크기를 따라 올린다.

| 대상 | 값 | Tailwind |
|---|---|---|
| 체크박스 | 3px | `rounded-wd-xs` |
| 배지 · 작은 칩 | 4px | `rounded-wd-sm` |
| 작은 버튼 · 중간 칩 | 6px | `rounded-wd-md` |
| 중간 버튼 · 큰 칩 | 8px | `rounded-wd-lg` |
| 큰 버튼 · 입력 필드 | 10px | `rounded-wd-xl` |
| 카드 · 시트 · 모달 | 12px | `rounded-wd-2xl` |
| 알약 | 1000px | `rounded-wd-full` |

그림자에는 **색이 없다** — 순수 검정을 낮은 알파로 세 겹 겹친다.
`shadow-wd-normal` · `shadow-wd-light` · `shadow-wd-strong` · `shadow-wd-heavy` · `shadow-wd-knob`.

**경계선은 `border` 가 아니라 inset ring 이다** — `shadow-wd-ring`(16%) · `shadow-wd-ring-soft`(8%) · `shadow-wd-ring-brand`.
`border` 는 박스 크기를 바꾸기 때문에 포커스가 올 때마다 레이아웃이 1px 씩 밀린다. inset 은 안 밀린다.

**회색은 거의 언제나 불투명이 아니다** — `bg-wd-fill`(5%) · `bg-wd-fill-strong`(8%) · `bg-wd-fill-heavy`(16%).
Cool Neutral 50(`#70737C`) 을 깔아 아래 배경이 비치게 한다. 카드 위에 얹어도 색이 죽지 않는다.

---

## 3. 공용 컴포넌트 (`app/components/ui/`)

새 화면을 만들 때 **hex 값을 직접 쓰기 전에 여기 있는지 먼저 확인할 것.**

```tsx
import { IconBadge, StatCard, SectionCard, EmptyState, Delta, ConfidenceBadge } from '@/app/components/ui'
```

| 컴포넌트 | 역할 |
|---|---|
| `IconBadge` | 그라데이션 아이콘 박스. tone 6종 × size 3종 |
| `StatCard` | KPI 카드 (아이콘 + 대표숫자 + 배지 + 캡션) |
| `SectionCard` | 섹션 껍데기 (제목 + 우측 액션 + 본문) |
| `EmptyState` | 빈 상태 3요소 강제 |
| `Delta` | 전일 대비 증감. `invert` 로 순위/일반 지표 구분 |
| `ConfidenceBadge` | 확정 / 추정 |

### 3-1. `Delta` 의 invert 규칙 (중요)

지표마다 "올라가는 게 좋은지" 가 다르다.

| 지표 | invert | 예 |
|---|---|---|
| 순위 | `true` | 3위 → 1위 = 좋음 (숫자 감소) |
| 리뷰수·점수·방문자 | `false` | 100 → 120 = 좋음 (숫자 증가) |

화면마다 따로 판단하면 색이 반대로 나오는 사고가 난다. 반드시 이 컴포넌트를 쓸 것.

---

## 4. 페이지 뼈대

모든 내부 페이지는 동일한 골격을 따른다.

```tsx
<div className="min-h-screen bg-[#F8F9FA]">
  <Sidebar />
  <div className="md:ml-[220px] flex flex-col min-h-screen">
    <PageHeader icon={<Icon size={28} className="text-white" strokeWidth={2.5} />}
                title="..." subtitle="..." variant="sky" />
    {/* 필요하면 sticky 필터바 */}
    <main className="flex-1 px-4 md:px-6 py-5 max-w-6xl mx-auto w-full">
      ...
    </main>
    <Footer />
  </div>
</div>
```

---

## 5. 소상공인 사용성 규칙

디지털 도구에 익숙하지 않은 사장님이 대상이므로 아래를 지킨다.

1. **전문용어 금지** — "인덱싱" 대신 "노출", "CTR" 대신 "클릭률"
2. **숫자 옆에 항상 해석** — `513%` 만 두지 말고 "상위 10개 평균의 5배" 를 붙인다
3. **다음 행동을 문장으로** — "리뷰 요청 QR·문자를 늘려보세요" 처럼 바로 실행 가능하게
4. **실패 메시지에 원인과 조치** — "오류 발생" 금지. "결제 확인이 필요해요" 처럼
5. **모바일 우선** — 사장님은 매장에서 폰으로 본다. `grid-cols-1 lg:grid-cols-2` 기본

---

## 6. 이미지 자산

현재 `public/` 에는 로고·파비콘만 남겨두었다.

향후 일러스트·배너가 필요하면:
- **인물 사진 금지** — 특정 매장·업종을 연상시키면 다른 업종 사장님이 이질감을 느낀다
- 추상 도형·그래프 모티프 위주
- 배경 제거 PNG 또는 SVG, 다크모드 대비 확인
- 파일당 200KB 이하, `next/image` 로만 렌더

---

## 7. 체크리스트 (새 화면 만들 때)

- [ ] 이모지 0개
- [ ] `app/components/ui` 컴포넌트를 먼저 찾아봤는가
- [ ] 지표 숫자에 `tabular-nums` 를 걸었는가
- [ ] 순위 증감에 `Delta invert` 를 맞게 줬는가
- [ ] 확정/추정 숫자에 `ConfidenceBadge` 를 붙였는가
- [ ] 빈 상태에 다음 행동 버튼이 있는가
- [ ] 모바일 1열로 접히는가
- [ ] `npx tsc --noEmit` 에서 해당 파일 에러 0건인가

---

## 8. 앱 포장 · safe-area · 오프라인 (2026-09-21 (월) 추가)

### 8-1. safe-area 유틸 (`app/globals.css`)

노치 · 홈바가 있는 기기(홈 화면 설치 · TWA · 웹뷰)에서 고정 요소가 잘리지 않게 한다. 브라우저 탭에서는 전부 0 이라 화면이 달라지지 않는다.

| 클래스 | 값 | 어디에 |
|---|---|---|
| `pt-safe` | `padding-top: var(--safe-top)` | 상단 고정 바 (TopNav · Sidebar 모바일 바 · Sidebar aside) |
| `pb-safe` | `padding-bottom: var(--safe-bottom)` | 하단 고정 바 (BottomTabBar) · 하단 고정 액션 버튼 |
| `px-safe` | 좌우 | 가로 모드 대비 (필요할 때만) |
| `top-safe` `bottom-safe` | 고정 위치 오프셋 | 토스트 · 플로팅 버튼 |
| `h-screen-safe` | `100vh - top - bottom` (`100dvh` 지원 시 dvh) | 전체 화면 모달 |

- `body { padding-top: var(--safe-top) }` 가 걸려 있다. 고정 상단 바가 `pt-safe` 로 커진 만큼 본문이 같이 내려가므로 **페이지의 `pt-16` · `pt-14` 오프셋은 그대로 둔다.**
- 인라인 `style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}` 를 새로 쓰지 않는다. 유틸 클래스로 통일.
- `@media (display-mode: standalone)` 에서 당겨서 새로고침(`overscroll-behavior-y: none`)과 길게 눌러 링크 미리보기(`-webkit-touch-callout: none`)를 끈다.

### 8-2. 서비스 워커 캐시 전략 (`public/sw.js` v1.3.0)

| 요청 | 전략 | 오프라인일 때 |
|---|---|---|
| 다른 출처 (Supabase · CDN) · GET 아님 | SW 가 손대지 않음 | 브라우저 기본 |
| `/api/*` `/auth/*` `/_next/data/*` | 네트워크만 | 503 JSON `{ ok:false, error:'offline' }` |
| `/_next/static/*` · 이미지 · 폰트 · 영상 | 캐시 우선 | 캐시본 |
| 보호 경로 HTML (`middleware.ts` 목록 + `/qr /auth /login /logout`) | 네트워크만 · **캐시 저장 없음** | `/offline.html` |
| 공개 화면 HTML | 네트워크 우선 · `response.type === 'basic'` 만 저장 | 캐시본 → `/offline.html` |

- 보호 경로를 캐시하지 않는 이유 : 공용 기기에서 로그아웃 뒤에도 남의 대시보드가 캐시에서 열리는 것을 막는다.
- 버전 올릴 때 `CACHE_VERSION` 만 바꾼다. `activate` 가 `localution-` 접두 옛 캐시를 지운다.
- `ServiceWorkerRegistrar` 가 새 버전을 발견하면 `SKIP_WAITING` 메시지를 보내 즉시 교체한다.
- API 호출 코드는 503 + `error:'offline'` 을 받으면 **"인터넷 연결이 없어요" 카드 + 재시도 버튼**을 그린다. 상태 코드를 화면에 적지 않는다.

### 8-3. 토스트는 객체다 (`app/lib/toast.ts`)

```tsx
toast.success('저장했어요')
toast.error('저장에 실패했어요. 잠시 뒤 다시 시도해 주세요')
```

`toast('...')` 처럼 함수로 부르면 아무것도 뜨지 않고 콘솔 오류만 남는다 (09/21 `settings` 알림 탭에서 실제 발생 · 수정됨). 새 화면에서 저장 결과를 알릴 때는 반드시 메서드로 부른다.

### 8-4. SEO · GEO 게이트

```bash
npm run check:geo
```

`scripts/geo-check.mjs` 가 S1~S6(사실 모듈 단일화 · 공개 메타 전수 · JSON-LD · 답변 블록 · robots/sitemap · 비공개 noindex)과 라이브 L1/L2 를 본다. 종료 코드 0 이 통과다. 공개 화면을 추가하면 `app/lib/seo.ts` 의 `PUBLIC_ROUTES` 에 먼저 넣고 게이트를 돌린다. 화면 계획 전체는 `DESIGN_PLAN.md`.

### 8-5. 하위 화면 헤더

`/review-admin/*/autoreply` 처럼 상위 화면 아래 붙는 화면은 PageHeader 배너를 또 그리지 않는다. **되돌아가기 링크 + 그라데이션 아이콘 박스 + h1** 의 간결 헤더를 쓴다 (네이버 자동답글 화면이 기준).

---

## 9. 체크리스트 추가 항목 (2026-09-21)

- [ ] 고정 요소(상단 · 하단 · 토스트)에 `pt-safe / pb-safe / top-safe / bottom-safe` 를 걸었는가
- [ ] 한글 문구에 긴 대시(—)가 없는가
- [ ] 저장 결과를 `toast.success / toast.error` 로 알리는가
- [ ] 공개 화면이면 `PUBLIC_ROUTES` 에 넣고 `npm run check:geo` 를 통과했는가
- [ ] 로그인 화면이면 `middleware.ts` 보호 경로와 `sw.js` PRIVATE_PREFIXES 둘 다에 있는가

최종 갱신: 2026-09-21 (월)
