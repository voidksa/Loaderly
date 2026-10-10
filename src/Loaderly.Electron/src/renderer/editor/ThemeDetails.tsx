import type {CSSProperties} from 'react';
import {RotateCcw, Music2, Library, SlidersHorizontal} from 'lucide-react';
import {appearanceVariables, opacityKeys, type Appearance} from '../../shared/app-preferences/appearance';

export function ThemePreview({value,dark,ar}:{value:Appearance;dark:boolean;ar:boolean}) {
 const t=(en:string,a:string)=>ar?a:en;
 return <div className="theme-preview-wrap"><div className="theme-live-preview" style={appearanceVariables(value,dark) as CSSProperties} aria-label={t('Theme preview','معاينة الثيم')}>
  <header><strong>Loaderly</strong><span className="theme-preview-label">{t('Live preview','معاينة مباشرة')}</span><span aria-hidden="true">● ● ●</span></header>
  <div className="theme-preview-body"><aside><Library size={17}/><span>{t('Library','المكتبة')}</span><Music2 size={17}/><span>{t('Audio','الصوت')}</span><SlidersHorizontal size={17}/><span>{t('Preferences','الإعدادات')}</span></aside>
  <section><strong>{t('Make it yours','صمّمه بطريقتك')}</strong><p>{t('Your colors, your workspace.','ألوانك ومساحتك الخاصة.')}</p><div className="theme-preview-panel"><Music2 size={22}/><div><strong>{t('Evening melody','لحن المساء')}</strong><small>03:24</small></div><span className="theme-preview-action">▶</span></div><div className="theme-preview-menu">{t('Menus & tooltips','القوائم والتلميحات')}</div></section></div>
 </div></div>;
}

export function ThemeTransparency({value,onChange,ar}:{value:Appearance;onChange:(value:Appearance)=>void;ar:boolean}) {
 const t=(en:string,a:string)=>ar?a:en;
 const labels={background:t('Workspace background','خلفية مساحة العمل'),sidebar:t('Sidebar','القائمة الجانبية'),titlebar:t('Title bar','الشريط العلوي'),surface:t('Panels','اللوحات'),editor:t('Editor background','خلفية المحرر'),popover:t('Menus & popups','القوائم والنوافذ المنبثقة')};
 return <div className="theme-transparency"><label className="audio-toggle"><input type="checkbox" checked={!!value.glass} onChange={e=>onChange({...value,glass:e.target.checked,...(e.target.checked?{opacity:{background:75,sidebar:85,titlebar:85,...value.opacity}}:{})})}/>{t('Show desktop glass','إظهار الزجاج فوق سطح المكتب')}</label>
 <p className="inspector-hint">{t('Desktop glass is available on macOS and Windows 11 (22H2 or later). On other systems, transparent areas blend with your app background. Text and icons stay solid.','يتوفر زجاج سطح المكتب على macOS وويندوز 11 (22H2 أو أحدث). في الأنظمة الأخرى تمتزج الأجزاء الشفافة مع خلفية البرنامج. تبقى النصوص والأيقونات واضحة.')}</p>
 <div className="theme-opacity-grid">{opacityKeys.map(key=><div className="theme-opacity-field" key={key}><label htmlFor={'theme-opacity-'+key}>{labels[key]}<output>{100-(value.opacity?.[key]??100)}%</output></label><input id={'theme-opacity-'+key} aria-label={labels[key]+' '+t('transparency','الشفافية')} type="range" min={0} max={100} value={100-(value.opacity?.[key]??100)} onChange={e=>onChange({...value,opacity:{...value.opacity,[key]:100-Number(e.target.value)}})}/><button type="button" className="text-link" disabled={value.opacity?.[key]===undefined} onClick={()=>{const opacity={...value.opacity};delete opacity[key];onChange({...value,opacity});}}>{t('Reset','إعادة ضبط')}</button></div>)}</div>
 <button type="button" className="button secondary" onClick={()=>onChange({...value,opacity:undefined,glass:false})}><RotateCcw size={14}/>{t('Reset transparency','إعادة ضبط الشفافية')}</button></div>;
}

export function ThemeLayout({value,onChange,ar}:{value:Appearance;onChange:(value:Appearance)=>void;ar:boolean}) {
 const t=(en:string,a:string)=>ar?a:en;
 const controlRadius=value.radius??(value.corners==='square'?3:8);
 const fields=[{key:'textScale',label:t('Interface text size','حجم نص الواجهة'),min:90,max:120,step:5,fallback:100,unit:'%'},{key:'sidebarWidth',label:t('Sidebar width','عرض القائمة الجانبية'),min:188,max:280,step:4,fallback:212,unit:'px'},{key:'radius',label:t('Control corners','زوايا عناصر التحكم'),min:0,max:20,step:1,fallback:value.corners==='square'?3:8,unit:'px'},{key:'panelRadius',label:t('Panel corners','زوايا اللوحات'),min:0,max:24,step:1,fallback:controlRadius===0?0:controlRadius+4,unit:'px'},{key:'borderWidth',label:t('Outline thickness','سُمك الحدود'),min:0,max:2,step:.5,fallback:1,unit:'px'}] as const;
 return <><div className="theme-opacity-grid">{fields.map(f=><div className="theme-opacity-field" key={f.key}><label htmlFor={'theme-layout-'+f.key}>{f.label}<output>{value[f.key]??f.fallback} {f.unit}</output></label><input id={'theme-layout-'+f.key} aria-label={f.label} type="range" min={f.min} max={f.max} step={f.step} value={value[f.key]??f.fallback} onChange={e=>onChange({...value,[f.key]:Number(e.target.value)})}/></div>)}</div><button type="button" className="button secondary" onClick={()=>onChange({...value,textScale:undefined,sidebarWidth:undefined,radius:undefined,panelRadius:undefined,borderWidth:undefined,density:'comfortable',corners:'rounded'})}><RotateCcw size={14}/>{t('Reset layout','إعادة ضبط التنسيق')}</button></>;
}
