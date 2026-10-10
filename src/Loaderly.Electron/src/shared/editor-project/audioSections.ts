import {audioOutputTime,normalizeAudioSettings,type AudioSettings,type AudioTimeline} from './audioProcessing';

export type AudioSection={id:string;startSeconds:number;endSeconds:number;settings:AudioSettings};
export const MAX_AUDIO_SECTIONS=32;
export function normalizeAudioSections(value:unknown,duration=86400):AudioSection[]{
  if(!Array.isArray(value))return [];
  const sections:AudioSection[]=[];
  for(const item of value.slice(0,MAX_AUDIO_SECTIONS)){
    if(!item||typeof item!=='object'||!Number.isFinite(item.startSeconds)||!Number.isFinite(item.endSeconds))continue;
    const startSeconds=Math.max(0,Math.min(duration,item.startSeconds)),endSeconds=Math.max(0,Math.min(duration,item.endSeconds));
    if(endSeconds-startSeconds<.01||sections.some(s=>s.startSeconds<endSeconds&&startSeconds<s.endSeconds))continue;
    sections.push({id:typeof item.id==='string'?item.id.slice(0,80):`section-${sections.length}`,startSeconds,endSeconds,settings:{...normalizeAudioSettings(item.settings),fadeIn:0,fadeOut:0}});
  }
  return sections.sort((a,b)=>a.startSeconds-b.startSeconds);
}
export function audioSectionAt(sections:readonly AudioSection[],time:number){return sections.find(s=>time>=s.startSeconds&&time<s.endSeconds);}
export function adjustAudioSectionWindow(section:AudioSection,sections:readonly AudioSection[],duration:number,edge:'move'|'start'|'end',seconds:number){
  const others=sections.filter(s=>s.id!==section.id);
  const lower=Math.max(0,...others.filter(s=>s.endSeconds<=section.startSeconds).map(s=>s.endSeconds));
  const upper=Math.min(duration,...others.filter(s=>s.startSeconds>=section.endSeconds).map(s=>s.startSeconds));
  const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
  if(edge==='start')return {...section,startSeconds:clamp(seconds,lower,section.endSeconds-.01)};
  if(edge==='end')return {...section,endSeconds:clamp(seconds,section.startSeconds+.01,upper)};
  const span=section.endSeconds-section.startSeconds,startSeconds=clamp(seconds,lower,upper-span);
  return {...section,startSeconds,endSeconds:startSeconds+span};
}
export function audioSectionsForOutput(sections:readonly AudioSection[],timeline:AudioTimeline):AudioSection[]{
  return sections.map(s=>({...s,startSeconds:audioOutputTime(s.startSeconds,timeline),endSeconds:audioOutputTime(s.endSeconds,timeline)})).filter(s=>s.endSeconds-s.startSeconds>=.01);
}
export function audioSectionPieces(base:AudioSettings,sections:readonly AudioSection[],duration:number){
  const valid=normalizeAudioSections(sections,duration);
  const points=[...new Set([0,duration,...valid.flatMap(s=>[s.startSeconds,s.endSeconds])])].sort((a,b)=>a-b);
  return points.slice(0,-1).map((start,i)=>({start,end:points[i+1],settings:{...(audioSectionAt(valid,(start+points[i+1])/2)?.settings??base),fadeIn:0,fadeOut:0}}));
}
