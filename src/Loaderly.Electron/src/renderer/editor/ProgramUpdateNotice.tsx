import { useEffect, useRef, useState } from 'react';
import { ArrowUpCircle } from 'lucide-react';
import { useProgramUpdate } from './useProgramUpdate';

export function ProgramUpdateNotice({ ar, hidden, onReview }: { ar: boolean; hidden: boolean; onReview: () => void }) {
  const state = useProgramUpdate();
  const [dismissed, setDismissed] = useState('');
  const dialog=useRef<HTMLDialogElement>(null);
  const [error,setError]=useState(false);
  useEffect(()=>{if(state?.phase==='installing')dialog.current?.showModal();else dialog.current?.close();},[state?.phase]);
  if(state?.distribution==='store') {
    if(state.phase==='installing')return <dialog ref={dialog} className="store-install-dialog" onCancel={e=>e.preventDefault()} aria-label={ar?'تثبيت التحديث':'Installing update'}><h2>{ar?'جارٍ تثبيت التحديث…':'Installing update…'}</h2><p>{ar?'حُفظت تعديلاتك. أكمل الخطوات في نافذة Microsoft إن ظهرت. قد يُغلق التطبيق أثناء التثبيت.':'Your edits are saved. Follow the Microsoft prompt if it appears. The app may close during installation.'}</p></dialog>;
    if(hidden||!['available','ready'].includes(state.phase)||(state.snoozedUntil??0)>Date.now())return null;
    const download=async()=>{try{setError(false);const next=await window.loaderly?.programUpdate('download');setError(next?.storeIssue==='download');}catch{setError(true);}};
    return <section className="program-update-notice" role="status" aria-label={ar?'تحديث متاح':'Update available'}><ArrowUpCircle size={22} aria-hidden="true"/><div className="program-update-notice__copy"><strong>{state.phase==='ready'?(ar?'التحديث جاهز للتثبيت':'Update ready to install'):(ar?'يتوفر تحديث لـ Loaderly في متجر Microsoft':'A Loaderly update is available from Microsoft Store')}</strong><span>{state.phase==='ready'?(ar?'ثبّته بعد انتهاء عملك.':'Install when you finish your work.'):(ar?'يمكنك تنزيله ومتابعة عملك.':'Download it while you keep working.')}</span>{error&&<span>{ar?'تعذّرت العملية. حاول من الإعدادات ثم حول.':'Could not start. Try Preferences > About.'}</span>}</div><div className="program-update-notice__actions"><button className="button primary" onClick={state.phase==='ready'?onReview:()=>void download()}>{state.phase==='ready'?(ar?'عرض التحديث':'View update'):(ar?'التحديث الآن':'Update now')}</button><a className="button secondary" href={`https://loaderly.app/${ar?'ar/':''}docs/whats-new/`} target="_blank" rel="noreferrer">{ar?'ما الجديد؟':'What’s new'}</a><button className="button secondary" onClick={()=>void window.loaderly?.programUpdate('later').catch(()=>setError(true))}>{ar?'لاحقًا':'Later'}</button></div></section>;
  }
  if (hidden || state?.phase !== 'available' || !state.version || dismissed === state.version) return null;
  return <section className="program-update-notice" role="status" aria-label={ar ? 'تحديث متاح' : 'Update available'}>
    <ArrowUpCircle size={22} aria-hidden="true" />
    <div className="program-update-notice__copy">
      <strong>{ar ? 'يتوفر تحديث جديد' : 'An update is available'}</strong>
      <span><bdi>Loaderly {state.version}</bdi></span>
    </div>
    <div className="program-update-notice__actions">
      <button className="button primary" onClick={onReview}>{ar ? 'عرض التحديث' : 'View update'}</button>
      <button className="button secondary" onClick={() => setDismissed(state.version!)}>{ar ? 'لاحقًا' : 'Later'}</button>
    </div>
  </section>;
}
