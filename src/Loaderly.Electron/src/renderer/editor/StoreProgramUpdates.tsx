import { useState } from 'react';
import { Download, ExternalLink, RefreshCcw } from 'lucide-react';
import type { UpdateState } from '../../shared/releases';

export function StoreProgramUpdates({state,ar,busy,beforeInstall}:{state:UpdateState;ar:boolean;busy:boolean;beforeInstall:()=>boolean}) {
  const [error,setError]=useState('');
  const t=(en:string,arabic:string)=>ar?arabic:en;
  const action=async(name:'check'|'download'|'install'|'automatic'|'open-store'|'restart',automatic?:boolean)=>{
    setError('');
    if((name==='install'||name==='restart')&&!beforeInstall()) {setError(t('Your work could not be saved. Try saving again before updating.','تعذّر حفظ عملك. حاول حفظه مجددًا قبل التحديث.'));return;}
    try {const next=await window.loaderly?.programUpdate(name,automatic);if(next?.storeIssue==='busy')setError(t('Finish or pause downloads and finish pending tasks before installing.','انتظر انتهاء المهام الجارية أو أوقف التنزيلات مؤقتًا قبل التثبيت.'));}
    catch {setError(t('Could not complete this action. Please try again.','تعذّر إكمال العملية. حاول مجددًا.'));}
  };
  const waiting=busy||state.workBusy;
  const issue=state.storeIssue==='check'?t('Could not check Microsoft Store. Check your connection or try again later.','تعذّر التحقق من متجر Microsoft. تحقق من اتصالك أو حاول لاحقًا.'):
    state.storeIssue==='download'?t('The update could not be downloaded. Your current app is unchanged. Try again.','تعذّر تنزيل التحديث. نسختك الحالية كما هي. حاول مجددًا.'):
    state.storeIssue==='install'?t('The update could not be installed. Your work is saved and Loaderly is still open. Try again.','تعذّر تثبيت التحديث. عملك محفوظ وLoaderly ما زال مفتوحًا. حاول مجددًا.'):
    state.storeIssue==='canceled'?t('Update postponed. You can continue working and try again later.','أُجّل التحديث. يمكنك متابعة عملك والمحاولة لاحقًا.'):'';
  return <section className="program-updates" aria-label={t('Loaderly updates','تحديثات Loaderly')}>
    <div className="setting-row"><span><strong>{t('Updates','التحديثات')}</strong><small>{t('Checked and delivered by Microsoft Store.','يتولى متجر Microsoft التحقق من التحديثات وتوفيرها.')}</small>
      {state.checkedAt&&<small>{t('Last checked: ','آخر فحص: ')}<time dateTime={state.checkedAt}>{new Intl.DateTimeFormat(ar?'ar':'en',{dateStyle:'medium',timeStyle:'short'}).format(new Date(state.checkedAt))}</time></small>}</span>
      <button className="button secondary" disabled={['checking','downloading','ready','installing','installed'].includes(state.phase)} onClick={()=>void action('check')}><RefreshCcw size={15}/>{t(state.phase==='checking'?'Checking…':'Check for updates',state.phase==='checking'?'جارٍ الفحص…':'التحقق من التحديثات')}</button></div>
    <label className="update-automatic"><input type="checkbox" checked={state.automatic} onChange={e=>void action('automatic',e.target.checked)}/>{t('Check automatically','التحقق تلقائيًا')}</label>
    {state.phase==='current'&&<p role="status">{t('No update is currently offered by Microsoft Store for this device.','لا يوفّر متجر Microsoft تحديثًا لهذا الجهاز حاليًا.')}</p>}
    {['available','downloading','ready','installing','installed'].includes(state.phase)&&<div className="update-release">
      <strong>{t(state.phase==='ready'?'Ready to install':state.phase==='installed'?'Update installed':state.phase==='installing'?'Installing update…':state.phase==='downloading'?'Downloading update…':'An update is available',state.phase==='ready'?'جاهز للتثبيت':state.phase==='installed'?'ثُبّت التحديث':state.phase==='installing'?'جارٍ تثبيت التحديث…':state.phase==='downloading'?'جارٍ تنزيل التحديث…':'يتوفر تحديث جديد')}</strong>
      <p>{t('Download while you work. Install when your tasks are finished; Loaderly saves your edits first. Windows may close the app during installation.','نزّل التحديث أثناء عملك، ثم ثبّته بعد انتهاء المهام. يحفظ Loaderly تعديلاتك أولًا، وقد يغلق ويندوز التطبيق أثناء التثبيت.')}</p>
      <div className="update-release__actions">
        {state.phase==='available'&&<button className="button primary" onClick={()=>void action('download')}><Download size={15}/>{t('Update now','التحديث الآن')}</button>}
        {state.phase==='downloading'&&<div className="update-release__progress"><progress aria-label={t('Downloading update','تنزيل التحديث')} max={100} value={state.progress??0}/><span>{Math.round(state.progress??0)}%</span><span>{t('You can keep working.','يمكنك متابعة عملك.')}</span></div>}
        {state.phase==='ready'&&<><button className="button primary" disabled={waiting} onClick={()=>void action('install')}><RefreshCcw size={15}/>{t('Save and install update','حفظ العمل وتثبيت التحديث')}</button>{waiting&&<p role="status">{t('Waiting for downloads, exports and other pending tasks to finish.','بانتظار انتهاء التنزيلات والتصدير والمهام المعلّقة.')}</p>}</>}
        {state.phase==='installed'&&<button className="button primary" disabled={waiting} onClick={()=>void action('restart')}>{t('Restart Loaderly','إعادة تشغيل Loaderly')}</button>}
        <a className="button secondary" href={`https://loaderly.app/${ar?'ar/':''}docs/whats-new/`} target="_blank" rel="noreferrer">{t('What’s new','ما الجديد؟')}</a>
      </div>
    </div>}
    {(error||issue)&&<p role="status">{error||issue}</p>}
    <div className="update-release__actions"><button className="button secondary" onClick={()=>void action('open-store')}><ExternalLink size={15}/>{t('Open Microsoft Store','فتح متجر Microsoft')}</button><small>{t('Store results may be cached. Recently published updates can take time to reach your device.','قد يعرض المتجر نتيجة فحص محفوظة، وقد تتأخر التحديثات المنشورة حديثًا في الوصول إلى جهازك.')}</small></div>
  </section>;
}
