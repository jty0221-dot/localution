# 로컬루션 화면 설계 계획 (DESIGN_PLAN)

> 작성 2026-09-21 (월) · 소유 태형(로컬루션 총괄) · 배포·커밋은 C 결재
> 이 문서는 **다른 도구(GPT · 다른 Claude · 새 세션)로 그대로 옮겨도 혼자 읽히도록** 썼다.
> 코드 안 상수나 다른 문서를 못 열어도 판단할 수 있게 숫자와 규칙을 본문에 적었다.
> 함께 옮길 파일은 맨 끝 13절에 있다.

---

## 0. 한 줄 요약

로컬루션은 88개 화면(공개 26 · 로그인 앱 50 · 어드민 12)을 가진 Next.js 14 앱이다.
디자인 토큰과 공용 컴포넌트는 이미 있다(`DESIGN_SYSTEM.md`). 부족한 것은 **화면마다 어느 템플릿을 쓰고, 어떤 상태(로딩 · 빈 · 오류 · 오프라인)를 어떻게 보이며, 검색·AI 검색·앱 포장에서 무엇이 필요한지**를 한 곳에 적어 둔 계획이다. 이 문서가 그것이다.

만드는 순서는 셋이다 : **1) 템플릿 5종에 화면을 배정한다 → 2) 상태 규칙을 전 화면에 같은 방식으로 건다 → 3) 검증 게이트를 통과한 것만 결재에 올린다.**

---

## 1. 현재 상태 진단 (2026-09-21 실측)

| 항목 | 값 | 판정 |
|---|---|---|
| 화면 수 | `app/**/page.tsx` 88개 | 공개 26 · 앱 50 · 어드민 12 |
| 프레임워크 | Next.js 14.0.0 · React 18 · App Router · Tailwind | `next.config.js` 가 tsc · lint 오류를 빌드에서 무시한다 (`ignoreBuildErrors`) |
| 보호 경로 | `middleware.ts` : `/dashboard /admin /admin-biz /customers /crm /review-admin /reviews /qr-admin /settings /settlement /my /reservations /partner-points` | 응답 헤더 `X-Robots-Tag: noindex` 가 같이 나간다 |
| 디자인 토큰 | `app/lib/brand-colors.ts` · `app/lib/typography.ts` · `tailwind.config.ts` | 있음 · 정본 `DESIGN_SYSTEM.md` |
| 공용 컴포넌트 | `app/components/ui/` : IconBadge · StatCard · SectionCard · EmptyState · Delta · ConfidenceBadge | 있음 · 쓰는 화면이 적다 |
| 화면 뼈대 | `PageHeader` · `Sidebar`(220px) · `TopNav` · `BottomTabBar` · `Footer` | 있음 · 리뷰 관리 6개 플랫폼은 `PlatformReviewAdmin` 이 PageHeader 를 대신 그린다 |
| SEO · GEO 사실 | `app/lib/seo.ts` : SITE · PUBLIC_ROUTES 26 · PRIVATE_PATHS · pageMetadata · JSON-LD 빌더 | 있음 · `AnswerBlock` 은 4화면(about · pricing · service-intro · marketing/place) |
| SEO 게이트 | `scripts/geo-check.mjs` → `npm run check:geo` | 통과 (09/21) |
| PWA | `app/manifest.ts` · `public/sw.js` v1.3.0 · `public/offline.html` · `ServiceWorkerRegistrar` | 홈 화면 설치 가능 · 오프라인 안내 · 푸시 |
| safe-area | `app/globals.css` 유틸 `pt-safe pb-safe px-safe top-safe bottom-safe h-screen-safe` | TopNav · Sidebar · BottomTabBar 에 연결 (09/21) |
| 타입 검사 | `npx tsc --noEmit` 27건 | 전부 타입 표기 문제 · 런타임 버그 아님 · 빌드는 무시한다 |
| 작업 트리 | 더티 파일 약 650개 (이 세션 이전부터) | **통째로 커밋 금지** · 내 파일만 골라 올린다 |

### 1-1. 디자인 기준이 정반대인 이웃 저장소

| | 로컬루션 (이 저장소) | 하랑 홈페이지 `E:\하랑\harang` |
|---|---|---|
| 담당 | 태형 | 민수 |
| 주색 | 토스 스타일 `#3182F6` | WDS `#0066FF` |
| 아이콘 박스 | **그라데이션 박스 필수** (`bg-gradient-to-br from-X to-Y`) | **그라데이션 금지** |
| 바탕 | `#F8F9FA` | WDS 토큰 |

하랑 홈페이지의 **방법**(사실 모듈 한 곳 · 답변 블록 · 검사 스크립트 · 보고서 발행 절차)은 가져오고, **시각 규칙은 가져오지 않는다.** 코드를 열기 전에 저장소부터 확인한다.

---

## 2. 이번 세션에 고친 것 (2026-09-21 · 기록)

전부 미커밋 상태다. 커밋 · 배포는 태형이 C 결재로 올린다. 내 파일만 `git add` 한다.

### 2-1. 런타임 버그 (동작이 달라지는 수정)

| 파일 | 무엇이 잘못됐나 | 어떻게 고쳤나 |
|---|---|---|
| `app/api/baemin/diagnose/route.ts` | `findFirstArray` 가 `{path, array}` 를 돌려주는데 `arr.length` 를 봐서 미리보기가 한 번도 안 채워졌다 | `arr.array.length` |
| `app/api/place/reviews/route.ts` | 미답글 수 계산이 `reply_status` 를 select 하지 않고 비교했다 | select 에 `reply_status` 추가 |
| `app/api/qr-review-generate/route.ts` | `receiptInfo.items` 키 중복 | 앞 항목 제거 |
| `app/components/CoupangReviewBookmarkletDialog.tsx` | `const hint = j?.hint ? ... hint.topKeys` 자기 참조(TDZ) → hint 가 있으면 ReferenceError | `j.hint.topKeys` |
| `app/api/internal/notify-new-reviews/route.ts` | 알림 행에 `user_id` · `platform_store_id` 가 빠져 있었다 | select · map 에 추가 |
| `app/api/stores/register/route.ts` | 스프레드 객체에서 `description` 삭제가 타입상 불가 | `Record<string, any>` |
| `app/settings/page.tsx` NotifyTab | `toast(...)` 를 함수처럼 호출 (toast 는 객체) → 저장 실패 안내가 안 떴다 | `toast.error / toast.success` |
| `app/lib/naver-place.ts` | 리뷰 수집기 페이지네이션 (첫 페이지만 가져오던 문제) | 커서 순환 |

### 2-2. 디자인 · 문구

- 화면 문자열의 이모지 전수 제거 → lucide 아이콘 (`fix_emoji.py` · `fix_sparkle.py` 로 일괄)
- `app/review-admin/naver/autoreply/page.tsx` 디자인 정리 (PageHeader · 카드 · 상태)
- `app/globals.css` 주석의 이모지 제거
- 답글 엔진 : `app/lib/reply-variety.ts` 신설 · 말투 `auto`(리뷰 내용에 맞춰 4종 순환) · 대표 키워드 · 지역 키워드 · 사진 매핑 (`app/api/ai-review-reply` · `app/api/cron/naver-reply-generate`)

### 2-3. SEO · GEO · AEO

- `package.json` 에 `"check:geo": "node scripts/geo-check.mjs"` 추가 → `npm run check:geo`
- 통과 기준 S1~S6 (사실 모듈 단일화 · 공개 라우트 메타 · JSON-LD · 답변 블록 · robots/sitemap · 비공개 noindex) + 라이브 L1/L2

### 2-4. 앱 포장 (PWA)

- `public/sw.js` 재작성 v1.3.0 : 같은 출처 GET 만 다룸 · `/api /auth /_next/data` 는 네트워크만 · 정적 자산 캐시 우선 · **보호 경로 HTML 은 캐시하지 않음**(공용 기기에서 남의 화면이 남던 문제) · 공개 화면 네트워크 우선 · `SKIP_WAITING` 메시지 처리
- `app/globals.css` : safe-area 유틸 6종 · standalone 에서 당겨서 새로고침 끔 · `body { padding-top: var(--safe-top) }`
- `app/components/TopNav.tsx` `pt-safe` · `Sidebar.tsx` 모바일 바 `pt-safe` + aside `pt-safe` · `BottomTabBar.tsx` 인라인 style → `pb-safe`

---

## 3. 설계 원칙 (이 문서만 읽어도 지킬 수 있게)

1. **이모지 0개.** 화면 · 코드 · 문서 · 답변 전부. 아이콘은 `lucide-react`, 상자는 `w-9 h-9 rounded-xl bg-gradient-to-br from-X to-Y shadow-sm` 안에 `size={16} className="text-white" strokeWidth={2.5}`.
2. **색 5개만.** 파랑 `#3182F6` · 보라 `#7C3AED` · 초록 `#059669` · 앰버 `#F59E0B` · 빨강 `#DC2626`. 글자 `#191F28` · 보조 `#8B95A1` · 선 `#E5E8EB` · 바탕 `#F8F9FA`. 플랫폼 색은 그 플랫폼 화면에서만 (네이버 `#03C75A` · 구글 `#4285F4` · 카카오 `#FEE500` · 배민 `#2AC1BC` · 요기요 `#E5007F` · 쿠팡이츠 `#FF4B30`).
3. **라운드 3단.** 카드 `rounded-2xl` · 버튼 · 입력 `rounded-xl` · 작은 상자 `rounded-lg`. 그림자는 `shadow-sm` 하나.
4. **폭 상한.** 앱 본문 `max-w-6xl`(1152px) · 단일 카드 `max-w-4xl`(896px) · 공개 랜딩 섹션 `max-w-6xl`. `max-w-7xl` 은 쓰지 않는다. PC 오른쪽 여백은 정상이다.
5. **반응형 4단 점검.** 375 → 768 → 1280 → 1920. 가로 스크롤 금지 · 터치 44px · 입력 글자 16px 이상(iOS 줌 방지).
6. **한글 문구에 긴 대시(—) 금지.** 마침표나 가운뎃점으로 끊는다. 굵게는 별표가 아니라 `font-semibold`.
7. **숫자는 고정폭(`tabular-nums`)이고 출처가 붙는다.** 추정치에는 `ConfidenceBadge`. 순위처럼 낮을수록 좋은 지표는 `Delta invert`.
8. **빈 화면을 그냥 두지 않는다.** `EmptyState` 에 다음 행동 버튼 하나.
9. **사실은 한 곳.** 회사 · 서비스 · 요금 · 연락처 문구는 `app/lib/seo.ts` 의 SITE 에서 온다. 화면에 숫자를 직접 적지 않는다.
10. **비밀값은 이름까지만.** 값은 대표가 넣는다. 사용자 데이터는 합계로만 말한다.

---

## 4. 정보 구조 (IA)

```
공개 (TopNav + Footer · 검색 노출)
 /                 랜딩
 /service-intro    서비스 소개        /pricing   요금      /about   회사
 /help             도움말             /updates   업데이트   /community 커뮤니티
 /inquiry          문의               /login /signup        /terms /privacy /legal/platform-consent
 /marketing/*      기능 소개 겸 도구 (공개 메타 · 도구는 로그인 뒤)

앱 (Sidebar 220px + 모바일 BottomTabBar 5탭 · noindex)
 홈      /dashboard
 리뷰    /review-admin/{naver google kakao baemin yogiyo coupang}  + /autoreply · /history · /stats · /templates · /keywords
 마케팅  /marketing/{place keyword-rank keyword-score blog-post blog-tracking naver-ads
                     instagram-feed reels card-news events threads youtube-community}
 고객    /customers · /crm · /reservations · /qr-admin · /partner-points
 설정    /settings · /settings/profile · /settings/connect · /my · /my/platforms · /my/subscription · /my/stamps

고객이 여는 화면 (로그인 없음 · TopNav 없음 · 가벼움)
 /review/[storeId]  QR 리뷰 작성      /menu/[slug] 메뉴판      /stamp/[slug] 스탬프      /qr

어드민 (Sidebar + 어드민 전용 · noindex)
 /admin/{dashboard users subscriptions inquiries updates review-health naver-check
         coupang coupang-diagnostics platform-issues queue-control reply-quality reseller fix-store-id threads-testers}
 /admin-biz
```

### 4-1. 내비게이션 규칙

- 데스크톱 앱 : `Sidebar` 고정 220px, 본문 `md:ml-[220px]`. 사이드바 그룹은 **홈 · 리뷰(플랫폼 6) · 마케팅(네이버 · 인스타 · 스레드 · 유튜브 · 준비중) · 운영(QR · 고객 · 예약 · 매장) · 안내(업데이트 · 도움말)**.
- 모바일 앱 : 상단 56px 바(로고 · 햄버거) + 하단 5탭(홈 · 리뷰 · 마케팅 · 고객 · 설정). 본문 `pt-14 pb-20`.
- 공개 : `TopNav` 64px 고정 + `Footer`. 본문 `pt-16`.
- **같은 화면에 TopNav 와 Sidebar 를 같이 두지 않는다.** 로그인 여부로 갈린다.
- safe-area : 고정 바는 `pt-safe / pb-safe`, 본문 오프셋은 `body` 가 받는다. 새 고정 요소(토스트 · 플로팅 버튼)도 같은 유틸을 쓴다.

---

## 5. 화면 템플릿 5종

모든 화면은 아래 다섯 중 하나다. 새 화면을 만들 때 먼저 번호를 고른다.

### T1. 랜딩형 (`/` · `/service-intro` · `/pricing` · `/about`)

```
TopNav
히어로 (h1 · 부제 · CTA 2개 · 우측 시각물) · max-w-6xl · py-16 md:py-24
증거 띠 (숫자 3~4개 · StatCard · 출처)
문제 → 해결 (Before/After 2열)
기능 6카드 (grid-cols-1 sm:grid-cols-2 lg:grid-cols-3)
답변 블록 AnswerBlock (질문 1 · 답 3~5문장 · GEO/AEO 용)
FAQ (HOME_FAQS 와 JSON-LD FAQPage 를 같은 배열에서)
요금 CTA
Footer
```
- 메타는 `layout.tsx` 에서 `pageMetadata({ title, description, path })` 로 (seo.ts). JSON-LD 는 `Organization · WebSite · SoftwareApplication · FAQPage · BreadcrumbList` 빌더로.
- 시각물은 인물 사진 금지 · 추상 도형 · `next/image` · 200KB 이하.

### T2. 안내형 (`/help` · `/updates` · `/community` · `/inquiry` · `/terms` · `/privacy` · `/legal/*`)

```
TopNav
PageHeader (아이콘 · 제목 · 부제) 또는 간결 헤더
본문 max-w-4xl · 카드 1열 · 목차(길면)
Footer
```
- 약관류는 `prose` 대신 h2 + p, 개정일을 SITE 에서.

### T3. 대시보드형 (`/dashboard` · `/admin/dashboard` · `/review-admin/stats`)

```
Sidebar
PageHeader (variant primary)
max-w-6xl · space-y-4 md:space-y-6
  지표 4카드 StatCard (grid-cols-2 lg:grid-cols-4) · Delta · ConfidenceBadge
  주 작업 카드 2열 (grid-cols-1 lg:grid-cols-2)
  목록 카드 (최근 리뷰 · 순위 변동 · 커뮤니티)
```
- 첫 화면은 3초 안에 **오늘 할 일 하나**가 보여야 한다 (미답글 n건 → 버튼).
- 로딩은 스켈레톤 · 빈 상태는 EmptyState · 오류는 카드 안 재시도.

### T4. 목록 · 작업형 (리뷰 관리 6 · 마케팅 도구 12 · 고객 · 예약 · QR 관리)

```
Sidebar
PageHeader (플랫폼 variant · logoNode) 또는 PlatformReviewAdmin 내장 헤더
max-w-4xl 또는 max-w-6xl
  필터 줄 (탭 · 검색 · 기간) · 모바일은 가로 스와이프 탭 overflow-x-auto scrollbar-hide
  목록 (카드 1열 · PC 도 1열이 읽기 쉽다 · 표는 어드민에서만)
  항목 : 상단 메타(별점 · 날짜 · 플랫폼) · 본문 · 하단 액션(AI 초안 · 복사 · 등록)
  하단 고정 액션(모바일) 또는 우상단 액션(PC)
```
- 하위 화면(`/autoreply` 등)은 **되돌아가기 링크 + 그라데이션 아이콘 박스 + h1** 의 간결 헤더를 쓴다 (PageHeader 배너 중복 금지).
- 한 화면에 주 버튼(파랑 채움)은 하나.

### T5. 설정형 (`/settings` · `/settings/profile` · `/settings/connect` · `/my/*` · 어드민 목록)

```
Sidebar
PageHeader
max-w-4xl
  좌 탭(PC) / 상단 탭(모바일)
  섹션 카드 SectionCard (제목 · 설명 · 입력 · 저장 버튼 우하단)
  위험 작업(연결 해제 · 탈퇴) 은 맨 아래 빨강 테두리 카드 + confirm
```
- 저장 결과는 `toast.success / toast.error` (toast 는 객체다. 함수처럼 부르면 안 뜬다).

---

## 6. 페이지별 계획

### 6-1. 공개 화면

| 경로 | 템플릿 | 지금 | 해야 할 것 | 우선 |
|---|---|---|---|---|
| `/` | T1 | 1,017행 · 히어로 · 통계 · Before/After · 기능 · 업데이트 · QR · 업종 · 후기 · FAQ · CTA | 후기 카드 출처 표기(실명 동의 확인 전엔 이니셜) · 히어로 시각물 경량화 · LCP 이미지 priority | P1 |
| `/service-intro` | T1 | 1,066행 · AnswerBlock 있음 | 기능 12개를 사이드바 그룹과 같은 순서로 · 각 기능에 화면 스크린샷 1장(추상 도형 대체 가능) | P2 |
| `/pricing` | T1 | 622행 · AnswerBlock · 좌측 사이드바 없음(DO_NOT_TOUCH) | 요금 숫자를 SITE 로 (문구 변경은 C) · 비교표 모바일 카드화 | P1 |
| `/about` | T1 | 440행 · AnswerBlock | 회사 사실은 `1-C` 기준(2020-04-15 개업 · 7년차 · 경력 10년) · `전담 팀장` 문구 금지 | P1 |
| `/help` | T2 | 395행 | 검색창 · 카테고리 6 · 문의로 이어지는 EmptyState | P2 |
| `/updates` | T2 | 있음 | 날짜 `2026-09-21 (월)` 형식 통일 · RSS 는 후순위 | P3 |
| `/community` | T2 | 있음 | 지역 필터를 대시보드 CommunityWidget 과 같은 `regions-community` 에서 | P3 |
| `/inquiry` | T2 | 있음 | 입력 16px · 제출 후 안내 카드 · 문의는 보라(상담실장)에게 간다 | P2 |
| `/login` `/signup` | T2 | 있음 | 소셜 버튼 3종 통일 폭 · OAuth state 검증 반영본(Q-0187) 유지 | P1 |
| `/terms` `/privacy` `/legal/platform-consent` | T2 | 있음 | 개정일 SITE 화 · h2 목차 | P3 |
| `/marketing/*` (12) | T4 + 공개 메타 | 도구 화면이 공개 메타를 겸한다 | 로그인 전에는 **기능 설명 + 예시 결과 + 로그인 CTA** 를 보여주고, 로그인 뒤 도구가 열리는 2단 구성 · 각 화면에 AnswerBlock 1개 | P1 |

### 6-2. 앱 화면 (로그인)

| 경로 | 템플릿 | 지금 | 해야 할 것 | 우선 |
|---|---|---|---|---|
| `/dashboard` | T3 | 2,250행 · CommunityWidget · 키워드 순위 연동 · QuickNav 없음(DO_NOT_TOUCH) | 파일 분할(위젯별 컴포넌트) · 오늘 할 일 카드 최상단 · 스켈레톤 | P1 |
| `/review-admin/{6}` | T4 | `PlatformReviewAdmin` 공용 · PageHeader 내장 | 미답글 필터 기본값 · 일괄 AI 초안 진행률 · 사진 리뷰 표시 · 말투 `auto` 노출 | P1 |
| `/review-admin/*/autoreply` | T4 하위 | 간결 헤더 · `AutoReplySettings` | 네이버 화면과 같은 카드 구성으로 5개 통일 | P2 |
| `/review-admin/history stats templates keywords` | T3/T4 | 있음 | stats 에 StatCard · Delta · 기간 필터 | P2 |
| `/marketing/place keyword-rank keyword-score` | T4 | 있음 | 순위는 `Delta invert` · 스냅샷 출처 시각 표기 | P1 |
| `/marketing/blog-post blog-tracking naver-ads` | T4 | 있음 · naver-ads 부제 긴 대시는 이미 가운뎃점으로 고쳐짐 | 결과 카드 복사 버튼 · 조회 결과 빈 상태 | P2 |
| `/marketing/instagram-feed reels card-news events threads youtube-community` | T4 | 있음 | 발행 전 미리보기 카드 통일 · 연결 안 됨 EmptyState → `/my/platforms` | P2 |
| `/customers` `/crm` | T4 | 503행 | 태그 칩 색 5색 안에서 · 단체 발송은 confirm 2단 | P2 |
| `/reservations` | T4 | 있음 | 주간 뷰 모바일 세로 | P3 |
| `/qr-admin` | T4 | 1,341행 | QR + 정보 `grid-cols-1 lg:grid-cols-[300px_1fr]` · 인코딩 URL 디코딩 표시 | P2 |
| `/settings` | T5 | 2,134행 | 탭별 파일 분할 · toast 객체 호출 확인(09/21 수정) · 푸시 구독 상태 카드 | P1 |
| `/settings/profile` `/settings/connect` `/my/platforms/*` | T5 | 있음 | 연결 상태 3색(연결 · 만료 · 미연결) · 세션 만료 안내 | P1 |
| `/my/subscription` | T5 | 있음 | 요금 문구는 SITE · 결제 관련 문구 변경은 C | P2 |
| `/locked` `/whoami` `/settlement`(리다이렉트 유지) | 보조 | 있음 | 손대지 않는다 | 없음 |

### 6-3. 고객이 여는 화면

| 경로 | 지금 | 해야 할 것 | 우선 |
|---|---|---|---|
| `/review/[storeId]` | 4단계(정보 → 사진 → AI → 등록) | 단계 표시줄 · 사진 업로드 진행률 · 오프라인이면 `offline.html` 이 아니라 화면 안 안내 | P1 |
| `/menu/[slug]` `/stamp/[slug]` | 있음 | 매장 색 1개만 · 공유 메타(OG) | P2 |
| `/qr` | 있음 | 개인 화면이라 SW 캐시 제외(반영됨) | 없음 |

### 6-4. 어드민

| 경로 | 지금 | 해야 할 것 | 우선 |
|---|---|---|---|
| `/admin/*` 12 | 표 위주 · PageHeader 없음 | 어드민은 표 허용 · 공통 `AdminPageHeader`(간결) 1개 만들어 12곳에 · 위험 작업 confirm | P2 |
| `/admin-biz` | 있음 | 위와 같음 | P3 |

---

## 7. 상태 규칙 (전 화면 공통)

| 상태 | 보이는 것 | 구현 |
|---|---|---|
| 로딩 | 카드 자리 스켈레톤(`animate-pulse` 회색 블록) · 스피너는 버튼 안에서만 | 첫 화면 300ms 안에 뼈대 |
| 빈 | `EmptyState` : 아이콘 박스 · 한 줄 설명 · 다음 행동 버튼 1 | "리뷰가 없어요 → 플랫폼 연결하기" |
| 오류 | 카드 안 빨강 테두리 · 원인 한 줄 · 재시도 버튼 · 기술 문구 금지 | 상태 코드는 콘솔에만 |
| 오프라인 | 공개 화면은 캐시본 · 앱 화면은 `offline.html` · API 는 503 JSON `{ok:false,error:'offline'}` | `public/sw.js` |
| 권한 없음 | `/locked` 또는 로그인으로 · 왜 막혔는지 한 줄 | `middleware.ts` |
| 저장 결과 | `toast.success('저장했어요')` · 실패 `toast.error(원인)` | `app/lib/toast.ts` |
| 위험 작업 | confirm 모달 · 빨강 버튼은 모달 안에서만 | 연결 해제 · 삭제 · 단체 발송 |

문구 톤 : 따뜻한 존댓말 · `~해보세요` `~하면 돼요` · 사실 · 숫자에는 완충어 없음 · 애교체 금지.

---

## 8. SEO · GEO · AEO 규칙

- **사실 모듈 한 곳** : `app/lib/seo.ts` 의 `SITE`(이름 · 설명 · URL · 연락 · 요금 · 회사 사실) · `PUBLIC_ROUTES`(26 · 제목 · 설명 · 우선순위) · `PRIVATE_PATHS`. 화면 · 메타 · sitemap · robots · JSON-LD 가 전부 여기서 읽는다.
- **공개 화면마다** : `layout.tsx` 의 `pageMetadata({ title, description, path })` 로 title · description · canonical · OG · Twitter. `BreadcrumbList` JSON-LD. 본문 첫 화면에 h1 하나.
- **답변 블록(AnswerBlock)** : 질문형 h2 + 3~5문장 답 + 근거 링크. AI 검색이 인용할 수 있게 **한 문단에 답이 끝난다.** 지금 4화면 → 마케팅 도구 12화면 · help 로 확장 (P1).
- **FAQ** : 화면에 보이는 배열과 `FAQPage` JSON-LD 가 같은 상수를 쓴다. 화면에 없는 FAQ 를 JSON-LD 에만 넣지 않는다.
- **비공개는 noindex** : `middleware.ts` 헤더 + `robots.ts` disallow. 앱 화면에 메타 설명을 쓰지 않는다.
- **게이트** : `npm run check:geo` 종료 코드 0 이 통과. S1 사실 단일화 · S2 공개 메타 전수 · S3 JSON-LD 유효 · S4 답변 블록 · S5 robots/sitemap · S6 비공개 noindex · L1/L2 라이브 응답. 실패한 채로 결재에 올리지 않는다.
- **속도** : LCP 이미지 `priority` · 폰트 `display: swap` · 히어로 영상은 `preload=none` · 공개 화면 JS 는 클라이언트 컴포넌트 최소화.

---

## 9. 앱 포장 로드맵 (PWA → 스토어)

| 단계 | 상태 | 남은 일 |
|---|---|---|
| 1. PWA | 완료 (manifest · SW · offline · 푸시 · safe-area) | 아이콘 maskable 실기기 확인 · iOS 홈 화면 스플래시(apple-touch-startup-image) 선택 |
| 2. Android TWA | 미착수 | Bubblewrap 으로 `manifest.webmanifest` 감싸기 · `assetlinks.json` 을 `public/.well-known/` 에 · 패키지명 · 서명키는 대표가 보관(값은 문서에 안 적는다) |
| 3. iOS | 미착수 | Capacitor 셸(웹뷰) · 푸시는 APNs 브리지 필요 · 로그인 OAuth 는 `state` 검증 그대로 · 결제는 웹 결제 유지(스토어 결제 정책 검토는 C) |
| 4. 딥링크 | 미착수 | `/review/[storeId]` · `/dashboard` 를 앱 링크로 · 푸시 `data.url` 이 이미 경로를 준다 |

앱 셸에서 지켜야 할 것 : `viewport-fit=cover` 유지 · 고정 바는 `pt-safe / pb-safe` · 외부 링크는 새 창 · 파일 업로드(사진 리뷰)는 웹뷰 권한 확인 · 새 버전은 SW `SKIP_WAITING` 으로 즉시 교체.

---

## 10. 미비 항목 백로그 (우선순위)

### P0 (사용자가 지금 못 쓰는 것) : 없음 (09/21 기준)

### P1
1. `/marketing/*` 12화면 로그인 전 2단 구성 + AnswerBlock (8절)
2. `/dashboard` · `/settings` 파일 분할 (2,000행 넘는 파일 둘)
3. 화면 문자열 긴 대시 : 0건 확인 완료 (09/21 · 남은 것은 코드 주석뿐). 새 문구에서만 지킨다
4. 플랫폼 연결 상태 3색 통일 (`/settings/connect` · `/my/platforms`)
5. `/review/[storeId]` 오프라인 · 업로드 진행률
6. `/about` 회사 사실 문구 점검 (1-C 기준)
7. `/pricing` 요금 숫자 SITE 화 (문구 자체 변경은 C)

### P2
8. 어드민 공통 `AdminPageHeader` + 12화면 적용
9. `/review-admin/*/autoreply` 5화면 카드 통일
10. `/qr-admin` 그리드 · URL 디코딩
11. `/help` 검색 · 카테고리
12. 타입 오류 27건 정리 (런타임 무관 · 시간 나면)

### P3
13. `/updates` 날짜 형식 · `/community` 지역 상수 공유 · 약관 개정일 SITE 화 · `/reservations` 모바일 주간 뷰

---

## 11. 검증 게이트 (결재 올리기 전)

```bash
npm run check:geo
```
```bash
npx tsc --noEmit
```
```bash
npm run build
```

- `check:geo` 종료 0 · `tsc` 는 27건 이하(늘면 새로 생긴 것) · `build` 통과.
- 화면은 375 · 768 · 1280 · 1920 네 폭에서 본다. 가로 스크롤 · 잘림 · 한쪽 쏠림 확인.
- 이모지 검사 : `app/**/*.tsx` 를 유니코드 이모지 범위로 grep 해서 0건.
- 긴 대시 검사 : 화면 문자열에 `—` 0건 (주석 · 변수명 제외).

---

## 12. 결재 · 금지

**C (결재 뒤 실행)** : 커밋 · 배포 · PR 병합 · 운영 DB 마이그레이션 · 요금 · 약관 문구 · 결제 정책 · 스토어 등록 · 서명키 · 외부 계정 접속.

**D (하지 않는다)** : 더티 작업 트리 통째 커밋 · 비밀값을 문서 · 채팅에 적기 · 사용자 데이터 개별 노출 · 아래 DO_NOT_TOUCH 되살리기.

**DO_NOT_TOUCH (사장님이 명시 제거)** : 대시보드 QuickNav · QuickActions · 인라인 ServiceRanking · 대시보드 홍보 띠 · `/pricing` 좌측 사이드바 · `/settlement` 는 리다이렉트 유지. 자세한 목록은 `DO_NOT_TOUCH.md`.

---

## 13. 다른 도구로 옮길 때 같이 가는 것

| 파일 | 왜 |
|---|---|
| `DESIGN_PLAN.md` (이 문서) | 계획 · 백로그 · 게이트 |
| `DESIGN_SYSTEM.md` | 토큰 · 타이포 · 공용 컴포넌트 · 체크리스트 |
| `DO_NOT_TOUCH.md` | 되살리면 안 되는 것 |
| `DEV_PITFALLS.md` | 빌드 스크립트 · 정규식 · 토큰 함정 |
| `CLAUDE.md` (localution) | 절대 규칙 · 이모지 매핑 · 반응형 기준 |
| `E:\하랑\.claude\skills\localution-web\SKILL.md` | 위 전부를 한 장으로 압축한 스킬 · GPT 시스템 프롬프트로 그대로 붙여도 된다 |
| `app/lib/seo.ts` · `scripts/geo-check.mjs` | 사실 모듈 · 게이트 (코드) |
| `app/components/ui/*` · `PageHeader.tsx` | 공용 컴포넌트 (코드) |

옮긴 뒤 첫 확인 : 옮긴 도구가 **이모지를 쓰지 않는지 · 그라데이션 아이콘 박스를 쓰는지 · 긴 대시를 안 쓰는지** 세 줄을 먼저 시험한다. 셋 중 하나라도 어기면 규칙이 안 실린 것이다.

---

최종 갱신: 2026-09-21 (월)
