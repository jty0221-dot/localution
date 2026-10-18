import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { requireUser } from '@/app/lib/userAuth'
import { youtubeConfig, youtubeConfigured, youtubeGet, saveYoutubeConnection } from '@/app/lib/youtube-token'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(request:Request) {
 const url=new URL(request.url),jar=await cookies(),auth=await requireUser()
 const state=jar.get('youtube_state')?.value,uid=jar.get('youtube_uid')?.value,verifier=jar.get('youtube_verifier')?.value
 for(const name of ['youtube_state','youtube_uid','youtube_verifier'])jar.set(name,'',{path:'/api/oauth/youtube',maxAge:0})
 const back=(result:string)=>{const response=NextResponse.redirect(new URL('/marketing/youtube-community?youtube='+result, youtubeConfig().callback || 'https://www.localution.co.kr'));response.headers.set('Cache-Control','private, no-store');return response}
 if(!auth.ok || uid!==auth.userId || !state || state!==url.searchParams.get('state') || !verifier)return back('invalid_session')
 if(!youtubeConfigured() || !url.searchParams.get('code'))return back('not_connected')
 try {
  const config=youtubeConfig()
  const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:config.clientId!,client_secret:config.clientSecret!,redirect_uri:config.callback!,code:url.searchParams.get('code')!,code_verifier:verifier,grant_type:'authorization_code'}),signal:AbortSignal.timeout(15000)})
  const token=await response.json()
  if(!response.ok || !token.access_token || !token.refresh_token)return back('permission_required')
  const lifetime=Number(token.expires_in)
  if(!Number.isFinite(lifetime)||lifetime<=0)return back('connection_failed')
  const scopes=String(token.scope||'').split(' ')
  if(!scopes.includes('https://www.googleapis.com/auth/youtube.upload')||!scopes.includes('https://www.googleapis.com/auth/youtube.readonly'))return back('permission_required')
  const channels=await youtubeGet('channels?part=snippet&mine=true',token.access_token),channel=channels.items?.[0]
  if(!channel?.id)return back('channel_required')
  await saveYoutubeConnection(auth.userId,{access_token:token.access_token,refresh_token:token.refresh_token,expires_at:Date.now()+lifetime*1000,channelId:channel.id,channelTitle:channel.snippet?.title||channel.id})
  return back('connected')
 }catch{return back('connection_failed')}
}
