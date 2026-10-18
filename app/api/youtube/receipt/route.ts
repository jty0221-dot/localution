import { NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { loadYoutubeConnection,youtubeGet } from '@/app/lib/youtube-token'
export const dynamic='force-dynamic'
export async function GET(request:Request){
 const auth=await requireUser(),headers={'Cache-Control':'no-store'}
 if(!auth.ok)return reply({error:'로그인이 필요합니다.'},{status:401,headers})
 const id=new URL(request.url).searchParams.get('id')||''
 if(!/^[a-zA-Z0-9_-]{11}$/.test(id))return reply({error:'영상 식별자를 확인해 주세요.'},{status:400,headers})
 try{
  const c=await loadYoutubeConnection(auth.userId)
  if(!c)return reply({error:'채널 연결이 필요합니다.'},{status:409,headers})
  const data=await youtubeGet('videos?part=snippet,status,processingDetails&id='+id,c.access_token),video=data.items?.[0]
  if(!video||video.snippet?.channelId!==c.channelId)return reply({error:'내 채널의 영상으로 확인되지 않았습니다.'},{status:404,headers})
  return reply({id:video.id,title:video.snippet.title,privacy:video.status?.privacyStatus,uploadStatus:video.status?.uploadStatus,processingStatus:video.processingDetails?.processingStatus,url:'https://www.youtube.com/watch?v='+video.id},{headers})
 }catch{return reply({error:'영상 접수 결과를 확인하지 못했습니다. YouTube Studio에서 확인해 주세요.'},{status:502,headers})}
}

function reply(body: unknown, init?: ResponseInit) { return NextResponse.json(body, {...init, headers: {...init?.headers, 'Cache-Control':'private, no-store'}}) }
