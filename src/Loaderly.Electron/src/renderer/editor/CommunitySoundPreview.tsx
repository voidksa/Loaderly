import {useEffect, useRef} from 'react';
import {X} from 'lucide-react';
import {decodeSoundPreset} from '../../shared/audioPreset';
import type {CommunityLook} from '../../shared/community';
import {SoundStudioPreview} from './SoundStudioPreview';

export function CommunitySoundPreview({look, ar, onClose}: {look: CommunityLook; ar: boolean; onClose: () => void}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const preset = decodeSoundPreset(look.code);
  useEffect(() => { dialog.current?.showModal(); }, []);
  const t = (en: string, arabic: string) => ar ? arabic : en;
  return <dialog ref={dialog} dir={ar?'rtl':'ltr'} className="app-dialog library-removal community-sound-dialog" aria-labelledby="community-sound-title" onCancel={onClose}>
    <header><div><h2 id="community-sound-title">{look.name}</h2><p>{t('Listen before you apply. Compare this preset with your original audio.', 'اسمع قبل التطبيق. قارن هذا الإعداد بصوتك الأصلي.')}</p></div><button autoFocus className="button secondary" aria-label={t('Close sound preview', 'إغلاق معاينة الصوت')} onClick={onClose}><X size={18}/></button></header>
    {preset && <SoundStudioPreview preset={preset} ar={ar} browsing/>}
    <p className="muted">{t('Previewing does not change your track or editor settings.', 'المعاينة لا تغيّر مقطعك أو إعدادات المحرر.')}</p>
  </dialog>;
}
