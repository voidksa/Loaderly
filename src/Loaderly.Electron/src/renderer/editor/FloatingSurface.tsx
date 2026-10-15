import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { registerFloatingMaterial } from '../../shared/ui/floating-material';

export function FloatingNotice({ children, className = '', ...props }: { children: ReactNode; className?: string; dir?: string; role?: string; 'aria-label'?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = ref.current!; element.showPopover();
    const release = registerFloatingMaterial(element);
    return () => { release(); element.hidePopover(); };
  }, []);
  return createPortal(<div ref={ref} popover="manual" className={`activity-notice ${className}`} {...props}>{children}</div>, document.body);
}

export function SettingsDialog({ title, ar, onClose, children }: { title: string; ar: boolean; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const previous = document.activeElement, element = ref.current!;
    element.showModal(); const release = registerFloatingMaterial(element);
    return () => { release(); element.close(); if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);
  return createPortal(<dialog ref={ref} className="app-dialog download-settings-dialog" dir={ar ? 'rtl' : 'ltr'} aria-label={title} onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className="app-dialog-heading"><h2>{title}</h2><button className="button secondary" autoFocus aria-label={ar ? 'إغلاق' : 'Close'} onClick={onClose}><X size={17}/></button></header>
    <div className="download-settings-dialog__body">{children}</div>
    <footer><button className="button primary" onClick={onClose}>{ar ? 'إغلاق' : 'Done'}</button></footer>
  </dialog>, document.body);
}
