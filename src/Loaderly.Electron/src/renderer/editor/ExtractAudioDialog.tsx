import { useEffect, useRef, useState } from 'react';
import { AudioLines, Copy, RefreshCcw, X } from 'lucide-react';
import type { ExtractAudioChoice } from '../../shared/audioExtraction';
import './extract-audio-dialog.css';

export function ExtractAudioDialog({ name, path, ar, onChoose }: { name: string; path: string; ar: boolean; onChoose: (choice: ExtractAudioChoice) => void }) {
  const dialog = useRef<HTMLDialogElement>(null), [choice, setChoice] = useState<Exclude<ExtractAudioChoice, 'cancel'>>('use');
  const t = (en: string, arabic: string) => ar ? arabic : en;
  useEffect(() => { const previous = document.activeElement; dialog.current?.showModal(); return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); }; }, []);
  const options = [
    { id: 'use' as const, icon: AudioLines, title: t('Use existing audio', 'استخدام الصوت الموجود'), detail: t('Open your saved audio in the editor without creating another file.', 'افتح الصوت المحفوظ في المحرر دون إنشاء ملف آخر.') },
    { id: 'keep' as const, icon: Copy, title: t('Keep both', 'الاحتفاظ بالنسختين'), detail: t('Extract a new MP3 with a different name. Keep the saved audio unchanged.', 'استخرج ملف MP3 باسم مختلف مع إبقاء الصوت المحفوظ كما هو.') },
    { id: 'replace' as const, icon: RefreshCcw, title: t('Replace existing audio', 'استبدال الصوت الموجود'), detail: t('Extract and check a new MP3 before replacing your saved audio. Any edits in the saved file will be replaced.', 'استخرج ملف MP3 جديدًا وتحقق منه قبل استبدال الصوت المحفوظ. ستُستبدل أي تعديلات محفوظة في الملف.') }
  ];
  return <dialog ref={dialog} className="app-dialog library-removal extract-audio-dialog" dir={ar ? 'rtl' : 'ltr'} aria-labelledby="extract-audio-title" onCancel={event => { event.preventDefault(); onChoose('cancel'); }}>
    <header className="app-dialog-heading"><div><h2 id="extract-audio-title">{t('You already have this audio', 'الصوت موجود عندك')}</h2><p>{t('Choose which copy to edit. Your video stays unchanged.', 'اختر النسخة التي تريد تعديلها. يبقى الفيديو كما هو.')}</p></div><button className="button secondary" aria-label={t('Close', 'إغلاق')} onClick={() => onChoose('cancel')}><X size={17}/></button></header>
    <div className="extract-audio-content"><div className="dialog-media"><span className="dialog-media-artwork"><AudioLines size={21}/></span><div><strong dir="auto">{name}</strong><small dir="auto">{path}</small></div></div>
    <div className="dialog-choices" role="radiogroup" aria-label={t('Existing audio', 'الصوت الموجود')}>{options.map(option => <label key={option.id}><input type="radio" name="extract-audio-choice" checked={choice === option.id} onChange={() => setChoice(option.id)}/><option.icon size={18}/><span><strong>{option.title}</strong><small>{option.detail}</small></span></label>)}</div></div>
    <footer><button className="button secondary" autoFocus onClick={() => onChoose('cancel')}>{t('Cancel', 'إلغاء')}</button><button className="button primary" onClick={() => onChoose(choice)}>{choice === 'use' ? t('Use existing', 'استخدام الموجود') : choice === 'keep' ? t('Extract another copy', 'استخراج نسخة أخرى') : t('Extract and replace', 'استخراج واستبدال')}</button></footer>
  </dialog>;
}
