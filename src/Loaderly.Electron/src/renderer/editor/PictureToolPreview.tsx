import { useEffect, useRef, useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { StudioPreviewPlayer, type StudioPlayerHandle } from './StudioPreviewPlayer';
import { formatTimecode } from '../../shared/editor-timeline/timecode';

const mediaUrl = (path: string) => `loaderly-media://file/${btoa(Array.from(new TextEncoder().encode(path), c => String.fromCharCode(c)).join('')).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')}`;

/** Uses the export renderer; never approximates exported colors with a CSS filter. */
export function PictureToolPreview({ ar, src, payload, frame, onFrame, mode }: {
  ar: boolean; src: string; payload: Record<string, unknown>; frame: number;
  onFrame: (value: number) => void; mode: 'color' | 'motion';
}) {
  const t = (en: string, arabic: string) => ar ? arabic : en;
  const player = useRef<StudioPlayerHandle>(null), initialFrame = useRef(frame), initialized = useRef(false);
  const [playing, setPlaying] = useState(false), [ready, setReady] = useState(false), [retry, setRetry] = useState(0);
  const [renderRequested, setRenderRequested] = useState('');
  const [result, setResult] = useState<{ key: string; path: string }>();
  const [rendering, setRendering] = useState(false), [error, setError] = useState('');
  const base: Record<string, unknown> = { ...payload, outputPreset: undefined };
  const render = mode === 'color'
    ? { ...base, kind: 'image', frameSeconds: frame }
    : { ...base, kind: 'video', endSeconds: Math.min(Number(base.endSeconds), Number(base.startSeconds) + 8) };
  const renderKey = JSON.stringify(render);
  const enabled = ready && !playing && (mode === 'color' || renderRequested === renderKey);
  useEffect(() => {
    if (!enabled) { setRendering(false); return; }
    let disposed = false, started = false;
    const id = `picture-${crypto.randomUUID()}`;
    setRendering(true); setError('');
    const timer = window.setTimeout(async () => {
      started = true;
      try {
        const response = await window.loaderly?.studio({ action: 'preview', id, render: JSON.parse(renderKey), locale: ar ? 'ar' : 'en' });
        if (disposed) return;
        if (!response?.ok || !response.path) throw new Error(response?.message);
        setResult({ key: renderKey, path: response.path });
      } catch {
        if (!disposed) setError(t('Could not create the preview. Try again.', 'تعذر تجهيز المعاينة. أعد المحاولة.'));
      } finally { if (!disposed) setRendering(false); }
    }, 400);
    return () => { disposed = true; window.clearTimeout(timer); if (started) void window.loaderly?.studio({ action: 'cancel', id }); };
  }, [renderKey, enabled, retry, ar]);
  const current = !playing && result?.key === renderKey && !rendering && !error;
  return <section className="studio-picture-preview" aria-label={t('Picture preview', 'معاينة الصورة')}>
    <p>{mode === 'color'
      ? t('Pause on a frame, then choose a look below. Its rendered result updates here automatically.', 'أوقف الفيديو عند اللقطة المطلوبة، ثم اختر الألوان أدناه. تتحدث النتيجة هنا تلقائيًا.')
      : t('Use the source to choose a moment. After changing the settings, play the edited preview here.', 'اختر اللحظة من الفيديو الأصلي. بعد تعديل الإعدادات، شغّل معاينة التعديل هنا.')}</p>
    <div className="studio-picture-preview__grid">
      <div><h4>{t('Original video', 'الفيديو الأصلي')}</h4>
        <StudioPreviewPlayer src={src} ar={ar} source playerRef={player} onReady={value => {
          setReady(value);
          if (value && !initialized.current) { initialized.current = true; player.current?.seek(initialFrame.current); }
        }} onPlayingChange={setPlaying} onPositionCommit={onFrame}/>
      </div>
      <div><h4>{mode === 'color' ? t('After edits', 'بعد التعديل') : t('Edited preview', 'معاينة التعديل')}</h4>
        {current ? mode === 'color'
          ? <figure className="studio-picture-preview__frame"><img src={mediaUrl(result.path)} alt={t('Rendered frame after edits', 'اللقطة بعد التعديل')}/><figcaption><bdi dir="ltr">{formatTimecode(frame)}</bdi></figcaption></figure>
          : <StudioPreviewPlayer key={result.path} src={mediaUrl(result.path)} ar={ar}/>
          : <div className="studio-picture-preview__placeholder" role="status">
            <p>{playing ? t('Pause the video to preview this moment.', 'أوقف الفيديو لمعاينة هذه اللحظة.') : rendering ? t('Updating preview…', 'جارٍ تحديث المعاينة…') : error || (mode === 'color' ? t('Loading the video…', 'جارٍ تحميل الفيديو…') : t('Preview up to 8 seconds with your current edits.', 'شاهد حتى 8 ثوانٍ بتعديلاتك الحالية.'))}</p>
            {rendering && <progress aria-label={t('Updating preview', 'تحديث المعاينة')}/>}
            {error && <button className="button secondary" onClick={() => setRetry(n => n + 1)}><RotateCcw size={15}/>{t('Retry preview', 'إعادة المعاينة')}</button>}
            {mode === 'motion' && !rendering && !playing && !error && <button className="button primary" disabled={!ready} onClick={() => { setRenderRequested(renderKey); setRetry(n => n + 1); }}><Play size={15}/>{t('Preview these changes', 'معاينة هذه التعديلات')}</button>}
          </div>}
      </div>
    </div>
  </section>;
}
