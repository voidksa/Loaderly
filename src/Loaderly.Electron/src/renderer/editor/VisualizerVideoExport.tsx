import {ImagePlus, X, Film, FolderOpen} from 'lucide-react';
import {useEffect, useRef, useState, type RefObject} from 'react';
import {DesktopMenu} from './DesktopMenu';
import {AudioVisualizer} from './AudioPreview';
import {RangeInput} from './RangeInput';
import type {VisualizerVideoOptions, VisualizerExportProgress} from '../../shared/editor-project/visualizerVideo';

export function VisualizerVideoExport({ar, options, onChange, payload, analyser, playing, onBusy, busy}: {
  busy: boolean; ar: boolean; options: VisualizerVideoOptions;
  onChange: (v: VisualizerVideoOptions) => void;
  payload: (whole: boolean) => Parameters<NonNullable<Window['loaderly']>['saveMediaOutput']>[0];
  analyser: RefObject<AnalyserNode | null>; playing: boolean; onBusy: (v: boolean) => void;
}) {
  const t = (en: string, a: string) => ar ? a : en;
  const [progress, setProgress] = useState<VisualizerExportProgress>();
  const [whole, setWhole] = useState(false), [message, setMessage] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => window.loaderly?.onVisualizerExport(setProgress), []);
  const run = async () => {
    if (!window.loaderly || busy) return;
    onBusy(true); setMessage(''); setProgress(undefined);
    try {
      const result = await window.loaderly.exportVisualizerVideo({...payload(whole), options, whole});
      if (result.canceled) setProgress({phase: 'canceled', percent: 0});
      else if (!result.ok) setMessage(ar ? 'تعذّر التصدير. تحقق من مجلد الحفظ وأدوات الوسائط.' : result.message ?? 'Export failed.');
    } catch { setMessage(t('Could not export. Check your output folder and media tools.', 'تعذّر التصدير. تحقق من مجلد الحفظ وأدوات الوسائط.')); }
    finally { onBusy(false); }
  };
  const patchScene = (patch: Partial<VisualizerVideoOptions['scene']>) => onChange({...options, scene: {...options.scene, ...patch}});
  const addImage = async (file: File) => {
    setMessage('');
    if (file.size > 8_000_000) { setMessage(t('Choose an image under 8 MB.', 'اختر صورة أقل من ٨ ميجابايت.')); return; }
    const url = URL.createObjectURL(file);
    try {
      const image = new Image(); image.src = url; await image.decode();
      const factor = Math.min(1, 1920 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * factor));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * factor));
      canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL('image/webp', .9);
      if (data.length > 1_500_000) throw Error();
      patchScene({image: data});
    } catch { setMessage(t('Choose a smaller PNG, JPEG or WebP image.', 'اختر صورة أصغر بصيغة PNG أو JPEG أو WebP.')); }
    finally { URL.revokeObjectURL(url); }
  };
  const status = message || (progress?.phase === 'canceled' ? t('Export canceled.', 'أُلغي التصدير.') : progress?.phase === 'complete' ? t('Video saved.', 'حُفظ الفيديو.') : progress?.phase === 'error' ? t('Export failed. Please try again.', 'تعذّر التصدير. حاول مجددًا.') : '');
  return <section className="visualizer-video-export">
    <header><h3>{t('Turn audio into video', 'حوّل صوتك إلى فيديو')}</h3><p>{t('Save your sound, visualizer and titles together as an MP4.', 'احفظ الصوت والطيف والعناوين معًا في فيديو MP4.')}</p></header>
    <fieldset disabled={busy} className="video-export-settings">
      <legend className="sr-only">{t('Video settings', 'إعدادات الفيديو')}</legend>
      <div className="video-export-fields">
        <div className="video-export-field"><span>{t('Video shape', 'مقاس الفيديو')}</span>
          <DesktopMenu disabled={busy} ariaLabel={t('Video shape', 'مقاس الفيديو')} value={options.size} valueLabel={options.size === 'landscape' ? t('Landscape · 16:9', 'أفقي · 16:9') : options.size === 'portrait' ? t('Portrait · 9:16', 'عمودي · 9:16') : t('Square · 1:1', 'مربع · 1:1')} options={[{value: 'landscape', label: t('Landscape · 16:9', 'أفقي · 16:9')}, {value: 'portrait', label: t('Portrait · 9:16', 'عمودي · 9:16')}, {value: 'square', label: t('Square · 1:1', 'مربع · 1:1')}]} onChange={size => onChange({...options, size: size as VisualizerVideoOptions['size']})}/>
        </div>
        <div className="video-export-field"><span>{t('Quality', 'الجودة')}</span>
          <DesktopMenu disabled={busy} ariaLabel={t('Video quality', 'جودة الفيديو')} value={String(options.resolution)} valueLabel={options.resolution + 'p'} options={[{value: '1080', label: '1080p'}, {value: '720', label: '720p'}]} onChange={resolution => onChange({...options, resolution: Number(resolution) as 720 | 1080})}/>
        </div>
      </div>
      <label className="video-export-range"><input type="checkbox" checked={whole} onChange={e => setWhole(e.target.checked)}/><span><strong>{t('Use the whole track', 'استخدام المقطع كاملًا')}</strong><small>{t('Keeps your cuts and sound edits. Turn off to export the selected range.', 'يحتفظ بالقص وتعديلات الصوت. أوقفه لتصدير النطاق المحدد فقط.')}</small></span></label>
      <section className="video-export-artwork"><div className="video-export-section-heading"><strong>{t('Cover or logo', 'الغلاف أو الشعار')}</strong><small>{t('Optional', 'اختياري')}</small></div>
        <button type="button" className="button secondary" onClick={() => fileInput.current?.click()}><ImagePlus size={15}/>{options.scene.image ? t('Replace image', 'استبدال الصورة') : t('Choose image', 'اختيار صورة')}</button>
        <input ref={fileInput} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={e => {const file = e.target.files?.[0]; e.target.value = ''; if (file) void addImage(file);}}/>
        {options.scene.image && <>
          <div className="video-export-field"><span>{t('Image placement', 'موضع الصورة')}</span><DesktopMenu disabled={busy} ariaLabel={t('Image placement', 'موضع الصورة')} value={options.scene.imageMode} valueLabel={options.scene.imageMode === 'cover' ? t('Background cover', 'خلفية') : t('Logo', 'شعار')} options={[{value: 'cover', label: t('Background cover', 'خلفية')}, {value: 'logo', label: t('Logo', 'شعار')}]} onChange={mode => patchScene({imageMode: mode as 'cover' | 'logo'})}/></div>
          {options.scene.imageMode === 'logo' && (['logoSize', 'logoX', 'logoY'] as const).map(key => {
            const label = key === 'logoSize' ? t('Logo size', 'حجم الشعار') : key === 'logoX' ? t('Horizontal position', 'الموضع الأفقي') : t('Vertical position', 'الموضع العمودي');
            return <label className="audio-control" key={key}><span>{label}<output dir="ltr">{options.scene[key]}%</output></span><RangeInput aria-label={label} min={key === 'logoSize' ? 5 : 0} max={100} value={options.scene[key]} onChange={e => patchScene({[key]: Number(e.target.value)})}/></label>;
          })}
          <button type="button" className="button secondary" onClick={() => patchScene({image: undefined})}><X size={14}/>{t('Remove image', 'إزالة الصورة')}</button>
        </>}
      </section>
    </fieldset>
    <details className="video-export-preview-group"><summary>{t('Video preview', 'معاينة الفيديو')}</summary>
      <div className="visualizer-export-preview" style={{aspectRatio: options.size === 'portrait' ? '9/16' : options.size === 'square' ? '1/1' : '16/9', maxWidth: options.size === 'portrait' ? 144 : options.size === 'square' ? 256 : undefined}}><AudioVisualizer analyser={analyser} playing={playing} settings={options.scene.settings} scene={options.scene}/></div>
      <small>{t('The exported video uses this layout.', 'يستخدم الفيديو المُصدّر هذا التنسيق.')}</small>
    </details>
    <div className="video-export-actions">
      <button type="button" className="button primary" disabled={busy} onClick={() => void run()}><Film size={15}/>{t(busy ? 'Exporting…' : 'Export MP4', busy ? 'جارٍ التصدير…' : 'تصدير MP4')}</button>
      {busy && <><progress aria-label={t('Export progress', 'تقدم التصدير')} max={100} value={progress?.percent ?? 0}/><span role="status">{progress?.percent ?? 0}% · {progress?.phase === 'preparing' ? t('Preparing audio', 'تجهيز الصوت') : t('Rendering video', 'تصدير الفيديو')}</span><button type="button" className="button secondary" onClick={() => void window.loaderly?.cancelVisualizerExport()}><X size={14}/>{t('Cancel export', 'إلغاء التصدير')}</button></>}
      {progress?.phase === 'complete' && progress.path && <button type="button" className="button secondary" onClick={() => void window.loaderly?.showItemInFolder(progress.path!)}><FolderOpen size={14}/>{t('Show exported video', 'عرض الفيديو المُصدّر')}</button>}
      {status && <p role="status">{status}</p>}
    </div>
  </section>;
}
