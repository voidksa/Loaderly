import {ThemePreview,ThemeTransparency,ThemeLayout} from './ThemeDetails';
import {ControlDeck} from './ControlDeck';
import { CommunityLookCard } from './CommunityLookCard';
import { useRef, useState } from 'react';
import { FileCode, Check, Palette, SlidersHorizontal, Paintbrush, Share2, Copy, Download, Upload, RotateCcw } from 'lucide-react';
import { themePresets, colorKeys, appearanceVariables, encodeTheme, decodeTheme, defaultAppearance, type Appearance } from '../../shared/app-preferences/appearance';
import { DesktopMenu } from './DesktopMenu';
import { ColorField } from './ColorField';
export function AppearanceSettings({value,onChange,ar,dark}:{value:Appearance;onChange:(v:Appearance)=>void;ar:boolean;dark:boolean}) {
 const [code,setCode]=useState(''),[message,setMessage]=useState(''); const file=useRef<HTMLInputElement>(null);
 const t=(en:string,arabic:string)=>ar?arabic:en;
 const apply=(text:string)=>{try{onChange(decodeTheme(text));setMessage(t('Theme applied.','المظهر جاهز.'))}catch{setMessage(t('Invalid theme. Choose a Loaderly theme file or paste the complete code.','ملف المظهر غير صالح. اختر ملف Loaderly أو الصق الكود كاملًا.'))}};
 const mode=dark?'dark':'light', variables=appearanceVariables(value,dark);
 const labels={background:t('Background','الخلفية'),surface:t('Panels','البطاقات'),raised:t('Controls','عناصر التحكم'),border:t('Borders','الحدود'),text:t('Text','النصوص'),muted:t('Secondary text','النصوص الثانوية'),accent:t('Accent','اللون الرئيسي'),sidebar:t('Sidebar','القائمة الجانبية'),titlebar:t('Title bar','الشريط العلوي'),editor:t('Editor background','خلفية المحرر'),popover:t('Menus & popups','القوائم والنوافذ المنبثقة'),selection:t('Selection','التحديد'),buttonText:t('Button text','نص الأزرار الرئيسية')};
 const tokens={background:'--background',surface:'--surface',raised:'--surface-raised',border:'--border',text:'--foreground',muted:'--muted',accent:'--accent',sidebar:'--sidebar',titlebar:'--titlebar-bg',editor:'--editor',popover:'--popover',selection:'--accent-soft',buttonText:'--accent-ink'};
 const setColor=(key:typeof colorKeys[number],color:string)=>onChange({...value,colors:{...value.colors,[mode]:{...value.colors?.[mode],[key]:color}}});
 return <div className="appearance-editor">
 <ThemePreview value={value} dark={dark} ar={ar}/>
 <ControlDeck label={t('Theme customization','تخصيص الثيم')} pages={[
 {id:'presets',label:t('Themes','الثيمات'),icon:<Palette size={15}/>,content:<>  <div className="theme-presets">{themePresets.map(p=><button key={p.id} type="button" aria-pressed={value.preset===p.id} onClick={()=>onChange({...value,preset:p.id,accent:'',colors:undefined})}><span className="theme-swatch" style={{background:(dark?p.dark:p.light)[0],borderColor:(dark?p.dark:p.light)[3]}}><i style={{background:(dark?p.dark:p.light)[1]}}/><b style={{background:(dark?p.dark:p.light)[4]}}/></span>{ar?p.ar:p.en}</button>)}</div>
</>},
 {id:'colors',label:t('Colors','الألوان'),icon:<Paintbrush size={15}/>,content:<>  <div className="theme-disclosure"><p>{t(`Editing ${mode} mode. Switch the appearance mode above to customize the other palette.`,dark?'تعدّل الآن ألوان الوضع الداكن. بدّل الوضع من الأعلى لتخصيص الألوان الفاتحة.':'تعدّل الآن ألوان الوضع الفاتح. بدّل الوضع من الأعلى لتخصيص الألوان الداكنة.')}</p><div className="theme-color-grid">{colorKeys.map(key=><ColorField key={mode+key} ar={ar} label={labels[key]} value={variables[tokens[key]]} onChange={color=>setColor(key,color)} onReset={value.colors?.[mode]?.[key]?()=>{const palette={...value.colors?.[mode]};delete palette[key];onChange({...value,colors:{...value.colors,[mode]:palette}});}:undefined}/>)}</div><label className="theme-radius">{t('Corner radius','استدارة الزوايا')}<input type="number" min={0} max={20} value={value.radius??(value.corners==='square'?3:8)} onChange={e=>onChange({...value,radius:Math.max(0,Math.min(20,Number(e.target.value)))})}/><span>px</span></label><button type="button" className="button secondary" onClick={()=>onChange({...value,accent:'',colors:undefined,radius:undefined})}><RotateCcw size={14}/>{t('Reset customization','استعادة ألوان المظهر')}</button></div>
</>},
 {id:'transparency',label:t('Transparency','الشفافية'),icon:<SlidersHorizontal size={15}/>,content:<ThemeTransparency value={value} onChange={onChange} ar={ar}/>},
 {id:'layout',label:t('Layout','التنسيق'),icon:<SlidersHorizontal size={15}/>,content:<>  <div className="appearance-options">
   <ColorField key={mode} ar={ar} label={t('Accent color','اللون الرئيسي')} value={variables['--accent']} onChange={color=>setColor('accent',color)}/>
   <div className="appearance-option"><span>{t('Spacing','المسافات')}</span><DesktopMenu ariaLabel={t('Spacing','المسافات')} value={value.density} valueLabel={value.density==='compact'?t('Compact','متقاربة'):value.density==='spacious'?t('Spacious','واسعة'):t('Comfortable','مريحة')} options={[{value:'comfortable',label:t('Comfortable','مريحة')},{value:'compact',label:t('Compact','متقاربة')},{value:'spacious',label:t('Spacious','واسعة')}]} onChange={density=>onChange({...value,density})}/></div>
   <div className="appearance-option"><span>{t('Corners','الزوايا')}</span><DesktopMenu ariaLabel={t('Corners','الزوايا')} value={value.corners} valueLabel={value.corners==='square'?t('Square','مستقيمة'):t('Rounded','مستديرة')} options={[{value:'rounded',label:t('Rounded','مستديرة')},{value:'square',label:t('Square','مستقيمة')}]} onChange={corners=>onChange({...value,corners,radius:undefined})}/></div>
  </div><ThemeLayout value={value} onChange={onChange} ar={ar}/>
</>},
 {id:'share',label:t('Import & share','استيراد ومشاركة'),icon:<Share2 size={15}/>,content:<>  <div className="theme-share theme-disclosure"><p>{t('Copy the code or save a theme file to share anywhere. Your media and API keys stay private.','انسخ الكود أو احفظ ملف المظهر لمشاركته بأي تطبيق. لا يتضمن ملفاتك أو مفاتيحك.')}</p><div className="inspector-actions">
  <button type="button" className="button secondary" onClick={async()=>{const text=encodeTheme(value);setCode(text);try{await window.loaderly?.copyText(text);setMessage(t('Theme code copied.','نُسخ كود المظهر.'))}catch{setMessage(t('Select and copy the code below.','حدد الكود أدناه وانسخه.'))}}}><Copy size={14}/>{t('Copy code','نسخ الكود')}</button>
  <button type="button" className="button secondary" onClick={()=>{const url=URL.createObjectURL(new Blob([encodeTheme(value)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='Loaderly.theme.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}}><Download size={14}/>{t('Export file','تصدير ملف')}</button>
  <button type="button" className="button secondary" onClick={()=>file.current?.click()}><Upload size={14}/>{t('Import file','استيراد ملف')}</button>
  <button type="button" className="button secondary" onClick={()=>setCode(encodeTheme({...defaultAppearance,colors:{dark:{background:'#151515',surface:'#202020',raised:'#2b2b2b',border:'#424242',text:'#eef1f5',muted:'#aab1bc',accent:'#c4cbd3'},light:{background:'#f4f4f4',surface:'#ffffff',raised:'#eaeaea',border:'#cccccc',text:'#25272c',muted:'#646b76',accent:'#495563'}},radius:8}))}><FileCode size={14}/>{t('Starter code','قالب جاهز')}</button>
  <input ref={file} type="file" accept=".json" hidden onChange={async e=>{const f=e.target.files?.[0];if(f){if(f.size>4096){setMessage(t('File is too large.','الملف أكبر من المسموح.'));return}apply(await f.text())}e.target.value=''}}/></div>
  <textarea aria-label={t('Theme code','كود المظهر')} dir="ltr" spellCheck={false} value={code} onChange={e=>setCode(e.target.value)} maxLength={4096}/><button type="button" className="button secondary" disabled={!code} onClick={()=>apply(code)}><Check size={14}/>{t('Apply code','تطبيق الكود')}</button></div></>}
 ]}/>{message&&<p role="status">{message}</p>}
  <CommunityLookCard ar={ar} kind="theme"/>
 </div>;
}
