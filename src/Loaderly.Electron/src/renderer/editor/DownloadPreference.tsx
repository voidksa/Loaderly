import { useId, type ReactNode } from 'react';

export function DownloadPreference({ label, description, children }: { label: string; description?: ReactNode; children: ReactNode }) {
  return <div className="download-preference">
    <span className="download-preference__copy"><strong>{label}</strong>{description && <small>{description}</small>}</span>
    <div className="download-preference__control">{children}</div>
  </div>;
}

export function DownloadToggle({ label, description, checked, disabled, onChange }: { label: string; description?: ReactNode; checked: boolean; disabled?: boolean; onChange: (value: boolean) => void }) {
  const id = useId();
  return <div className="download-preference download-preference--toggle">
    <label className="download-preference__copy" htmlFor={id}><strong id={`${id}-label`}>{label}</strong>{description && <small id={`${id}-hint`}>{description}</small>}</label>
    <input id={id} className="download-switch" type="checkbox" role="switch" checked={checked} disabled={disabled} aria-labelledby={`${id}-label`} aria-describedby={description ? `${id}-hint` : undefined} onChange={event => onChange(event.target.checked)}/>
  </div>;
}
