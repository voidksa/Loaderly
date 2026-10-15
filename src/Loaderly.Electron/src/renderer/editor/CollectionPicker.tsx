import { useEffect, useRef, useState } from 'react';
import { Check, FolderPlus, Search, X } from 'lucide-react';
import { StudioSelect } from './StudioSelect';
import { formatTimecode } from '../../shared/editor-timeline/timecode';
import type { LibraryCollection } from './LibraryWorkspaceTools';

export type CollectionRow = { id: number; title?: string; filePath?: string; missing?: boolean; durationSeconds?: number };
export function CollectionPicker(p: {
  ar: boolean; rows: readonly CollectionRow[]; collections: LibraryCollection[]; initialCollection?: string;
  selected: number[]; create: boolean; onClose: () => void; onSave: (collection: LibraryCollection) => boolean;
}) {
  const t = (en: string, ar: string) => p.ar ? ar : en;
  const dialog = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(''), [query, setQuery] = useState('');
  const [target, setTarget] = useState(p.initialCollection || p.collections[0]?.id || '');
  const [selected, setSelected] = useState(p.selected), [error, setError] = useState('');
  const existing = p.create ? undefined : p.collections.find(c => c.id === target);
  const candidates = p.rows.filter(r => (r.title || r.filePath || '').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const additions = p.rows.filter(r => selected.includes(r.id) && !existing?.members.includes(r.id)).map(r => r.id);
  useEffect(() => { const element = dialog.current; const focus = document.activeElement as HTMLElement | null; element?.showModal(); return () => { element?.close(); focus?.focus(); }; }, []);
  function save() {
    const collection = p.create ? { id: crypto.randomUUID(), name: name.trim(), members: additions } : existing && { ...existing, members: [...new Set([...existing.members, ...additions])] };
    if (!collection || !collection.name) return;
    if (p.onSave(collection)) p.onClose(); else setError(t('Could not save the collection. Try again.', 'تعذر حفظ المجموعة. حاول مجددًا.'));
  }
  return <dialog ref={dialog} className="collection-picker" dir={p.ar ? 'rtl' : 'ltr'} aria-label={p.create ? t('New collection', 'مجموعة جديدة') : t('Add files to collection', 'إضافة ملفات للمجموعة')} onCancel={e => { e.preventDefault(); p.onClose(); }}>
    <header><div><h2>{p.create ? t('New collection', 'مجموعة جديدة') : t('Add files to collection', 'إضافة ملفات للمجموعة')}</h2><p>{t('Choose from your whole library. Files stay in All files and can belong to more than one collection.', 'اختر من مكتبتك كاملة. تبقى الملفات في «كل الملفات»، ويمكن إضافتها لأكثر من مجموعة.')}</p></div><button className="button secondary" aria-label={t('Close', 'إغلاق')} onClick={p.onClose}><X size={18}/></button></header>
    <div className="collection-picker__filter">
      {p.create ? <label className="studio-field"><span>{t('Collection name', 'اسم المجموعة')}</span><input autoFocus aria-label={t('Collection name', 'اسم المجموعة')} placeholder={t('For example: Travel videos', 'مثلًا: مقاطع الرحلة')} maxLength={100} value={name} onChange={e => setName(e.target.value)}/></label> : <StudioSelect label={t('Add to collection', 'إضافة إلى مجموعة')} value={target} onChange={setTarget} options={p.collections.map(c => ({ value: c.id, label: c.name }))}/>}
      <label className="toolbar-search"><Search size={16}/><input type="search" aria-label={t('Search all files', 'البحث في كل الملفات')} placeholder={t('Search all files', 'ابحث في كل الملفات')} value={query} onChange={e => setQuery(e.target.value)}/></label>
      <div className="studio-actions"><button className="button secondary" onClick={() => setSelected([...new Set([...selected, ...candidates.map(r => r.id)])])}><Check size={15}/>{t('Select results', 'تحديد النتائج')}</button><button className="button secondary" disabled={!selected.length} onClick={() => setSelected([])}>{t('Clear selection', 'إلغاء التحديد')}</button><span role="status">{additions.length} {t('files to add', 'ملفات للإضافة')}</span></div>
    </div>
    <div className="collection-picker__list">
      {candidates.map(row => <label className="collection-picker__row" key={row.id}>
        <input type="checkbox" checked={!!existing?.members.includes(row.id) || selected.includes(row.id)} disabled={!!existing?.members.includes(row.id)} onChange={e => setSelected(e.target.checked ? [...selected, row.id] : selected.filter(id => id !== row.id))}/>
        <span><strong dir="auto">{row.title || row.filePath}</strong><small>{existing?.members.includes(row.id) ? t('Already in this collection', 'موجود في المجموعة') : row.missing ? t('File needs relinking', 'يحتاج الملف إلى إعادة ربط') : t('In your library', 'في مكتبتك')}</small></span>
        <bdi dir="ltr">{formatTimecode(row.durationSeconds ?? 0)}</bdi>
      </label>)}
      {!candidates.length && <p className="studio-empty-hint">{p.rows.length ? t('No files match this search.', 'لا توجد ملفات تطابق البحث.') : t('Your library is empty. Create the collection, then import files into your library.', 'مكتبتك فارغة. أنشئ المجموعة، ثم استورد ملفات إلى مكتبتك.')}</p>}
    </div>
    <footer>{error && <p role="alert">{error}</p>}<button className="button primary" disabled={p.create ? !name.trim() : !existing || !additions.length} onClick={save}><FolderPlus size={16}/>{p.create ? t('Create collection', 'إنشاء المجموعة') : t('Add selected files', 'إضافة الملفات المحددة')}{additions.length ? ` (${additions.length})` : ''}</button><button className="button secondary" onClick={p.onClose}>{t('Cancel', 'إلغاء')}</button></footer>
  </dialog>;
}
