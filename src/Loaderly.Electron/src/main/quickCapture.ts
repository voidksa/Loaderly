import { randomUUID } from 'node:crypto';
import { captureBindings, captureUrl, defaultQuickCapture, normalizeQuickCapture, type CaptureShortcutKind, type CaptureKind, type CaptureRequest, type QuickCaptureSettings, type QuickCaptureState } from '../shared/quickCapture';

type Context = {
  read: () => string;
  register: (shortcut: string, action: () => void, kind: CaptureShortcutKind) => boolean;
  unregister: (shortcut: string) => void;
  send: (request: CaptureRequest) => void;
  changed: (state: QuickCaptureState) => void;
};
export { captureShortcuts } from '../shared/quickCapture';

export class QuickCapture {
  private settings = { ...defaultQuickCapture };
  private bindings = { video: false, audio: false, floating: false };
  private registeredKeys: Partial<Record<CaptureShortcutKind,string>> = {};
  private lastText = '';
  private clipboardAvailable = true;
  private timer?: ReturnType<typeof setInterval>;
  private seen = new Set<string>();
  private pending = new Map<string, CaptureRequest>();
  private ready = false;
  constructor(private context: Context) {}
  state(message?: string): QuickCaptureState { return { settings: { ...this.settings }, shortcuts: { ...this.bindings }, clipboardAvailable: this.clipboardAvailable, message }; }
  configure(settings: QuickCaptureSettings) {
    const next = normalizeQuickCapture(settings), previous = this.settings;
    this.settings = next;
    const keys = captureBindings(next);
    if (previous.shortcuts !== next.shortcuts || JSON.stringify(captureBindings(previous)) !== JSON.stringify(keys) || (next.shortcuts && Object.values(this.bindings).some(value => !value))) {
      for (const kind of ['video', 'audio', 'floating'] as const) {
        if (this.bindings[kind] && (!next.shortcuts || this.registeredKeys[kind] !== keys[kind])) {
          this.context.unregister(this.registeredKeys[kind]!); this.bindings[kind] = false; delete this.registeredKeys[kind];
        }
      }
      for (const kind of ['video', 'audio', 'floating'] as const) {
        if (next.shortcuts && this.bindings[kind]) continue;
        this.bindings[kind] = false;
        if (next.shortcuts) {
          try { this.bindings[kind] = this.context.register(keys[kind], () => kind === 'floating' ? this.toggleFloating() : this.capture(kind), kind); if(this.bindings[kind]) this.registeredKeys[kind] = keys[kind]; } catch { /* OS denied the binding. */ }
        }
      }
    }
    if (previous.watch !== next.watch) {
      clearInterval(this.timer);
      if (next.watch) {
        // Enabling/reopening never downloads whatever happened to be copied earlier.
        this.lastText = this.read();
        this.timer = setInterval(() => this.poll(), 900);
        this.timer.unref?.();
      } else this.lastText = '';
    }
    this.context.changed(this.state());
    return this.state();
  }
  private read() {
    try { const value = this.context.read(); this.clipboardAvailable = true; return value; }
    catch { if (this.clipboardAvailable) { this.clipboardAvailable = false; this.context.changed(this.state('CLIPBOARD_UNAVAILABLE')); } return ''; }
  }
  poll() {
    if (!this.settings.watch) return;
    const text = this.read();
    if (text === this.lastText) return;
    this.lastText = text;
    this.enqueue(text, this.settings.kind, true);
  }
  capture(kind: CaptureKind) { return this.enqueue(this.read(), kind, false); }
  toggleFloating() { return this.configure({ ...this.settings, floating: !this.settings.floating }); }
  // The floating panel downloads the link the user reviewed, even if another
  // app changes the clipboard while they choose a format.
  captureLink(text: string, kind: CaptureKind) { return this.enqueue(text, kind, false); }
  private enqueue(text: string, kind: CaptureKind, automatic: boolean) {
    const url = captureUrl(text);
    if (!url) { if (!automatic) this.context.changed(this.state('COPY_MEDIA_LINK')); return this.state('COPY_MEDIA_LINK'); }
    const key = JSON.stringify([url, kind, this.settings.audioMode]);
    if (automatic && this.seen.has(key)) return this.state();
    if ([...this.pending.values()].some(item => item.url === url && item.kind === kind && item.audioMode === this.settings.audioMode)) return this.state();
    if (this.pending.size >= 50) { this.context.changed(this.state('CAPTURE_QUEUE_FULL')); return this.state('CAPTURE_QUEUE_FULL'); }
    this.seen.add(key); if (this.seen.size > 500) this.seen.delete(this.seen.values().next().value!);
    const request: CaptureRequest = { id: randomUUID(), url, kind, audioMode: this.settings.audioMode, automatic };
    this.pending.set(request.id, request);
    if (this.ready) this.context.send(request);
    return this.state();
  }
  acknowledge(id: string) { this.pending.delete(id); }
  connect() { this.ready = true; for (const request of this.pending.values()) this.context.send(request); }
  disconnect() { this.ready = false; }
  close() { clearInterval(this.timer); for (const kind of ['video', 'audio', 'floating'] as const) if (this.bindings[kind]) this.context.unregister(this.registeredKeys[kind]!); this.pending.clear(); this.seen.clear(); this.lastText = ''; }
}
