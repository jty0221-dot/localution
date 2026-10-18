import { NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { youtubeConfig,openYoutubeUpload,loadYoutubeConnection } from '@/app/lib/youtube-token'
export const runtime='nodejs'
export const maxDuration=60
export async function POST(request:Request){
 const headers={'Cache-Control':'no-store'}
 if(request.headers.get('origin')!==new URL(youtubeConfig().callback||'https://www.localution.co.kr').origin)return reply({error:'요청 출처가 일치하지 않습니다.'},{status:403,headers})
 const auth=await requireUser()
 if(!auth.ok)return reply({error:'로그인이 필요합니다.'},{status:401,headers})
 let session
 try{session=openYoutubeUpload(request.headers.get('x-upload-session')||'',auth.userId)}catch{return reply({error:'업로드 세션이 만료되었거나 일치하지 않습니다. YouTube Studio에서 접수 상태를 확인해 주세요.'},{status:400,headers})}
 try{
  const c=await loadYoutubeConnection(auth.userId)
  if(!c||c.channelId!==session.channel)return reply({error:'업로드를 시작한 채널 연결이 필요합니다.'},{status:409,headers})
  const probe=new URL(request.url).searchParams.get('probe')==='1'
  const declared=Number(request.headers.get('content-length')||0)
  if(declared>3*1024*1024)return reply({error:'전송 조각이 너무 큽니다.'},{status:413,headers})
  const bytes=await request.arrayBuffer(),offset=Number(request.headers.get('x-upload-offset'))
  if(bytes.byteLength>3*1024*1024||(probe&&bytes.byteLength!==0)||(!probe&&(!Number.isSafeInteger(offset)||offset<0||offset%262144!==0||bytes.byteLength===0||offset+bytes.byteLength>session.size||(offset+bytes.byteLength<session.size&&bytes.byteLength%262144!==0))))return reply({error:'전송 범위를 확인해 주세요.'},{status:400,headers})
  const range=probe?`bytes */${session.size}`:`bytes ${offset}-${offset+bytes.byteLength-1}/${session.size}`
  const response=await fetch(session.url,{method:'PUT',headers:{Authorization:`Bearer ${c.access_token}`,'Content-Type':session.mime,'Content-Length':String(bytes.byteLength),'Content-Range':range},body:bytes,signal:AbortSignal.timeout(45000),redirect:'error'})
  if(response.status===308){
   const range=response.headers.get('range'),match=range?.match(/^bytes=0-(\d+)$/)
   if(range&&!match)throw new Error('invalid_range')
   const offset=match?Number(match[1])+1:0
   if(offset>session.size)throw new Error('invalid_offset')
   return reply({complete:false,offset},{headers})
  }
  if(response.ok){const video=await response.json();if(!/^[\w-]{11}$/.test(video.id||''))throw new Error('missing_receipt');return reply({complete:true,id:video.id,offset:session.size},{headers})}
  return reply({error:response.status===404?'업로드 세션이 만료되었습니다. Studio에서 기존 영상 접수 여부를 확인해 주세요.':'YouTube 전송이 일시 중단되었습니다. 같은 세션의 상태를 다시 확인해 주세요.'},{status:502,headers})
 }catch{return reply({error:'전송 결과를 확인하지 못했습니다. 이어서 전송하면 기존 세션부터 조회합니다.'},{status:502,headers})}
}

function reply(body: unknown, init?: ResponseInit) { return NextResponse.json(body, {...init, headers: {...init?.headers, 'Cache-Control':'private, no-store'}}) }
