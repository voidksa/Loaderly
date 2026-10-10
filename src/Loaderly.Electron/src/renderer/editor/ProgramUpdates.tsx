import {useEffect,useState} from 'react';
import type {UpdateState} from '../../shared/releases';
export function ProgramUpdates({ar,busy,beforeInstall}:{ar:boolean;busy:boolean;beforeInstall:()=>boolean}) {
  const [state,setState]=useState<UpdateState>(),[error,setError]=useState('');
  const t=(en:string,arabic:string)=>ar?arabic:en;
  useEffect(()=>{void window.loaderly?.programUpdate('state').then(setState);return window.loaderly?.onProgramUpdate(setState);},[]);
  const action=async (name:'check'|'download'|'cancel'|'install'|'automatic',automatic?:boolean)=>{setError('');try{if(name==='install'&&!beforeInstall())throw Error('Save failed');const result=await window.loaderly?.programUpdate(name,automatic);if(result)setState(result);}catch{setError(t('Could not complete this action. Finish active jobs and try again.','تعذّر إكمال العملية. انتظر انتهاء العمليات الجارية وحاول مجددًا.'));}};
  const downloading=state?.phase==='downloading', checking=state?.phase==='checking';
  if(state?.distribution==='store')return <section className="program-updates" aria-label={t('Loaderly updates','تحديثات Loaderly')}>
    <div className="setting-row"><span><strong>Loaderly · {state.current}</strong><small>{t('Microsoft Store manages updates for this copy of Loaderly.','يتولى متجر Microsoft تحديث هذه النسخة من Loaderly.')}</small></span><button className="button secondary" onClick={()=>void action('check')}>{t('Open Microsoft Store','فتح متجر Microsoft')}</button></div>
    {error&&<p role="status">{t('Could not open Microsoft Store. Open it from the Start menu.','تعذّر فتح متجر Microsoft. افتحه من قائمة ابدأ.')}</p>}
  </section>;
  return <section className="program-updates" aria-label={t('Loaderly updates','تحديثات Loaderly')}>
    <div className="setting-row"><span><strong>{t('Loaderly update','تحديث Loaderly')} · {state?.current??'…'}</strong><small>{state?.checkedAt?t('Last checked: ','آخر فحص: ')+new Date(state.checkedAt).toLocaleString(ar?'ar':'en'):t('Check for a newer release.','تحقق من توفر إصدار أحدث.')}</small></span><button className="button secondary" disabled={!state||checking||downloading||state.phase==='ready'} onClick={()=>void action('check')}>{t(checking?'Checking…':'Check for updates',checking?'جارٍ الفحص…':'التحقق من التحديثات')}</button></div>
    <label className="update-automatic"><input type="checkbox" checked={state?.automatic??true} onChange={e=>void action('automatic',e.target.checked)}/>{t('Check automatically while Loaderly is open','التحقق تلقائيًا أثناء فتح Loaderly')}</label>
    {state?.phase==='current'&&<p role="status">{t('You have the latest available version for this device.','لديك أحدث نسخة متاحة لهذا الجهاز.')}</p>}
    {['available','downloading','ready'].includes(state?.phase??'')&&<div className="update-release"><strong>{t('Available: ','متاح: ')}Loaderly {state?.version}</strong><p style={{whiteSpace:'pre-wrap'}}>{state?.notes}</p>
      {downloading?<><progress max={100} value={state?.progress}/><span>{state?.progress}%</span><button className="button secondary" onClick={()=>void action('cancel')}>{t('Cancel download','إلغاء التنزيل')}</button></>:state?.phase==='ready'?<><button className="button primary" disabled={busy} onClick={()=>void action('install')}>{window.loaderly?.platform==='win32'?t('Restart and update','إعادة التشغيل والتحديث'):t('Open downloaded update','فتح التحديث الذي نُزّل')}</button><p>{busy?t('Wait for active jobs to finish.','انتظر انتهاء العمليات الجارية.'):window.loaderly?.platform==='darwin'?t('Quit Loaderly, extract the ZIP, then replace Loaderly in Applications. Your settings stay on this Mac.','أغلق Loaderly وفك ملف ZIP، ثم استبدل Loaderly في التطبيقات. تبقى إعداداتك على الماك.'):window.loaderly?.platform==='linux'?t('Close Loaderly and install the downloaded package, or replace your AppImage.','أغلق Loaderly وثبّت الحزمة التي نُزّلت، أو استبدل ملف AppImage.'):t('Your work is saved before restarting. You can also update later.','يُحفظ عملك قبل إعادة التشغيل. يمكنك التحديث لاحقًا أيضًا.')}</p></>:<button className="button primary" onClick={()=>void action('download')}>{t('Download update','تنزيل التحديث')}</button>}
    </div>}
    {(error||state?.message)&&<p role="status">{error||(ar?'تعذّر إكمال التحديث أو أُلغي التنزيل. حاول مجددًا.':state?.message)}</p>}
  </section>;
}
