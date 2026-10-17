"""Probe every tutorial and extract real encoded frames for visual review."""
import concurrent.futures, hashlib, json, subprocess
from pathlib import Path
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/tutorials'
PROOF=ROOT/'작업로그/featurevideo-proof'
PROOF.mkdir(parents=True,exist_ok=True)
manifest=json.loads((OUT/'manifest.json').read_text(encoding='utf-8'))
def verify(entry):
    p=OUT/(entry['id']+'.mp4')
    result=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(p)],text=True,encoding='utf-8'))
    streams=result['streams']; video=streams[0]
    assert len(streams)==1 and video['codec_type']=='video'
    assert video['codec_name']=='h264' and video['width']==960 and video['height']==540
    assert video['pix_fmt']=='yuv420p' and video['r_frame_rate']=='15/1'
    assert abs(float(result['format']['duration'])-12)<0.01
    assert (OUT/(entry['id']+'.jpg')).stat().st_size>0
    assert (OUT/(entry['id']+'.vtt')).read_text(encoding='utf-8').startswith('WEBVTT')
    frame=PROOF/(entry['id']+'-6s.jpg')
    subprocess.run(['ffmpeg','-y','-v','error','-ss','6','-i',str(p),'-frames:v','1',str(frame)],check=True)
    return {'id':entry['id'],'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size,'duration':12,'codec':'h264','width':960,'height':540,'fps':15,'audio':False,'frame':str(frame)}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    results=list(pool.map(verify,manifest))
for n in range(4):
    sheet=Image.new('RGB',(1920,1080),'white')
    for i,item in enumerate(results[n*4:n*4+4]):
        sheet.paste(Image.open(item['frame']),((i%2)*960,(i//2)*540))
    sheet.save(PROOF/f'contact-{n+1}.jpg',quality=94)
(PROOF/'verification.json').write_text(json.dumps({'status':'automated-probes-pass-visual-review-pending','count':len(results),'results':results},ensure_ascii=False,indent=2),encoding='utf-8')
print('PASS',len(results),'videos; frames and four contact sheets extracted')
