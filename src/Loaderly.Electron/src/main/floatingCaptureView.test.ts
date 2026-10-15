import { describe, it, expect } from 'vitest';
import { buildFloatingCaptureHtml, floatingAction, floatingBounds, floatingQueueText, savedCapturePoint } from './floatingCaptureView';
import { defaultAppearance } from '../shared/app-preferences/appearance';
import { defaultQuickCapture, normalizeQuickCapture } from '../shared/quickCapture';

describe('floating download surface', () => {
  it('accepts only exact local actions, never links or parameters from the clipboard', () => {
    expect(floatingAction('loaderly-capture://video')).toBe('video');
    for (const url of ['https://example.org/video', 'javascript:alert(1)', 'loaderly-capture://unknown', 'loaderly-capture://video?url=https://example.org', 'loaderly-capture://user@video', 'loaderly-capture://video/extra', 'loaderly-capture://video#other']) expect(floatingAction(url)).toBeUndefined();
  });
  it('recovers saved placement after monitor changes and fits small screens', () => {
    expect(savedCapturePoint({ x: null, y: 3 })).toBeUndefined();
    expect(savedCapturePoint({ x: '42', y: 3 })).toBeUndefined();
    expect(savedCapturePoint({ x: NaN, y: 3 })).toBeUndefined();
    expect(floatingBounds({ x: 9000, y: -3000 }, { x: 0, y: 0, width: 1920, height: 1080 }, true)).toEqual({ x: 1540, y: 0, width: 380, height: 510 });
    expect(floatingBounds({ x: -1850, y: 1000 }, { x: -1920, y: 0, width: 1920, height: 1080 }, true)).toEqual({ x: -1850, y: 570, width: 380, height: 510 });
    expect(floatingBounds({ x: 50, y: 50 }, { x: 0, y: 0, width: 300, height: 350 }, true)).toEqual({ x: 0, y: 0, width: 300, height: 350 });
    expect(floatingBounds({ x: 300, y: 350 }, { x: 0, y: 0, width: 300, height: 350 }, false)).toEqual({x:212,y:306,width:88,height:44});
    expect(floatingBounds({ x: 300, y: 350 }, { x: 0, y: 0, width: 300, height: 350 }, false,'label').width).toBe(154);
  });
  it('upgrades old preferences without enabling a desktop window or clipboard watcher', () => {
    expect(normalizeQuickCapture({ kind: 'audio', audioMode: 'vocals' as const })).toEqual({ ...defaultQuickCapture, kind: 'audio', audioMode: 'vocals' as const });
    expect(normalizeQuickCapture({ floating: true }).watch).toBe(false);
  });
  it('shows bounded local actions in both directions and disables absent links', () => {
    for (const ar of [true, false]) {
      const options = { expanded: true, settings: { ...defaultQuickCapture, audioMode: 'vocals' as const }, ar, appearance: defaultAppearance, dark: true, desktopGlass: false, reduceTransparency: false, platform: 'win32', fontCss: '', queueText: '' };
      const empty = buildFloatingCaptureHtml(options);
      expect(empty).toContain(`dir="${ar ? 'rtl' : 'ltr'}"`);
      expect(empty).toContain('aria-disabled="true"');
      expect(empty).toContain('href="loaderly-capture://sound-vocals"');
      expect(empty).toContain("default-src 'none'");
      const ready = buildFloatingCaptureHtml({ ...options, copiedUrl: 'https://example.org/clip' });
      expect(ready).toContain('example.org'); expect(ready).not.toContain('aria-disabled="true"');
      expect(ready).not.toContain('href="https://');
    }
  });
  it('reports live queue totals without claiming a transfer has completed', () => {
    const state = { settings: { concurrency: 2, rateKib: 0 }, entries: [{ id: 1, phase: 'removing-music' as const }, { id: 2, phase: 'queued' as const }] };
    expect(floatingQueueText(state, false)).toBe('1 active · 1 waiting');
    expect(floatingQueueText(state, true)).toBe('1 نشط · 1 منتظر');
  });
});
