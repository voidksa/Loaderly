import { decodeEditorPreset, encodeEditorPreset } from '../../shared/editorPreset';
export function EditorPresetDesigner({code,onChange,ar}:{code:string;onChange:(code:string)=>void;ar:boolean}){
 const preset=decodeEditorPreset(code);if(!preset)return <p>{ar?'قالب غير مدعوم.':'Unsupported template.'}</p>;
 const t=(en:string,a:string)=>ar?a:en;
 const update=(edits:typeof preset.edits)=>onChange(encodeEditorPreset({...preset,edits}));
 return <section className="studio-extension"><p>{t('Loaderly 2.3.0 or later. Text timing adapts to the selected media. Images, audio files and transcripts are excluded.','يتطلب Loaderly 2.3.0 أو أحدث. يتكيف توقيت النص مع الوسائط المحددة. لا تُضمّن الصور وملفات الصوت والتفريغ.')}</p><div className="studio-grid">
 {(['brightness','contrast','saturation','warmth'] as const).map(key=><label key={key}>{ar?{brightness:'السطوع',contrast:'التباين',saturation:'التشبع',warmth:'حرارة اللون'}[key]:key}<input type="number" step={.05} min={key==='brightness'||key==='warmth'?-1:0} max={key==='brightness'||key==='warmth'?1:3} value={preset.edits.color[key]} onChange={e=>update({...preset.edits,color:{...preset.edits.color,[key]:e.target.valueAsNumber}})}/></label>)}</div>
 <label><input type="checkbox" checked={preset.edits.audio.normalize} onChange={e=>update({...preset.edits,audio:{...preset.edits.audio,normalize:e.target.checked}})}/>{t('Normalize loudness','توحيد جهارة الصوت')}</label>
 {preset.edits.overlays.map(o=><label className="studio-field" key={o.id}>{t('Template text','نص القالب')}<textarea value={o.text} onChange={e=>update({...preset.edits,overlays:preset.edits.overlays.map(v=>v.id===o.id?{...v,text:e.target.value}:v)})}/></label>)}
 <p>{t('For more changes, apply the template to media and open Editing workspace.','لمزيد من التعديلات، طبّق القالب على وسائط وافتح مساحة أدوات التحرير.')}</p></section>;
}
