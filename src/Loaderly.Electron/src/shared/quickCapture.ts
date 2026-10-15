import { normalizeDownloadAudioMode, type DownloadAudioMode } from './downloadAudio';
import { normalizeDownloadUrl } from './download-url/downloadUrl';

export type CaptureKind = 'video' | 'audio';
// Function keys have no language-dependent letter mapping or AltGr ambiguity.
export const captureShortcuts = { video: 'CommandOrControl+Shift+F6', audio: 'CommandOrControl+Shift+F7', floating: 'CommandOrControl+Shift+F8' } as const;
export type CaptureShortcutKind = keyof typeof captureShortcuts;
export type QuickCaptureSettings = { watch: boolean; floating: boolean; floatingSize: 'compact' | 'label'; shortcuts: boolean; shortcutDefaultsVersion?: 1; shortcutBindings?: Partial<Record<CaptureShortcutKind,string>>; kind: CaptureKind; audioMode: DownloadAudioMode; removeMusic?: boolean };
export function captureBindings(value: QuickCaptureSettings): Record<CaptureShortcutKind,string> {
  const result: Record<CaptureShortcutKind,string> = { ...captureShortcuts };
  const input = value.shortcutBindings;
  if (!input || typeof input !== 'object') return result;
  const used = new Set<string>();
  for (const kind of ['video','audio','floating'] as const) {
    const candidate = input[kind];
    if (typeof candidate === 'string' && /^CommandOrControl\+Shift\+F([1-9]|1[0-9]|2[0-4])$/.test(candidate) && !used.has(candidate)) {
      result[kind] = candidate; used.add(candidate);
    }
  }
  // Never silently assign two actions to one key, including a custom/default conflict.
  for (const kind of ['video','audio','floating'] as const) {
    if (Object.entries(result).some(([other,key]) => other !== kind && key === result[kind])) {
      result[kind] = Array.from({length:24},(_,i)=>`CommandOrControl+Shift+F${i+1}`).find(key=>!Object.values(result).includes(key))!;
    }
  }
  return result;
}
export type CaptureRequest = { id: string; url: string; kind: CaptureKind; audioMode: DownloadAudioMode; removeMusic?: boolean; automatic: boolean };
export type QuickCaptureState = { settings: QuickCaptureSettings; shortcuts: { video: boolean; audio: boolean; floating: boolean }; clipboardAvailable: boolean; message?: string };
export type QuickCaptureCommand = { action: 'configure'; settings: QuickCaptureSettings } | { action: 'state' | 'ready' | 'focus' } | { action: 'capture'; kind: CaptureKind } | { action: 'ack'; id: string };
export const defaultQuickCapture: QuickCaptureSettings = { watch: false, floating: false, floatingSize: 'compact', shortcuts: true, shortcutDefaultsVersion: 1, kind: 'video', audioMode: 'original' };
export function normalizeQuickCapture(value?: Partial<QuickCaptureSettings>): QuickCaptureSettings {
  const settings: QuickCaptureSettings = { watch: value?.watch === true, floating: value?.floating === true, floatingSize: value?.floatingSize === 'label' ? 'label' : 'compact', shortcuts: value?.shortcutDefaultsVersion === 1 ? value.shortcuts !== false : true, shortcutDefaultsVersion: 1, kind: value?.kind === 'audio' ? 'audio' : 'video', audioMode: normalizeDownloadAudioMode(value?.audioMode, value?.removeMusic) };
  if (value?.shortcutBindings) settings.shortcutBindings = captureBindings({ ...settings, shortcutBindings: value.shortcutBindings });
  return settings;
}
/** A copied URL must be the entire clipboard, never a URL extracted from private text. */
export function captureUrl(text: unknown): string | undefined {
  if (typeof text !== 'string' || /\s/.test(text.trim())) return;
  const normalized = normalizeDownloadUrl(text);
  if (!normalized) return;
  const url = new URL(normalized);
  if (url.username || url.password) return;
  url.hash = '';
  // A watch URL with a playlist parameter still denotes one explicitly copied video.
  if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(url.hostname) && url.pathname === '/watch' && url.searchParams.has('v')) {
    for (const key of ['list', 'index', 'start_radio']) url.searchParams.delete(key);
  }
  return url.href;
}
