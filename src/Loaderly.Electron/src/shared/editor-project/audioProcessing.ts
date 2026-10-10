import { normalizeAudioSpace, type AudioSpace } from './audioSpace';
export type AudioSettings = { gainDb:number; fadeIn:number; fadeOut:number; bass:number; treble:number; mono:boolean; muted:boolean; space?:AudioSpace };
export const defaultAudioSettings: AudioSettings = {gainDb:0,fadeIn:0,fadeOut:0,bass:0,treble:0,mono:false,muted:false};
export type AudioTimeline = {
  ranges: readonly {startSeconds:number;endSeconds:number}[];
  speed?: {startTime:number;endTime:number;rate:number};
  speeds?: readonly {startTime:number;endTime:number;rate:number;mode?:string}[];
};
// Fades follow the edited output, including removed ranges and changed speed.
export function audioOutputTime(sourceTime:number,timeline:AudioTimeline):number {
  return timeline.ranges.reduce((elapsed,range)=>{
    const end=Math.min(sourceTime,range.endSeconds),start=range.startSeconds;
    if(end<=start)return elapsed;
    const speeds=timeline.speeds??(timeline.speed?[timeline.speed]:[]);
    const points=[...new Set([start,end,...speeds.flatMap(s=>[s.startTime,s.endTime])].map(p=>Math.max(start,Math.min(end,p))))].sort((a,b)=>a-b);
    for(let i=0;i<points.length-1;i++){const midpoint=(points[i]+points[i+1])/2;const speed=speeds.find(s=>midpoint>=s.startTime&&midpoint<s.endTime);elapsed+=(points[i+1]-points[i])/Math.max(.25,speed?.rate??1)}
    return elapsed;
  },0);
}
export function normalizeAudioSettings(value:unknown):AudioSettings {
 const v=value&&typeof value==='object'?value as Record<string,unknown>:{};
 const n=(k:string,min:number,max:number)=>typeof v[k]==='number'&&Number.isFinite(v[k])?Math.min(max,Math.max(min,v[k] as number)):0;
 return {gainDb:n('gainDb',-60,12),fadeIn:n('fadeIn',0,10),fadeOut:n('fadeOut',0,10),bass:n('bass',-12,12),treble:n('treble',-12,12),mono:v.mono===true,muted:v.muted===true,space:normalizeAudioSpace(v.space)};
}
export function audioFilterChain(value:unknown,duration:number):string {
 const s=normalizeAudioSettings(value),filters:string[]=[];
 if(s.bass)filters.push(`bass=g=${s.bass}:f=200`);
 if(s.treble)filters.push(`treble=g=${s.treble}:f=3000`);
 if(s.mono)filters.push('aformat=channel_layouts=mono');
 if(s.muted||s.gainDb)filters.push(`volume=${s.muted?'0':`${s.gainDb}dB`}`);
 if(s.fadeIn)filters.push(`afade=t=in:d=${Math.min(s.fadeIn,duration).toFixed(4)}`);
 if(s.fadeOut)filters.push(`afade=t=out:st=${Math.max(0,duration-s.fadeOut).toFixed(4)}:d=${Math.min(s.fadeOut,duration).toFixed(4)}`);
 return filters.join(',');
}
