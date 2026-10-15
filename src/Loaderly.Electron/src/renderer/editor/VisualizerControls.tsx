import {VisualizerThumbnail} from './VisualizerThumbnail';
import {LocalDesignControls} from './LocalDesignControls';
import {DesignLibraryToggle} from './DesignLibraryToggle';
import {ControlDeck} from './ControlDeck';
import { VisualizerDesigner } from './VisualizerDesigner';
import { Shapes, Palette, Move, Type, AudioLines, Expand, RotateCcw } from 'lucide-react';
import { DesktopMenu } from './DesktopMenu';
import { RangeInput } from './RangeInput';
import { ColorField } from './ColorField';
import { applyVisualizerPreset, defaultVisualizer, decodeVisualizer, encodeVisualizer, normalizeVisualizer, visualizerPresets, visualizerShapePresets, type AudioVisualizerSettings } from '../../shared/editor-project/audioVisualizer';

export function VisualizerControls({value,onChange,onCleanView,ar}:{value:AudioVisualizerSettings;onChange:(v:AudioVisualizerSettings)=>void;onCleanView:()=>void;ar:boolean}) {
  const t=(en:string,arabic:string)=>ar?arabic:en;
  const patch=(next:Partial<AudioVisualizerSettings>)=>onChange(normalizeVisualizer({...value,...next}));
  const toggle=(key:'gradient'|'backgroundGradient'|'showTitle'|'showSubtitle'|'showBadges',en:string,arabic:string)=><label className="audio-toggle"><input type="checkbox" checked={value[key]} onChange={e=>patch({[key]:e.target.checked})}/>{t(en,arabic)}</label>;
  const range=(key:'width'|'height'|'positionX'|'positionY'|'count'|'gap'|'roundness'|'sensitivity'|'smoothing'|'glow'|'opacity'|'textSize',en:string,arabic:string,min:number,max:number,step:number,unit='')=><label className="audio-control"><span>{t(en,arabic)}<output dir="ltr">{Number(value[key].toFixed(2))}{unit}</output></span><RangeInput aria-label={t(en,arabic)} min={min} max={max} step={step} value={value[key]} onChange={e=>patch({[key]:Number(e.target.value)})}/></label>;
  const color=(key:'color'|'secondColor'|'background'|'backgroundEnd'|'textColor',en:string,arabic:string)=><ColorField key={key} ar={ar} label={t(en,arabic)} value={value[key]} onChange={color=>patch({[key]:color})}/>;
  return <div className="visualizer-controls">
 <DesignLibraryToggle label={t('My visualizers · save & share','أطيافي · حفظ ومشاركة')} icon={<AudioLines size={16}/>}>
   <LocalDesignControls kind="visualizer" code={encodeVisualizer(value)} ar={ar} onApply={text=>{const next=decodeVisualizer(text);if(next)onChange(next);}}/>
 </DesignLibraryToggle>
 <ControlDeck label={t('Visualizer settings','إعدادات الطيف')} pages={[
{id:'shape',label:t('Shape','الشكل'),icon:<Shapes size={15}/>,content:<div className="visualizer-page">    <div className="inspector-section">
      <VisualizerDesigner value={value} onChange={onChange} ar={ar}/>
      <strong>{t('Audio visualizer','طيف الصوت')}</strong>
      <small>{t('Customize the display separately from your sound and app theme.','خصص العرض بشكل مستقل عن إعدادات الصوت ومظهر البرنامج.')}</small>
      <button className="button primary" type="button" onClick={onCleanView}><Expand size={15}/>{t('Clean view','عرض نظيف')}</button>
      <small>{t('For screen recording. Move the mouse to show controls. Escape returns to editing. Visuals are not included in MP3 exports.','لتسجيل الشاشة. حرّك الماوس لإظهار التحكم، واضغط Escape للعودة للتحرير. لا تُضاف الرسوم إلى ملفات MP3 المصدّرة.')}</small>
      <div className="visualizer-presets">{visualizerPresets.map(p=><button type="button" key={p.id} className="visualizer-preset" onClick={()=>onChange(applyVisualizerPreset(value,p.settings))}><VisualizerThumbnail settings={p.settings}/><span>{ar?p.ar:p.en}</span></button>)}</div>
      <DesktopMenu ariaLabel={t('Visualizer style','شكل الطيف')} value={value.style} valueLabel={t({mirror:'Mirrored bars',bars:'Bars',wave:'Wave',ring:'Ring',dots:'Dots',path:'Custom shape'}[value.style],{mirror:'أعمدة متناظرة',bars:'أعمدة',wave:'موجة',ring:'حلقة',dots:'نقاط',path:'شكل مخصص'}[value.style])} options={[
        {value:'mirror',label:t('Mirrored bars','أعمدة متناظرة')},{value:'bars',label:t('Bars','أعمدة')},{value:'wave',label:t('Wave','موجة')},{value:'ring',label:t('Ring','حلقة')},{value:'dots',label:t('Dots','نقاط')},{value:'path',label:t('Custom shape','شكل مخصص')}
      ]} onChange={style=>patch({style:style as AudioVisualizerSettings['style']})}/>
    </div>
    {value.style==='path'?<div className="inspector-section"><strong>{t('Custom shape','شكل مخصص')}</strong><div className="visualizer-presets">{visualizerShapePresets.map(p=><button type="button" className="visualizer-preset" key={p.id} onClick={()=>patch({shape:p.shape})}><VisualizerThumbnail settings={{...value,shape:p.shape}}/><span>{ar?p.ar:p.en}</span></button>)}</div>{(['closed','smooth','mirror'] as const).filter(key=>!value.shape.paths||key==='mirror').map((key)=><label className="audio-toggle" key={key}><input type="checkbox" checked={value.shape[key]} onChange={e=>patch({shape:{...value.shape,[key]:e.target.checked}})}/>{t({closed:'Close the shape',smooth:'Smooth curve',mirror:'Two-sided movement'}[key],{closed:'إغلاق الشكل',smooth:'منحنى ناعم',mirror:'حركة في الاتجاهين'}[key])}</label>)}<small>{t('Import a settings file in My visualizers · save & share.','استورد ملف إعدادات من قسم أطيافي · حفظ ومشاركة.')}</small></div>:null}
    {value.style==='path'?<div className="inspector-section"><strong>{t('Shape finish','طريقة رسم الشكل')}</strong><DesktopMenu ariaLabel={t('Shape finish','طريقة رسم الشكل')} value={value.shape.stroke??'bars'} valueLabel={t({bars:'Bars',dots:'Dots',line:'Outline'}[value.shape.stroke??'bars'],{bars:'أعمدة',dots:'نقاط',line:'خط متصل'}[value.shape.stroke??'bars'])} options={[{value:'line',label:t('Outline','خط متصل')},{value:'bars',label:t('Bars','أعمدة')},{value:'dots',label:t('Dots','نقاط')}]} onChange={stroke=>patch({shape:{...value.shape,stroke:stroke as 'bars'|'dots'|'line'}})}/><label className="audio-control"><span>{t('Stroke thickness','سماكة الرسم')}<output>{value.shape.thickness??2}</output></span><RangeInput aria-label={t('Stroke thickness','سماكة الرسم')} min={.5} max={8} step={.25} value={value.shape.thickness??2} onChange={e=>patch({shape:{...value.shape,thickness:Number(e.target.value)}})}/></label><label className="audio-control"><span>{t('Shape proportions','نسبة أبعاد الشكل')}<output dir="ltr">{(value.shape.aspect??1).toFixed(2)}</output></span><RangeInput aria-label={t('Shape proportions','نسبة أبعاد الشكل')} min={value.shape.paths?.length ? .05 : .25} max={value.shape.paths?.length?24:4} step={.05} value={value.shape.aspect??1} onChange={e=>patch({shape:{...value.shape,aspect:Number(e.target.value)}})}/></label>{value.shape.paths?<small>{t('Your text and separate shapes are preserved. Open the visualizer designer above to edit letters and points.','يُحفظ النص والأجزاء المنفصلة كما صمّمتها. افتح مصمّم الطيف أعلاه لتعديل الحروف والنقاط.')}</small>:null}</div>:null}
    {value.style==='path'?<label className="audio-control"><span>{t('Movement strength','قوة الحركة')}<output dir="ltr">{Math.round((value.shape.amplitude??.5)*100)}%</output></span><RangeInput aria-label={t('Movement strength','قوة الحركة')} min={0} max={1} step={.01} value={value.shape.amplitude??.5} onChange={e=>patch({shape:{...value.shape,amplitude:Number(e.target.value)}})}/></label>:null}

</div>},
{id:'colors',label:t('Colors','الألوان'),icon:<Palette size={15}/>,content:<div className="visualizer-page">
      {color('color','Visualizer color','لون الطيف')}{toggle('gradient','Gradient color','تدرّج لون الطيف')}{value.gradient?color('secondColor','Second color','اللون الثاني'):null}
      {color('background','Background color','لون الخلفية')}{toggle('backgroundGradient','Gradient background','خلفية متدرّجة')}{value.backgroundGradient?color('backgroundEnd','Background end color','لون نهاية الخلفية'):null}
      {range('opacity','Opacity','العتامة',.15,1,.05)}{range('glow','Glow','التوهج',0,30,1)}
    </div>},
{id:'motion',label:t('Layout & motion','التنسيق والحركة'),icon:<Move size={15}/>,content:<div className="visualizer-page">
      {range('width','Visualizer width','عرض الطيف',20,100,1,'%')}{range('height','Visualizer height','ارتفاع الطيف',15,80,1,'%')}{range('positionX','Horizontal position','الموضع الأفقي',10,90,1,'%')}{range('positionY','Vertical position','الموضع الرأسي',10,90,1,'%')}
      {range('count','Detail','التفاصيل',16,value.style==='path'&&value.shape.paths?1200:160,1)}{!['wave','path'].includes(value.style)?range('gap','Bar gap','المسافة بين الأعمدة',0,12,1):null}{value.style==='wave'?range('roundness','Line weight','سماكة الموجة',3,12,1):!['dots','path'].includes(value.style)?range('roundness','Roundness','استدارة الأطراف',0,12,1):null}{range('sensitivity','Visual sensitivity','حساسية الحركة',.25,3,.05)}{value.style!=='wave'?range('smoothing','Motion smoothing','نعومة الحركة',0,.95,.05):null}
    </div>},
{id:'text',label:t('Text','النصوص'),icon:<Type size={15}/>,content:<div className="visualizer-page">
      {toggle('showTitle','Show track title','إظهار اسم المقطع')}{value.showTitle?<label className="inspector-field"><span>{t('Custom title (blank uses track name)','عنوان مخصص (اتركه فارغًا لاستخدام اسم المقطع)')}</span><input aria-label={t('Custom visualizer title','عنوان الطيف المخصص')} maxLength={160} value={value.title} onChange={e=>patch({title:e.target.value})}/></label>:null}
      {toggle('showSubtitle','Show subtitle','إظهار نص إضافي')}{value.showSubtitle?<label className="inspector-field"><span>{t('Subtitle','النص الإضافي')}</span><input aria-label={t('Visualizer subtitle','النص الإضافي للطيف')} maxLength={160} value={value.subtitle} onChange={e=>patch({subtitle:e.target.value})}/></label>:null}
      {toggle('showBadges','Show tool and playback badges','إظهار شارات الأداة والتشغيل')}{color('textColor','Title color','لون النص')}{range('textSize','Title size','حجم النص',10,48,1,'px')}
    </div>},
 ]}/>
    <button className="button secondary" type="button" onClick={()=>{onChange(defaultVisualizer);}}><RotateCcw size={14}/>{t('Reset visualizer','إعادة ضبط الطيف')}</button>
  </div>;
}
