'use client'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

export default function LoginPage() {
 const cardRef = useRef<HTMLDivElement>(null)
 const [error, setError] = useState('')
 // 회원가입 모드 여부 (/signup → /login?mode=signup 로 rewrite 되거나, 직접 쿼리로 접근)
 const [isSignup, setIsSignup] = useState(false)
 // 다른 계정으로 로그인 (네이버/카카오/구글에 reset 쿼리 전달 · 계정 선택/재로그인 강제)
 const [useDifferentAccount, setUseDifferentAccount] = useState(false)
 const oauthQuery = useDifferentAccount ? '?reset=1' : ''

 useEffect(function() {
 const params = new URLSearchParams(window.location.search)
 setIsSignup(params.get('mode') === 'signup')
 const err = params.get('error')
 if (err === 'naver_denied') setError('네이버 로그인이 취소되었습니다.')
 else if (err === 'kakao_denied') setError('카카오 로그인이 취소되었습니다.')
 else if (err === 'google_denied') setError('Google 로그인이 취소되었습니다.')
 else if (err) setError('로그인 중 오류가 발생했습니다. 다시 시도해 주세요.')
 }, [])

 useEffect(function() {
 const cookies = document.cookie
 if (cookies.indexOf('localution_session=') !== -1) {
 // Hotfix 2026-04-21: redirect 쿼리 파라미터를 우선 처리
 // · 기존: 무조건 /dashboard 로 보냄 → 카카오 OAuth 도중 /login 거치면 /dashboard 튕김
 // · 수정: ?redirect=<path> 가 있으면 거기로, 없으면 /dashboard
 const params = new URLSearchParams(window.location.search)
 const redirect = params.get('redirect')
 // 보안: open redirect 방지 · 같은 출처 path 만 허용
 const safe = redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/dashboard'
 window.location.href = safe
 }
 }, [])

 useEffect(function() {
 var card = cardRef.current
 if (!card) return
 function handleMove(e: MouseEvent) {
 if (!card) return
 var rect = card.getBoundingClientRect()
 var x = (e.clientX - rect.left) / rect.width - 0.5
 var y = (e.clientY - rect.top) / rect.height - 0.5
 card.style.setProperty('--tilt-x', (y * -6) + 'deg')
 card.style.setProperty('--tilt-y', (x * 6) + 'deg')
 }
 function handleLeave() {
 if (!card) return
 card.style.setProperty('--tilt-x', '0deg')
 card.style.setProperty('--tilt-y', '0deg')
 }
 card.addEventListener('mousemove', handleMove)
 card.addEventListener('mouseleave', handleLeave)
 return function() {
 if (!card) return
 card.removeEventListener('mousemove', handleMove)
 card.removeEventListener('mouseleave', handleLeave)
 }
 }, [])

 return (
 <div className='loginContainer'>
 <style>{`
 @keyframes orbitGrad { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
 @keyframes floatUp { 0% { opacity:0; transform: translateY(40px); } 100% { opacity:1; transform: translateY(0); } }
 @keyframes fadeInUp { 0% { opacity:0; transform: translateY(30px); } 100% { opacity:1; transform: translateY(0); } }
 @keyframes growBar { 0% { height: 0; } 100% { height: var(--bar-h); } }
 @keyframes drawLine { 0% { stroke-dashoffset: 800; } 100% { stroke-dashoffset: 0; } }
 @keyframes slideUp { 0% { transform: translateY(20px); opacity:0; } 100% { transform: translateY(0); opacity:1; } }
 @keyframes floatCard { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
 @keyframes countUp { 0% { opacity:0; transform: scale(0.8); } 100% { opacity:1; transform: scale(1); } }
 @keyframes arrowBounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
 @keyframes particleFloat { 0% { opacity:0; transform: translateY(100vh) translateX(0); } 10% { opacity:0.6; } 90% { opacity:0.6; } 100% { opacity:0; transform: translateY(-100vh) translateX(80px); } }
 @keyframes glowPulse { 0%,100% { box-shadow: 0 0 20px rgba(59,130,246,0.1); } 50% { box-shadow: 0 0 40px rgba(59,130,246,0.2); } }

 body, html { margin:0; padding:0; background:#060D1A; font-family: var(--lu-font); overflow-x:hidden; }
 /* 데스크톱: 풀스크린 고정 / 모바일: 자연 스크롤 허용 (loginCard 가 길어도 안 잘림) */
 .loginContainer { position:fixed; top:0; left:0; width:100%; height:100%; background: linear-gradient(135deg, #060D1A 0%, #0f1e3c 50%, #060D1A 100%); background-size: 200% 200%; animation: orbitGrad 15s ease infinite; display:flex; align-items:center; justify-content:center; overflow:hidden; }
 @media (max-width: 1100px) {
 /* 모바일: 위→아래 column 으로 stacking, 자연 스크롤 + safe-area */
 .loginContainer { position:relative; height:auto; min-height:100vh; flex-direction:column; align-items:stretch; justify-content:flex-start; overflow-y:auto; overflow-x:hidden; padding:0; }
 }
 .particles { position:absolute; width:100%; height:100%; pointer-events:none; overflow:hidden; }
 .p { position:absolute; border-radius:50%; pointer-events:none; }

 .mainWrap { display:flex; gap:0; width:100%; max-width:1400px; height:100vh; position:relative; z-index:10; }
 .leftArea { flex:1; display:flex; align-items:center; justify-content:center; padding:40px; }
 .rightArea { flex:1; display:flex; align-items:center; justify-content:center; padding:20px; }

 .growthScene { width:100%; max-width:520px; animation: floatUp 1s ease 0.3s backwards; }
 .heroTitle { font-size:28px; font-weight:800; color:#fff; margin-bottom:6px; line-height:1.4; }
 .heroSub { font-size:15px; color:#94a3b8; margin-bottom:32px; line-height:1.7; }
 .heroHighlight { color:#3b82f6; }

 .graphCard { background: rgba(255,255,255,0.03); border:1px solid rgba(59,130,246,0.12); border-radius:20px; padding:28px; margin-bottom:20px; animation: floatCard 6s ease-in-out infinite, glowPulse 4s ease infinite; }
 .graphHeader { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; }
 .graphLabel { font-size:14px; color:#94a3b8; }
 .graphBadge { background:rgba(34,197,94,0.12); color:#22c55e; padding:4px 12px; border-radius:20px; font-size:13px; font-weight:600; display:flex; align-items:center; gap:4px; }
 .graphBadge svg { animation: arrowBounce 1.5s ease infinite; }

 .barChart { display:flex; align-items:flex-end; gap:8px; height:120px; margin-top:16px; }
 .bar { flex:1; border-radius:6px 6px 2px 2px; animation: growBar 1.2s ease forwards; height:0; position:relative; }
 .barLabel { position:absolute; bottom:-20px; left:50%; transform:translateX(-50%); font-size:10px; color:#64748b; white-space:nowrap; }

 .lineGraph { width:100%; height:100px; }

 .statCards { display:grid; grid-template-columns: repeat(3,1fr); gap:12px; margin-bottom:20px; }
 .statCard { background:rgba(255,255,255,0.03); border:1px solid rgba(59,130,246,0.08); border-radius:14px; padding:16px; text-align:center; animation: slideUp 0.6s ease backwards; }
 .statCard:nth-child(1) { animation-delay: 0.2s; }
 .statCard:nth-child(2) { animation-delay: 0.4s; }
 .statCard:nth-child(3) { animation-delay: 0.6s; }
 .statNum { font-size:22px; font-weight:800; color:#fff; margin-bottom:4px; animation: countUp 0.8s ease backwards; }
 .statLabel { font-size:12px; color:#64748b; }
 .statChange { font-size:11px; color:#22c55e; margin-top:4px; }

 .trustRow { display:flex; align-items:center; gap:12px; }
 .trustDots { display:flex; }
 .trustDot { width:28px; height:28px; border-radius:50%; border:2px solid #0f1e3c; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; color:#fff; margin-left:-8px; }
 .trustDot:first-child { margin-left:0; }
 .trustText { font-size:13px; color:#64748b; }
 .trustText strong { color:#3b82f6; }

 .loginCard { width:100%; max-width:400px; background: linear-gradient(135deg, rgba(30,58,138,0.2) 0%, rgba(59,130,246,0.05) 100%); border:1px solid rgba(59,130,246,0.2); border-radius:24px; backdrop-filter:blur(20px); padding:44px 36px; box-shadow: 0 20px 60px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1); animation: fadeInUp 0.8s ease; transform: perspective(1200px) rotateX(var(--tilt-x,0deg)) rotateY(var(--tilt-y,0deg)); transition: transform 0.1s ease-out; }
 .logoSection { text-align:center; margin-bottom:32px; }
 .logoImg { width:52px; height:52px; margin:0 auto 14px; display:block; filter: drop-shadow(0 0 10px rgba(59,130,246,0.3)); border-radius:12px; }
 .brandName { font-size:22px; font-weight:800; color:#fff; margin-bottom:4px; }
 .tagline { font-size:13px; color:#94a3b8; }
 .loginTitle { font-size:22px; font-weight:700; color:#fff; text-align:center; margin-bottom:28px; }

 .socialBtns { display:flex; flex-direction:column; gap:12px; margin-bottom:24px; }
 .sBtn { display:flex; align-items:center; justify-content:center; gap:10px; padding:14px 16px; border-radius:12px; font-size:15px; font-weight:600; cursor:pointer; transition:all 0.3s cubic-bezier(0.4,0,0.2,1); text-decoration:none; border:none; }
 .sBtn:hover { transform:translateY(-2px); }
 .sBtn:active { transform:translateY(0); }

 .kakaoBtn { background:#FEE500; color:#191919; }
 .kakaoBtn:hover { background:#fdd835; box-shadow: 0 8px 24px rgba(254,229,0,0.25); }
 .naverBtn { background:#03C75A; color:#fff; }
 .naverBtn:hover { background:#02b050; box-shadow: 0 8px 24px rgba(3,199,90,0.25); }
 .googleBtn { background:#fff; color:#333; border:1px solid #dadce0; }
 .googleBtn:hover { background:#f8f9fa; box-shadow: 0 8px 24px rgba(0,0,0,0.1); }

 .sIcon { width:20px; height:20px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }

 .errMsg { background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); color:#fca5a5; padding:12px; border-radius:10px; font-size:13px; margin-bottom:20px; text-align:center; animation: fadeInUp 0.4s ease; }
 .consentMsg { margin-top:16px; padding:10px 12px; background:rgba(59,130,246,0.06); border:1px solid rgba(59,130,246,0.15); border-radius:10px; font-size:11px; color:#94a3b8; line-height:1.6; text-align:center; }
 .consentMsg a { color:#60a5fa; text-decoration:underline; }
 .consentMsg a:hover { color:#93c5fd; }
 .footer { margin-top:20px; text-align:center; font-size:12px; color:#64748b; line-height:1.8; }
 .footerLinks { display:flex; justify-content:center; gap:12px; margin-bottom:8px; font-size:11px; }
 .footerLinks a { color:#64748b; text-decoration:none; }
 .footerLinks a:hover { color:#94a3b8; text-decoration:underline; }
 .footerDivider { color:#334155; }

 /* 다른 계정으로 로그인 토글 */
 .accountSwitch { display:flex; align-items:center; gap:8px; margin-top:14px; padding:10px 12px; background:rgba(255,255,255,0.04); border:1px solid rgba(59,130,246,0.18); border-radius:10px; cursor:pointer; transition:all 0.2s; user-select:none; }
 .accountSwitch:hover { background:rgba(59,130,246,0.08); border-color:rgba(59,130,246,0.3); }
 .accountSwitch input { width:14px; height:14px; accent-color:#3b82f6; cursor:pointer; flex-shrink:0; }
 .accountSwitch span { font-size:12px; color:#94a3b8; font-weight:500; line-height:1.4; }

 /* 모바일 상단 브랜드 바 · 1100px 이하에서 노출, 데스크톱은 숨김 */
 .mobileTopBar { display:none; position:sticky; top:0; left:0; right:0; z-index:20; padding: calc(env(safe-area-inset-top, 0px) + 12px) 16px 12px; background: linear-gradient(180deg, rgba(6,13,26,0.96) 0%, rgba(6,13,26,0.88) 100%); backdrop-filter: blur(10px); border-bottom: 1px solid rgba(59,130,246,0.18); }
 .mobileTopBar .row { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:10px; }
 .mobileTopBar .brand { display:flex; align-items:center; gap:10px; }
 .mobileTopBar .brandLogo { width:38px; height:38px; border-radius:10px; background:#fff; padding:3px; display:flex; align-items:center; justify-content:center; box-shadow: 0 2px 12px rgba(59,130,246,0.25); flex-shrink:0; }
 .mobileTopBar .brandLogo img { width:100%; height:100%; object-fit:contain; }
 .mobileTopBar .brandText { color:#fff; font-size:15px; font-weight:800; letter-spacing:-0.3px; }
 .mobileTopBar .brandTagline { color:#94a3b8; font-size:10px; font-weight:500; margin-top:1px; }
 .mobileTopBar .liveBadge { display:inline-flex; align-items:center; gap:5px; padding:5px 9px; border-radius:999px; background:rgba(34,197,94,0.14); color:#22c55e; font-size:10px; font-weight:700; flex-shrink:0; border:1px solid rgba(34,197,94,0.22); }
 .mobileTopBar .liveDot { width:5px; height:5px; border-radius:50%; background:#22c55e; animation: pulseDot 1.5s ease-in-out infinite; flex-shrink:0; }
 @keyframes pulseDot { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(1.4); } }
 @keyframes statSlideUp {
 0% { opacity:0; transform: translateY(8px); }
 12% { opacity:1; transform: translateY(0); }
 88% { opacity:1; transform: translateY(0); }
 100% { opacity:0; transform: translateY(-8px); }
 }
 @keyframes numberPulse {
 0%,100% { transform: scale(1); }
 50% { transform: scale(1.04); }
 }

 /* 실시간 통계 트랙 · 가로 stat 카드 3개 + 회전 데이터 */
 .liveStats { display:grid; grid-template-columns: repeat(3, 1fr); gap:6px; }
 .liveStatCard { background: rgba(59,130,246,0.08); border:1px solid rgba(59,130,246,0.16); border-radius:10px; padding:7px 8px; min-height:46px; position:relative; overflow:hidden; }
 .liveStatCard .liveStatIcon { position:absolute; top:6px; right:6px; opacity:0.45; }
 .liveStatCard .liveStatLabel { font-size:9px; color:#94a3b8; font-weight:600; line-height:1; margin-bottom:3px; letter-spacing:-0.2px; }
 .liveStatCard .liveStatValue { font-size:14px; color:#fff; font-weight:900; line-height:1.1; letter-spacing:-0.4px; animation: numberPulse 2s ease-in-out infinite; }
 .liveStatCard .liveStatChange { font-size:8px; color:#22c55e; font-weight:700; margin-top:2px; }
 .liveStatCard.featured { background: linear-gradient(135deg, rgba(59,130,246,0.18), rgba(139,92,246,0.12)); border-color: rgba(59,130,246,0.35); }
 .liveStatCard.featured .liveStatValue { color:#60a5fa; }

 @media (max-width: 1100px) {
 /* mobileTopBar 와 mainWrap 이 column 으로 stacking · mobileTopBar 위, mainWrap 아래 */
 .mobileTopBar { display:block; width:100%; flex-shrink:0; }
 .mainWrap { display:block; flex-direction:column; height:auto; width:100%; max-width:none; padding:0; }
 .leftArea { display:none; }
 .rightArea {
 width:100%;
 max-width:480px;
 margin:0 auto;
 padding: 24px 16px 40px;
 display:block;
 align-items:initial;
 justify-content:initial;
 }
 .loginCard {
 width:100%;
 max-width:100%;
 margin:0 auto;
 transform:none;
 }
 }
 @media (max-width: 640px) {
 .rightArea { padding: 20px 16px 36px; max-width:100%; }
 .loginCard { padding:28px 20px; }
 .sBtn { padding:12px 14px; font-size:14px; }
 .logoSection { margin-bottom:24px; }
 .logoImg { width:44px; height:44px; }
 .brandName { font-size:20px; }
 .loginTitle { font-size:20px; margin-bottom:22px; }
 }

 /* Calm workspace login. Provider button identities and authentication handlers are unchanged. */
 body, html { background: var(--lu-canvas); }
 .loginContainer { background:var(--lu-canvas); animation:none; }
 .particles { display:none; }
 .mainWrap { max-width:1152px; }
 .heroTitle, .statNum, .brandName, .loginTitle, .mobileTopBar .brandText, .liveStatCard .liveStatValue { color:var(--lu-ink); font-weight:700; }
 .heroHighlight, .trustText strong, .consentMsg a { color:var(--lu-accent); }
 .heroSub, .graphLabel, .statLabel, .trustText, .tagline, .footer, .footerLinks a, .accountSwitch span { color:var(--lu-muted); }
 .graphCard, .statCard, .loginCard { background:var(--lu-surface); border:1px solid var(--lu-line); border-radius:10px; box-shadow:none; animation:none; transform:none; }
 .loginCard { backdrop-filter:none; padding:36px 28px; }
 .growthScene { animation:none; }
 .logoImg { filter:none; }
 .sBtn { border-radius:6px; min-height:48px; transition:background-color 150ms,border-color 150ms; }
 .sBtn:hover, .sBtn:active { transform:none; box-shadow:none; }
 .accountSwitch, .consentMsg { border:1px solid var(--lu-line); background:var(--lu-canvas); border-radius:6px; color:var(--lu-muted); }
 .accountSwitch input { accent-color:var(--lu-accent); }
 .mobileTopBar { background:var(--lu-surface); border-bottom:1px solid var(--lu-line); backdrop-filter:none; }
 .liveStatCard { background:var(--lu-surface); border-color:var(--lu-line); }
 .liveStatCard .liveStatValue, .graphBadge svg, .mobileTopBar .liveDot { animation:none; }
 .graphBadge, .statChange { color:var(--lu-success); }
 .graphBadge { background:var(--lu-success-soft); }
 .mobileTopBar .brandTagline, .barLabel, .liveStatCard .liveStatLabel { color:var(--lu-muted); }
 .mobileTopBar .liveBadge, .liveStatCard .liveStatChange { color:var(--lu-success); }
 .liveStatCard.featured .liveStatValue { color:var(--lu-ink); }
 .errMsg { background:var(--lu-danger-soft); border-color:var(--lu-danger); color:var(--lu-danger); border-radius:6px; }
 .footerLinks a:hover { color:var(--lu-accent); }
 @media(prefers-reduced-motion:reduce) { .bar,.statCard,.loginCard,.growthScene {animation:none;} }
 `}</style>

 {/* 모바일 상단 브랜드 바 (1100px 이하 노출) · 실제 로고 + 실시간 통계 카드 3종 */}
 <div className='mobileTopBar'>
 <div className='row'>
 <div className='brand'>
 <div className='brandLogo'>
 <Image src="/logo-icon.svg" alt="로컬루션" width={32} height={32} priority />
 </div>
 <div>
 <div className='brandText'>로컬루션</div>
 <div className='brandTagline'>AI 사장님 마케팅 플랫폼</div>
 </div>
 </div>
 <span className="text-xs text-[var(--lu-muted)]">매장 계정 연결</span>
 </div>
 <p className="mt-3 text-xs leading-5 text-[var(--lu-muted)]">로그인 후 연결한 계정의 실제 정보를 확인하세요.</p>
 </div>

 <div className='mainWrap'>
 <div className='leftArea'>
 <div className='growthScene'>
 <h1 className='heroTitle'>매장 운영에 필요한 도구를<br /><span className='heroHighlight'>한곳에서 확인하세요</span></h1>
 <p className='heroSub'>리뷰와 고객 관리는 계정을 연결한 뒤 이용하세요.<br />먼저 살펴볼 수 있는 도구와 사용 안내도 준비되어 있습니다.</p>
 <div className="grid gap-4 pt-6">
 <a href="/marketing" className="min-h-11 rounded-[10px] border border-[var(--lu-line)] bg-white p-5 text-base font-semibold text-[var(--lu-accent)]">마케팅 도구 살펴보기</a>
 <a href="/help/videos" className="min-h-11 rounded-[10px] border border-[var(--lu-line)] bg-white p-5 text-base font-semibold text-[var(--lu-accent)]">기능별 사용 영상 보기</a>
 <a href="/support" className="min-h-11 rounded-[10px] border border-[var(--lu-line)] bg-white p-5 text-base font-semibold text-[var(--lu-accent)]">공식 지원정보 확인하기</a>
 </div>
 </div>
 </div>

 <div className='rightArea'>
 <div className='loginCard' ref={cardRef}>
 <div className='logoSection'>
 <Image src="/logo.png" alt="로컬루션" width={52} height={52} className='logoImg' priority />
 <div className='brandName'>Localution</div>
 <div className='tagline'>AI가 사장님의 비즈니스를 성장시킵니다</div>
 </div>

 <h1 className='loginTitle'>{isSignup ? '무료 시작하기' : '로그인'}</h1>
 {isSignup && (
 <p style={{ textAlign: 'center', color: 'var(--lu-muted)', fontSize: 13, marginTop: -8, marginBottom: 16 }}>
 카카오·네이버·구글 계정으로 1분만에 가입 → 바로 시작
 </p>
 )}

 {error && <div className='errMsg'>{error}</div>}

 <div className='socialBtns'>
 <a href={'/api/oauth/kakao' + oauthQuery} className='sBtn kakaoBtn'>
 <span className='sIcon'>
 <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
 <path d="M10 3C5.582 3 2 5.828 2 9.274c0 2.177 1.432 4.088 3.594 5.186l-.912 3.376c-.08.297.26.534.522.364l3.96-2.636c.272.028.55.044.836.044 4.418 0 8-2.828 8-6.334C18 5.828 14.418 3 10 3z" fill="#191919"/>
 </svg>
 </span>
 카카오로 시작
 </a>

 <a href={'/api/oauth/naver' + oauthQuery} className='sBtn naverBtn'>
 <span className='sIcon'>
 <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
 <path d="M13.36 10.57L6.38 3H3v14h3.64V9.43L13.62 17H17V3h-3.64v7.57z" fill="#fff"/>
 </svg>
 </span>
 네이버로 시작
 </a>

 <a href={'/api/oauth/google' + oauthQuery} className='sBtn googleBtn'>
 <span className='sIcon'>
 <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
 <path d="M18.17 10.2c0-.63-.06-1.25-.16-1.84H10v3.48h4.58a3.92 3.92 0 01-1.7 2.57v2.13h2.75c1.61-1.48 2.54-3.66 2.54-6.34z" fill="#4285F4"/>
 <path d="M10 18.5c2.3 0 4.23-.76 5.64-2.07l-2.75-2.13c-.76.51-1.74.81-2.89.81-2.22 0-4.1-1.5-4.77-3.52H2.38v2.2A8.5 8.5 0 0010 18.5z" fill="#34A853"/>
 <path d="M5.23 11.59a5.1 5.1 0 010-3.18v-2.2H2.38a8.5 8.5 0 000 7.58l2.85-2.2z" fill="#FBBC05"/>
 <path d="M10 4.89c1.25 0 2.38.43 3.26 1.28l2.45-2.45A8.46 8.46 0 0010 1.5a8.5 8.5 0 00-7.62 4.71l2.85 2.2c.67-2.02 2.55-3.52 4.77-3.52z" fill="#EA4335"/>
 </svg>
 </span>
 Google로 시작
 </a>
 </div>

 {/* 다른 계정으로 로그인 토글 · 같은 OAuth 계정이 자동 재사용되는 문제 해결 */}
 <label className='accountSwitch'>
 <input
 type='checkbox'
 checked={useDifferentAccount}
 onChange={(e) => setUseDifferentAccount(e.target.checked)}
 />
 <span>다른 계정으로 로그인 (계정 선택 화면 보기)</span>
 </label>

 <div className='consentMsg'>
 {isSignup ? '가입하면 ' : '로그인하면 '}
 <a href='/terms' target='_blank' rel='noopener'>이용약관</a>
 {' 및 '}
 <a href='/privacy' target='_blank' rel='noopener'>개인정보처리방침</a>
 에 동의하는 것으로 간주됩니다.
 </div>

 <div className='footer'>
 <div className='footerLinks'>
 <a href='/terms' target='_blank' rel='noopener'>이용약관</a>
 <span className='footerDivider'>·</span>
 <a href='/privacy' target='_blank' rel='noopener'>개인정보처리방침</a>
 <span className='footerDivider'>·</span>
 <a href='/legal/platform-consent' target='_blank' rel='noopener'>위임동의서</a>
 </div>
 &copy; 2026 로컬루션<br/>
 Powered by Localution
 </div>
 </div>
 </div>
 </div>
 </div>
 )
}
