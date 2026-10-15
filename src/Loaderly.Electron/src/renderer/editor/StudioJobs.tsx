import {useEffect, useState} from 'react';
import {Download, FolderOpen, Languages, Music2, Search, Trash2, Undo2, ChevronUp, ChevronDown} from 'lucide-react';
import type {StudioJob} from '../../main/studioQueue';
import type {StudioRequest, StudioResponse} from '../../shared/studioApi';
import {StudioSelect} from './StudioSelect';
import {mediaIdentityForPath} from '../../shared/editor-project/editorSession';

export function StudioJobs({ar, source, jobs, busy, emptyIds, request, onJobs, onAdd, onConfigure, friendly}: {
  ar:boolean; source:string; jobs:StudioJob[]; busy:boolean; emptyIds:string[];
  request:(value:StudioRequest)=>Promise<StudioResponse>; onJobs:(jobs:StudioJob[])=>void;
  onAdd:(job:StudioJob,path:string)=>void; onConfigure:(job:StudioJob)=>void; friendly:(code:string)=>string;
}) {
  const t=(en:string,a:string)=>ar?a:en;
  const [scope,setScope]=useState('current'),[filter,setFilter]=useState('all'),[kind,setKind]=useState('all'),[query,setQuery]=useState('');
  const [selected,setSelected]=useState<string[]>([]),[removed,setRemoved]=useState<string[]>([]),[working,setWorking]=useState(false),[error,setError]=useState('');
  useEffect(()=>{setSelected([]);},[scope,filter,kind,query,source]);
  const active=(job:StudioJob)=>job.state==='queued'||job.state==='running';
  const noSpeech=(job:StudioJob)=>job.message==='NO_SPEECH_DETECTED'||emptyIds.includes(job.id);
  const jobSource=(job:StudioJob)=>{
    const payload=job.payload as {request?:{source?:string;paths?:string[];render?:{sourcePath?:string};renders?:{sourcePath?:string}[]}};
    const matches=(path:string|undefined)=>Boolean(path)&&mediaIdentityForPath(path)===mediaIdentityForPath(source);
    return matches(payload?.request?.source)||matches(payload?.request?.render?.sourcePath)||payload?.request?.paths?.some(matches)||payload?.request?.renders?.some(render=>matches(render.sourcePath));
  };
  const kinds:Record<string,string>={render:t('Export clips','تصدير المقاطع'),convert:t('Convert files','تحويل الملفات'),transcribe:t('Speech to subtitles','تحويل الكلام إلى ترجمة'),separate:t('Vocals & music','الغناء والموسيقى')};
  const scoped=jobs.filter(job=>(scope==='all'||jobSource(job))&&(kind==='all'||job.kind===kind)&&(!query||`${job.name} ${kinds[job.kind]??''}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())));
  const match=(job:StudioJob,id:string)=>id==='all'||(id==='active'?active(job):id==='completed'?job.state==='completed'&&!noSpeech(job):!active(job)&&(job.state!=='completed'||noSpeech(job)));
  const visible=scoped.filter(job=>match(job,filter));
  const pending=visible.filter(active);
  const history=visible.filter(job=>!active(job)).sort((a,b)=>(b.createdAt??'').localeCompare(a.createdAt??'')||jobs.indexOf(b)-jobs.indexOf(a));
  const selectedVisible=history.filter(job=>selected.includes(job.id)).map(job=>job.id);
  async function perform(input:StudioRequest){
    setWorking(true);setError('');
    try{const result=await request(input);if(result.jobs)onJobs(result.jobs);return result;}
    catch{setError(t('Could not update the task history. Try again.','تعذر تحديث سجل المهام. حاول مجددًا.'));return false;}
    finally{setWorking(false);}
  }
  async function remove(ids:string[]){const result=await perform({action:'dismiss-jobs',ids});if(result){setRemoved(ids.filter(id=>!result.jobs?.some(job=>job.id===id)));setSelected([]);}}
  function card(job:StudioJob){
    const Icon=job.kind==='transcribe'?Languages:job.kind==='separate'?Music2:Download;
    const state=noSpeech(job)?t('No speech recognized','لم يُتعرّف على كلام'):({queued:t('Queued','في الانتظار'),running:t('Running','قيد التنفيذ'),completed:t('Completed','اكتمل'),failed:t('Failed','تعذر الإكمال'),canceled:t('Canceled','ألغي')}[job.state]);
    return <article key={job.id} className="studio-job" data-job-id={job.id}>
      <header className="studio-job-heading">
        {!active(job)&&<input type="checkbox" aria-label={t('Select result','تحديد النتيجة')} checked={selected.includes(job.id)} onChange={e=>setSelected(ids=>e.target.checked?[...ids,job.id]:ids.filter(id=>id!==job.id))}/>}
        <Icon size={20}/><div><strong>{kinds[job.kind]??job.kind}</strong><p dir="auto">{job.name}</p></div>
        <span className={`studio-job-state studio-job-state--${job.state}`}>{state}</span>
      </header>
      <div className="studio-job-meta">{Number.isFinite(Date.parse(job.createdAt))&&<time dateTime={job.createdAt}>{new Date(job.createdAt).toLocaleString(ar?'ar-u-nu-latn':'en',{dateStyle:'medium',timeStyle:'short'})}</time>}{scope==='all'&&jobSource(job)&&<span>{t('Current file','الملف المفتوح')}</span>}</div>
      {job.state==='running'&&<div className="studio-job-progress"><progress aria-label={t('Task progress','تقدم المهمة')} max={100} value={job.progress}/>{job.progress!==undefined&&<span>{Math.round(job.progress)}%</span>}</div>}
      {job.state==='failed'&&<p>{friendly(job.message??'')}</p>}
      <div className="studio-job-actions">
        {job.paths?.map(path=>{
          const transcript=/transcript\.json$/i.test(path),different=transcript&&!jobSource(job);
          return <button key={path} type="button" className="button secondary" disabled={working||(transcript&&(busy||different))} title={different?t('Open the original source to use this transcript.','افتح ملف المصدر الأصلي لاستخدام هذا التفريغ.'):undefined}
            onClick={()=>transcript?(noSpeech(job)?onConfigure(job):onAdd(job,path)):void window.loaderly?.showItemInFolder(path)}>
            {transcript?<Languages size={15}/>:<FolderOpen size={15}/>}
            {transcript?(noSpeech(job)?t('Try different settings','تجربة إعدادات أخرى'):t('Add subtitles to editor','إضافة الترجمة للمحرر')):job.kind==='separate'&&/vocals\.wav$/i.test(path)?t('Vocals without music','الغناء دون موسيقى'):job.kind==='separate'&&/instrumental\.wav$/i.test(path)?t('Music without vocals','الموسيقى دون غناء'):/\.srt$/i.test(path)?t('Subtitle file (SRT)','ملف الترجمة (SRT)'):/\.vtt$/i.test(path)?t('Subtitle file (VTT)','ملف الترجمة (VTT)'):path.split(/[\\/]/).at(-1)}
          </button>;
        })}
        {job.state==='queued'&&<><button className="button secondary" disabled={working} aria-label={t('Earlier in queue','تقديم في الانتظار')} onClick={()=>void perform({action:'move',id:job.id,direction:-1})}><ChevronUp size={15}/></button><button className="button secondary" disabled={working} aria-label={t('Later in queue','تأخير في الانتظار')} onClick={()=>void perform({action:'move',id:job.id,direction:1})}><ChevronDown size={15}/></button></>}
        {active(job)?<button className="button secondary" disabled={working} onClick={()=>void perform({action:'cancel',id:job.id})}>{t('Cancel','إلغاء')}</button>:<>
          {['failed','canceled'].includes(job.state)&&<button className="button secondary" disabled={working} onClick={()=>void perform({action:'retry',id:job.id})}>{t('Retry','إعادة المحاولة')}</button>}
          <button className="button secondary studio-job-remove" disabled={working} onClick={()=>void remove([job.id])}><Trash2 size={15}/>{t('Remove from history','إزالة من السجل')}</button>
        </>}
      </div>
      {job.kind==='transcribe'&&!jobSource(job)&&<small>{t('Open this result’s source file to add its subtitles.','افتح ملف المصدر الخاص بهذه النتيجة لإضافة ترجمته.')}</small>}
    </article>;
  }
  return <div className="studio-results">
    <header><h3>{t('Tasks & results','المهام والنتائج')}</h3><p>{t('Follow current work and use your saved results. Removing a result only clears its history entry; output files stay in their folder.','تابع العمل الجاري واستخدم النتائج المحفوظة. الإزالة تخص سجل المهمة فقط؛ تبقى الملفات الناتجة في مجلدها.')}</p></header>
    <div className="studio-results-filters">
      <StudioSelect label={t('Show tasks for','عرض مهام')} value={scope} onChange={setScope} options={[{value:'current',label:t('Current file','الملف المفتوح')},{value:'all',label:t('All files','كل الملفات')}]}/>
      <StudioSelect label={t('Task type','نوع المهمة')} value={kind} onChange={setKind} options={[{value:'all',label:t('All types','كل الأنواع')},...Object.entries(kinds).map(([value,label])=>({value,label}))]}/>
      <label className="studio-field"><span>{t('Search results','بحث في النتائج')}</span><span className="studio-results-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t('File name or task','اسم الملف أو المهمة')}/></span></label>
    </div>
    <div className="studio-results-status" role="group" aria-label={t('Task status','حالة المهمة')}>{[{id:'all',label:t('All','الكل')},{id:'active',label:t('In progress','الجارية')},{id:'completed',label:t('Completed','المكتملة')},{id:'attention',label:t('Needs attention','تحتاج مراجعة')}].map(item=><button className="button secondary" key={item.id} aria-pressed={filter===item.id} onClick={()=>setFilter(item.id)}>{item.label}<span>{scoped.filter(job=>match(job,item.id)).length}</span></button>)}</div>
    {removed.length>0&&<div className="studio-results-notice" role="status"><span>{t('Removed from history. Output files are kept.','أُزيلت من السجل. الملفات الناتجة محفوظة.')}</span><button className="button secondary" disabled={working} onClick={()=>void perform({action:'dismiss-jobs',ids:removed,restoreJobs:true}).then(ok=>{if(ok)setRemoved([]);})}><Undo2 size={15}/>{t('Undo','تراجع')}</button></div>}
    {error&&<p role="alert">{error}</p>}
    {pending.length>0&&<section><h4>{t('In progress · queue order','الجارية · حسب ترتيب الانتظار')}</h4><div className="studio-jobs">{pending.map(card)}</div></section>}
    {history.length>0&&<section><div className="studio-results-history-heading"><h4>{t('Previous results · newest first','النتائج السابقة · الأحدث أولًا')}</h4><label><input type="checkbox" checked={selectedVisible.length===history.length} onChange={e=>setSelected(e.target.checked?history.map(job=>job.id):[])}/>{t('Select shown results','تحديد النتائج الظاهرة')}</label>{selectedVisible.length>0&&<button className="button secondary" disabled={working} onClick={()=>void remove(selectedVisible)}><Trash2 size={15}/>{t('Remove selected','إزالة المحدد')} ({selectedVisible.length})</button>}</div><div className="studio-jobs">{history.map(card)}</div></section>}
    {!visible.length&&<div className="studio-results-empty"><Download size={28}/><strong>{t('No matching tasks','لا توجد مهام مطابقة')}</strong><p>{t('Change the filters or start a task for this file.','غيّر الفلاتر أو ابدأ مهمة لهذا الملف.')}</p><button className="button secondary" onClick={()=>{setScope('all');setFilter('all');setKind('all');setQuery('');}}>{t('Show all tasks','عرض جميع المهام')}</button></div>}
  </div>;
}
