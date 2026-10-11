import {useEffect, useId, useRef, useState, type ReactNode} from 'react';
import {Trash2} from 'lucide-react';

export function ConfirmAction({ar, title, children, confirmLabel, onConfirm, onCancel}: {
  ar: boolean; title: string; children: ReactNode; confirmLabel: string;
  onConfirm: () => Promise<void> | void; onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null), cancel = useRef<HTMLButtonElement>(null);
  const id = useId(), [busy, setBusy] = useState(false);
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.showModal(); cancel.current?.focus();
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);
  return <dialog ref={dialog} dir={ar ? 'rtl' : 'ltr'} className="app-dialog confirm-action" aria-labelledby={id} aria-describedby={id + '-body'} onCancel={event => {event.preventDefault(); if (!busy) onCancel();}}>
    <h2 id={id}>{title}</h2><div id={id + '-body'} className="confirm-action-body">{children}</div>
    <footer><button ref={cancel} type="button" className="button secondary" disabled={busy} onClick={onCancel}>{ar ? 'إلغاء' : 'Cancel'}</button>
      <button type="button" className="button primary button-danger" disabled={busy} onClick={async () => {setBusy(true); try {await onConfirm();} finally {setBusy(false); onCancel();}}}><Trash2 size={15}/>{busy ? (ar ? 'جارٍ التنفيذ…' : 'Working…') : confirmLabel}</button></footer>
  </dialog>;
}

