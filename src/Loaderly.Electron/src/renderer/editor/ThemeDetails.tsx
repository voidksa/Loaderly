import {useEffect,useState,type CSSProperties} from 'react';
import {RotateCcw, Music2, Library, Download, Users, Minus, Square, Maximize2, X, Play, Ellipsis} from 'lucide-react';
import {appearanceVariables, appearanceOpacity, defaultInterfaceTextScale, opacityKeys, type Appearance} from '../../shared/app-preferences/appearance';
import {RangeInput} from './RangeInput';
import './theme-details.css';

export function ThemePreview({value,dark,ar}:{value:Appearance;dark:boolean;ar:boolean}) {
 const t=(en:string,a:string)=>ar?a:en;
 const platform=window.loaderly?.platform??'win32';
 return <div className="theme-preview-wrap"><div className="theme-live-preview" dir={ar?'rtl':'ltr'} data-platform={platform} data-density={value.density} data-glass={value.glass===true} style={appearanceVariables(value,dark) as CSSProperties} role="group" aria-label={t('Theme preview','معاينة الثيم')}>
  <header className="theme-preview-titlebar" dir="ltr">
   {platform==='darwin'&&<span className="theme-preview-traffic-lights" aria-hidden="true"><i/><i/><i/></span>}
   <span className="theme-preview-brand">{platform!=='darwin'&&<img src="./assets/loaderly-64.png" alt=""/>}<strong>Loaderly</strong></span>
   <span className="theme-preview-label" dir={ar?'rtl':'ltr'}>{t('Live preview','معاينة مباشرة')}</span>
   {platform!=='darwin'&&<span className="theme-preview-window-controls" aria-hidden="true"><span><Minus size={12}/></span><span>{platform==='linux'?<Maximize2 size={11}/>:<Square size={10}/>}</span><span><X size={12}/></span></span>}
  </header>
  <div className="theme-preview-body"><aside>
   <div className="theme-preview-nav-item is-selected"><Library size={15} aria-hidden="true"/><span>{t('Library','المكتبة')}</span></div>
   <div className="theme-preview-nav-item"><Download size={15} aria-hidden="true"/><span>{t('Downloads','التنزيلات')}</span></div>
   <div className="theme-preview-community"><div className="theme-preview-nav-item"><Users size={15} aria-hidden="true"/><span>{t('Community library','مكتبة المجتمع')}</span></div></div>
  </aside>
  <section><strong>{t('Make it yours','صمّمه بطريقتك')}</strong><p>{t('Your colors, your workspace.','ألوانك ومساحتك الخاصة.')}</p><div className="theme-preview-panel"><span className="theme-preview-media" aria-hidden="true"><Music2 size={22}/></span><div className="theme-preview-media-copy"><strong>{t('Evening melody','لحن المساء')}</strong><small><bdi dir="ltr">03:24</bdi></small></div><span className="theme-preview-action" aria-hidden="true"><Play size={13} fill="currentColor"/></span><span className="theme-preview-control" aria-hidden="true"><Ellipsis size={14}/></span></div><div className="theme-preview-menu">{t('Menus & tooltips','القوائم والتلميحات')}</div></section></div>
 </div></div>;
}

export function ThemeTransparency({value,onChange,ar}:{value:Appearance;onChange:(value:Appearance)=>void;ar:boolean}) {
 const t=(en:string,a:string)=>ar?a:en;
 const linux=window.loaderly?.platform==='linux';
 const [support,setSupport]=useState<{supported:boolean;reduced:boolean}>();
 useEffect(()=>{
  let mounted=true;
  const refresh=()=>void window.loaderly?.getWindowAppearanceSupport().then(result=>{if(mounted)setSupport(result);}).catch(()=>{if(mounted)setSupport({supported:false,reduced:false});});
  const removeAppearanceListener=window.loaderly?.onWindowAppearanceChanged?.(result=>{if(mounted)setSupport(result);});
  refresh();window.addEventListener('focus',refresh);
  return()=>{mounted=false;window.removeEventListener('focus',refresh);removeAppearanceListener?.();};
 },[]);
 const available=!!support?.supported&&!support.reduced;
 const labels={background:t('Workspace background','خلفية مساحة العمل'),sidebar:t('Sidebar','القائمة الجانبية'),titlebar:t('Title bar','الشريط العلوي'),surface:t('Panels','اللوحات'),editor:t('Editor background','خلفية المحرر'),popover:t('Menus & popups','القوائم والنوافذ المنبثقة')};
 return <div className="theme-transparency"><div className="theme-glass-settings"><label className="audio-toggle"><input type="checkbox" disabled={!available} checked={available&&!!value.glass} aria-describedby={`desktop-glass-hint${support&&!available?' desktop-glass-status':''}`} onChange={e=>onChange({...value,glass:e.target.checked})}/>{t('Show desktop glass','إظهار الزجاج فوق سطح المكتب')}</label>
 <p className="inspector-hint" id="desktop-glass-hint">{t('Show what’s behind Loaderly while keeping text and icons clear.','أظهر ما خلف نافذة Loaderly مع بقاء النصوص والأيقونات واضحة.')}</p>
 {support&&!available&&<p className="inspector-hint theme-glass-status" id="desktop-glass-status">{support.reduced?t('Your system reduces transparency, so desktop glass is off.','تقلّل إعدادات النظام الشفافية، لذا يتوقف زجاج سطح المكتب.'):linux?t('Desktop glass needs an X11 session with desktop compositing enabled.','يحتاج زجاج سطح المكتب جلسة X11 مع تفعيل المؤثرات الرسومية لسطح المكتب.'):t('Desktop glass is unavailable on this device.','زجاج سطح المكتب غير متاح على هذا الجهاز.')}</p>}
 {linux&&<p className="inspector-hint theme-glass-status">{t('Your desktop controls the background blur. On Linux Mint Cinnamon, enable Blur Cinnamon for Loaderly to add blur to the transparent window.','يتحكم سطح المكتب في تمويه الخلفية. على Linux Mint Cinnamon، فعّل Blur Cinnamon لتطبيق Loaderly لإضافة التمويه إلى النافذة الشفافة.')}</p>}
 <details className="theme-glass-support"><summary>{t('Device support','دعم الجهاز')}</summary>{linux?<><p>{t('Linux Mint Cinnamon: in Extensions, install and enable Blur Cinnamon. In its settings, enable Application windows and add Loaderly to the window list. Keep window opacity at 100% so text and icons stay clear.','في Linux Mint Cinnamon: من الإضافات، ثبّت Blur Cinnamon وفعّله. في إعداداته، فعّل نوافذ التطبيقات وأضف Loaderly إلى قائمة النوافذ. اترك عتامة النافذة عند 100٪ لتبقى النصوص والأيقونات واضحة.')}</p><a href="https://cinnamon-spices.linuxmint.com/extensions/view/104" target="_blank" rel="noreferrer">{t('Blur Cinnamon setup','إعداد Blur Cinnamon')}</a><p>{t('Other X11 desktops need a compositor with background blur. Without blur, the window is translucent. Wayland currently keeps a solid background.','تحتاج بيئات X11 الأخرى مدير نوافذ يدعم تمويه الخلفية. بدون التمويه تظهر النافذة شفافة. تحتفظ جلسة Wayland حاليًا بخلفية معتمة.')}</p></>:<p>{t('Desktop glass works on macOS and Windows 11 (22H2 or later). On other systems, transparency blends with Loaderly’s background.','يتوفر زجاج سطح المكتب على macOS وويندوز 11 (22H2 أو أحدث). في الأنظمة الأخرى تتغيّر شفافية اللوحات داخل البرنامج فقط.')}</p>}</details></div>
 <p className="inspector-hint theme-transparency-guide">{t('Raise each slider to show more of the background. A tint stays at 100% to keep content readable.','ارفع النسبة لإظهار الخلفية أكثر. تبقى طبقة لونية عند 100٪ لوضوح المحتوى.')}</p>
 <div className="theme-opacity-grid theme-slider-grid">{opacityKeys.map(key=><div className="theme-opacity-field theme-slider-card" key={key}><div className="theme-slider-heading"><label htmlFor={'theme-opacity-'+key}>{labels[key]}</label><output htmlFor={'theme-opacity-'+key}><bdi dir="ltr">{100-appearanceOpacity(value,key)}%</bdi></output><button type="button" className="theme-slider-reset" aria-label={t(`Reset ${labels[key].toLowerCase()} transparency`,`إعادة ضبط شفافية ${labels[key]}`)} disabled={value.opacity?.[key]===undefined} onClick={()=>{const opacity={...value.opacity};delete opacity[key];onChange({...value,opacity});}}><RotateCcw size={14} aria-hidden="true"/></button></div><RangeInput id={'theme-opacity-'+key} aria-label={labels[key]+' '+t('transparency','الشفافية')} min={0} max={100} value={100-appearanceOpacity(value,key)} onChange={e=>onChange({...value,opacity:{...value.opacity,[key]:100-Number(e.target.value)}})}/></div>)}</div>
 <div className="theme-section-actions"><button type="button" className="button secondary" onClick={()=>onChange({...value,opacity:undefined,glass:false})}><RotateCcw size={14}/>{t('Reset transparency','إعادة ضبط الشفافية')}</button></div></div>;
}

export function ThemeLayout({value,onChange,ar}:{value:Appearance;onChange:(value:Appearance)=>void;ar:boolean}) {
 const t=(en:string,a:string)=>ar?a:en;
 const controlRadius=value.radius??(value.corners==='square'?3:8);
 const fields=[{key:'textScale',label:t('Interface text size','حجم نص الواجهة'),min:90,max:120,step:5,fallback:defaultInterfaceTextScale,unit:'%'},{key:'sidebarWidth',label:t('Sidebar width','عرض القائمة الجانبية'),min:188,max:280,step:4,fallback:212,unit:'px'},{key:'radius',label:t('Control corners','زوايا عناصر التحكم'),min:0,max:20,step:1,fallback:value.corners==='square'?3:8,unit:'px'},{key:'panelRadius',label:t('Panel corners','زوايا اللوحات'),min:0,max:24,step:1,fallback:controlRadius===0?0:controlRadius+4,unit:'px'},{key:'borderWidth',label:t('Outline thickness','سُمك الحدود'),min:0,max:2,step:.5,fallback:1,unit:'px'}] as const;
 return <><div className="theme-opacity-grid theme-slider-grid">{fields.map(f=><div className="theme-opacity-field theme-slider-card" key={f.key}><div className="theme-slider-heading"><label htmlFor={'theme-layout-'+f.key}>{f.label}</label><output htmlFor={'theme-layout-'+f.key}><bdi dir="ltr">{value[f.key]??f.fallback} {f.unit}</bdi></output></div><RangeInput id={'theme-layout-'+f.key} aria-label={f.label} min={f.min} max={f.max} step={f.step} value={value[f.key]??f.fallback} onChange={e=>onChange({...value,[f.key]:Number(e.target.value)})}/></div>)}</div><div className="theme-section-actions"><button type="button" className="button secondary" onClick={()=>onChange({...value,textScale:undefined,sidebarWidth:undefined,radius:undefined,panelRadius:undefined,borderWidth:undefined,density:'comfortable',corners:'rounded'})}><RotateCcw size={14}/>{t('Reset layout','إعادة ضبط التنسيق')}</button></div></>;
}
