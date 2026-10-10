import { useEffect, useState } from 'react';
import { AlertTriangle, Check, FolderOpen, HardDrive, X } from 'lucide-react';
import { downloadFolderMessage, type DownloadFolderCheck } from '../../shared/download-destination/downloadFolderError';

export function DownloadFolderSetting({ folder, ar, onChoose, onDefault }: { folder: string; ar: boolean; onChoose: () => Promise<void>; onDefault: () => void }) {
  const [result, setResult] = useState<DownloadFolderCheck>();
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true, request = 0;
    setResult(undefined);
    const check = async () => {
      if (!window.loaderly?.checkDownloadDirectory) return;
      const id = ++request;
      try {
        const next = await window.loaderly.checkDownloadDirectory(folder);
        if (active && id === request) setResult(next);
      } catch { if (active && id === request) setResult({ path: folder, problem: 'unavailable' }); }
    };
    const refresh = () => { if (document.visibilityState === 'visible') void check(); };
    void check();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    const timer = window.setInterval(refresh, 30_000);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [folder, revision]);
  return <div className="setting-row download-folder-setting">
    <span>
      <strong>{ar ? 'مجلد التنزيل' : 'Download folder'}</strong>
      <span className="download-folder-path"><FolderOpen size={16} aria-hidden="true" /><bdi dir="ltr">{result?.path || folder || (ar ? 'المجلد الافتراضي داخل التنزيلات' : 'Default Loaderly folder inside Downloads')}</bdi></span>
      <small className="download-folder-status" role="status" data-problem={Boolean(result?.problem)}>
        {result ? result.problem ? <AlertTriangle size={14} aria-hidden="true" /> : <Check size={14} aria-hidden="true" /> : null}
        <span>{!result ? (ar ? 'جارٍ التحقق من إمكانية الحفظ…' : 'Checking folder access…') : result.problem ? downloadFolderMessage(result.problem, ar) : (ar ? 'يمكن الحفظ في هذا المجلد' : 'Ready to save here')}</span>
      </small>
    </span>
    <div className="setting-actions">
      {folder ? <button className="button secondary" onClick={onDefault} type="button"><X size={15} aria-hidden="true" />{ar ? 'افتراضي' : 'Default'}</button> : null}
      <button className="button secondary" onClick={async () => { await onChoose(); setRevision(value => value + 1); }} type="button"><HardDrive size={15} aria-hidden="true" />{ar ? 'اختيار مجلد' : 'Choose folder'}</button>
    </div>
  </div>;
}
