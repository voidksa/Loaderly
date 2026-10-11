import { useEffect, useRef, useState } from 'react';
import { Copy, FolderOpen, Replace, X } from 'lucide-react';
export type SaveMode = 'beside' | 'replace' | 'choose';
export function SaveOutputDialog({ sourcePath, extension, ar, onChoose }: {
  sourcePath: string; extension: string; ar: boolean; onChoose: (mode: SaveMode | null) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<SaveMode>('beside');
  const t = (en: string, arabic: string) => ar ? arabic : en;
  const canReplace = sourcePath.toLowerCase().endsWith(`.${extension}`);
  useEffect(() => {
    const previous = document.activeElement; ref.current?.showModal();
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);
  return <dialog ref={ref} className="app-dialog save-output-dialog" dir={ar ? 'rtl' : 'ltr'} aria-labelledby="save-output-title" onCancel={event => { event.preventDefault(); onChoose(null); }}>
    <header className="app-dialog-heading"><div><h2 id="save-output-title">{t('Save your edit', 'حفظ تعديلاتك')}</h2><p>{t('Choose where to keep the finished file.', 'اختر أين تحفظ الملف بعد التعديل.')}</p></div><button className="button secondary" aria-label={t('Close','إغلاق')} onClick={() => onChoose(null)}><X size={16}/></button></header>
    <p className="save-source-path"><strong>{t('Original file','الملف الأصلي')}</strong><bdi dir="ltr">{sourcePath}</bdi></p>
    <div className="dialog-choices" role="radiogroup" aria-label={t('Save options','خيارات الحفظ')}>
      <label><input autoFocus type="radio" name="save-mode" checked={mode === 'beside'} onChange={() => setMode('beside')}/><Copy size={18}/><span><strong>{t('Keep both', 'الاحتفاظ بالنسختين')}</strong><small>{t('Save an edited copy beside the original. No folder picker.', 'حفظ نسخة معدلة بجانب الأصل، دون اختيار المجلد من جديد.')}</small></span></label>
      <label><input type="radio" name="save-mode" disabled={!canReplace} checked={mode === 'replace'} onChange={() => setMode('replace')}/><Replace size={18}/><span><strong>{t('Replace original', 'استبدال الأصل')}</strong><small>{canReplace ? t('Replace this file only after the export finishes successfully.', 'استبدال هذا الملف فقط بعد اكتمال التصدير بنجاح.') : t(`This export is ${extension.toUpperCase()}. Keep both to preserve the original format.`, `صيغة التصدير ${extension.toUpperCase()}. احتفظ بالنسختين للحفاظ على الصيغة الأصلية.`)}</small></span></label>
      <label><input type="radio" name="save-mode" checked={mode === 'choose'} onChange={() => setMode('choose')}/><FolderOpen size={18}/><span><strong>{t('Choose location', 'اختيار مكان آخر')}</strong><small>{t('Choose a folder and filename, starting in the original folder.', 'اختر المجلد والاسم، بدءًا من مجلد الملف الأصلي.')}</small></span></label>
    </div><footer><button className="button secondary" onClick={() => onChoose(null)}>{t('Cancel','إلغاء')}</button><button className="button primary" onClick={() => onChoose(mode)}>{mode === 'replace' ? t('Replace original','استبدال الأصل') : t('Continue','متابعة')}</button></footer>
  </dialog>;
}
