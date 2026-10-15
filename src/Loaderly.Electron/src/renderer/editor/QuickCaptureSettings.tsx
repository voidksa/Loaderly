import { useId, useState } from 'react';
import { ClipboardPaste, AudioLines, Film, Keyboard, MousePointer2 } from 'lucide-react';
import { captureBindings, captureShortcuts, type CaptureShortcutKind, type QuickCaptureSettings as Settings, type QuickCaptureState } from '../../shared/quickCapture';
import { shortcutLabel } from '../../shared/ui/shortcutLabel';
import { DesktopMenu } from './DesktopMenu';
import { MusicDownloadOptions } from './MusicDownloadOptions';
import { DownloadPreference, DownloadToggle } from './DownloadPreference';
import { SettingsDialog } from './FloatingSurface';

type Props = { ar: boolean; value: Settings; state?: QuickCaptureState; onChange: (value: Settings) => void };
export function QuickCaptureSettings({ ar, value, state, onChange }: Props) {
  const t = (en: string, a: string) => ar ? a : en;
  const [tab, setTab] = useState<'floating' | 'automatic' | 'shortcuts'>('floating');
  const id = useId(), platform = window.loaderly?.platform ?? 'win32';
  const [message,setMessage] = useState('');
  const keys = captureBindings(value);
  const ready = (kind: CaptureShortcutKind) => value.shortcuts && state?.shortcuts[kind] && captureBindings(state.settings)[kind] === keys[kind];
  const tabs = [
    { id: 'floating' as const, label: t('Floating button', 'الزر العائم'), icon: MousePointer2 },
    { id: 'automatic' as const, label: t('Automatic', 'التلقائي'), icon: ClipboardPaste },
    { id: 'shortcuts' as const, label: t('Shortcuts', 'الاختصارات'), icon: Keyboard }
  ];
  return <section className="quick-download-settings" aria-label={t('Quick downloads', 'التنزيل السريع')}>
    <nav className="capture-methods" aria-label={t('Download method', 'طريقة التنزيل')}>
      {tabs.map(item => <button type="button" key={item.id} className={`button secondary ${tab === item.id ? 'active' : ''}`} aria-pressed={tab === item.id} aria-controls={id} onClick={() => setTab(item.id)}><item.icon size={16}/>{item.label}</button>)}
    </nav>
    <div id={id} className="capture-method">
      {tab === 'floating' && <>
        <DownloadToggle label={t('Show floating download button', 'إظهار زر التنزيل العائم')} description={t('Minimize Loaderly to use it over your browser. It stays hidden while a Loaderly window is open.', 'صغّر Loaderly لتستخدمه فوق المتصفح. يظل مخفيًا ما دامت نافذة البرنامج مفتوحة.')} checked={value.floating} onChange={floating => onChange({ ...value, floating })}/>
        <DownloadPreference label={t('Button size', 'حجم الزر')}><DesktopMenu ariaLabel={t('Button size', 'حجم الزر')} value={value.floatingSize} valueLabel={value.floatingSize === 'label' ? t('Icon and label', 'أيقونة مع اسم') : t('Small icon', 'أيقونة صغيرة')} options={[{value:'compact',label:t('Small icon','أيقونة صغيرة')},{value:'label',label:t('Icon and label','أيقونة مع اسم')}]} onChange={floatingSize=>onChange({...value,floatingSize:floatingSize as Settings['floatingSize']})}/></DownloadPreference>
        <ol className="capture-steps"><li>{t('Copy a video link in your browser.', 'انسخ رابط المقطع من المتصفح.')}</li><li>{t('Click the Loaderly button beside your browser.', 'اضغط زر Loaderly العائم بجانب المتصفح.')}</li><li>{t('Choose Original audio, Vocals only or Instrumental, then Download video or Download audio.', 'اختر «الصوت الأصلي» أو «بدون موسيقى» أو «موسيقى فقط»، ثم «تنزيل فيديو» أو «تنزيل صوت».')}</li></ol>
        <p className="download-settings-hint">{t('Drag the grip to move it. Right-click or press ⋯ for size and Hide. Bring it back from the Loaderly icon beside the clock > Show floating button, or enable it here. Escape collapses the panel. Loaderly must keep running.', 'حرّكه من مقبض السحب. اضغط كلك يمين أو ⋯ لاختيار الحجم أو الإخفاء. أرجعه من أيقونة Loaderly بجانب الساعة > إظهار الزر العائم، أو فعّله هنا. يصغّر Escape النافذة إلى الزر. يجب أن يظل Loaderly يعمل.')}</p>
        <p className="download-settings-hint">{t('Show / hide shortcut:', 'اختصار الإظهار والإخفاء:')} <kbd dir="ltr">{shortcutLabel(keys.floating,platform)}</kbd> · {ready('floating') ? t('Ready','جاهز') : !value.shortcuts ? t('Disabled in Shortcuts','معطّل من قسم الاختصارات') : state ? t('Unavailable. Choose another key in Shortcuts.','غير متاح. اختر مفتاحًا آخر من قسم الاختصارات.') : t('Checking…','جارٍ التحقق…')}</p>
        {value.floating && <p className="capture-status" role="status">{t('On. Minimize Loaderly, then open your browser.', 'مفعّل. صغّر Loaderly، ثم افتح المتصفح.')}</p>}
        {platform === 'linux' && <p className="download-settings-hint">{t('On Wayland, placement and staying above other apps depend on your desktop.', 'في Wayland، يعتمد موضع الزر وبقاؤه فوق التطبيقات على سطح المكتب.')}</p>}
      </>}
      {tab === 'automatic' && <>
        <DownloadToggle label={t('Download when I copy a link', 'التنزيل بمجرد نسخ الرابط')} description={t('Starts immediately, without clicking the floating button.', 'يبدأ مباشرة دون الضغط على الزر العائم.')} checked={value.watch} onChange={watch => onChange({ ...value, watch })}/>
        <DownloadPreference label={t('Download as', 'التنزيل بصيغة')}>
          <DesktopMenu ariaLabel={t('Automatic download format', 'صيغة التنزيل التلقائي')} value={value.kind} valueLabel={value.kind === 'audio' ? t('Audio', 'صوت') : t('Video', 'فيديو')} options={[{ value: 'video', label: t('Video', 'فيديو') }, { value: 'audio', label: t('Audio', 'صوت') }]} onChange={kind => onChange({ ...value, kind })}/>
        </DownloadPreference>
        <MusicDownloadOptions ar={ar} mode={value.audioMode} onChange={audioMode => onChange({ ...value, audioMode })}/>
        <p className="download-settings-hint">{t('Uses saved quality and folders. Captures only new complete links while Loaderly runs; skips repeats and does not save other clipboard text. The floating button and shortcuts share this sound setting.', 'يستخدم الجودة ومجلدات الحفظ المحددة. يلتقط الروابط الكاملة الجديدة أثناء تشغيل Loaderly ويتخطى المكرر، ولا يحفظ نص الحافظة الآخر. يشترك الزر العائم والاختصارات في إعداد الصوت هذا.')}</p>
      </>}
      {tab === 'shortcuts' && <>
        <DownloadToggle label={t('Global shortcuts', 'الاختصارات العامة')} description={t('Enabled by default while Loaderly runs. Change any shortcut below. Copy a link before downloading.', 'مفعّلة افتراضيًا أثناء تشغيل Loaderly. يمكنك تعديلها أدناه. انسخ الرابط قبل التنزيل.')} checked={value.shortcuts} onChange={shortcuts => onChange({ ...value, shortcuts, shortcutDefaultsVersion:1 })}/>
        <p className="download-settings-hint">{t('Function keys work with every keyboard language. Some keyboards also need Fn.', 'تعمل مفاتيح F مع جميع لغات لوحة المفاتيح. قد تحتاج إلى Fn أيضًا.')}</p>
        {message&&<p className="download-settings-hint" role="status">{message}</p>}
        <div className="quick-download-keys">{(['video', 'audio', 'floating'] as const).map(kind => <div key={kind}>
          <span>{kind === 'video' ? t('Download video', 'تنزيل فيديو') : kind === 'audio' ? t('Download audio', 'تنزيل صوت') : t('Show / hide floating button','إظهار الزر العائم أو إخفاؤه')}<small className="capture-key-status">{!value.shortcuts ? t('Disabled','معطّل') : ready(kind) ? t('Ready','جاهز') : state ? t('Unavailable','غير متاح') : t('Checking…','جارٍ التحقق…')}</small></span>
          <div className="capture-key-actions"><DesktopMenu ariaLabel={t('Change shortcut: ','تغيير اختصار: ')+t(kind,kind==='video'?'تنزيل فيديو':kind==='audio'?'تنزيل صوت':'الزر العائم')} value={keys[kind]} valueLabel={shortcutLabel(keys[kind],platform)} options={Array.from({length:24},(_,i)=>`CommandOrControl+Shift+F${i+1}`).filter(key=>!Object.entries(keys).some(([other,current])=>other!==kind&&current===key)).map(key=>({value:key,label:shortcutLabel(key,platform)}))} onChange={key=>{onChange({...value,shortcutBindings:{...keys,[kind]:key}});setMessage('');}}/>{keys[kind]!==captureShortcuts[kind]&&<button className="button secondary" onClick={()=>{const next={...keys,[kind]:captureShortcuts[kind]};if(Object.values(next).length!==new Set(Object.values(next)).size){setMessage(t('The default key is used by another action. Change that action first.','المفتاح الافتراضي مستخدم لإجراء آخر. غيّر اختصاره أولًا.'));return;}onChange({...value,shortcutBindings:next});}}>{t('Reset','استعادة')}</button>}</div>
        </div>)}</div>
        <p className="download-settings-hint">{t('Loaderly must be running. You can also use these buttons or the app icon menu.', 'يجب أن يكون Loaderly يعمل. يمكنك أيضًا استخدام الأزرار التالية أو قائمة أيقونة البرنامج.')}</p>
        <div className="quick-download-buttons"><button type="button" className="button secondary" onClick={() => void window.loaderly?.quickCapture({ action: 'capture', kind: 'video' })}><Film size={15}/>{t('Download copied video', 'تنزيل الرابط كفيديو')}</button><button type="button" className="button secondary" onClick={() => void window.loaderly?.quickCapture({ action: 'capture', kind: 'audio' })}><AudioLines size={15}/>{t('Download copied audio', 'تنزيل الرابط كصوت')}</button></div>
        {value.shortcuts && state && (!state.shortcuts.audio || !state.shortcuts.video || !state.shortcuts.floating) && <div role="status" className="download-settings-hint">{t('An unavailable key may be used by another app. Change it or retry after closing that app.', 'قد يكون الاختصار غير المتاح مستخدمًا في تطبيق آخر. غيّره أو أعد المحاولة بعد إغلاق ذلك التطبيق.')} <button className="button secondary" onClick={()=>onChange({...value})}>{t('Retry','إعادة المحاولة')}</button></div>}
      </>}
      {tab !== 'automatic' && <MusicDownloadOptions ar={ar} mode={value.audioMode} onChange={audioMode => onChange({ ...value, audioMode })}/>}
      {state && !state.clipboardAvailable && <p role="status">{t('Clipboard unavailable. Paste a link in Downloads.', 'تعذر الوصول إلى الحافظة. الصق الرابط في التنزيلات.')}</p>}
    </div>
  </section>;
}

export function QuickCaptureBar(props: Props) {
  const { ar, value } = props, [open, setOpen] = useState(false);
  return <div className="quick-download-bar">
    <button type="button" className="button secondary" onClick={() => setOpen(true)}><MousePointer2 size={16}/>{ar ? 'التنزيل السريع' : 'Quick downloads'}</button>
    <span>{value.watch ? ar ? 'التنزيل عند النسخ مفعّل' : 'Downloads on copy are on' : value.floating ? ar ? 'الزر العائم مفعّل خارج Loaderly' : 'Floating button on outside Loaderly' : ar ? 'زر عائم واختصارات للروابط المنسوخة' : 'A floating button and shortcuts for copied links'}</span>
    {open && <SettingsDialog title={ar ? 'التنزيل السريع' : 'Quick downloads'} ar={ar} onClose={() => setOpen(false)}><QuickCaptureSettings {...props}/></SettingsDialog>}
  </div>;
}
