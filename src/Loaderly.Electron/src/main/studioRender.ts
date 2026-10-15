import { mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { normalizeOutputPreset, normalizeStudioEdits, projectInterval, sourcePieces, type StudioEdits, type TranscriptWord } from '../shared/editor-project/studio';
import { probeStudioMedia } from './studioAnalysis';
import { studioProcess } from './studioProcess';
import { wordCaptionAss } from '../shared/editor-project/studioCaptions';
import { studioMotionAt, motionExpression } from '../shared/editor-project/studioMotion';
import { studioTextTexture } from './studioText';

export type StudioRenderInput = { outputPreset?: import('../shared/editor-project/studio').StudioOutputPreset; sourcePath: string; kind: string; startSeconds: number; endSeconds: number; frameSeconds?: number; cutOutRanges?: readonly { startSeconds: number; endSeconds: number }[]; effects?: { speeds?: readonly { startSeconds?: number; endSeconds?: number; rate: number }[] }; studio?: StudioEdits; transcriptWords?: TranscriptWord[] };
const filterPath = (path: string) => path.replaceAll('\\','/').replaceAll(':','\\:').replaceAll("'", "'\\''");
const n = (value: number) => Number(value.toFixed(6)).toString();
export async function applyStudioOutput(ffmpeg: string, ffprobe: string, output: string, request: StudioRenderInput, font: string, signal?: AbortSignal) {
  const edits = normalizeStudioEdits(request.studio, request.endSeconds), directory = await mkdtemp(join(dirname(output), '.loaderly-studio-'));
  try {
    const still = ['image','snapshot'].includes(request.kind);
    const media = await probeStudioMedia(ffprobe, output, signal, still);
    const pieces = sourcePieces(request.startSeconds, request.endSeconds, request.cutOutRanges, request.effects?.speeds?.map(s=>({...s,startSeconds:s.startSeconds??request.startSeconds,endSeconds:s.endSeconds??request.endSeconds})));
    const intervals = (start: number, end: number) => still ? (request.frameSeconds! >= start && request.frameSeconds! <= end ? [{start:0,end:1}] : []) : projectInterval(start,end,pieces);
    const args = ['-v','error','-y','-filter_complex_threads','1','-i',output], filters: string[] = []; let inputIndex = 0, v = '0:v', a = media.audio ? '0:a' : '', count = 0;
    const videoFilter = (filter: string) => { const next = `v${count++}`; filters.push(`[${v}]${filter}[${next}]`); v = next; };
    const audioFilter = (filter: string) => { const next = `a${count++}`; filters.push(`[${a}]${filter}[${next}]`); a = next; };
    if (request.kind !== 'audio') {
      const c = edits.color;
      const colorTimes = edits.colorRange ? intervals(edits.colorRange.start, edits.colorRange.end) : undefined;
      const colorEnable = colorTimes ? `:enable='${colorTimes.map(i=>`between(t,${n(i.start)},${n(i.end)})`).join('+') || '0'}'` : '';
      videoFilter(`eq=brightness=${n(c.brightness)}:contrast=${n(c.contrast)}:saturation=${n(c.saturation)}${colorEnable},colorbalance=rs=${n(c.warmth*.15)}:bs=${n(-c.warmth*.15)}${colorEnable}`);
      for (const overlay of edits.overlays) {
        const textTexture=overlay.kind==='text'&&overlay.text&&(overlay.keyframes?.length||overlay.animation==='zoom')
          ? await studioTextTexture(ffmpeg,directory,count++,overlay.text,font,overlay.fontSize,overlay.color,media.width,media.height,signal):undefined;
        for (const interval of intervals(overlay.start,overlay.end)) {
          const duration = interval.end-interval.start, fade = Math.min(.3,duration/2), enable = `between(t,${n(interval.start)},${n(interval.end)})`;
          const piece=pieces.find(p=>interval.start>=p.outputStart-.000001&&interval.start<p.outputStart+(p.end-p.start)/p.rate-.000001);
          const sourceAt=(time:number)=>still?request.frameSeconds! : piece?piece.start+(time-piece.outputStart)*piece.rate:time;
          const points=overlay.keyframes?.length ? [sourceAt(interval.start),...(overlay.keyframes??[]).map(k=>k.time).filter(time=>time>sourceAt(interval.start)&&time<sourceAt(interval.end)),sourceAt(interval.end)].map(time=>({...studioMotionAt(overlay.keyframes!,time)!,time:still?0:interval.start+(time-sourceAt(interval.start))/(piece?.rate??1)})) : [];
          const motion=(key:'x'|'y'|'width'|'opacity',clock='t')=>points.length?motionExpression(points,key,clock):n(overlay[key]);
          const x = `W*(${motion('x')})/100`, y = `H*(${motion('y')})/100`;
          if ((overlay.kind === 'image' && overlay.path) || textTexture) {
            args.push('-loop','1','-i',textTexture?.path??overlay.path!); const image = ++inputIndex, imageLabel = `image${count++}`;
            const width = textTexture?.width??Math.max(2,Math.round(media.width*overlay.width/100));
            const multiplier=textTexture?textTexture.width/overlay.width:media.width/100;
            const scale = points.length ? `scale=w='max(2,min(8192,${n(multiplier)}*(${motion('width',`(t+${n(interval.start)})`)})))':h=-1:eval=frame` : overlay.animation === 'zoom' ? `scale=w='${width}*(0.8+0.2*min(t/${n(fade)},1))':h=-1:eval=frame` : `scale=${width}:-1`;
            const opacity = overlay.animation === 'fade' ? `,fade=t=in:st=0:d=${n(fade)}:alpha=1,fade=t=out:st=${n(Math.max(fade,duration-fade))}:d=${n(fade)}:alpha=1` : '';
            const alpha=points.length?`geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='alpha(X,Y)*(${motion('opacity',`(T+${n(interval.start)})`)})'`:`colorchannelmixer=aa=${n(overlay.opacity)}`;
            // Evaluate alpha on the fixed image before animated scaling. geq can
            // retain a frame-sized working buffer when its input dimensions change.
            filters.push(`[${image}:v]format=rgba,${alpha}${opacity},${scale},setpts=PTS-STARTPTS+${n(interval.start)}/TB[${imageLabel}]`);
            const next = `v${count++}`, offset = overlay.animation === 'slide' ? `-${width}*(1-min(max((t-${n(interval.start)})/${n(fade)},0),1))` : '';
            filters.push(`[${v}][${imageLabel}]overlay=x='${x}${offset}':y='${y}':enable='${enable}':eof_action=pass:shortest=0[${next}]`); v=next;
          } else if (overlay.text) {
            const path = join(directory,`text-${count}.txt`); await writeFile(path,overlay.text,'utf8');
            const alpha = overlay.animation === 'fade' ? `(${motion('opacity')})*min(min(max((t-${n(interval.start)})/${n(fade)},0),1),min(max((${n(interval.end)}-t)/${n(fade)},0),1))` : motion('opacity');
            const slide = overlay.animation === 'slide' ? `-w*(1-min(max((t-${n(interval.start)})/${n(fade)},0),1))` : '';
            const size = points.length?`'${n(overlay.fontSize)}*(${motion('width')})/${n(overlay.width)}'`:overlay.animation === 'zoom' ? `'${n(overlay.fontSize)}*(0.8+0.2*min(max((t-${n(interval.start)})/${n(fade)},0),1))'` : n(overlay.fontSize);
            videoFilter(`drawtext=fontfile='${filterPath(font)}':textfile='${filterPath(path)}':expansion=none:fontsize=${size}:fontcolor=${overlay.color}:alpha='${alpha}':x='w*(${motion('x')})/100${slide}':y='h*(${motion('y')})/100':enable='${enable}'`);
          }
        }
      }
      if (edits.wordCaptions && request.transcriptWords?.length) {
        // ASS carries timing as events instead of one filter and file per word.
        const words = request.transcriptWords.flatMap(word => intervals(word.start,word.end).map(i=>({...word,...i})));
        const path = join(directory,'words.ass');
        await writeFile(path,wordCaptionAss(words,media.width,media.height,edits.captionColor,edits.captionStyle),'utf8');
        videoFilter(`subtitles=filename='${filterPath(path)}':fontsdir='${filterPath(dirname(font))}'`);
      }
    }
    if (edits.audio.extraPath && !still && request.kind!=='gif') {
      args.push('-i',edits.audio.extraPath); const index=++inputIndex, extra=`extra${count++}`;
      const extraMedia=await probeStudioMedia(ffprobe,edits.audio.extraPath,signal);
      if(!extraMedia.audio)throw new Error('NO_AUDIO');
      const offset=edits.audio.extraOffset??0, available=Math.max(0,extraMedia.duration-offset), length=edits.audio.extraDuration?Math.min(available,edits.audio.extraDuration):available;
      const tracks:string[]=[];
      for(const piece of pieces){
        const from=Math.max(piece.start,edits.audio.extraStart),to=Math.min(piece.end,edits.audio.extraStart+length);if(to<=from)continue;
        const label=`track${count++}`,tempos:number[]=[];let rate=piece.rate;while(rate>2){tempos.push(2);rate/=2;}while(rate<.5){tempos.push(.5);rate/=.5;}tempos.push(rate);
        const delay=piece.outputStart+(from-piece.start)/piece.rate;
        filters.push(`[${index}:a]atrim=start=${n(offset+from-edits.audio.extraStart)}:end=${n(offset+to-edits.audio.extraStart)},asetpts=PTS-STARTPTS,${tempos.map(rate=>`atempo=${n(rate)}`).join(',')},aresample=48000,aformat=channel_layouts=stereo,asetpts=N/SR/TB,volume=${n(edits.audio.extraGain)}dB,adelay=${Math.round(delay*1000)}:all=1,apad,atrim=end_sample=${Math.round(media.duration*48000)},asetpts=N/SR/TB[${label}]`);tracks.push(label);
      }
      if(tracks.length)filters.push(`${tracks.map(t=>`[${t}]`).join('')}amix=inputs=${tracks.length}:duration=longest:normalize=0,asetpts=N/SR/TB[${extra}]`);
      else filters.push(`anullsrc=r=48000:cl=stereo,atrim=duration=${n(media.duration)}[${extra}]`);
      if (!a || edits.audio.replace) a=extra;
      else {
        const mixed=`mixed${count++}`;
        if (edits.audio.duck) {
          const voice=`voice${count++}`, side=`side${count++}`, duck=`duck${count++}`;
          filters.push(`[${a}]asplit[${voice}][${side}]`,`[${extra}][${side}]sidechaincompress=threshold=0.02:ratio=8:attack=20:release=250[${duck}]`,`[${voice}][${duck}]amix=inputs=2:duration=first:normalize=0[${mixed}]`);
        } else filters.push(`[${a}][${extra}]amix=inputs=2:duration=first:normalize=0[${mixed}]`);
        a=mixed;
      }
    }
    if (a && edits.audio.denoise) {
      const sample=edits.audio.noiseSample;
      if(sample){
        const source=await probeStudioMedia(ffprobe,request.sourcePath,signal);
        const length=Math.min(5,sample.end-sample.start,source.duration-sample.start);
        if(!source.audio||length<.2)throw new Error('INVALID_NOISE_SAMPLE');
        args.push('-ss',n(sample.start),'-t',n(length),'-i',request.sourcePath);const index=++inputIndex;
        const noise=`noise${count++}`,body=`body${count++}`,joined=`sampled${count++}`;
        filters.push(`[${index}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=end_sample=${Math.round(length*48000)},asetpts=N/SR/TB[${noise}]`,
          `[${a}]aresample=48000,aformat=channel_layouts=stereo,asetpts=N/SR/TB[${body}]`,
          `[${noise}][${body}]concat=n=2:v=0:a=1[${joined}]`);a=joined;
        // Learn from the chosen source interval first, then discard the prepended
        // sample. The entire export receives the same measured noise profile.
        audioFilter(`asendcmd=c='0 afftdn sn start;${n(length-.05)} afftdn sn stop',afftdn=nr=${n(edits.audio.denoise)},atrim=start_sample=${Math.round(length*48000)},asetpts=N/SR/TB`);
      }else audioFilter(`afftdn=nr=${n(edits.audio.denoise)}`);
    }
    if (edits.freezeDuration && !still && request.kind !== 'audio') {
      const at=projectInterval(edits.freezeAt,edits.freezeAt+.001,pieces)[0]?.start;
      if (at !== undefined) {
        const from=Math.max(0,Math.min(media.duration-.04,at)), first=`f${count++}`, second=`f${count++}`, result=`v${count++}`;
        filters.push(`[${v}]split[${first}][${second}]`,`[${first}]trim=end=${n(Math.max(.04,from))},setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=${n(edits.freezeDuration)}[${first}out]`,`[${second}]trim=start=${n(Math.max(.04,from))},setpts=PTS-STARTPTS[${second}out]`,`[${first}out][${second}out]concat=n=2:v=1:a=0[${result}]`); v=result;
        if(a){ const before=`ab${count++}`, after=`aa${count++}`, result=`a${count++}`; filters.push(`[${a}]asplit[${before}][${after}]`,`[${before}]atrim=end=${n(Math.max(.04,from))},asetpts=PTS-STARTPTS,apad=pad_dur=${n(edits.freezeDuration)}[${before}out]`,`[${after}]atrim=start=${n(Math.max(.04,from))},asetpts=PTS-STARTPTS[${after}out]`,`[${before}out][${after}out]concat=n=2:v=0:a=1[${result}]`); a=result; }
      }
    }
    if (edits.reverse && !still) { if (media.duration+edits.freezeDuration>120) throw new Error('REVERSE_RANGE_TOO_LONG'); if(request.kind!=='audio') videoFilter('reverse'); if(a && edits.reverseAudio !== false)audioFilter('areverse'); }
    const preset=normalizeOutputPreset(request.outputPreset??edits.outputPreset);
    if(preset?.width && preset?.height && request.kind!=='audio')videoFilter(`scale=${preset.width}:${preset.height}:force_original_aspect_ratio=decrease,pad=${preset.width}:${preset.height}:(ow-iw)/2:(oh-ih)/2,setsar=1`);
    if(request.kind==='gif')a='';
    const processed=join(directory,`processed${extname(output)}`);
    const video=request.kind!=='audio';
    if(filters.length){const script=join(directory,'filters.txt');await writeFile(script,filters.join(';'),'utf8');args.push('-/filter_complex',script);}
    if(video)args.push('-map',v==='0:v'?v:`[${v}]`);
    if(a)args.push('-map',a==='0:a'?a:`[${a}]`);
    if(still)args.push('-frames:v','1');
    else if(request.kind==='video')args.push('-c:v','libx264','-preset','fast','-crf',String(preset?.crf??18),'-pix_fmt','yuv420p','-movflags','+faststart');
    if(a)args.push('-c:a',request.kind==='audio'?'libmp3lame':'aac',...(request.kind==='audio'?['-q:a','0']:['-b:a','192k']));
    if(!still)args.push('-t',n(media.duration+edits.freezeDuration));
    args.push(processed); await studioProcess(ffmpeg,args,{signal});
    if(a && edits.audio.normalize){
      const measure=await studioProcess(ffmpeg,['-v','info','-i',processed,'-vn','-af',`loudnorm=I=${edits.audio.targetLufs}:TP=${edits.audio.peakDb}:LRA=11:print_format=json`,'-f','null','-'],{signal});
      const match=measure.stderr.match(/\{\s*"input_i"[\s\S]*?\}/); const stats=match?JSON.parse(match[0]):undefined;
      if(stats && ['input_i','input_tp','input_lra','input_thresh','target_offset'].every(k=>Number.isFinite(Number(stats[k])))){
        const normalized=join(directory,`normalized${extname(output)}`), filter=`loudnorm=I=${edits.audio.targetLufs}:TP=${edits.audio.peakDb}:LRA=11:measured_I=${stats.input_i}:measured_TP=${stats.input_tp}:measured_LRA=${stats.input_lra}:measured_thresh=${stats.input_thresh}:offset=${stats.target_offset}:linear=true`;
        await studioProcess(ffmpeg,['-v','error','-y','-i',processed,'-map','0','-c:v','copy','-af',filter,'-ar','48000','-c:a',request.kind==='audio'?'libmp3lame':'aac',normalized],{signal}); await rename(normalized,processed);
      }
    }
    await rename(processed,output);
  } finally { await rm(directory,{recursive:true,force:true}); }
}
