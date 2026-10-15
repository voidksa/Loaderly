import {audioOutputTime, type AudioTimeline} from './audioProcessing';
import type {EditorSubtitleCue} from './editorSubtitles';

/** Captions use the same cut/speed clock as the rendered audio. */
export function audioCaptionsForOutput(cues:readonly EditorSubtitleCue[],timeline:AudioTimeline):EditorSubtitleCue[] {
  return cues.flatMap(cue=>timeline.ranges.flatMap(range=>{
    const start=Math.max(cue.startSeconds,range.startSeconds),end=Math.min(cue.endSeconds,range.endSeconds);
    if(!cue.text.trim()||!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return [];
    return [{text:cue.text,startSeconds:audioOutputTime(start,timeline),endSeconds:audioOutputTime(end,timeline)}];
  })).sort((a,b)=>a.startSeconds-b.startSeconds);
}

/** Shared canvas caption treatment for live audio preview and MP4 frames. */
export function drawAudioCaption(ctx:CanvasRenderingContext2D,width:number,height:number,text:string) {
  if(!text.trim())return;
  ctx.save();
  const size=Math.max(10,Math.min(width/28,height/18)),maxWidth=width*.86;
  ctx.font=`600 ${size}px "Noto Sans Arabic", "Segoe UI", sans-serif`;
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';
  // Wrap by characters as well as spaces, so a long word or Arabic line fits.
  const lines:string[]=[];
  for(const paragraph of text.split(/\r?\n/)){
    let line='';
    for(const word of paragraph.split(/\s+/)){
      if(line&&ctx.measureText(`${line} ${word}`).width>maxWidth){lines.push(line);line='';}
      for(const char of (line?' ':'')+word){if(ctx.measureText(line+char).width>maxWidth){lines.push(line);line='';}line+=char;}
    }
    if(line)lines.push(line);
  }
  const visible=lines.slice(0,4),lineHeight=size*1.6,padding=size*.45;
  if(lines.length>4)visible[3]=visible[3].slice(0,-1)+'…';
  const boxWidth=Math.min(width*.94,Math.max(...visible.map(line=>ctx.measureText(line).width))+padding*2);
  const boxHeight=visible.length*lineHeight+padding*2,y=height*.92-boxHeight;
  ctx.fillStyle='rgba(0,0,0,.76)';ctx.beginPath();ctx.roundRect((width-boxWidth)/2,y,boxWidth,boxHeight,size*.3);ctx.fill();
  ctx.fillStyle='#fff';
  visible.forEach((line,index)=>{ctx.direction=/[\u0600-\u06ff]/.test(line)?'rtl':'ltr';ctx.fillText(line,width/2,y+padding+lineHeight*(index+.5));});
  ctx.restore();
}
