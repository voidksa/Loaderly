import {useEffect,useRef,useState} from 'react';
import {Save,Upload,Download,Share2,Library} from 'lucide-react';
import {normalizedLookCode,type CommunityLook} from '../../shared/community';
import {readLocalDesigns,storeLocalDesign,exportDesignFile} from './localDesigns';
import {designKindLabel} from './DesignLibrary';

export function LocalDesignControls({kind,code,ar,onApply}:{kind:'theme'|'visualizer';code:string;ar:boolean;onApply:(code:string)=>void}){
 const t=(en:string,a:string)=>ar?a:en;
 const [name,setName]=useState(''),[query,setQuery]=useState(''),[pasted,setPasted]=useState(''),[message,setMessage]=useState(''),[items,setItems]=useState(readLocalDesigns);
 const file=useRef<HTMLInputElement>(null);
 useEffect(()=>{const refresh=()=>setItems(readLocalDesigns());window.addEventListener('loaderly:local-designs',refresh);return()=>window.removeEventListener('loaderly:local-designs',refresh);},[]);
 const save=()=>{
  const draft={id:`design-${crypto.randomUUID()}`,kind:kind as CommunityLook['kind'],name:name.trim()||designKindLabel(kind,ar),code,revision:0,updatedAt:new Date().toISOString(),published:false};
  try{storeLocalDesign(draft);setMessage(t('Saved privately on this device.','حُفظ بشكل خاص على هذا الجهاز.'));return draft;}catch{setMessage(t('Could not save. Export a settings file to keep a copy.','تعذّر الحفظ. صدّر ملف إعدادات للاحتفاظ بنسخة.'));}
 };
 const apply=(text:string)=>{const valid=normalizedLookCode(text,kind);if(!valid){setMessage(t('This file does not match this design type.','هذا الملف لا يطابق نوع التصميم.'));return;}onApply(valid);setMessage(t('Applied. Only these settings changed.','طُبّقت هذه الإعدادات فقط.'));};
 const matches=items.filter(item=>item.kind===kind&&item.name.toLowerCase().includes(query.toLowerCase()));
 return <section className="local-design-controls"><header><h3>{t('Keep your current design','احفظ تصميمك الحالي')}</h3><p>{t('Save it on this device to use again or share later.','احفظه على هذا الجهاز لتستخدمه مجددًا أو تشاركه لاحقًا.')}</p></header>
  <div className="preset-save-row"><label className="design-name-field"><span>{t('Design name','اسم التصميم')}</span><input aria-label={t('Design name','اسم التصميم')} placeholder={t('Name your design','سمِّ تصميمك')} maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label><button className="button primary" onClick={()=>save()}><Save size={15}/>{t('Save on this device','حفظ على هذا الجهاز')}</button></div>
  <div className="inspector-actions"><button className="button secondary" onClick={()=>file.current?.click()}><Upload size={15}/>{t('Import settings file','استيراد ملف إعدادات')}</button><button className="button secondary" onClick={()=>exportDesignFile(name||designKindLabel(kind,ar),kind,code)}><Download size={15}/>{t('Export settings file','تصدير ملف الإعدادات')}</button><button className="button secondary" onClick={()=>{const draft=save();if(draft)window.dispatchEvent(new CustomEvent('loaderly:community',{detail:{create:true,draftId:draft.id}}));}}><Share2 size={15}/>{t('Share in community','مشاركة في المجتمع')}</button></div>
  <input type="file" hidden ref={file} accept=".json" onChange={async e=>{const selected=e.target.files?.[0];e.target.value='';if(!selected)return;if(selected.size>320000){setMessage(t('File is too large.','الملف كبير جدًا.'));return;}try{apply(await selected.text());}catch{setMessage(t('Could not read this file.','تعذّر قراءة الملف.'));}}}/>
  <div className="preset-library"><h4>{kind==='theme'?t('My themes','الثيمات الخاصة بي'):t('My visualizers','الأطياف الخاصة بي')}</h4><input type="search" aria-label={t('Find a design','البحث عن تصميم')} placeholder={t('Find a design','ابحث عن تصميم')} value={query} onChange={e=>setQuery(e.target.value)}/><div className="preset-options">{matches.map(item=><button key={item.id} className="preset-option" onClick={()=>{setName(item.name);apply(item.code);}}><span><strong>{item.name}</strong><small>{designKindLabel(kind,ar)} · {t('Apply','تطبيق')}</small></span></button>)}</div>{!matches.length&&<small>{t('Your saved designs will appear here.','ستظهر تصاميمك المحفوظة هنا.')}</small>}</div>
  <div className="local-design-footer"><button className="button secondary" onClick={()=>window.dispatchEvent(new Event('loaderly:community'))}><Library size={15}/>{t('Browse community designs','تصفّح تصاميم المجتمع')}</button><details className="preset-advanced"><summary>{t('Advanced: import code','متقدم: استيراد كود')}</summary><textarea dir="ltr" aria-label={t('Design code','كود التصميم')} maxLength={320000} value={pasted} onChange={e=>setPasted(e.target.value)}/><button className="button secondary" disabled={!pasted} onClick={()=>apply(pasted)}>{t('Apply code','تطبيق الكود')}</button></details></div>{message&&<p role="status">{message}</p>}
 </section>;
}
