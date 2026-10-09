import { CommunityLookCard } from './CommunityLookCard';
import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Copy, Download, Expand, RotateCcw, Upload } from 'lucide-react';
import { DesktopMenu } from './DesktopMenu';
import { RangeInput } from './RangeInput';
import { ColorField } from './ColorField';
import { defaultVisualizer, decodeVisualizer, encodeVisualizer, normalizeVisualizer, visualizerPresets, visualizerShapePresets, type AudioVisualizerSettings } from '../../shared/editor-project/audioVisualizer';

export function VisualizerControls({value,onChange,onCleanView,ar}:{value:AudioVisualizerSettings;onChange:(v:AudioVisualizerSettings)=>void;onCleanView:()=>void;ar:boolean}) {
  const [code,setCode]=useState(''),[status,setStatus]=useState(''),[copied,setCopied]=useState(false);
  const fileRef=useRef<HTMLInputElement>(null),copyTimer=useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(()=>()=>clearTimeout(copyTimer.current),[]);
  const t=(en:string,arabic:string)=>ar?arabic:en;
  const patch=(next:Partial<AudioVisualizerSettings>)=>onChange(normalizeVisualizer({...value,...next}));
  const toggle=(key:'gradient'|'backgroundGradient'|'showTitle'|'showSubtitle'|'showBadges',en:string,arabic:string)=><label className="audio-toggle"><input type="checkbox" checked={value[key]} onChange={e=>patch({[key]:e.target.checked})}/>{t(en,arabic)}</label>;
  const range=(key:'width'|'height'|'positionY'|'count'|'gap'|'roundness'|'sensitivity'|'smoothing'|'glow'|'opacity'|'textSize',en:string,arabic:string,min:number,max:number,step:number,unit='')=><label className="audio-control"><span>{t(en,arabic)}<output dir="ltr">{Number(value[key].toFixed(2))}{unit}</output></span><RangeInput aria-label={t(en,arabic)} min={min} max={max} step={step} value={value[key]} onChange={e=>patch({[key]:Number(e.target.value)})}/></label>;
  const color=(key:'color'|'secondColor'|'background'|'backgroundEnd'|'textColor',en:string,arabic:string)=><ColorField key={key} ar={ar} label={t(en,arabic)} value={value[key]} onChange={color=>patch({[key]:color})}/>;
  const apply=(text:string)=>{
    const result=decodeVisualizer(text);
    if(!result){setStatus(t('This is not a valid Loaderly visualizer code. Your current look was kept.','هذا الكود غير صالح لمظهر الطيف. بقي مظهرك الحالي كما هو.'));return;}
    onChange(result);setCode(encodeVisualizer(result));setStatus(t('Visualizer look applied.','طُبّق مظهر الطيف.'));
  };
  return <div className="visualizer-controls">
    <div className="inspector-section">
      <strong>{t('Audio visualizer','طيف الصوت')}</strong>
      <small>{t('Customize the display separately from your sound and app theme.','خصص العرض بشكل مستقل عن إعدادات الصوت ومظهر البرنامج.')}</small>
      <button className="button primary" type="button" onClick={onCleanView}><Expand size={15}/>{t('Clean view','عرض نظيف')}</button>
      <small>{t('For screen recording. Move the mouse to show controls; Escape returns to editing. Visuals are not included in MP3 exports.','لتسجيل الشاشة. حرّك الماوس لإظهار التحكم، واضغط Escape للعودة للتحرير. لا تُضاف الرسوم إلى ملفات MP3 المصدّرة.')}</small>
      <div className="visualizer-presets">{visualizerPresets.map(p=><button type="button" key={p.id} className="button secondary" onClick={()=>{onChange(normalizeVisualizer(p.settings));setStatus('');}}>{ar?p.ar:p.en}</button>)}</div>
      <DesktopMenu ariaLabel={t('Visualizer style','شكل الطيف')} value={value.style} valueLabel={t({mirror:'Mirrored bars',bars:'Bars',wave:'Wave',ring:'Ring',dots:'Dots',path:'Custom shape'}[value.style],{mirror:'أعمدة متناظرة',bars:'أعمدة',wave:'موجة',ring:'حلقة',dots:'نقاط',path:'شكل مخصص'}[value.style])} options={[
        {value:'mirror',label:t('Mirrored bars','أعمدة متناظرة')},{value:'bars',label:t('Bars','أعمدة')},{value:'wave',label:t('Wave','موجة')},{value:'ring',label:t('Ring','حلقة')},{value:'dots',label:t('Dots','نقاط')},{value:'path',label:t('Custom shape','شكل مخصص')}
      ]} onChange={style=>patch({style:style as AudioVisualizerSettings['style']})}/>
    </div>
    {value.style==='path'?<div className="inspector-section"><strong>{t('Custom shape','شكل مخصص')}</strong><div className="visualizer-presets">{visualizerShapePresets.map(p=><button type="button" className="button secondary" key={p.id} onClick={()=>patch({shape:p.shape})}>{ar?p.ar:p.en}</button>)}</div>{(['closed','smooth','mirror'] as const).map((key,i)=><label className="audio-toggle" key={key}><input type="checkbox" checked={value.shape[key]} onChange={e=>patch({shape:{...value.shape,[key]:e.target.checked}})}/>{t(['Close the shape','Smooth curve','Two-sided movement'][i],['إغلاق الشكل','منحنى ناعم','حركة في الاتجاهين'][i])}</label>)}<small>{t('Import a shape from the online designer through Share this look below.','استورد شكلًا من المصمّم في الموقع عبر مشاركة مظهر الطيف أدناه.')}</small></div>:null}
    {value.style==='path'?<label className="audio-control"><span>{t('Movement strength','قوة الحركة')}<output dir="ltr">{Math.round((value.shape.amplitude??.5)*100)}%</output></span><RangeInput aria-label={t('Movement strength','قوة الحركة')} min={0} max={1} step={.01} value={value.shape.amplitude??.5} onChange={e=>patch({shape:{...value.shape,amplitude:Number(e.target.value)}})}/></label>:null}
    <a className="button secondary visualizer-designer-link" href={'https://loaderly-docs.voidksa.workers.dev/'+(ar?'ar/':'')+'docs/audio-visualizer/#visualizer-builder'} target="_blank" rel="noreferrer">{t('Design and share a new shape','صمّم شكلًا جديدًا وشاركه')}</a>
    <details className="visualizer-section" open><summary>{t('Colors and background','الألوان والخلفية')}<ChevronDown size={15}/></summary><div className="visualizer-section__body">
      {color('color','Visualizer color','لون الطيف')}{toggle('gradient','Gradient color','تدرّج لون الطيف')}{value.gradient?color('secondColor','Second color','اللون الثاني'):null}
      {color('background','Background color','لون الخلفية')}{toggle('backgroundGradient','Gradient background','خلفية متدرّجة')}{value.backgroundGradient?color('backgroundEnd','Background end color','لون نهاية الخلفية'):null}
      {range('opacity','Opacity','العتامة',.15,1,.05)}{range('glow','Glow','التوهج',0,30,1)}
    </div></details>
    <details className="visualizer-section"><summary>{t('Size and motion','الحجم والحركة')}<ChevronDown size={15}/></summary><div className="visualizer-section__body">
      {range('width','Visualizer width','عرض الطيف',20,100,1,'%')}{range('height','Visualizer height','ارتفاع الطيف',15,80,1,'%')}{range('positionY','Vertical position','الموضع الرأسي',10,90,1,'%')}
      {range('count','Detail','التفاصيل',16,160,1)}{range('gap','Bar gap','المسافة بين الأعمدة',0,12,1)}{range('roundness','Roundness','استدارة الأطراف',0,12,1)}{range('sensitivity','Visual sensitivity','حساسية الحركة',.25,3,.05)}{range('smoothing','Motion smoothing','نعومة الحركة',0,.95,.05)}
    </div></details>
    <details className="visualizer-section"><summary>{t('Text and labels','النصوص والشارات')}<ChevronDown size={15}/></summary><div className="visualizer-section__body">
      {toggle('showTitle','Show track title','إظهار اسم المقطع')}{value.showTitle?<label className="inspector-field"><span>{t('Custom title (blank uses track name)','عنوان مخصص (اتركه فارغًا لاستخدام اسم المقطع)')}</span><input aria-label={t('Custom visualizer title','عنوان الطيف المخصص')} maxLength={160} value={value.title} onChange={e=>patch({title:e.target.value})}/></label>:null}
      {toggle('showSubtitle','Show subtitle','إظهار نص إضافي')}{value.showSubtitle?<label className="inspector-field"><span>{t('Subtitle','النص الإضافي')}</span><input aria-label={t('Visualizer subtitle','النص الإضافي للطيف')} maxLength={160} value={value.subtitle} onChange={e=>patch({subtitle:e.target.value})}/></label>:null}
      {toggle('showBadges','Show tool and playback badges','إظهار شارات الأداة والتشغيل')}{color('textColor','Title color','لون النص')}{range('textSize','Title size','حجم النص',10,48,1,'px')}
    </div></details>
    <details className="visualizer-section"><summary>{t('Share this look','مشاركة مظهر الطيف')}<ChevronDown size={15}/></summary><div className="visualizer-section__body">
      <small>{t('This code contains only visualizer settings and custom text. It never contains audio files or their paths.','يحتوي الكود على إعدادات الطيف والنصوص المخصصة فقط. لا يتضمن الملفات الصوتية أو مساراتها.')}</small>
      <div className="inspector-actions"><button className="button secondary" type="button" onClick={async()=>{
        const text=encodeVisualizer(value);setCode(text);
        try {const result=await window.loaderly?.copyText?.(text);if(result){if(!result.ok)throw Error();}else await navigator.clipboard.writeText(text);setCopied(true);setStatus(t('Visualizer code copied.','نُسخ كود الطيف.'));clearTimeout(copyTimer.current);copyTimer.current=setTimeout(()=>setCopied(false),2000);} catch {setStatus(t('Select the code below and copy it.','حدد الكود أدناه وانسخه.'));}
      }}>{copied?<Check size={14}/>:<Copy size={14}/>} {t('Copy look','نسخ المظهر')}</button>
      <button className="button secondary" type="button" onClick={()=>{
        const url=URL.createObjectURL(new Blob([encodeVisualizer(value)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='Loaderly.visualizer.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      }}><Download size={14}/>{t('Export look','تصدير المظهر')}</button>
      <button className="button secondary" type="button" onClick={()=>fileRef.current?.click()}><Upload size={14}/>{t('Import look','استيراد المظهر')}</button></div>
      <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;if(file.size>16000){setStatus(t('Choose a visualizer JSON file under 16 KB.','اختر ملف JSON للطيف بحجم أقل من 16 كيلوبايت.'));return;}apply(await file.text());}}/>
  <textarea className="visualizer-code" aria-label={t('Visualizer code','كود الطيف')} dir="ltr" spellCheck={false} value={code} placeholder={t('Paste visualizer JSON here','الصق كود JSON للطيف هنا')} onChange={e=>setCode(e.target.value)}/>
      <div className="inspector-actions"><button className="button secondary" type="button" onClick={()=>apply(code)}>{t('Apply look','تطبيق المظهر')}</button><button className="button secondary" type="button" onClick={()=>setCode(encodeVisualizer(value))}>{t('Show current code','عرض الكود الحالي')}</button></div>
      <p role="status" className="inspector-hint">{status}</p>
    </div></details>
    <button className="button secondary" type="button" onClick={()=>{onChange(defaultVisualizer);setStatus('');}}><RotateCcw size={14}/>{t('Reset visualizer','إعادة ضبط الطيف')}</button>
  <CommunityLookCard ar={ar} kind="visualizer"/>
  </div>;
}
