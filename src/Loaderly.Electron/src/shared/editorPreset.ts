import { normalizeStudioEdits, type StudioEdits } from './editor-project/studio';
export type EditorPreset={duration:number;edits:StudioEdits};
function safePreset(value:EditorPreset):EditorPreset {
 const duration=Math.max(.1,Math.min(604800,Number(value.duration)||10));
 const edits=normalizeStudioEdits(value.edits,duration);
 // A shared template contains settings and authored text, never media paths or transcripts.
 return {duration,edits:{...edits,outputPreset:edits.outputPreset?{...edits.outputPreset,directory:undefined}:undefined,ranges:[],markers:[],wordCaptions:false,overlays:edits.overlays.filter(o=>o.kind==='text').map(({path,...o})=>o),audio:{...edits.audio,noiseSample:undefined,extraPath:'',extraStart:0,extraOffset:0,extraDuration:0,replace:false,duck:false}}};
}
export function encodeEditorPreset(value:EditorPreset){return JSON.stringify({format:'loaderly-editor',version:1,minimumAppVersion:'2.3.0',...safePreset(value)},null,2);}
export function decodeEditorPreset(code:string):EditorPreset|undefined {
 if(typeof code!=='string'||code.length>100000)return;
 try{const v=JSON.parse(code);if(v?.format!=='loaderly-editor'||v.version!==1||v.minimumAppVersion!=='2.3.0'||!v.edits||typeof v.edits!=='object'||!Number.isFinite(v.duration)||v.duration<=0)return;return safePreset(v);}catch{return;}
}
export function applyEditorPreset(preset:EditorPreset,duration:number):StudioEdits {
 const safe=safePreset(preset),scale=Math.max(.1,duration)/safe.duration;
 return normalizeStudioEdits({...safe.edits,freezeAt:safe.edits.freezeAt*scale,colorRange:safe.edits.colorRange?{start:safe.edits.colorRange.start*scale,end:safe.edits.colorRange.end*scale}:undefined,overlays:safe.edits.overlays.map(o=>({...o,start:o.start*scale,end:o.end*scale,keyframes:o.keyframes?.map(k=>({...k,time:k.time*scale}))}))},duration);
}
