import { useState } from 'react';
import { FolderPlus, Trash2 } from 'lucide-react';
import type { AppPreferences } from '../../shared/app-preferences/appPreferences';
import { DownloadFolderSetting } from './DownloadFolderSetting';
import { DesktopMenu } from './DesktopMenu';
import { DownloadPreference } from './DownloadPreference';
import { DesignLibraryToggle } from './DesignLibraryToggle';
import { ConfirmAction } from './ConfirmAction';

export function DownloadLocationsSettings({ preferences: p, onChange }: { preferences: AppPreferences; onChange: (value: Partial<AppPreferences>) => void }) {
  const ar = p.locale === 'ar', t = (en: string, a: string) => ar ? a : en;
  const [message, setMessage] = useState('');
  const [names, setNames] = useState<Record<string, string>>({});
  const [addedId, setAddedId] = useState<string>();
  const [removing, setRemoving] = useState<string>();
  const removal = p.downloadLocations.find(item => item.id === removing);
  const defaults = (kind: 'audio' | 'video') => [
    { value: '', label: t('Default download folder', 'مجلد التنزيل الافتراضي') },
    ...p.downloadLocations.filter(item => item.kind === 'all' || item.kind === kind).map(item => ({ value: item.id, label: item.name }))
  ];
  const kinds = [
    { value: 'all' as const, label: t('Audio & video', 'صوت وفيديو') },
    { value: 'audio' as const, label: t('Audio only', 'صوت فقط') },
    { value: 'video' as const, label: t('Video only', 'فيديو فقط') }
  ];
  async function chooseFolder(id?: string) {
    setMessage('');
    try {
      const result = await window.loaderly?.pickDownloadDirectory();
      if (!result || result.canceled || !result.path) return;
      const path = result.path;
      if (id) {
        onChange({ downloadLocations: p.downloadLocations.map(item => item.id === id ? { ...item, path } : item) });
      } else {
        const newId = crypto.randomUUID();
        setAddedId(newId);
        onChange({ downloadLocations: [...p.downloadLocations, {
          id: newId, name: path.split(/[\\/]/).filter(Boolean).pop() || t('My location', 'مكاني'), path, kind: 'all', groupByPlatform: false
        }] });
      }
    } catch {
      setMessage(t('Could not open the folder picker. Try again.', 'تعذّر فتح نافذة اختيار المجلد. حاول مجددًا.'));
    }
  }
  return <section className="download-locations" aria-label={t('Video and audio folders', 'مجلدات الفيديو والصوت')}>
    {removal && <ConfirmAction ar={ar} title={t('Remove this location?', 'إزالة هذا المكان؟')} confirmLabel={t('Remove location', 'إزالة المكان')} onCancel={() => setRemoving(undefined)} onConfirm={() => onChange({ downloadLocations: p.downloadLocations.filter(l => l.id !== removal.id), audioLocationId: p.audioLocationId === removal.id ? '' : p.audioLocationId, videoLocationId: p.videoLocationId === removal.id ? '' : p.videoLocationId })}>
      <strong dir="auto">{removal.name}</strong><p>{t('Removes this saved location from Loaderly. Files in the folder stay in place. Downloads assigned here will use the default folder.', 'يُزال هذا المكان من إعدادات Loaderly وتبقى ملفات المجلد كما هي. ستستخدم التنزيلات المرتبطة به المجلد الافتراضي.')}</p>
    </ConfirmAction>}
    <div className="location-defaults">{(['audio', 'video'] as const).map(kind => {
      const options = defaults(kind), value = kind === 'audio' ? p.audioLocationId : p.videoLocationId;
      const label = kind === 'audio' ? t('Save audio to', 'حفظ الصوت في') : t('Save video to', 'حفظ الفيديو في');
      return <DownloadPreference key={kind} label={label}>
        <DesktopMenu ariaLabel={label} value={value} valueLabel={options.find(item => item.value === value)?.label ?? options[0].label} options={options}
          onChange={id => onChange(kind === 'audio' ? { audioLocationId: id } : { videoLocationId: id })} />
      </DownloadPreference>;
    })}</div>
    <DesignLibraryToggle label={t('Manage saved locations', 'إدارة أماكن الحفظ')} icon={<FolderPlus size={16} aria-hidden="true"/>}>
    <div className="download-saved-locations">
    <header className="download-locations__heading">
      <div><h3 id="download-locations-title">{t('Saved locations', 'أماكن الحفظ المحفوظة')}</h3>
        <p>{t('Add named folders to use in your downloads.', 'أضف مجلدات مسماة لاستخدامها في التنزيلات.')}</p></div>
      <button className="button secondary" type="button" disabled={p.downloadLocations.length >= 50} onClick={() => void chooseFolder()}>
        <FolderPlus size={17} aria-hidden="true" />{t('Add location', 'إضافة مكان')}
      </button>
    </header>
    <div className="download-location-grid">{p.downloadLocations.map(item => <section className="download-location" key={item.id} aria-label={item.name}>
      <div className="location-heading">
        <label className="location-field"><span className="location-field__label">{t('Location name', 'اسم المكان')}</span>
          <input dir="auto" value={names[item.id] ?? item.name} maxLength={80} autoFocus={addedId === item.id}
            onChange={e => setNames(values => ({ ...values, [item.id]: e.target.value }))}
            onBlur={() => {
              const name = names[item.id]?.trim();
              if (name) onChange({ downloadLocations: p.downloadLocations.map(l => l.id === item.id ? { ...l, name } : l) });
              setNames(values => { const next = { ...values }; delete next[item.id]; return next; });
            }} />
        </label>
        <div className="location-field"><span className="location-field__label">{t('File types', 'نوع الملفات')}</span>
          <DesktopMenu ariaLabel={t('File types', 'نوع الملفات')} value={item.kind} valueLabel={kinds.find(kind => kind.value === item.kind)!.label} options={kinds}
            onChange={kind => onChange({
              downloadLocations: p.downloadLocations.map(l => l.id === item.id ? { ...l, kind } : l),
              ...(kind === 'audio' && p.videoLocationId === item.id ? { videoLocationId: '' } : {}),
              ...(kind === 'video' && p.audioLocationId === item.id ? { audioLocationId: '' } : {})
            })} />
        </div>
        <button className="button secondary location-remove" type="button" aria-label={t('Remove location', 'إزالة المكان') + ' ' + item.name}
          onClick={() => setRemoving(item.id)}>
          <Trash2 size={16} aria-hidden="true" />{t('Remove', 'إزالة')}
        </button>
      </div>
      <div className="location-details">
        <DownloadFolderSetting folder={item.path} ar={ar} hideDefault onDefault={() => {}} onChoose={() => chooseFolder(item.id)} />
        <label className="location-organize"><input type="checkbox" checked={item.groupByPlatform}
          onChange={e => onChange({ downloadLocations: p.downloadLocations.map(l => l.id === item.id ? { ...l, groupByPlatform: e.target.checked } : l) })} />
          <span>{t('Create a folder for each website', 'إنشاء مجلد لكل موقع')}</span>
        </label>
      </div>
    </section>)}</div>
    </div></DesignLibraryToggle>
    <p className="download-locations__message" role="status">{message}</p>
  </section>;
}

