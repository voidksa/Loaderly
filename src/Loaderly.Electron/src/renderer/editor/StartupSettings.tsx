import { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import type { StartupState } from '../../shared/startup';
import './startup-settings.css';

export function StartupSettings({ ar }: { ar: boolean }) {
  const [state, setState] = useState<StartupState>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const sequence = useRef(0);
  const changing = useRef(false);
  const t = (en: string, arabic: string) => ar ? arabic : en;
  const refresh = useCallback(async () => {
    if (changing.current) return;
    const current = ++sequence.current;
    try {
      if (!window.loaderly?.startup) throw Error('Unavailable');
      const next = await window.loaderly.startup({ action: 'get' });
      if (current === sequence.current) { setState(next); setError(false); }
    } catch { if (current === sequence.current) { setState(undefined); setError(true); } }
  }, []);
  useEffect(() => {
    void refresh();
    window.addEventListener('focus', refresh);
    return () => { sequence.current++; window.removeEventListener('focus', refresh); };
  }, [refresh]);
  const change = async (enabled: boolean) => {
    changing.current = true; ++sequence.current; setBusy(true); setError(false);
    try { setState(await window.loaderly!.startup({ action: 'set', enabled })); }
    catch {
      try { setState(await window.loaderly!.startup({ action: 'get' })); } catch { setState(undefined); }
      setError(true);
    } finally { changing.current = false; setBusy(false); }
  };
  const description = state?.reason === 'development'
    ? t('Available in the installed app. Development and isolated test profiles do not change your startup apps.', 'متاح في النسخة المثبتة. لا تغيّر نسخ التطوير والاختبار المعزولة برامج بدء التشغيل.')
    : state?.reason === 'temporary'
    ? t('Move Loaderly to a permanent location and open it there first.', 'انقل Loaderly إلى مكان دائم وافتحه منه أولًا.')
    : state?.reason === 'disabled-by-user'
    ? t('Disabled in Windows. Enable Loaderly in Startup apps to turn it on again.', 'معطّل من إعدادات ويندوز. أعد تفعيل Loaderly من تطبيقات بدء التشغيل.')
    : state?.reason === 'policy'
    ? t('This setting is managed by your organization.', 'تدير مؤسستك هذا الإعداد.')
    : state?.reason === 'approval'
    ? t('Allow Loaderly in Login Items to finish enabling startup.', 'اسمح بتشغيل Loaderly في عناصر تسجيل الدخول لإكمال التفعيل.')
    : state?.reason === 'unavailable'
    ? t('Automatic startup is unavailable on this system.', 'التشغيل التلقائي غير متاح على هذا النظام.')
    : t('Open Loaderly automatically after you sign in to Windows or your operating system.', 'افتح البرنامج تلقائيًا عند تسجيل الدخول إلى جهازك.');
  return <section className="startup-settings" aria-label={t('Startup', 'بدء التشغيل')}>
    <div className="preference-row startup-setting">
      <div className="startup-setting__copy">
        <label className="startup-setting__label preference-row__copy" htmlFor="loaderly-start-at-login"><strong id="loaderly-startup-label">{t('Start Loaderly with my computer', 'تشغيل Loaderly مع بدء تشغيل الجهاز')}</strong><small id="loaderly-startup-description">{description}</small></label>
        {state?.settingsAvailable && <button className="startup-setting__system-link" type="button" disabled={busy} onClick={() => void window.loaderly!.startup({ action: 'settings' }).catch(() => setError(true))}><ExternalLink size={14} aria-hidden="true" />{t('System startup settings', 'إعدادات بدء التشغيل في النظام')}</button>}
      </div>
      <input id="loaderly-start-at-login" className="startup-setting__switch" type="checkbox" role="switch" checked={state?.enabled ?? false} disabled={!state?.canChange || busy} aria-labelledby="loaderly-startup-label" aria-describedby="loaderly-startup-description" onChange={event => void change(event.target.checked)} />
    </div>
    <div className="startup-setting__feedback" aria-live="polite">
      {(busy || (!state && !error)) && <p>{t(busy ? 'Saving…' : 'Checking startup settings…', busy ? 'جارٍ الحفظ…' : 'جارٍ التحقق من إعدادات بدء التشغيل…')}</p>}
      {state?.reason === 'approval' && <button className="button secondary" type="button" disabled={busy} onClick={() => void change(false)}>{t('Cancel startup request', 'إلغاء طلب التشغيل التلقائي')}</button>}
      {error && <><p>{t('Could not read or change startup settings. Check your system settings or try again.', 'تعذّرت قراءة إعدادات بدء التشغيل أو تغييرها. راجع إعدادات النظام أو حاول مجددًا.')}</p><button className="button secondary" type="button" disabled={busy} onClick={() => void refresh()}><RefreshCw size={14} aria-hidden="true" />{t('Try again', 'حاول مجددًا')}</button></>}
    </div>
  </section>;
}

