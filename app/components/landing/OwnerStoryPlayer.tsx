'use client'

import { useRef, useState } from 'react'

const MEDIA = '/hero/owner-story-v2-20261018'

export default function OwnerStoryPlayer() {
  const video = useRef<HTMLVideoElement>(null)
  const [failed, setFailed] = useState(false)

  return <div>
    <video ref={video} controls playsInline preload="metadata" poster={`${MEDIA}/owner-poster.jpg`} aria-label="가게 문을 닫아도 끝나지 않는 하루, 로컬루션 브랜드 영상" aria-describedby="story-caption" className="aspect-video w-full rounded-[10px] bg-black" onError={() => setFailed(true)} onLoadedData={() => setFailed(false)}>
      <source src={`${MEDIA}/owner-story.mp4`} type="video/mp4" />
      <track kind="captions" src={`${MEDIA}/owner-story.vtt`} srcLang="ko" label="한국어" />
      브라우저에서 영상을 재생할 수 없어요. 아래 영상 파일을 열거나 설명을 읽어 주세요.
    </video>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm leading-6 text-[var(--lu-muted)]">
      <p id="story-caption">소리는 재생 버튼을 누른 뒤 조절할 수 있어요. 한국어 자막을 제공해요.</p>
      <a className="inline-flex min-h-11 items-center underline underline-offset-4" href={`${MEDIA}/owner-story.mp4`}>영상 파일 열기</a>
    </div>
    {failed && <div role="status" className="mt-3 rounded-[10px] border border-[var(--lu-line)] p-4 text-sm leading-6">
      <p>영상 연결이 원활하지 않아요. 다시 재생하거나 아래 글로 내용을 확인해 주세요.</p>
      <button type="button" className="mt-2 min-h-11 rounded-md border border-[var(--lu-line)] px-4 font-semibold" onClick={() => { setFailed(false); video.current?.load() }}>영상 다시 불러오기</button>
    </div>}
  </div>
}
