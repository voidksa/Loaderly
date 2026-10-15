import { useEffect, useRef, useState } from 'react';
import { Check, Download, X } from 'lucide-react';
import type { StudioResponse } from '../../shared/studioApi';

/** Preparation belongs to the model it prepares, including cancellation and errors. */
export function StudioModelSetup({ ar, engine, model, local, onChange, onBusy }: {
  ar: boolean; engine: 'speech' | 'separation'; model?: 'base' | 'small';
  local: StudioResponse['local']; onChange: (value: StudioResponse['local']) => void;
  onBusy: (busy: boolean) => void;
}) {
  const t = (en: string, arabic: string) => ar ? arabic : en;
  const [working, setWorking] = useState(false), [canceling, setCanceling] = useState(false), [message, setMessage] = useState('');
  const requestId = useRef(''), mounted = useRef(true), busyCallback = useRef(onBusy);
  busyCallback.current = onBusy;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (requestId.current) {
        void window.loaderly?.studio({ action: 'cancel', id: requestId.current });
        busyCallback.current(false);
      }
    };
  }, []);
  useEffect(() => { setMessage(''); }, [model]);
  const ready = engine === 'speech' ? !!local?.speechModels.includes(model ?? 'base') : !!local?.separation;
  async function prepare() {
    if (requestId.current) return;
    const id = `prepare-${crypto.randomUUID()}`;
    requestId.current = id; setWorking(true); setCanceling(false); setMessage(''); onBusy(true);
    try {
      const result = await window.loaderly?.studio({ action: 'prepare-local', id, engine, model, locale: ar ? 'ar' : 'en' });
      if (!mounted.current) return;
      if (result?.ok) onChange(result.local);
      else setMessage(result?.message === 'TASK_CANCELED'
        ? t('Setup canceled. You can try again.', 'أُلغي التجهيز. يمكنك المحاولة مجددًا.')
        : t('Could not prepare the model. Check your connection and free space, then retry.', 'تعذر تجهيز النموذج. تحقق من الاتصال والمساحة المتاحة ثم أعد المحاولة.'));
    } catch {
      if (mounted.current) setMessage(t('Could not prepare the model. Try again.', 'تعذر تجهيز النموذج. أعد المحاولة.'));
    } finally {
      requestId.current = '';
      if (mounted.current) { setWorking(false); setCanceling(false); onBusy(false); }
    }
  }
  return <section className="studio-model-setup" aria-label={t('Model setup', 'تجهيز النموذج')} aria-busy={working}>
    <div className="studio-model-setup__status" role="status" aria-live="polite">
      <strong>{working ? t('Downloading and checking the model…', 'جارٍ تنزيل النموذج والتحقق منه…') : ready
        ? <><Check size={17}/>{t('Ready on this device', 'جاهز على هذا الجهاز')}</>
        : t('Prepare this tool once', 'جهّز الأداة مرة واحدة')}</strong>
      <p>{working ? t('Setup continues here. You can cancel at any time.', 'تابع التجهيز هنا. يمكنك إلغاء التنزيل في أي وقت.') : ready
        ? t('You can start now. No download is needed.', 'يمكنك البدء الآن، دون تنزيل إضافي.')
        : t('Download the model to process files on your device without a subscription.', 'نزّل النموذج لمعالجة الملفات على جهازك دون اشتراك.')}</p>
      {working && <progress aria-label={t('Model download', 'تنزيل النموذج')}/>}
      {message && <p className="studio-model-setup__message">{message}</p>}
    </div>
    {working ? <button className="button secondary" disabled={canceling} onClick={() => {
      setCanceling(true);
      void window.loaderly?.studio({ action: 'cancel', id: requestId.current }).catch(() => { if (mounted.current) setCanceling(false); });
    }}><X size={15}/>{canceling ? t('Canceling…', 'جارٍ الإلغاء…') : t('Cancel download', 'إلغاء التنزيل')}</button>
      : !ready ? <button className="button secondary" disabled={!local?.runtime} onClick={() => void prepare()}><Download size={15}/>{!local ? t('Checking availability…', 'جارٍ التحقق من الجاهزية…') : engine === 'speech' ? t('Set up speech recognition', 'تجهيز التعرف على الكلام') : t('Set up vocal separation', 'تجهيز فصل الغناء')}</button>
      : <details className="studio-model-repair"><summary>{t('Setup options', 'خيارات التجهيز')}</summary><button className="button secondary" onClick={() => void prepare()}>{t('Check and repair model', 'فحص النموذج وإصلاحه')}</button></details>}
    {local && !local.runtime && <p role="status">{t('Local processing tools are not installed.', 'أدوات المعالجة المحلية غير مثبتة.')}</p>}
  </section>;
}
