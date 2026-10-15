import { useEffect, useState } from 'react';
import type { StudioResponse } from '../../shared/studioApi';
import { downloadAudioModes, downloadAudioLabel, downloadAudioDescription, type DownloadAudioMode } from '../../shared/downloadAudio';
import { StudioModelSetup } from './StudioModelSetup';
import { DownloadPreference } from './DownloadPreference';
import { DesktopMenu } from './DesktopMenu';
import './quick-download.css';

export function MusicDownloadOptions({ ar, mode, onChange, setupRequired = false, composer = false }: { ar: boolean; mode: DownloadAudioMode; onChange: (value: DownloadAudioMode) => void; setupRequired?: boolean; composer?: boolean }) {
  const [local, setLocal] = useState<StudioResponse['local']>(), [busy, setBusy] = useState(false);
  const t = (en: string, arabic: string) => ar ? arabic : en;
  const enabled = mode !== 'original';
  useEffect(() => { if (enabled || setupRequired) { let current = true; void window.loaderly?.studio({ action: 'local-status' }).then(result => { if (current) setLocal(result.local); }).catch(() => {}); return () => { current = false; }; } }, [enabled, setupRequired]);
  const selector = <DesktopMenu ariaLabel={t('Download sound', 'صوت التنزيل')} value={mode} valueLabel={downloadAudioLabel(mode, ar)} disabled={busy} layout="detailed" options={downloadAudioModes.map(value => ({ value, label: downloadAudioLabel(value, ar), description: downloadAudioDescription(value, ar) }))} onChange={onChange}/>;
  const details = (enabled || setupRequired) && <section className="music-download-options music-download-details">
    {enabled && <p>{downloadAudioDescription(mode, ar)} {t('Separation runs on your device after downloading and keeps the original file. Some sounds may remain.', 'يجري الفصل على جهازك بعد التنزيل مع الاحتفاظ بالملف الأصلي. قد تبقى بعض الأصوات.')}</p>}
    {(enabled || setupRequired) && (!local?.separation || busy) && <StudioModelSetup ar={ar} engine="separation" local={local} onChange={setLocal} onBusy={setBusy}/>}
    {(enabled || setupRequired) && local?.separation && !busy && <small role="status">{t('Ready for audio separation.', 'جاهز لفصل الصوت.')}</small>}
  </section>;
  return composer ? <><div className="location-field download-audio-field"><span className="location-field__label">{t('Sound', 'الصوت')}</span>{selector}</div>{details}</> : <section className="music-download-options"><DownloadPreference label={t('Download sound', 'صوت التنزيل')}>{selector}</DownloadPreference>{details}</section>;
}
