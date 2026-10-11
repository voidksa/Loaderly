import './design-studio.css';
import { DesignLibrary, designKindLabel } from './DesignLibrary';
import { readLocalDesigns, storeLocalDesign, removeLocalDesign, exportDesignFile } from './localDesigns';
import {ConfirmAction} from './ConfirmAction';
import {ImportDesignCode} from './ImportDesignCode';
import {SoundStudioPreview} from './SoundStudioPreview';
import {AudioControls} from './AudioControls';
import {SpeedControls} from './SpeedControls';
import {decodeSoundPreset,encodeSoundPreset} from '../../shared/audioPreset';
import {useEffect,useRef,useState} from 'react';
import {Upload,Trash2,SlidersHorizontal,Cloud,CloudOff,Check,Copy,Download,Palette,PenTool,RefreshCw,Share2,EyeOff,ArrowLeft} from 'lucide-react';
import {AppearanceSettings} from './AppearanceSettings';
import {VisualizerDesigner} from './VisualizerDesigner';
import {decodeTheme,encodeTheme} from '../../shared/app-preferences/appearance';
import {decodeVisualizer,encodeVisualizer} from '../../shared/editor-project/audioVisualizer';
import {validDraft,type DesignDraft} from '../../shared/communityDrafts';
import type {CommunityLook} from '../../shared/community';
const fingerprint=(d:DesignDraft)=>JSON.stringify([d.id,d.name,d.code]);
export function CommunityStudio({ar,dark,login,currentCode,onApply,onPublished,onViewPublished,publishedLooks,initialDraftId}:{ar:boolean;dark:boolean;login?:string;currentCode:(kind:CommunityLook['kind'])=>string;onApply:(look:CommunityLook)=>()=>void;onPublished:()=>void;onViewPublished:(draft:DesignDraft)=>void;publishedLooks:CommunityLook[];initialDraftId?:string}){
 const t=(en:string,a:string)=>ar?a:en;
 const [localDrafts,setLocalDrafts]=useState(()=>readLocalDesigns(login));
 useEffect(()=>{const update=()=>setLocalDrafts(readLocalDesigns(login));window.addEventListener('loaderly:local-designs',update);return()=>window.removeEventListener('loaderly:local-designs',update);},[login]);
 const [confirmation,setConfirmation]=useState<'delete'|'unpublish'>();
 const [importOpen,setImportOpen]=useState(false),[editing,setEditing]=useState(false);
 const studio=useRef<HTMLElement>(null),heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{studio.current?.scrollIntoView({block:'start'});heading.current?.focus({preventScroll:true});},[editing]);
 const [draft,setDraft]=useState<DesignDraft>(),[drafts,setDrafts]=useState<DesignDraft[]>([]),[sync,setSync]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[copied,setCopied]=useState(false);
 const current=useRef(draft),account=useRef(login),saved=useRef(''),inFlight=useRef(false);current.current=draft;account.current=login;
 const key=`loaderly:design-draft:v1:${login??'local'}`;
 const load=async()=>{const owner=login;try{const result=await window.loaderly?.communityDrafts({action:'list'});if(account.current!==owner)return;if(result?.ok)setDrafts(result.drafts??[]);else setMessage(t('Could not load account drafts. Your local draft is still here.','تعذّر تحميل مسودات الحساب. مسودتك المحلية موجودة.'));}catch{setMessage(t('Drafts are unavailable right now.','المسودات غير متاحة الآن.'));}};
 useEffect(()=>{setDraft(undefined);setEditing(false);setDrafts([]);setSync(false);saved.current='';setMessage('');try{const local=validDraft(JSON.parse(localStorage.getItem(key)??'null'));if(local){const existing=readLocalDesigns(login).find(item=>item.id===local.id);if(!existing)storeLocalDesign(local,login);setDraft(existing??local);}const requested=readLocalDesigns(login).find(item=>item.id===initialDraftId);if(requested){setDraft(requested);setEditing(true);}}catch{/* Invalid local drafts are ignored. */}if(login)void load();},[login,initialDraftId]);
 useEffect(()=>{if(!draft)return;try{localStorage.setItem(key,JSON.stringify(draft));if(draft.name.trim())storeLocalDesign(draft,login);}catch{setMessage(t('Local storage is full. Export your settings file to keep a copy.','التخزين المحلي ممتلئ. صدّر ملف الإعدادات للاحتفاظ بنسخة.'));}},[draft]);
 const save=async():Promise<DesignDraft|undefined>=>{
  const snapshot=current.current,owner=account.current;if(!snapshot||!owner||inFlight.current)return;
  inFlight.current=true;setBusy(true);
  try{const result=await window.loaderly?.communityDrafts({action:'save',draft:snapshot});if(account.current!==owner||current.current?.id!==snapshot.id)return;
   if(!result?.ok||!result.draft){setSync(false);setMessage(result?.error==='conflict-or-limit'?t('This draft changed elsewhere, or you reached 10 drafts. Reload account drafts before saving again. Your local changes are kept.','تغيّرت المسودة من جهاز آخر، أو وصلت إلى ١٠ مسودات. أعد تحميل مسودات الحساب قبل الحفظ. تعديلاتك المحلية محفوظة.'):t('Not saved to your account. Your local draft is kept. Retry when connected.','لم تُحفظ في حسابك. مسودتك محفوظة محليًا. أعد المحاولة عند الاتصال.'));return;}
   saved.current=fingerprint(snapshot);setDraft(value=>value?.id===snapshot.id?{...value,revision:result.draft!.revision,updatedAt:result.draft!.updatedAt,published:result.draft!.published}:value);setDrafts(list=>[result.draft!,...list.filter(d=>d.id!==snapshot.id)]);setMessage(t('Private draft saved to your account.','حُفظت المسودة في حسابك بشكل خاص.'));return result.draft;
  }catch{setSync(false);setMessage(t('Could not save online. Your local changes are kept.','تعذّر الحفظ عبر الإنترنت. تعديلاتك محفوظة محليًا.'));}
  finally{inFlight.current=false;setBusy(false);}
 };
 useEffect(()=>{if(!draft||!login||!sync||busy||confirmation||!draft.name.trim()||fingerprint(draft)===saved.current)return;const timer=setTimeout(()=>void save(),1200);return()=>clearTimeout(timer);},[draft,login,sync,busy,confirmation]);
 const create=(kind:CommunityLook['kind'])=>{saved.current='';setEditing(true);setDraft({id:`design-${crypto.randomUUID()}`,kind,name:kind==='sound'?t('My sound preset','إعداداتي الصوتية'):kind==='theme'?t('My theme','الثيم الخاص بي'):t('My visualizer','طيفي الصوتي'),code:currentCode(kind),revision:0,updatedAt:'',published:false});setSync(false);setMessage(kind==='sound'?t('Copied your current editor sound settings into this private draft. Editing this draft does not change the track.','نُسخت إعدادات الصوت الحالية إلى هذه المسودة الخاصة. تعديل المسودة لا يغيّر المقطع.'):'');};
 const publish=async()=>{if(!login||busy||!draft)return;const snapshot=await save();if(!snapshot)return;const owner=account.current;setBusy(true);try{const result=await window.loaderly?.communityDrafts({action:'publish',id:snapshot.id,revision:snapshot.revision});if(account.current!==owner)return;if(!result?.ok)throw Error();setDraft(value=>value?.id===snapshot.id?{...value,published:true}:value);setMessage('');void load();onPublished();}catch{setMessage(t('Publishing failed. Your private draft is kept.','تعذّر النشر. مسودتك الخاصة محفوظة.'));}finally{setBusy(false);}};
 const unpublish=async()=>{if(!draft||!login)return;setBusy(true);try{const result=await window.loaderly?.communityDrafts({action:'unpublish',id:draft.id,revision:draft.revision});if(!result?.ok||result.draft?.published)throw Error();setDraft(result.draft);setMessage(t('Removed from the public library. Your private draft is kept.','أُزيل من المكتبة العامة. مسودتك الخاصة محفوظة.'));void load();onPublished();}catch{setMessage(t('Could not remove the public design. Refresh and try again.','تعذّر إلغاء المشاركة. حدّث وحاول مجددًا.'));}finally{setBusy(false);}};
 const deleteDraft=async()=>{if(!draft||busy||draft.published)return;setBusy(true);try{if(draft.revision>0){const result=await window.loaderly?.communityDrafts({action:'delete',id:draft.id,revision:draft.revision});if(!result?.ok)throw Error();}localStorage.removeItem(key);removeLocalDesign(draft.id);setDrafts(list=>list.filter(d=>d.id!==draft.id));setDraft(undefined);setEditing(false);setMessage(t('Draft deleted.','حُذفت المسودة.'));}catch{setMessage(t('Could not delete the draft. Reload account drafts and try again.','تعذّر حذف المسودة. أعد تحميل مسودات الحساب وحاول مجددًا.'));}finally{setBusy(false);}};
 const live=draft?publishedLooks.find(look=>look.id===draft.id):undefined;
 const pending=!!draft?.published&&!!live&&(draft.name!==live.name||draft.code!==live.code);
 const combined=[...localDrafts,...drafts.filter(remote=>!localDrafts.some(local=>local.id===remote.id))];
 const myDesigns=[...combined];
 if(draft&&!myDesigns.some(item=>item.id===draft.id))myDesigns.unshift(draft);
 const setCode=(code:string)=>setDraft(value=>value?{...value,code}:value);
 return <section className="community-studio" ref={studio} data-view={editing&&draft?'editor':'library'}>
  <header className="design-studio-heading">
   <div>
    {editing&&draft&&<button className="button secondary studio-back" disabled={busy} onClick={()=>{setEditing(false);setMessage('');}}><ArrowLeft size={15}/>{t('Back to my designs','العودة إلى تصاميمي')}</button>}
    <h2 ref={heading} tabIndex={-1}>{editing&&draft?designKindLabel(draft.kind,ar):t('My designs','تصاميمي')}</h2>
    <p>{editing&&draft?t('Changes are saved on this device. Sharing is always your choice.','تُحفظ التعديلات على هذا الجهاز. أنت تختار متى تشاركها.'):t('Keep your favorite settings here. Open a design to edit or share it.','احتفظ بإعداداتك المفضلة هنا. افتح تصميمًا لتعديله أو مشاركته.')}</p>
   </div>
   {!editing&&<div className="inspector-actions studio-create-actions">
    <button className="button secondary" disabled={busy} onClick={()=>create('theme')}><Palette size={15}/>{t('New theme','ثيم جديد')}</button>
    <button className="button secondary" disabled={busy} onClick={()=>create('visualizer')}><PenTool size={15}/>{t('New visualizer','طيف جديد')}</button>
    <button className="button secondary" disabled={busy} data-tooltip={t('Start with your current editor sound settings','ابدأ بإعدادات الصوت الحالية في المحرر')} onClick={()=>create('sound')}><SlidersHorizontal size={15}/>{t('New sound preset','إعداد صوت جديد')}</button>
    <button className="button secondary" disabled={busy} onClick={()=>setImportOpen(true)}><Upload size={15}/>{t('Import design','استيراد تصميم')}</button>
    {login&&<button className="button secondary studio-reload" disabled={busy} onClick={()=>void load()}><RefreshCw size={15}/>{t('Reload account drafts','تحميل مسودات الحساب')}</button>}
   </div>}
  </header>
  {confirmation&&draft&&<ConfirmAction ar={ar} title={confirmation==='delete'?t('Delete this design?','حذف هذا التصميم؟'):t('Remove from the public library?','إزالة التصميم من المكتبة العامة؟')} confirmLabel={confirmation==='delete'?t('Delete design','حذف التصميم'):t('Remove from public library','إزالة من المكتبة العامة')} onCancel={()=>setConfirmation(undefined)} onConfirm={confirmation==='delete'?deleteDraft:unpublish}>
    <strong dir="auto">{draft.name}</strong><p>{confirmation==='delete'?(draft.revision>0?t('This deletes the private design from this device and your account. This cannot be undone.','سيُحذف التصميم الخاص من هذا الجهاز وحسابك. لا يمكن التراجع عن الحذف.'):t('This deletes the saved design from this device. This cannot be undone.','سيُحذف التصميم المحفوظ من هذا الجهاز. لا يمكن التراجع عن الحذف.')):t('Other people will no longer see it in the community library. Your private draft is kept.','لن يظهر التصميم للآخرين في مكتبة المجتمع. تبقى مسودتك الخاصة محفوظة.')}</p>
  </ConfirmAction>}
  {importOpen&&<ImportDesignCode ar={ar} onCancel={()=>setImportOpen(false)} onImport={(kind,code)=>{saved.current='';setDraft({id:`design-${crypto.randomUUID()}`,kind,name:t('Imported design','تصميم مستورد'),code,revision:0,updatedAt:'',published:false});setSync(false);setEditing(true);setImportOpen(false);setMessage(t('Settings imported. Review your draft and share when ready.','استُوردت الإعدادات. راجع المسودة ثم شاركها حين تجهز.'));}}/>}
  <div className="studio-library-view" hidden={editing&&!!draft}>
   <DesignLibrary items={myDesigns} ar={ar} busy={busy} onSelect={item=>{saved.current=fingerprint(item);setDraft(item);setEditing(true);setSync(false);setMessage('');}}/>
  </div>
  {message||busy?<p className="studio-feedback" role="status">{busy?t('Saving…','جارٍ الحفظ…'):message}</p>:null}
  {editing&&draft&&<div className="studio-editor" key={draft.id}>
   <div className="studio-draft-header">
    <label className="community-design-name">{t('Design name','اسم التصميم')}<input value={draft.name} maxLength={80} onChange={e=>setDraft({...draft,name:e.target.value})}/></label>
    <div className="studio-publication-status"><div><strong className="studio-state-badge">{draft.published?(pending?t('Unpublished changes','تعديلات لم تُنشر'):t('Published in Loaderly','منشور في Loaderly')):t('Private design','تصميم خاص')}</strong><small>{draft.published?(pending?t('Publish update to share your edits.','انشر التحديث لمشاركة تعديلاتك.'):t('Visible in the app and on the community website.','ظاهر في البرنامج وموقع المجتمع.')):t('Only you can see this.','يظهر لك فقط.')}</small></div>{draft.published&&<button className="button secondary" onClick={()=>onViewPublished(draft)}>{t('View my post','عرض منشوري')}</button>}</div>
   </div>
   <div className="inspector-actions studio-actions" aria-label={t('Design actions','إجراءات التصميم')}><button className="button secondary" onClick={()=>{try{storeLocalDesign(draft,login);setMessage(t('Saved on this device.','حُفظ على هذا الجهاز.'));}catch{setMessage(t('Could not save locally. Export your settings file.','تعذّر الحفظ محليًا. صدّر ملف الإعدادات.'));}}}><Check size={15}/>{t('Save on this device','حفظ على هذا الجهاز')}</button><button className="button secondary" onClick={()=>exportDesignFile(draft.name,draft.kind,draft.code)}><Download size={15}/>{t('Export settings file','تصدير ملف الإعدادات')}</button><button className="button secondary" onClick={()=>{onApply({...draft,author:login??'',url:'',featured:false});setMessage(draft.kind==='sound'?t('Preset ready. Open an audio clip, then review and apply it under Sound presets.','الإعداد جاهز. افتح مقطعًا صوتيًا ثم راجعه وطبّقه من إعدادات الصوت.'):t('Applied in Loaderly.','طُبّق في Loaderly.'));}}><Check size={15}/>{draft.kind==='theme'?t('Apply app theme','تطبيق ثيم البرنامج'):draft.kind==='sound'?t('Use in editor','استخدام في المحرر'):t('Use visualizer','استخدام الطيف')}</button><button className="button primary" disabled={!login||busy||!draft.name.trim()} onClick={()=>void publish()}><Share2 size={15}/>{draft.published?t('Publish update','نشر التحديث'):t('Publish in Loaderly','نشر في مجتمع Loaderly')}</button>{draft.published&&<button className="button secondary" disabled={!login||busy} onClick={()=>setConfirmation('unpublish')}><EyeOff size={15}/>{t('Remove from public library','إزالة من المكتبة العامة')}</button>}</div>
   {draft.kind==='sound'?<div className="community-sound-editor"><SoundStudioPreview key={draft.id} ar={ar} preset={decodeSoundPreset(draft.code)!}/><AudioControls value={decodeSoundPreset(draft.code)!.audio} onChange={audio=>setCode(encodeSoundPreset({...decodeSoundPreset(draft.code)!,audio}))} ar={ar} speedControls={<div className="studio-speed"><label className="audio-toggle"><input type="checkbox" checked={!!decodeSoundPreset(draft.code)!.speed} onChange={e=>setCode(encodeSoundPreset({...decodeSoundPreset(draft.code)!,speed:e.target.checked?{rate:1,mode:'normal'}:undefined}))}/>{t('Include speed & pitch mode','تضمين السرعة ووضع الطبقة')}</label>{decodeSoundPreset(draft.code)!.speed&&<SpeedControls rate={decodeSoundPreset(draft.code)!.speed!.rate} mode={decodeSoundPreset(draft.code)!.speed!.mode} ar={ar} onRate={rate=>setCode(encodeSoundPreset({...decodeSoundPreset(draft.code)!,speed:{...decodeSoundPreset(draft.code)!.speed!,rate}}))} onMode={mode=>setCode(encodeSoundPreset({...decodeSoundPreset(draft.code)!,speed:{...decodeSoundPreset(draft.code)!.speed!,mode}}))}/>}</div>}/></div>:draft.kind==='theme'?<AppearanceSettings showLibrary={false} value={decodeTheme(draft.code)} onChange={value=>setCode(encodeTheme(value))} ar={ar} dark={dark}/>:<VisualizerDesigner value={decodeVisualizer(draft.code)!} onChange={value=>setCode(encodeVisualizer(value))} ar={ar}/>}
   <details className="studio-sharing-options">
    <summary>{t('Sharing & backup','المشاركة والنسخ الاحتياطي')}</summary>
    <div className="community-draft-status"><span>{login?<Cloud size={15}/>:<CloudOff size={15}/>} {login?`${t('Signed in as','مسجّل الدخول باسم')} @${login}`:t('Sign in to publish or keep an account copy.','سجّل الدخول للنشر أو لحفظ نسخة في الحساب.')}</span>{login&&<label><input type="checkbox" checked={sync} onChange={e=>setSync(e.target.checked)}/>{t('Automatically save a private copy to my account','حفظ نسخة خاصة تلقائيًا في حسابي')}</label>}</div>
     <details className="studio-extra-sharing"><summary>{t('Keep a copy of your design','احتفظ بنسخة من تصميمك')}</summary><p>{t('Copy or download the code to keep a backup or send it to someone. Publish in Loaderly shares your design in the app and on the community website.','انسخ الكود أو نزّله للاحتفاظ بنسخة أو إرسالها لشخص. ينشر زر نشر في مجتمع Loaderly تصميمك في البرنامج وموقع المجتمع.')}</p><div className="inspector-actions"><button className="button secondary" onClick={async()=>{try{const result=await window.loaderly?.copyText(draft.code);if(!result?.ok)throw Error();setCopied(true);setTimeout(()=>setCopied(false),2000);}catch{setMessage(t('Copy failed. Download the code instead.','تعذّر النسخ. نزّل الكود بدلًا من ذلك.'));}}}>{copied?<Check size={15}/>:<Copy size={15}/>} {copied?t('Copied!','تم النسخ!'):t('Copy code','نسخ الكود')}</button><button className="button secondary" onClick={()=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([draft.code],{type:'application/json'}));a.href=url;a.download=`Loaderly.${draft.kind}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}><Download size={15}/>{t('Download code','تنزيل الكود')}</button></div></details>
   </details>
   {!draft.published&&<button className="button secondary studio-delete" disabled={busy} onClick={()=>setConfirmation('delete')}><Trash2 size={14}/>{t('Delete private draft','حذف المسودة الخاصة')}</button>}
  </div>}
 </section>;
}


