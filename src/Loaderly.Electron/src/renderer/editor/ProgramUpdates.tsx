import { useState } from 'react';
import { ArrowUpCircle, Download, ExternalLink, RefreshCcw } from 'lucide-react';
import { useProgramUpdate } from './useProgramUpdate';

export function ProgramUpdates({ ar, busy, beforeInstall }: { ar: boolean; busy: boolean; beforeInstall: () => boolean }) {
  const state = useProgramUpdate();
  const [error, setError] = useState('');
  const [installing,setInstalling]=useState(false);
  const t = (en: string, arabic: string) => ar ? arabic : en;
  const action = async (name: 'check' | 'download' | 'cancel' | 'install' | 'automatic', automatic?: boolean) => {
    setError('');
    if(name==='install')setInstalling(true);
    try {
      if (name === 'install' && !beforeInstall()) throw Error('Save failed');
      await window.loaderly?.programUpdate(name, automatic);
    } catch { setError(t('Could not complete this action. Please try again.', 'تعذّر إكمال العملية. حاول مجددًا.')); }
    finally {if(name==='install')setInstalling(false);}
  };
  const downloading = state?.phase === 'downloading', checking = state?.phase === 'checking';
  const progress = Math.min(100, Math.max(0, Math.round(state?.progress ?? 0)));
  const checkedAt = state?.checkedAt ? new Date(state.checkedAt) : undefined;
  const checkedLabel = checkedAt && Number.isFinite(checkedAt.getTime()) ? new Intl.DateTimeFormat(ar ? 'ar-u-nu-latn' : 'en', {dateStyle:'medium',timeStyle:'short'}).format(checkedAt) : undefined;
  if (state?.distribution === 'store') return <section className="program-updates" aria-label={t('Loaderly updates', 'تحديثات Loaderly')}>
    <div className="setting-row"><span><strong>{t('Updates', 'التحديثات')}</strong><small>{t('Updates are managed by Microsoft Store.', 'يتولى متجر Microsoft التحديثات.')}</small></span><button className="button secondary" onClick={() => void action('check')}><ExternalLink size={15} aria-hidden="true" />{t('Open Microsoft Store', 'فتح متجر Microsoft')}</button></div>
    {error && <p role="status">{t('Could not open Microsoft Store. Open it from the Start menu.', 'تعذّر فتح متجر Microsoft. افتحه من قائمة ابدأ.')}</p>}
  </section>;
  return <section className="program-updates" aria-label={t('Loaderly updates', 'تحديثات Loaderly')}>
    <div className="setting-row">
      <span><strong>{t('Updates', 'التحديثات')}</strong>{checkedLabel && <small className="update-checked"><span>{t('Last checked:', 'آخر فحص:')}</span><time dateTime={state!.checkedAt}><bdi dir={ar ? 'rtl' : 'ltr'}>{checkedLabel}</bdi></time></small>}</span>
      <button className="button secondary" disabled={!state || checking || downloading || state.phase === 'ready'} onClick={() => void action('check')}><RefreshCcw size={15} aria-hidden="true" />{t(checking ? 'Checking…' : 'Check for updates', checking ? 'جارٍ الفحص…' : 'التحقق من التحديثات')}</button>
    </div>
    <label className="update-automatic"><input type="checkbox" disabled={!state} checked={state?.automatic ?? true} onChange={e => void action('automatic', e.target.checked)} />{t('Check automatically', 'التحقق تلقائيًا')}</label>
    {state?.phase === 'current' && <p role="status">{t('You’re up to date.', 'لديك أحدث إصدار.')}</p>}
    {['available', 'downloading', 'ready'].includes(state?.phase ?? '') && <div className="update-release">
      <div className="update-release__heading"><ArrowUpCircle size={19} aria-hidden="true" /><strong>{state?.phase === 'ready' ? t('Ready to install', 'جاهز للتثبيت') : t('Update available', 'تحديث متاح')}</strong><span><bdi>Loaderly {state?.version}</bdi></span></div>
      {state?.notes && <p className="update-release__notes" dir="auto">{ar && state.notesAr ? state.notesAr : state.notes}</p>}
      <div className="update-release__actions">
        {downloading ? <>
          <div className="update-release__progress">
            <div className="update-progress" role="progressbar" aria-label={t('Downloading update', 'تنزيل التحديث')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
              <div className="update-progress__fill" style={{ width: `${progress}%` }} />
            </div>
            <span aria-hidden="true"><bdi>{progress}%</bdi></span>
          </div>
          <button className="button secondary" onClick={() => void action('cancel')}>{t('Cancel download', 'إلغاء التنزيل')}</button>
        </> : state?.phase === 'ready' ? <>
          <button className="button primary" disabled={busy||installing} onClick={() => void action('install')}><RefreshCcw size={15} aria-hidden="true" />{installing?t('Preparing update…','جارٍ تجهيز التحديث…'):window.loaderly?.platform !== 'linux' ? t('Restart and update', 'إعادة التشغيل والتحديث') : t('Open downloaded update', 'فتح التحديث الذي نُزّل')}</button>
          <p>{busy ? t('Wait for active jobs to finish.', 'انتظر انتهاء العمليات الجارية.') : window.loaderly?.platform === 'darwin' ? t('Loaderly will save your work, close, replace this app and reopen the new version. Your library and settings stay on this Mac.', 'يحفظ Loaderly عملك، ثم يُغلق ويستبدل التطبيق ويفتح النسخة الجديدة. تبقى مكتبتك وإعداداتك على الماك.') : window.loaderly?.platform === 'linux' ? t('Close Loaderly and install the downloaded package, or replace your AppImage.', 'أغلق Loaderly وثبّت الحزمة التي نُزّلت، أو استبدل ملف AppImage.') : t('Your work is saved before restarting. You can also update later.', 'يُحفظ عملك قبل إعادة التشغيل. يمكنك التحديث لاحقًا أيضًا.')}</p>
        </> : <button className="button primary" onClick={() => void action('download')}><Download size={15} aria-hidden="true" />{t('Download update', 'تنزيل التحديث')}</button>}
      </div>
    </div>}
    {(error || state?.message || state?.installIssue) && <p role="status">{state?.installIssue==='location'?t('Move Loaderly to a writable Applications folder and open it there, then try the update again.','انقل Loaderly إلى مجلد التطبيقات الذي تملك صلاحية الكتابة فيه وافتحه منه، ثم حاول التحديث مجددًا.'):state?.installIssue?t('The update could not be installed. Your current app has been kept. Please try again.','تعذّر تثبيت التحديث. احتُفظ بالتطبيق الحالي. حاول مجددًا.'):error || (ar ? 'تعذّر إكمال التحديث أو أُلغي التنزيل. حاول مجددًا.' : state?.message)}</p>}
  </section>;
}
