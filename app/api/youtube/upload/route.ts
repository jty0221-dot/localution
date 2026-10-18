import { NextResponse } from 'next/server'
import { requireUser } from '@/app/lib/userAuth'
import { loadYoutubeConnection,youtubeConfigured,youtubeConfig,validYoutubeUploadUrl,sealYoutubeUpload } from '@/app/lib/youtube-token'
export const runtime='nodejs'
export async function POST(request:Request){
 const allowedOrigin=new URL(youtubeConfig().callback || 'https://www.localution.co.kr').origin
 if(request.headers.get('origin')!==allowedOrigin)return reply({error:'요청 출처를 확인할 수 없습니다.'},{status:403})
 const auth=await requireUser()
 if(!auth.ok)return reply({error:'로그인이 필요합니다.'},{status:401})
 if(!youtubeConfigured())return reply({error:'YouTube 연결 환경 설정이 필요합니다.'},{status:503})
 try{
  const body=await request.json()
  if(typeof body.title!=='string'||!body.title.trim()||body.title.length>100||typeof body.description!=='string'||body.description.length>5000||!Number.isSafeInteger(body.size)||body.size<=0||body.size>256*1024**3||typeof body.mime!=='string'||!/^video\/[a-zA-Z0-9.+-]+$/.test(body.mime)||!['private','unlisted','public'].includes(body.privacy)||typeof body.madeForKids!=='boolean'||body.confirm!==true)return reply({error:'영상 제목, 파일, 공개 범위와 아동용 여부를 확인해 주세요.'},{status:400})
  const c=await loadYoutubeConnection(auth.userId)
  if(!c)return reply({error:'YouTube 채널을 먼저 연결해 주세요.'},{status:409})
  const response=await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',{method:'POST',headers:{Authorization:`Bearer ${c.access_token}`,'Content-Type':'application/json','X-Upload-Content-Type':body.mime,'X-Upload-Content-Length':String(body.size)},body:JSON.stringify({snippet:{title:body.title.trim(),description:body.description},status:{privacyStatus:body.privacy,selfDeclaredMadeForKids:body.madeForKids}}),signal:AbortSignal.timeout(20000)})
  const location=response.headers.get('location')
  if(!response.ok||!location||!validYoutubeUploadUrl(location))return reply({error:'YouTube 업로드를 시작하지 못했습니다. 연결 권한과 채널 업로드 제한을 확인해 주세요.'},{status:502})
  return reply({session:sealYoutubeUpload({uid:auth.userId,url:location,size:body.size,mime:body.mime,channel:c.channelId,expiresAt:Date.now()+3600000}),chunkSize:3*1024*1024,channelId:c.channelId},{headers:{'Cache-Control':'no-store'}})
 }catch{return reply({error:'업로드를 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.'},{status:502})}
}

function reply(body: unknown, init?: ResponseInit) { return NextResponse.json(body, {...init, headers: {...init?.headers, 'Cache-Control':'private, no-store'}}) }
