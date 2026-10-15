import { useEffect, useRef, useState } from 'react';
import { Heart, X } from 'lucide-react';
import { accumulateSupportUse, canShowSupportReminder, normalizeSupportReminder, recordSupportReminder, supportIdleAfterMs, supportReminderStorageKey, supportUrl, type SupportReminderState } from '../../shared/supportReminder';
import './support-notice.css';
import { FloatingNotice } from './FloatingSurface';

const overlaySelector = 'dialog[open], [role="menu"], .app-color-picker, .activity-notice:not(.support-notice), .program-update-notice';
const supportOpenedEvent = 'loaderly:support-opened';
export function announceSupportOpened() { window.dispatchEvent(new Event(supportOpenedEvent)); }

export function SupportNotice({ ar, blocked }: { ar: boolean; blocked: boolean }) {
  const [visible, setVisible] = useState(false);
  const blockedRef = useRef(blocked); blockedRef.current = blocked;
  const actions = useRef({ dismiss: () => {}, neverAgain: () => {} });
  const refresh = useRef(() => {});
  useEffect(() => {
    let state: SupportReminderState;
    try { state = normalizeSupportReminder(JSON.parse(localStorage.getItem(supportReminderStorageKey) || 'null')); }
    catch { state = normalizeSupportReminder(undefined); }
    let pending = false, expiresAt = 0, previousTick = performance.now(), lastInteraction = -Infinity, previousActive = false;
    let eligibleSince: number | undefined;
    let savedActiveMs = state.activeMs;
    const persist = (next: SupportReminderState) => {
      try { localStorage.setItem(supportReminderStorageKey, JSON.stringify(next)); state = next; savedActiveMs = next.activeMs; return true; }
      catch { return false; }
    };
    const tick = () => {
      const monotonicNow = performance.now(), elapsed = monotonicNow - previousTick;
      previousTick = monotonicNow;
      const foreground = document.visibilityState === 'visible' && document.hasFocus();
      const active = foreground && monotonicNow - lastInteraction <= supportIdleAfterMs;
      state = accumulateSupportUse(state, elapsed, active && previousActive);
      previousActive = active;
      if (state.activeMs - savedActiveMs >= 5_000) persist(state);
      const playingMedia = [...document.querySelectorAll<HTMLMediaElement>('audio, video')].some(media => !media.paused && !media.ended && !media.muted && media.volume > 0);
      const deferred = blockedRef.current || playingMedia || !!document.querySelector(overlaySelector);
      if (pending && monotonicNow >= expiresAt) pending = false;
      if (!pending && canShowSupportReminder(state, Date.now(), active, deferred)) {
        // Let completion notices and playback/dialog state settle before spending the reminder.
        eligibleSince ??= monotonicNow;
        if (monotonicNow - eligibleSince >= 5_000) {
          pending = persist(recordSupportReminder(state, Date.now()));
          if (pending) expiresAt = monotonicNow + 30_000;
        }
      } else eligibleSince = undefined;
      setVisible(pending && foreground && !deferred && !state.neverAgain);
    };
    const interact = () => { tick(); lastInteraction = performance.now(); };
    refresh.current = tick;
    const dismiss = () => { pending = false; setVisible(false); };
    actions.current = {
      dismiss,
      neverAgain: () => { state = { ...state, neverAgain: true }; persist(state); dismiss(); }
    };
    const supported = () => { persist(recordSupportReminder(state, Date.now())); dismiss(); };
    const observer = new MutationObserver(tick);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open'] });
    const timer = window.setInterval(tick, 5_000);
    window.addEventListener('pointerdown', interact, { passive: true });
    window.addEventListener('keydown', interact);
    window.addEventListener('wheel', interact, { passive: true });
    window.addEventListener('focus', tick); window.addEventListener('blur', tick);
    document.addEventListener('visibilitychange', tick);
    for (const event of ['play', 'pause', 'ended', 'volumechange']) document.addEventListener(event, tick, true);
    window.addEventListener(supportOpenedEvent, supported);
    return () => {
      persist(state);
      window.clearInterval(timer); observer.disconnect();
      window.removeEventListener('pointerdown', interact); window.removeEventListener('keydown', interact); window.removeEventListener('wheel', interact);
      window.removeEventListener('focus', tick); window.removeEventListener('blur', tick); document.removeEventListener('visibilitychange', tick);
      for (const event of ['play', 'pause', 'ended', 'volumechange']) document.removeEventListener(event, tick, true);
      window.removeEventListener(supportOpenedEvent, supported);
    };
  }, []);
  useEffect(() => { refresh.current(); }, [blocked]);
  if (!visible) return null;
  return <FloatingNotice className="support-notice" dir={ar ? 'rtl' : 'ltr'} aria-label={ar ? 'دعم Loaderly' : 'Support Loaderly'}>
    <Heart size={18} aria-hidden="true" />
    <div className="support-notice__body"><p role="status">{ar ? 'أعجبك Loaderly؟ دعمك يساهم في تطويره.' : 'Enjoying Loaderly? Your support helps us make it better.'}</p>
      <div className="support-notice__actions"><a className="button secondary" href={supportUrl(ar)} target="_blank" rel="noopener noreferrer" onClick={announceSupportOpened}>{ar ? 'ساهم في تطوير Loaderly' : 'Support Loaderly'}</a><button className="support-notice__never" type="button" onClick={() => actions.current.neverAgain()}>{ar ? 'عدم إظهار هذا التذكير مجددًا' : 'Don’t remind me again'}</button></div>
    </div>
    <button type="button" className="support-notice__close" aria-label={ar ? 'إغلاق' : 'Dismiss'} onClick={() => actions.current.dismiss()}><X size={15} /></button>
  </FloatingNotice>;
}
