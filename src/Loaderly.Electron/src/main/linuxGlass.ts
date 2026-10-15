import type {BrowserWindow} from 'electron';
import {createRequire} from 'node:module';

type Reply<T> = (error: Error|null, value: T) => void;
type PointerReply = {rootX: number; rootY: number; sameScreen: number};
export type XClient = {
  screenNum: number;
  on(event: string, listener: (...args: any[]) => void): unknown;
  InternAtom(onlyIfExists: boolean, name: string, reply: Reply<number>): void;
  GetSelectionOwner(atom: number, reply: Reply<number>): void;
  QueryPointer(window: number, reply: Reply<PointerReply>): void;
  ChangeProperty(mode: number, window: number, property: number, type: number, format: number, data: Buffer): void;
  DeleteProperty(window: number, property: number): void;
  terminate(): void;
};
type XDisplay = {client: XClient; screen: {root: number}[]};
type XLibrary = {createClient(options: {display: string}, reply: Reply<XDisplay>): XClient};
type Environment = {platform: NodeJS.Platform; display?: string; wayland: boolean};
type GlassWindow = Pick<BrowserWindow, 'getNativeWindowHandle'|'isDestroyed'>;

// X11 compositors own this selection. An ARGB visual alone does not prove that
// transparency is usable. Never fade the whole window: text stays fully opaque.
export function createLinuxGlass(environment: Environment, load: () => XLibrary) {
  let client: XClient|undefined;
  let supported = false;
  let timer: ReturnType<typeof setInterval>|undefined;
  let selection = 0, blur = 0, bypass = 0;
  let root = 0;
  let probing: Promise<void>|undefined;
  const listeners = new Set<() => void>();
  const eligible = environment.platform === 'linux' && !!environment.display && !environment.wayland;
  const update = (next: boolean) => {
    if (next === supported) return;
    supported = next;
    for (const listener of listeners) listener();
  };
  function request<T>(send: (reply: Reply<T>) => void, timeoutMs = 1200): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('X11 request timed out')), timeoutMs);
      try { send((error, value) => {clearTimeout(timeout); error ? reject(error) : resolve(value);}); }
      catch (error) {clearTimeout(timeout); reject(error);}
    });
  }
  function refresh(): Promise<void> {
    if (!client || !selection) return Promise.resolve();
    if (!probing) probing = request<number>(reply => client!.GetSelectionOwner(selection, reply))
      .then(owner => update(owner !== 0), () => update(false)).finally(() => {probing = undefined;});
    return probing;
  }
  return {
    isSupported: () => supported,
    windowOptions: () => eligible ? {transparent: true} : {},
    onChange(listener: () => void) {listeners.add(listener); return () => {listeners.delete(listener);};},
    refresh,
    async cursorPoint(): Promise<{x: number; y: number}|undefined> {
      if (!client || !root) return;
      // Share the X11 connection, even when glass is disabled. Electron's X11
      // cursor cache can retain the last point inside the application after it
      // is hidden; StatusNotifier activation does not refresh that cache.
      try {
        const point = await request<PointerReply>(reply => client!.QueryPointer(root, reply), 200);
        if (point.sameScreen && Number.isFinite(point.rootX) && Number.isFinite(point.rootY)) {
          return {x: point.rootX, y: point.rootY};
        }
      } catch { /* A disconnected display must not block tray activation. */ }
    },
    async initialize() {
      if (!eligible || client) return;
      try {
        const display = await request<XDisplay>(reply => {
          client = load().createClient({display: environment.display!}, reply);
          client.on('error', () => update(false));
          client.on('end', () => update(false));
        });
        client = display.client;
        root = display.screen[client.screenNum || 0]?.root ?? 0;
        const atom = (name: string) => request<number>(reply => client!.InternAtom(false, name, reply));
        [selection, blur, bypass] = await Promise.all([
          atom(`_NET_WM_CM_S${client.screenNum || 0}`),
          atom('_KDE_NET_WM_BLUR_BEHIND_REGION'), atom('_NET_WM_BYPASS_COMPOSITOR')
        ]);
        await refresh();
        timer = setInterval(() => {void refresh();}, 4000);
        timer.unref();
      } catch {
        update(false);
        try {client?.terminate();} catch { /* The display may have disconnected. */ }
        client = undefined;
        root = 0;
      }
    },
    apply(win: GlassWindow, enabled: boolean) {
      if (!client || !blur || !bypass || win.isDestroyed()) return;
      const handle = win.getNativeWindowHandle();
      if (handle.length < 4) return;
      const window = handle.readUInt32LE(0);
      if (enabled && supported) {
        const neverBypass = Buffer.alloc(4); neverBypass.writeUInt32LE(2);
        client.ChangeProperty(0, window, bypass, 6, 32, neverBypass);
        // KWin and compatible compositors interpret an empty region as the
        // whole window. Cinnamon's per-application blur works with its alpha.
        client.ChangeProperty(0, window, blur, 6, 32, Buffer.alloc(0));
      } else {
        client.DeleteProperty(window, blur);
        client.DeleteProperty(window, bypass);
      }
    },
    dispose() {
      if (timer) clearInterval(timer);
      listeners.clear();
      update(false);
      try {client?.terminate();} catch { /* Already closed. */ }
      client = undefined;
      root = 0;
    }
  };
}

export const linuxGlass = createLinuxGlass({
  platform: process.platform, display: process.env.DISPLAY,
  wayland: process.env.XDG_SESSION_TYPE === 'wayland' || !!process.env.WAYLAND_DISPLAY
}, () => createRequire(import.meta.url)('x11') as XLibrary);
