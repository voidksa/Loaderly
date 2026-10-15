import { useRef, useState } from 'react';
import { Download, Pencil, Play, Plus, Scissors, Trash2, X } from 'lucide-react';
import type { NamedRange, StudioOutputPreset } from '../../shared/editor-project/studio';
import { formatTimecode } from '../../shared/editor-timeline/timecode';
import { StudioPreviewPlayer, type StudioPlayerHandle } from './StudioPreviewPlayer';
import { TimeField } from './TimeField';
import { ClipPreset } from './StudioExtras';
import { StudioOutputFolder } from './StudioOutputFolder';

export function ClipExportTool(p: {
  ar: boolean; src: string; duration: number; start: number; end: number;
  ranges: NamedRange[]; preset?: StudioOutputPreset; busy: boolean; outputDirectory: string;
  onChange: (ranges: NamedRange[]) => void; onPreset: (preset?: StudioOutputPreset) => void;
  onFolder: () => void; onExport: () => void; onError: (message: string) => void;
}) {
  const t = (en: string, ar: string) => p.ar ? ar : en;
  const player = useRef<StudioPlayerHandle>(null);
  const [ready, setReady] = useState(false), [editing, setEditing] = useState('');
  const [start, setStart] = useState(p.start), [end, setEnd] = useState(p.end);
  const [name, setName] = useState(''), [notice, setNotice] = useState('');
  const valid = end - start >= .01 && !!p.duration;
  function reset() { setEditing(''); setName(''); setStart(p.start); setEnd(p.end); player.current?.pause(); }
  function mark(edge: 'start' | 'end') {
    const value = Math.round((player.current?.position() ?? 0) * 100) / 100;
    setNotice('');
    if (edge === 'start') { setStart(Math.min(value, p.duration - .01)); if (value >= end) setEnd(p.duration); }
    else { setEnd(Math.max(.01, Math.min(value, p.duration))); if (value <= start) setStart(0); }
  }
  function save() {
    if (!valid) return;
    const clip = { id: editing || crypto.randomUUID(), name: name.trim() || `${t('Clip', 'مقطع')} ${p.ranges.length + 1}`, start, end };
    p.onChange(editing ? p.ranges.map(r => r.id === editing ? { ...r, ...clip } : r) : [...p.ranges, clip]);
    setNotice(editing ? t('Clip updated in the export list.', 'حُدّث المقطع في قائمة التصدير.') : t('Clip added. Choose another part, or export the list below.', 'أُضيف المقطع. اختر جزءًا آخر أو صدّر القائمة أدناه.'));
    setEditing(''); setName(''); player.current?.pause();
  }
  return <div className="clip-export-tool">
    <div className="clip-composer">
      <div className="clip-composer__viewer">
        <StudioPreviewPlayer src={p.src} ar={p.ar} source playerRef={player} onReady={setReady}/>
        <p>{t('Play or seek to a moment, then use “Start here” and “End here”. This is the original file; your edits are applied when exporting.', 'شغّل الملف أو حرّك مؤشره، ثم اختر «ابدأ هنا» و«انتهِ هنا». هذا هو الملف الأصلي؛ تُطبّق تعديلاتك عند التصدير.')}</p>
      </div>
      <div className="clip-composer__fields">
        <h4>{editing ? t('Edit clip', 'تعديل المقطع') : t('Choose a part to save', 'اختر الجزء الذي تريد حفظه')}</h4>
        <label className="studio-field"><span>{t('Clip name', 'اسم المقطع')}</span><input aria-label={t('Clip name', 'اسم المقطع')} value={name} placeholder={`${t('Clip', 'مقطع')} ${p.ranges.length + 1}`} maxLength={120} onChange={e => setName(e.target.value)}/></label>
        <div className="clip-time-row">
          <TimeField ar={p.ar} label={t('Start', 'البداية')} value={start} max={end - .01} onChange={value => { setStart(value); player.current?.seek(value); }}/>
          <button className="button secondary" disabled={!ready} onClick={() => mark('start')}>{t('Start here', 'ابدأ هنا')}</button>
        </div>
        <div className="clip-time-row">
          <TimeField ar={p.ar} label={t('End', 'النهاية')} value={end} min={start + .01} max={p.duration} onChange={value => { setEnd(value); player.current?.seek(value); }}/>
          <button className="button secondary" disabled={!ready} onClick={() => mark('end')}>{t('End here', 'انتهِ هنا')}</button>
        </div>
        <div className="clip-selection" aria-label={t('Selected part', 'الجزء المحدد')}>
          <div className="clip-selection__track" dir="ltr"><span style={{ left: `${start / (p.duration || 1) * 100}%`, width: `${(end - start) / (p.duration || 1) * 100}%` }}/></div>
          <span>{t('Clip length', 'مدة المقطع')}: <bdi dir="ltr">{formatTimecode(end - start)}</bdi></span>
        </div>
        <button className="button secondary" disabled={!valid || !ready} onClick={() => player.current?.playRange(start, end)}><Play size={15}/>{t('Play selected part', 'تشغيل الجزء المحدد')}</button>
        <button className="button primary" disabled={!valid || !ready || p.busy} onClick={save}><Plus size={15}/>{editing ? t('Save clip changes', 'حفظ تعديل المقطع') : t('Add to export list', 'إضافة لقائمة التصدير')}</button>
        {editing && <button className="button secondary" onClick={reset}><X size={15}/>{t('Cancel editing', 'إلغاء التعديل')}</button>}
      </div>
    </div>
    {notice && <p role="status">{notice}</p>}
    <section className="clip-export-list" aria-label={t('Clips to export', 'المقاطع المراد تصديرها')}>
      <h4>{t('Clips to export', 'المقاطع المراد تصديرها')} <span>({p.ranges.length})</span></h4>
      {!p.ranges.length && <div className="studio-empty-hint"><Scissors size={22}/><p>{t('Nothing added yet. Choose the first part in the player above and add it to this list.', 'لم تُضف مقاطع بعد. اختر الجزء الأول من المشغّل أعلاه وأضفه إلى القائمة.')}</p></div>}
      {p.ranges.map(range => <fieldset className="clip-export-card" key={range.id}>
        <div className="clip-export-card__row">
          <div><strong dir="auto">{range.name}</strong><p><bdi dir="ltr">{formatTimecode(range.start)} – {formatTimecode(range.end)}</bdi><span> · {t('Length', 'المدة')} <bdi dir="ltr">{formatTimecode(range.end - range.start)}</bdi></span></p></div>
          <div className="studio-actions">
            <button className="button secondary" disabled={!ready} aria-label={`${t('Play', 'تشغيل')} ${range.name}`} onClick={() => { player.current?.playRange(range.start, range.end); document.querySelector('.clip-composer')?.scrollIntoView({ block: 'start', behavior: 'smooth' }); }}><Play size={15}/>{t('Play', 'تشغيل')}</button>
            <button className="button secondary" aria-label={`${t('Edit', 'تعديل')} ${range.name}`} onClick={() => { setEditing(range.id); setName(range.name); setStart(range.start); setEnd(range.end); player.current?.pause(); player.current?.seek(range.start); document.querySelector('.clip-composer')?.scrollIntoView({ block: 'start', behavior: 'smooth' }); }}><Pencil size={15}/>{t('Edit', 'تعديل')}</button>
            <button className="button secondary" aria-label={`${t('Remove', 'إزالة')} ${range.name}`} onClick={() => { p.onChange(p.ranges.filter(r => r.id !== range.id)); if (editing === range.id) reset(); }}><Trash2 size={15}/>{t('Remove', 'إزالة')}</button>
          </div>
        </div>
        <ClipPreset ar={p.ar} range={range} onError={p.onError} change={preset => p.onChange(p.ranges.map(r => r.id === range.id ? { ...r, preset } : r))}/>
      </fieldset>)}
    </section>
    {!!p.ranges.length && <div className="clip-export-destination">
      <StudioOutputFolder ar={p.ar} value={p.outputDirectory} busy={p.busy} onChoose={p.onFolder}/>
      <ClipPreset title={t('Default output settings', 'إعدادات الإخراج الافتراضية')} ar={p.ar} range={{ id: 'default', name: '', start, end, preset: p.preset }} change={p.onPreset} onError={p.onError}/>
      <button className="button primary" disabled={p.busy || !p.outputDirectory} onClick={p.onExport}><Download size={15}/>{t('Export all clips', 'تصدير جميع المقاطع')} ({p.ranges.length})</button>
      <p>{t('Each clip is saved as a separate file. The original stays unchanged.', 'يُحفظ كل مقطع في ملف مستقل، ويبقى الملف الأصلي كما هو.')}</p>
    </div>}
  </div>;
}
