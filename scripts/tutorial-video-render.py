"""Render code-grounded, silent procedure guides. These are not execution recordings.

Requires Pillow, fontTools[woff] and ffmpeg. No external API, user data or paid media.
Usage: python scripts/tutorial-video-render.py
"""
import json, math, re, subprocess, tempfile, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'tutorials'
OUT.mkdir(parents=True, exist_ok=True)
source = (ROOT / 'app/lib/tool-catalog.ts').read_text(encoding='utf-8')
tasks = []
for line in source.splitlines():
    if "{ id: '" not in line or 'preparation:' not in line:
        continue
    task = dict(re.findall(r"(id|title|problem|preparation|result|href|access): '([^']*)'", line))
    if task['id']=='reservations':
        task['preparation']='예약 날짜와 시간, 필요한 메모'
        task['access']='browser'
    if task['id']=='customers':
        task['preparation']='적법하게 보유한 고객 정보와 방문 기록'
    tasks.append(task)
actions = {}
for match in re.finditer(r"(?:'([^']+)'|(\w+)): \{ label: '[^']+', next: '([^']+)'", source):
    actions[match[1] or match[2]] = match[3]
font_path = Path(tempfile.gettempdir()) / 'localution-tutorial-pretendard.ttf'
font = TTFont(ROOT / 'public/fonts/pretendard/PretendardVariable.woff2')
font.flavor = None
font.save(font_path)
F = {size: ImageFont.truetype(str(font_path), size) for size in [15, 17, 18, 20, 22, 28, 34]}
W,H,FPS,DURATION = 960,540,15,12
INK, MUTED, TEAL = '#172B2F','#53656A','#16685D'

def wrap(text, size, width):
    result, line = [], ''
    for char in text:
        if F[size].getlength(line + char) > width:
            result.append(line)
            line = char
        else:
            line += char
    if line:
        result.append(line)
    return result

def text_block(draw, text, xy, size, width, fill=INK, gap=8):
    x,y=xy
    for line in wrap(text,size,width):
        draw.text((x,y),line,font=F[size],fill=fill)
        y += size+gap
    return y

def render(task, frame):
    t=frame/FPS
    stage=min(2,int(t/4))
    im=Image.new('RGB',(W,H),'#F3F5F4'); d=ImageDraw.Draw(im)
    d.text((38,24),'LOCALUTION  /  기능 사용 안내',font=F[17],fill=TEAL)
    d.rounded_rectangle((736,20,922,53),radius=6,fill='#E7F1ED')
    d.text((749,27),'절차 설명 · 무음 영상',font=F[15],fill=TEAL)
    text_block(d,task['title'],(38,78),34,850)
    text_block(d,task['problem'],(40,133),20,860,MUTED)
    # Layered isometric geometry adds restrained 2.5D motion without invented UI.
    for k in range(3):
        x=820+k*9; y=205-k*17+math.sin(t*1.4+k)*5
        d.polygon([(x-38,y),(x,y-21),(x+38,y),(x,y+21)],fill=['#CBDDD6','#8DB9A8','#16685D'][k])
        d.polygon([(x-38,y),(x,y+21),(x,y+33),(x-38,y+12)],fill=['#B8CEC4','#7CA996','#105448'][k])
    labels=['준비하기','입력하고 확인하기','결과를 검토하고 사용하기']
    content=[task['preparation'], task['result'], actions.get(task['id'],'결과를 직접 확인한 뒤 사용하세요.')]
    for i in range(3):
        x=38+i*298
        active=i==stage
        d.rounded_rectangle((x,215,x+280,405),radius=10,fill='#FFFFFF',outline=TEAL if active else '#D5DEDC',width=3 if active else 1)
        d.rounded_rectangle((x+17,232,x+48,263),radius=6,fill=TEAL if active else '#E7F1ED')
        d.text((x+27,239),str(i+1),font=F[17],fill='#FFFFFF' if active else TEAL)
        d.text((x+17,278),labels[i],font=F[18],fill=TEAL if active else INK)
        text_block(d,content[i],(x+17,314),18,246,MUTED,7)
    foot = '로그인 후 필요한 정보를 준비하세요. 저장과 조회 결과는 직접 확인하세요.' if task['access']=='account' else ('외부 도구의 연결과 조회 상태를 확인한 뒤 사용하세요.' if task['access']=='tool' else '입력 조건과 결과를 직접 확인하세요. 외부 게시가 자동 실행되지는 않습니다.')
    d.text((40,427),foot,font=F[17],fill=MUTED)
    if task['id']=='reservations':
        d.rectangle((30,421,930,457),fill='#F3F5F4')
        d.text((40,427),'현재 브라우저에만 저장됩니다. 다른 기기와 자동 동기화되지 않습니다.',font=F[17],fill=MUTED)
    if task['id']=='customers':
        d.rectangle((30,421,930,457),fill='#F3F5F4')
        d.text((40,427),'게스트도 사용할 수 있습니다. 고객 정보의 저장 범위와 이용 목적을 확인하세요.',font=F[17],fill=MUTED)
    if task['id']=='campaign-url' and stage==2 and (OUT/'campaign-url-source.png').exists():
        d.rectangle((30,178,930,460),fill='#F3F5F4')
        screen=Image.open(OUT/'campaign-url-source.png').convert('RGB')
        screen.thumbnail((600,272))
        im.paste(screen,(320,181))
        text_block(d,'운영 화면 예시',(40,203),22,260,TEAL)
        text_block(d,'예시 값을 입력해 생성한 실제 결과 화면입니다.',(40,247),20,250)
        text_block(d,'실시간 녹화가 아닌 실화면 캡처 설명입니다.',(40,326),17,250,MUTED)
    d.rounded_rectangle((38,468,922,508),radius=6,fill='#172B2F')
    d.text((54,479),['먼저 준비할 정보를 확인하세요.','기능을 열고 입력 내용과 결과를 확인하세요.','결과를 검토한 뒤 다음 행동으로 이어가세요.'][stage],font=F[18],fill='#FFFFFF')
    d.rectangle((38,520,38+884*min(1,t/DURATION),523),fill=TEAL)
    return im

manifest=json.loads((OUT/'manifest.json').read_text(encoding='utf-8')) if len(sys.argv)>1 and (OUT/'manifest.json').exists() else []
for task in tasks:
    if len(sys.argv)>1 and task['id'] not in sys.argv[1:]:
        continue
    dest=OUT/(task['id']+'.mp4')
    command=['ffmpeg','-y','-hide_banner','-loglevel','error','-f','rawvideo','-vcodec','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-an','-c:v','libx264','-preset','veryfast','-crf','26','-pix_fmt','yuv420p','-movflags','+faststart',str(dest)]
    proc=subprocess.Popen(command,stdin=subprocess.PIPE)
    for frame in range(FPS*DURATION):
        proc.stdin.write(render(task,frame).tobytes())
    proc.stdin.close()
    if proc.wait()!=0:
        raise RuntimeError('ffmpeg failed: '+task['id'])
    render(task,30).save(OUT/(task['id']+'.jpg'),quality=90)
    captions=['준비할 정보: '+task['preparation'],'기능에서 확인할 내용: '+task['result'],actions.get(task['id'],'결과를 직접 확인한 뒤 사용하세요.')]
    vtt='WEBVTT\n\n'
    for i,c in enumerate(captions):
        vtt+=f'00:00:{i*4:02}.000 --> 00:00:{(i+1)*4:02}.000\n{c}\n\n'
    (OUT/(task['id']+'.vtt')).write_text(vtt,encoding='utf-8')
    manifest=[entry for entry in manifest if entry['id']!=task['id']]
    manifest.append({'id':task['id'],'type':'procedure-motion-with-production-capture' if task['id']=='campaign-url' else 'procedure-motion','duration':DURATION,'width':W,'height':H,'fps':FPS,'audio':False,'source':'app/lib/tool-catalog.ts','executionRecording':False,'productionCapture':task['id']=='campaign-url','bytes':dest.stat().st_size})
    print(task['id'],dest.stat().st_size,flush=True)
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
