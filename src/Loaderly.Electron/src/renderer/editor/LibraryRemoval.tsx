import {useEffect,useRef,useState} from 'react';
import {Library,Trash2,X} from 'lucide-react';

export function LibraryRemoval({names,ar,canTrash=true,onCancel,onRemove}:{names:string[];ar:boolean;canTrash?:boolean;onCancel:()=>void;onRemove:(disk:boolean)=>Promise<string|undefined>}){
  const dialog=useRef<HTMLDialogElement>(null),[disk,setDisk]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const t=(en:string,a:string)=>ar?a:en;
  useEffect(()=>{const previous=document.activeElement;dialog.current?.showModal();return()=>{if(previous instanceof HTMLElement&&previous.isConnected)previous.focus();};},[]);
  return <dialog className="library-removal" ref={dialog} aria-labelledby="library-removal-title" onCancel={e=>{e.preventDefault();if(!busy)onCancel();}}>
    <h2 id="library-removal-title">{names.length===1?t('Remove this item?','إزالة هذا العنصر؟'):t(`Remove ${names.length} items?`,`إزالة ${names.length} عناصر؟`)}</h2>
    <p>{t('Choose what happens to the selected files.','اختر ما يحدث للملفات المحددة.')}</p>
    <div className="library-removal-names">{names.slice(0,5).map((name,i)=><div key={i} dir="auto">{name}</div>)}{names.length>5&&<small>+{names.length-5} {t('more','أخرى')}</small>}</div>
    <label><input type="radio" name="removal" checked={!disk} disabled={busy} onChange={()=>setDisk(false)}/><Library size={18}/><span><strong>{t('Remove from Loaderly only','إزالة من Loaderly فقط')}</strong><small>{t('Remove from Downloads and Library. Keep the files on this device.','تُزال من التنزيلات والمكتبة، وتبقى الملفات على جهازك.')}</small></span></label>
    <label><input type="radio" name="removal" checked={disk} disabled={busy||!canTrash} onChange={()=>setDisk(true)}/><Trash2 size={18}/><span><strong>{t('Delete from device','حذف من الجهاز')}</strong><small>{canTrash?t('Move the files to the system Trash and remove them from Loaderly.','تُنقل الملفات إلى سلة محذوفات النظام وتُزال من Loaderly.'):t('There is no downloaded file to delete for these items.','لا يوجد ملف منزّل لهذه العناصر لحذفه من الجهاز.')}</small></span></label>
    {error&&<p role="alert">{error}</p>}
    <footer><button className="button secondary" autoFocus disabled={busy} onClick={onCancel}><X size={15}/>{t('Cancel','إلغاء')}</button><button className="button primary" disabled={busy} onClick={async()=>{setBusy(true);try{const message=await onRemove(disk);if(message)setError(message);}catch{setError(t('Could not remove the selected files. Please try again.','تعذّرت إزالة الملفات المحددة. حاول مجددًا.'));}finally{setBusy(false);}}}><Trash2 size={15}/>{busy?t('Removing…','جارٍ الإزالة…'):disk?t('Move to Trash','نقل إلى السلة'):t('Remove from Loaderly','إزالة من Loaderly')}</button></footer>
  </dialog>;
}
