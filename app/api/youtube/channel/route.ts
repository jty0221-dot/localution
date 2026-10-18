import { NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { loadYoutubeConnection,youtubeConfigured,youtubeGet } from '@/app/lib/youtube-token'
import { youtubeConfig } from '@/app/lib/youtube-token'
import { createServiceClient } from '@/app/lib/adminAuth'
export const dynamic='force-dynamic'
export async function GET(){
 const headers={'Cache-Control':'no-store'}
 const auth=await requireUser()
 if(!auth.ok)return reply({error:'로그인이 필요합니다.'},{status:401,headers})
 if(!youtubeConfigured())return reply({configured:false,connected:false},{headers})
 try{
  const c=await loadYoutubeConnection(auth.userId)
  if(!c)return reply({configured:true,connected:false},{headers})
  const data=await youtubeGet('channels?part=snippet,statistics&mine=true',c.access_token),channel=data.items?.find((item:{id:string})=>item.id===c.channelId)
  if(!channel)throw new Error('channel_missing')
  return reply({configured:true,connected:true,channel:{id:channel.id,title:channel.snippet?.title,videoCount:channel.statistics?.videoCount}},{headers})
 }catch(error){const schema=error instanceof Error&&error.message==='schema_required';return reply({code:schema?'schema_required':'connection_failed',error:schema?'YouTube 연결 저장소 설정이 필요합니다. 관리자에게 문의해 주세요.':'채널을 확인하지 못했습니다. YouTube를 다시 연결해 주세요.'},{status:schema?503:502,headers})}
}

export async function DELETE(request:Request){
 if(request.headers.get('origin')!==new URL(youtubeConfig().callback||'https://www.localution.co.kr').origin)return reply({error:'요청 출처가 일치하지 않습니다.'},{status:403})
 const auth=await requireUser()
 if(!auth.ok)return reply({error:'로그인이 필요합니다.'},{status:401})
 try{
  const {data,error}=await createServiceClient().from('youtube_connections').delete().eq('user_id',auth.userId).select('user_id').maybeSingle()
  if(error)throw new Error('delete_failed')
  return reply({disconnected:true,removed:Boolean(data)})
 }catch{return reply({error:'연결 해제 결과를 확인하지 못했습니다.'},{status:502})}
}

function reply(body: unknown, init?: ResponseInit) { return NextResponse.json(body, {...init, headers: {...init?.headers, 'Cache-Control':'private, no-store'}}) }
