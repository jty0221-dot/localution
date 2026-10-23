import { NextRequest, NextResponse } from 'next/server';
import { requirePaidQuota } from '@/app/lib/paid-quota';

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// LU-018 · SEC-L07
//   · 예전에는 로그인 실패해도 IP 로 통과시키고 요청 본문을 그대로 Anthropic 에 넘겨
//     모델 · max_tokens · 입력 길이를 호출자가 정할 수 있었다 (무료 Claude 프록시).
//   · 이제: 로그인 필수 · 사용자당 1분 10회 · 1일 200회 · 모델과 max_tokens 는 서버 고정 ·
//     messages(문자열 content) 와 system 만 받아 서버가 본문을 조립한다.
//   · 저장소 안 화면 호출처는 0건(2026-10-23 grep) — 외부 스크립트 호환을 위해 응답 모양은 그대로 둔다.
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'
const MAX_TOKENS = 1024
const MAX_MESSAGES = 20
const MAX_TOTAL_CHARS = 12000

type InMessage = { role?: unknown; content?: unknown }

export async function POST(req: NextRequest) {
 try {
 const gate = await requirePaidQuota('ai', { perMinute: 10, perDay: 200 });
 if (!gate.ok) return gate.response;

 if (!process.env.ANTHROPIC_API_KEY) {
 return NextResponse.json({ error: 'AI 서비스가 설정되지 않았어요.' }, { status: 503 });
 }

 let body: { messages?: unknown; system?: unknown };
 try {
 body = await req.json();
 } catch {
 return NextResponse.json({ error: '요청 형식이 올바르지 않아요.' }, { status: 400 });
 }

 const raw = Array.isArray(body.messages) ? (body.messages as InMessage[]) : [];
 if (raw.length === 0 || raw.length > MAX_MESSAGES) {
 return NextResponse.json({ error: 'messages 가 비었거나 너무 많아요.' }, { status: 400 });
 }
 const messages: { role: 'user' | 'assistant'; content: string }[] = [];
 let total = 0;
 for (const m of raw) {
 if ((m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') {
 return NextResponse.json({ error: 'messages 형식이 올바르지 않아요.' }, { status: 400 });
 }
 total += m.content.length;
 messages.push({ role: m.role, content: m.content });
 }
 const system = typeof body.system === 'string' ? body.system : undefined;
 total += system?.length || 0;
 if (total > MAX_TOTAL_CHARS) {
 return NextResponse.json({ error: '입력이 너무 길어요.' }, { status: 413 });
 }

 const response = await fetch('https://api.anthropic.com/v1/messages', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'x-api-key': process.env.ANTHROPIC_API_KEY,
 'anthropic-version': '2023-06-01',
 },
 body: JSON.stringify({ model: MODEL, max_tokens: MAX_TOKENS, messages, ...(system ? { system } : {}) }),
 signal: AbortSignal.timeout(45000), // 45초 timeout (hang 방지)
 });

 if (!response.ok) {
 // 공급자 응답 본문은 돌려주지 않는다
 return NextResponse.json({ error: `AI 서비스 오류 (${response.status})` }, { status: 502 });
 }

 const data = await response.json();
 return NextResponse.json(data);
 } catch {
 return NextResponse.json({ error: 'AI 요청 처리 중 오류' }, { status: 500 });
 }
}
