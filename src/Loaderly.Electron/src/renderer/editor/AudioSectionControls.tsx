import {useState} from 'react';
import {Plus,Trash2,Music2,Clock3} from 'lucide-react';
import {AudioControls} from './AudioControls';
import {DesktopMenu} from './DesktopMenu';
import {TimeField} from './TimeField';
import {formatTimecode} from '../../shared/editor-timeline/timecode';
import {MAX_AUDIO_SECTIONS,type AudioSection} from '../../shared/editor-project/audioSections';
import type {AudioSettings} from '../../shared/editor-project/audioProcessing';

export function AudioSectionControls({base,sections,selectedId,onSelect,onBase,onSections,duration,playhead,onSeek,ar,loop,onLoopChange}:{base:AudioSettings;sections:AudioSection[];selectedId?:string;onSelect:(id?:string)=>void;onBase:(value:AudioSettings)=>void;onSections:(value:AudioSection[])=>void;duration:number;playhead:number;onSeek:(time:number)=>void;ar:boolean;loop?:boolean;onLoopChange:(value:boolean)=>void}){
  const [message,setMessage]=useState('');const selected=sections.find(s=>s.id===selectedId),t=(en:string,a:string)=>ar?a:en;
  const update=(patch:Partial<AudioSection>)=>{if(!selected)return false;const next={...selected,...patch};if(next.endSeconds<=next.startSeconds||sections.some(s=>s.id!==next.id&&s.startSeconds<next.endSeconds&&next.startSeconds<s.endSeconds)){setMessage(t('Sections cannot overlap. Choose a free time range.','لا يمكن تداخل الأجزاء. اختر فترة فارغة.'));return false;}setMessage('');onSections(sections.map(s=>s.id===next.id?next:s));return true;};
  const add=()=>{const start=Math.max(0,Math.min(playhead,duration-.01)),end=Math.min(duration,start+3,...sections.filter(s=>s.startSeconds>start).map(s=>s.startSeconds));if(sections.length>=MAX_AUDIO_SECTIONS||sections.some(s=>start>=s.startSeconds&&start<s.endSeconds)||end-start<.01){setMessage(t('Move the playhead to a free part of the track before adding a section.','حرّك مؤشر التشغيل إلى جزء فارغ قبل إضافة جزء جديد.'));return;}const id=crypto.randomUUID();onSections([...sections,{id,startSeconds:start,endSeconds:end,settings:{...base,fadeIn:0,fadeOut:0}}]);onSelect(id);setMessage('');};
  return <div className="audio-sections"><div className="audio-section-scope">
    <DesktopMenu ariaLabel={t('Sound editing scope','نطاق تعديل الصوت')} icon={selected?<Clock3 size={14}/>:<Music2 size={14}/>} value={selected?.id??'whole'} valueLabel={selected?`${t('Section','جزء')} ${sections.indexOf(selected)+1} / ${sections.length}`:t('Whole track','المقطع كاملًا')} options={[
      {value:'whole',label:t('Whole track','المقطع كاملًا'),description:t('Default sound outside individual sections','الصوت العام خارج الأجزاء المخصصة'),icon:Music2},
      ...sections.map((section,i)=>({value:section.id,label:`${t('Section','جزء')} ${i+1}`,description:`${formatTimecode(section.startSeconds)} – ${formatTimecode(section.endSeconds)}`,icon:Clock3}))
    ]} onChange={id=>{const section=sections.find(s=>s.id===id);onSelect(section?.id);if(section)onSeek(section.startSeconds);setMessage('');}}/>
    <button className="button secondary" onClick={add} disabled={sections.length>=MAX_AUDIO_SECTIONS}><Plus size={14}/>{t('Add sound section','إضافة جزء صوتي')}</button></div>
    {selected?<div className="inspector-section" key={`timing-${selected.id}`}><strong>{t('Edit this section only','تعديل هذا الجزء فقط')}</strong><div className="inspector-grid"><TimeField label={t('Section start','بداية الجزء')} value={selected.startSeconds} max={selected.endSeconds-.01} ar={ar} onChange={startSeconds=>update({startSeconds})}/><TimeField label={t('Section end','نهاية الجزء')} value={selected.endSeconds} min={selected.startSeconds+.01} max={duration} ar={ar} onChange={endSeconds=>update({endSeconds})}/></div><button className="button secondary" onClick={()=>{onSections(sections.filter(s=>s.id!==selected.id));onSelect(undefined);setMessage('');}}><Trash2 size={14}/>{t('Remove sound section','إزالة الجزء الصوتي')}</button><small>{t('Drag the section to move it. Drag either edge to resize it. Whole-track sound returns outside the section.','اسحب الجزء لتحريكه أو أحد طرفيه لتغيير مدته. خارج الجزء ترجع إعدادات الصوت العامة.')}</small></div>:<p>{t('Set the track sound here, or place the playhead and add a section for a bass boost, echo or different volume.','اضبط صوت المقطع هنا، أو حرّك المؤشر وأضف جزءًا لرفع الباس أو الصدى أو تغيير المستوى.')}</p>}
    {message&&<p role="status">{message}</p>}
    <AudioControls key={selected?.id??'whole'} value={selected?.settings??base} onChange={value=>selected?update({settings:{...value,fadeIn:0,fadeOut:0}}):onBase(value)} ar={ar} hideFades={!!selected} loop={selected?undefined:loop} onLoopChange={onLoopChange}/>
  </div>;
}
