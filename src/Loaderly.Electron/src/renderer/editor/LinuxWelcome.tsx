import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Heart, X } from 'lucide-react';
import './linuxWelcome.css';

const welcomeKey = 'loaderly:linux-welcome:seen';

export function LinuxWelcome({ ar }: { ar: boolean }) {
  const [visible, setVisible] = useState(() => {
    if (window.loaderly?.platform !== 'linux') return false;
    try { return localStorage.getItem(welcomeKey) !== 'yes'; }
    catch { return false; }
  });
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!visible) return;
    const element = dialog.current;
    if (!element) return;
    const previous = document.activeElement;
    element.showModal();
    element.querySelector<HTMLButtonElement>('.linux-welcome__start')?.focus();
    // Mark when shown, so even closing the app without dismissing is one visit.
    try { localStorage.setItem(welcomeKey, 'yes'); } catch { /* Keep the app usable if storage is unavailable. */ }
    return () => {
      element.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, [visible]);

  if (!visible) return null;
  const close = () => setVisible(false);
  return <dialog ref={dialog} className="app-dialog linux-welcome" dir={ar ? 'rtl' : 'ltr'}
    aria-labelledby="linux-welcome-title" aria-describedby="linux-welcome-message"
    onCancel={event => { event.preventDefault(); close(); }}>
    <button className="linux-welcome__close button secondary" type="button" aria-label={ar ? 'إغلاق الترحيب' : 'Close welcome'} onClick={close}><X size={18} /></button>
    <div className="linux-welcome__heart" aria-hidden="true"><Heart size={42} strokeWidth={1.5} fill="currentColor" /></div>
    <p className="linux-welcome__eyebrow">{ar ? 'يا أهل لينكس' : 'HELLO, LINUX'}</p>
    <h2 id="linux-welcome-title">{ar ? 'أنتم في القلب.' : 'You’re in our hearts.'}</h2>
    <p id="linux-welcome-message">{ar
      ? 'هذه أول نسخة لنا على لينكس، وسعداء بوجودكم معنا. ملاحظاتكم وأفكاركم تساعدنا نخلي Loaderly أجمل وأفضل.'
      : 'Our first Linux release is here, and we’re happy you’re part of it. Your ideas and feedback will help make Loaderly even better.'}</p>
    <p className="linux-welcome__signature">{ar ? 'بكل حب،' : 'With love,'} <bdi>VOIDKSA</bdi></p>
    <button className="button primary linux-welcome__start" type="button" autoFocus onClick={close}>
      {ar ? 'يلا نبدأ' : 'Let’s get started'}<ArrowRight size={17} aria-hidden="true" />
    </button>
  </dialog>;
}
