import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomBytes, createHash } from 'crypto'
import { requireUser } from '@/app/lib/userAuth'
import { youtubeConfig, youtubeConfigured } from '@/app/lib/youtube-token'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET() {
 const auth=await requireUser()
 if(!auth.ok)return reply({error:'로그인이 필요합니다.'},{status:401})
 if(!youtubeConfigured())return reply({error:'YouTube 연결 환경 설정이 필요합니다.'},{status:503})
 const state=randomBytes(32).toString('hex'),verifier=randomBytes(32).toString('base64url'),config=youtubeConfig(),jar=await cookies()
 const opts={httpOnly:true,secure:true,sameSite:'lax' as const,maxAge:600,path:'/api/oauth/youtube'}
 jar.set('youtube_state',state,opts);jar.set('youtube_uid',auth.userId,opts);jar.set('youtube_verifier',verifier,opts)
 const url=new URL('https://accounts.google.com/o/oauth2/v2/auth')
 for(const [key,value] of Object.entries({client_id:config.clientId!,redirect_uri:config.callback!,response_type:'code',scope:'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.upload',access_type:'offline',prompt:'consent',state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'}))url.searchParams.set(key,value)
 const response=NextResponse.redirect(url);response.headers.set('Cache-Control','private, no-store');return response
}

function reply(body: unknown, init?: ResponseInit) { return NextResponse.json(body, {...init, headers: {...init?.headers, 'Cache-Control':'private, no-store'}}) }
