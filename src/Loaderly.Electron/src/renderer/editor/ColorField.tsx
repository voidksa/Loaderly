import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, X } from 'lucide-react';
import { clampColor, hexHsv, hexRgb, hsvHex, parseHex, rgbHex, type HSV } from './colorMath';

function RgbInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  return <input type="number" aria-label={label} min={0} max={255} step={1} value={draft} onChange={e => {
    setDraft(e.target.value);
    if (e.target.value !== '' && e.target.validity.valid) onChange(Number(e.target.value));
  }} onBlur={() => setDraft(String(value))} />;
}

export function ColorField({ label, value, onChange, ar }: { label: string; value: string; onChange: (value: string, recordHistory: boolean) => void; ar: boolean }) {
  const t = (en: string, arabic: string) => ar ? arabic : en;
  const id = useId(), canonical = parseHex(value) ?? '#000000';
  const [draft, setDraft] = useState(canonical.toUpperCase());
  const [invalid, setInvalid] = useState(false), [copied, setCopied] = useState(false), [status, setStatus] = useState('');
  const [open, setOpen] = useState(false), [hsv, setHsv] = useState(() => hexHsv(canonical));
  const [position, setPosition] = useState<CSSProperties>({ visibility: 'hidden' });
  const fieldRef = useRef<HTMLDivElement>(null), inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null), popupRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLInputElement>(null), lastEmitted = useRef(canonical), hsvRef = useRef(hsv);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const gesture = useRef({ active: false, changed: false });
  const beginGesture = () => { gesture.current = { active: true, changed: false }; };
  const endGesture = () => { gesture.current.active = false; };
  hsvRef.current = hsv;

  useEffect(() => {
    if (document.activeElement !== inputRef.current || canonical !== lastEmitted.current) {
      setDraft(canonical.toUpperCase()); setInvalid(false);
    }
    if (canonical !== lastEmitted.current) setHsv(hexHsv(canonical, hsvRef.current.h));
  }, [canonical]);
  useEffect(() => () => clearTimeout(copyTimer.current), []);

  const close = (restoreFocus = false) => {
    endGesture();
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus({ preventScroll: true });
  };
  const apply = (color: string, fromPicker = false, preserveDraft = false) => {
    lastEmitted.current = color;
    if (!preserveDraft) setDraft(color.toUpperCase());
    setInvalid(false); setStatus('');
    if (!fromPicker) setHsv(hexHsv(color, hsvRef.current.h));
    if (color !== canonical) {
      onChange(color, !gesture.current.active || !gesture.current.changed);
      if (gesture.current.active) gesture.current.changed = true;
    }
  };
  const changeHsv = (next: HSV) => { hsvRef.current = next; setHsv(next); apply(hsvHex(next), true); };
  const commit = () => {
    const parsed = parseHex(draft);
    if (parsed) apply(parsed); else setInvalid(true);
  };

  useLayoutEffect(() => {
    if (!open) return;
    const reposition = () => {
      const trigger = triggerRef.current, popup = popupRef.current;
      if (!trigger || !popup) return;
      const r = trigger.getBoundingClientRect(), width = popup.offsetWidth, height = popup.offsetHeight;
      const left = clampColor(ar ? r.right - width : r.left, 12, Math.max(12, innerWidth - width - 12));
      const top = innerHeight - r.bottom - 20 >= height ? r.bottom + 8
        : r.top >= height + 20 ? r.top - height - 8 : clampColor(r.bottom + 8, 12, Math.max(12, innerHeight - height - 12));
      setPosition({ top, left, visibility: 'visible' });
    };
    reposition();
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => { window.removeEventListener('resize', reposition); window.removeEventListener('scroll', reposition, true); };
  }, [open, ar]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => hueRef.current?.focus({ preventScroll: true }));
    const outside = (e: Event) => {
      if (!fieldRef.current?.contains(e.target as Node) && !popupRef.current?.contains(e.target as Node)) close();
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); }
    };
    window.addEventListener('pointerdown', outside);
    window.addEventListener('focusin', outside);
    window.addEventListener('pointerup', endGesture);
    window.addEventListener('pointercancel', endGesture);
    window.addEventListener('keydown', escape, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointerdown', outside);
      window.removeEventListener('focusin', outside);
      window.removeEventListener('pointerup', endGesture);
      window.removeEventListener('pointercancel', endGesture);
      window.removeEventListener('keydown', escape, true);
    };
  }, [open]);

  const movePlane = (event: PointerEvent<HTMLDivElement>) => {
    const r = event.currentTarget.getBoundingClientRect();
    changeHsv({ h: hsvRef.current.h, s: clampColor((event.clientX - r.left) / r.width), v: 1 - clampColor((event.clientY - r.top) / r.height) });
  };
  const rgb = hexRgb(canonical);
  return <div className="app-color-field" ref={fieldRef}>
    <label htmlFor={id}>{label}</label>
    <div className="app-color-value" dir="ltr">
      <button type="button" className="app-color-swatch" ref={triggerRef} aria-label={t('Choose color: ', 'اختيار لون: ') + label} aria-expanded={open} aria-haspopup="dialog" aria-controls={open ? id + '-picker' : undefined} onClick={() => {
        if (open) { close(); return; }
        setHsv(hexHsv(canonical, hsvRef.current.h)); setPosition({ visibility: 'hidden' }); setOpen(true);
      }}><span style={{ background: canonical }} /></button>
      <span className="app-color-format" aria-hidden="true">HEX</span>
      <input id={id} ref={inputRef} type="text" aria-label={label + ' HEX'} aria-invalid={invalid} aria-describedby={invalid ? id + '-error' : undefined} autoComplete="off" spellCheck={false} maxLength={16} value={draft} onChange={e => {
        const text = e.target.value; setDraft(text); setInvalid(false);
        const parsed = parseHex(text);
        if (parsed && text.trim().replace(/^#/, '').length === 6) apply(parsed, false, true);
      }} onBlur={commit} onKeyDown={e => {
        if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); commit(); }
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setDraft(canonical.toUpperCase()); setInvalid(false); }
      }} />
      <button type="button" className="app-color-copy" aria-label={t('Copy color: ', 'نسخ لون: ') + label} title={copied ? t('Copied', 'تم النسخ') : t('Copy HEX', 'نسخ HEX')} onClick={async () => {
        const color = parseHex(draft);
        if (!color) { setInvalid(true); inputRef.current?.focus(); return; }
        try {
          const result = await window.loaderly?.copyText?.(color.toUpperCase());
          if (result) { if (!result.ok) throw Error('Copy failed'); } else await navigator.clipboard.writeText(color.toUpperCase());
          setCopied(true); setStatus(t('Color copied.', 'نُسخ اللون.')); clearTimeout(copyTimer.current);
          copyTimer.current = setTimeout(() => setCopied(false), 1600);
        } catch { inputRef.current?.focus(); inputRef.current?.select(); setStatus(t('Press Ctrl+C to copy the selected color.', 'اضغط Ctrl+C لنسخ اللون المحدد.')); }
      }}>{copied ? <Check size={15} /> : <Copy size={15} />}</button>
    </div>
    {invalid ? <small className="app-color-error" id={id + '-error'}>{t('Use 3 or 6 HEX digits, such as #AABBCC.', 'أدخل كود HEX من 3 أو 6 خانات، مثل #AABBCC.')}</small> : null}
    <span className="sr-only" role="status">{status}</span>
    {open ? createPortal(<div className="app-color-picker" id={id + '-picker'} ref={popupRef} role="dialog" aria-label={t('Choose color: ', 'اختيار لون: ') + label} dir={ar ? 'rtl' : 'ltr'} style={position} onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
      <header><strong>{label}</strong><button type="button" aria-label={t('Close color picker', 'إغلاق منتقي الألوان')} onClick={() => close(true)}><X size={16} /></button></header>
      <div className="app-color-plane" role="group" tabIndex={0} aria-label={t('Shade. Arrow keys adjust saturation and brightness.', 'درجة اللون. الأسهم تضبط التشبع والسطوع.')} style={{ backgroundColor: `hsl(${hsv.h} 100% 50%)` }} onPointerDown={e => {
        if (e.button !== 0) return; e.preventDefault(); e.currentTarget.focus(); beginGesture(); e.currentTarget.setPointerCapture(e.pointerId); movePlane(e);
      }} onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) movePlane(e); }} onPointerUp={e => { endGesture(); if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }} onPointerCancel={endGesture} onLostPointerCapture={endGesture} onKeyDown={e => {
        const step = e.shiftKey ? .1 : .01, next = { ...hsvRef.current };
        if (e.key === 'ArrowLeft') next.s = clampColor(next.s - step);
        else if (e.key === 'ArrowRight') next.s = clampColor(next.s + step);
        else if (e.key === 'ArrowUp') next.v = clampColor(next.v + step);
        else if (e.key === 'ArrowDown') next.v = clampColor(next.v - step);
        else return;
        e.preventDefault(); changeHsv(next);
      }}><i style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }} /></div>
      <label className="app-color-hue-label">{t('Hue', 'درجة اللون')}<input ref={hueRef} className="app-color-hue" type="range" min={0} max={359} step={1} value={Math.round(hsv.h)} dir="ltr" onPointerDown={beginGesture} onPointerUp={endGesture} onPointerCancel={endGesture} onBlur={endGesture} onChange={e => changeHsv({ ...hsvRef.current, h: Number(e.target.value) })} /></label>
      <div className="app-color-rgb" dir="ltr">{['R', 'G', 'B'].map((channel, index) => <label key={channel}>{channel}<RgbInput label={[t('Red', 'الأحمر'), t('Green', 'الأخضر'), t('Blue', 'الأزرق')][index]} value={rgb[index]} onChange={n => {
        const next = [...rgb]; next[index] = n; apply(rgbHex(next));
      }} /></label>)}</div>
      <footer><span className="app-color-preview" style={{ background: canonical }} /><code dir="ltr">{canonical.toUpperCase()}</code><span>{t('Drag or enter RGB', 'اسحب أو أدخل RGB')}</span></footer>
    </div>, fieldRef.current?.closest('.app-shell') ?? document.body) : null}
  </div>;
}
