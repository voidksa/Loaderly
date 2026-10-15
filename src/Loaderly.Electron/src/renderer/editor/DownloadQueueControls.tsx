import { StudioSelect } from './StudioSelect';
import { SettingsDialog } from './FloatingSurface';
import { useState } from 'react';
import { Pause, Play, ChevronUp, ChevronDown, Clock3, SlidersHorizontal } from 'lucide-react';
import type { DownloadControlState } from '../../shared/downloadControl';
type Row={id:number;title?:string;source?:string;downloadPaused?:boolean;downloadScheduledAt?:number;status:string};
export function DownloadQueueControls({ar,state,rows,onStart,onSchedule}:{ar:boolean;state:DownloadControlState;rows:readonly Row[];onStart:(id:number)=>void;onSchedule:(id:number,at?:number)=>void}){
 const t=(en:string,arText:string)=>ar?arText:en;
 const [error,setError]=useState(''),[open,setOpen]=useState(false);
 const order=new Map(state.entries.map((entry,index)=>[entry.id,index]));
 const displayed=rows.filter(r=>r.status==='queued'||r.status==='downloading').slice().sort((a,b)=>(order.get(a.id)??Infinity)-(order.get(b.id)??Infinity));
 const control=(request:Parameters<NonNullable<typeof window.loaderly>['downloadControl']>[0])=>{void window.loaderly?.downloadControl(request).catch(()=>setError(t('Could not update the queue.','تعذر تعديل قائمة الانتظار.')));};
 return <div className="download-queue-controls"><button type="button" className="button secondary" onClick={()=>setOpen(true)}><SlidersHorizontal size={16}/>{t('Queue settings','إعدادات القائمة')}</button>{open&&<SettingsDialog title={t('Download settings & scheduling','إعدادات التنزيل والجدولة')} ar={ar} onClose={()=>setOpen(false)}><div className="download-queue-controls__body studio-extension"><div className="studio-grid">
 <StudioSelect label={t('Concurrent downloads','التنزيلات المتزامنة')} value={String(state.settings.concurrency)} onChange={value=>control({action:'configure',settings:{...state.settings,concurrency:Number(value)}})} options={[1,2,3,4,5,6].map(n=>({value:String(n),label:String(n)}))}/>
 <label><span>{t('Total speed limit (KB/s)','الحد الإجمالي للسرعة (كيلوبايت/ثانية)')}</span><input type="number" min={0} step={6} max={1048576} value={state.settings.rateKib} onChange={e=>control({action:'configure',settings:{...state.settings,rateKib:Number.isFinite(e.target.valueAsNumber)?Math.max(0,e.target.valueAsNumber):0}})}/><small>{t('0 means no speed limit.','0 يعني سرعة دون حد.')}</small></label></div>
 <p>{t('Changes apply after active downloads finish. The total limit is divided across available download slots. Scheduled downloads need Loaderly to be running. Interrupted transfers resume when supported by the source.','تُطبّق التغييرات بعد انتهاء التنزيلات النشطة. يُوزّع الحد الإجمالي على خانات التنزيل المتزامنة. الجدولة تتطلب تشغيل Loaderly. يُستكمل النقل المنقطع إذا كان المصدر يدعم ذلك.')}</p>
 {displayed.map(row=>{const entry=state.entries.find(e=>e.id===row.id);const queued=!entry||entry.phase==='queued';return <div className="studio-item" key={row.id}>
 <span dir="auto">{row.title??row.source}</span>{row.downloadPaused&&<span>{t('Paused','متوقف مؤقتًا')}</span>}
 {entry&&['queued','preparing','downloading','waiting-audio','removing-music','saving-audio'].includes(entry.phase)?<button className="button secondary" onClick={()=>control({action:'pause',id:row.id})}><Pause size={15}/>{t('Pause','إيقاف مؤقت')}</button>:!entry?<button className="button secondary" onClick={()=>onStart(row.id)}><Play size={15}/>{t('Start / resume','بدء أو استئناف')}</button>:<span>{t('Finishing file…','جارٍ تجهيز الملف…')}</span>}
 {queued&&entry&&<><button className="button secondary" aria-label={t('Move up','تحريك للأعلى')} onClick={()=>control({action:'move',id:row.id,direction:-1})}><ChevronUp size={16}/></button><button className="button secondary" aria-label={t('Move down','تحريك للأسفل')} onClick={()=>control({action:'move',id:row.id,direction:1})}><ChevronDown size={16}/></button></>}
 {!entry&&<label><Clock3 size={14}/>{t('Start at','البدء في')}<input type="datetime-local" aria-label={t('Start time','وقت البدء')} value={row.downloadScheduledAt?new Date(row.downloadScheduledAt-new Date(row.downloadScheduledAt).getTimezoneOffset()*60000).toISOString().slice(0,16):''} onChange={e=>{const at=new Date(e.target.value).getTime();onSchedule(row.id,Number.isFinite(at)?at:undefined);}}/></label>}
 </div>;})}{error&&<p role="status">{error}</p>}</div></SettingsDialog>}</div>;
}
