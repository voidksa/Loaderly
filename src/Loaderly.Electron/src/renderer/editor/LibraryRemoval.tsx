import {useEffect,useRef,useState} from 'react';
import {Library,Trash2,X} from 'lucide-react';
import {MediaIdentity,type MediaIdentityItem} from './MediaIdentity';

export function LibraryRemoval({items,ar,canTrash=true,onCancel,onRemove}:{items:MediaIdentityItem[];ar:boolean;canTrash?:boolean;onCancel:()=>void;onRemove:(disk:boolean)=>Promise<string|undefined>}){
  const dialog=useRef<HTMLDialogElement>(null),[disk,setDisk]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const t=(en:string,a:string)=>ar?a:en;
  useEffect(()=>{const previous=document.activeElement;dialog.current?.showModal();return()=>{if(previous instanceof HTMLElement&&previous.isConnected)previous.focus();};},[]);
  useEffect(()=>{if(!canTrash)setDisk(false);},[canTrash]);
  return <dialog className="app-dialog library-removal" dir={ar?'rtl':'ltr'} ref={dialog} aria-labelledby="library-removal-title" onCancel={e=>{e.preventDefault();if(!busy)onCancel();}}>
    <header className="app-dialog-heading"><div><h2 id="library-removal-title">{items.length===1?t('Remove this item?','إزالة هذا العنصر؟'):t(`Remove ${items.length} items?`,`إزالة ${items.length} عناصر؟`)}</h2>
    <p>{t('Choose what happens to the selected files.','اختر ما يحدث للملفات المحددة.')}</p>
    </div><button className="button secondary" disabled={busy} aria-label={t('Close','إغلاق')} onClick={onCancel}><X size={17}/></button></header>
    <div className="dialog-media-list">{items.slice(0,5).map((item,i)=><MediaIdentity key={i} item={item}/>)}{items.length>5&&<small>+{items.length-5} {t('more','أخرى')}</small>}</div>
    <div className="dialog-choices" role="radiogroup" aria-label={t('Removal options','خيارات الإزالة')}>
    <label><input type="radio" name="removal" checked={!disk} disabled={busy} onChange={()=>setDisk(false)}/><Library size={18}/><span><strong>{t('Remove from Loaderly only','إزالة من Loaderly فقط')}</strong><small>{t('Remove from Downloads and Library. Keep the files on this device.','تُزال من التنزيلات والمكتبة، وتبقى الملفات على جهازك.')}</small></span></label>
    {canTrash?<label><input type="radio" name="removal" checked={disk} disabled={busy} onChange={()=>setDisk(true)}/><Trash2 size={18}/><span><strong>{t('Move to Trash','نقل إلى سلة المحذوفات')}</strong><small>{t('Move the files to the system Trash and remove them from Loaderly.','تُنقل الملفات إلى سلة محذوفات النظام وتُزال من Loaderly.')}</small></span></label>:<p className="dialog-info">{t('This entry has no downloaded file on this device. You can remove it from Loaderly.','هذا العنصر ليس له ملف منزّل على الجهاز. يمكنك إزالته من Loaderly.')}</p>}
    </div>
    {error&&<p role="alert">{error}</p>}
    <footer><button className="button secondary" autoFocus disabled={busy} onClick={onCancel}><X size={15}/>{t('Cancel','إلغاء')}</button><button className="button primary" disabled={busy} onClick={async()=>{setBusy(true);try{const message=await onRemove(disk);if(message)setError(message);}catch{setError(t('Could not remove the selected files. Please try again.','تعذّرت إزالة الملفات المحددة. حاول مجددًا.'));}finally{setBusy(false);}}}><Trash2 size={15}/>{busy?t('Removing…','جارٍ الإزالة…'):disk?t('Move to Trash','نقل إلى السلة'):t('Remove from Loaderly','إزالة من Loaderly')}</button></footer>
  </dialog>;
}
