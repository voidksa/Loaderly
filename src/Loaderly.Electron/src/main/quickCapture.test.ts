import { afterEach, describe, expect, it, vi } from 'vitest';
import { QuickCapture } from './quickCapture';
import { captureUrl, defaultQuickCapture } from '../shared/quickCapture';

afterEach(() => vi.useRealTimers());
function setup() {
  vi.useFakeTimers(); let text = 'https://example.org/old';
  const context = { read: vi.fn(() => text), register: vi.fn((_shortcut: string, _action: () => void) => true), unregister: vi.fn(), send: vi.fn(), changed: vi.fn() };
  const service = new QuickCapture(context);
  return { service, context, copy: (value: string) => { text = value; service.poll(); } };
}
describe('clipboard capture', () => {
  it('registers defaults immediately and moves customized keys without retaining the old binding', () => {
    const {service,context}=setup();
    service.configure(defaultQuickCapture);expect(context.register).toHaveBeenCalledTimes(3);
    expect(context.read).not.toHaveBeenCalled();context.register.mockClear();
    service.configure({...defaultQuickCapture,shortcutBindings:{floating:'CommandOrControl+Shift+F9'}});
    expect(context.unregister).toHaveBeenCalledWith('CommandOrControl+Shift+F8');
    expect(context.register).toHaveBeenCalledTimes(1);expect(context.register.mock.calls[0][0]).toBe('CommandOrControl+Shift+F9');
    context.register.mock.calls[0][1]();expect(service.state().settings.floating).toBe(true);
    service.close();expect(context.unregister).toHaveBeenCalledWith('CommandOrControl+Shift+F9');
  });
  it('retries denied bindings without unregistering successful ones', () => {
    const { service, context } = setup();
    context.register.mockImplementation(shortcut => shortcut.endsWith('+F7'));
    service.configure({ ...defaultQuickCapture, shortcuts: true });
    context.register.mockClear(); context.register.mockReturnValue(true);
    expect(service.configure({ ...defaultQuickCapture, shortcuts: true }).shortcuts).toEqual({audio:true,video:true,floating:true});
    expect(context.register).toHaveBeenCalledTimes(2);
    expect(context.unregister).not.toHaveBeenCalled();
    service.configure({...defaultQuickCapture,shortcuts:false});expect(context.unregister).toHaveBeenCalledTimes(3);
    service.close();
  });
  it('accepts only a complete web link without credentials, stripping video playlist parameters', () => {
    for (const value of ['a secret https://example.org/video', 'file:///secret', 'https://user:password@example.org/', 'javascript:alert(1)', 'https://example.org/\nhttps://example.org/b']) expect(captureUrl(value)).toBeUndefined();
    expect(captureUrl('https://www.youtube.com/watch?v=abc&list=xyz&index=2#top')).toBe('https://www.youtube.com/watch?v=abc');
  });
  it('does not read until opted in; ignores existing text and repeats, but keeps explicit actions', () => {
    const { service, context, copy } = setup();
    service.connect(); service.poll(); expect(context.read).not.toHaveBeenCalled();
    service.configure({ ...defaultQuickCapture, watch: true });
    service.poll(); expect(context.send).not.toHaveBeenCalled();
    copy('https://example.org/new'); expect(context.send).toHaveBeenCalledTimes(1);
    service.acknowledge(context.send.mock.calls[0][0].id);
    copy('private text'); copy('https://example.org/new'); expect(context.send).toHaveBeenCalledTimes(1);
    service.capture('audio'); expect(context.send.mock.calls[1][0]).toMatchObject({ kind: 'audio', automatic: false });
    service.configure({ ...defaultQuickCapture }); copy('https://example.org/another'); expect(context.send).toHaveBeenCalledTimes(2);
    service.close();
  });
  it('retains unacknowledged requests until the renderer is ready, preserving mode', () => {
    const { service, context } = setup();
    service.configure({ ...defaultQuickCapture, audioMode: 'vocals' as const }); service.capture('audio');
    expect(context.send).not.toHaveBeenCalled(); service.connect();
    expect(context.send.mock.calls[0][0]).toMatchObject({ kind: 'audio', audioMode: 'vocals' as const });
    const id = context.send.mock.calls[0][0].id; service.disconnect(); service.connect(); expect(context.send).toHaveBeenCalledTimes(2);
    service.acknowledge(id); service.disconnect(); service.connect(); expect(context.send).toHaveBeenCalledTimes(2); service.close();
  });
  it('deduplicates identical captures without dropping a different sound choice', () => {
    const { service, context } = setup(); service.connect();
    for (const audioMode of ['original', 'vocals', 'instrumental'] as const) {
      service.configure({ ...defaultQuickCapture, audioMode });
      service.captureLink('https://example.org/same', 'audio');
      service.captureLink('https://example.org/same', 'audio');
    }
    expect(context.send.mock.calls.map(call => call[0].audioMode)).toEqual(['original', 'vocals', 'instrumental']);
    service.close();
  });
  it('keeps the floating button independent of automatic capture and uses the reviewed link', () => {
    const { service, context, copy } = setup();
    service.configure({ ...defaultQuickCapture, floating: true, audioMode: 'vocals' as const });
    service.connect(); copy('https://example.org/other');
    expect(context.read).not.toHaveBeenCalled(); expect(context.send).not.toHaveBeenCalled();
    service.captureLink('https://example.org/reviewed', 'video');
    expect(context.send.mock.calls[0][0]).toMatchObject({ url: 'https://example.org/reviewed', kind: 'video', audioMode: 'vocals' as const, automatic: false });
    service.captureLink('https://example.org/reviewed', 'video');
    expect(context.send).toHaveBeenCalledTimes(1);
    service.close();
  });
  it('reports shortcut conflicts and stops registered shortcuts on shutdown', () => {
    const { service, context } = setup(); context.register.mockImplementation(shortcut => shortcut.endsWith('+F7'));
    const state = service.configure({ ...defaultQuickCapture, shortcuts: true });
    expect(state.shortcuts).toEqual({ audio: true, video: false, floating: false });
    service.close(); expect(context.unregister).toHaveBeenCalledTimes(1);
  });
  it('hides and restores the floating button by shortcut without reading or downloading the clipboard', () => {
    const { service, context } = setup();
    service.configure({ ...defaultQuickCapture, shortcuts: true });
    const toggle = context.register.mock.calls.find(([key]) => key.endsWith('+F8'))![1];
    toggle(); expect(service.state().settings.floating).toBe(true);
    toggle(); expect(service.state().settings.floating).toBe(false);
    expect(service.state().settings.shortcuts).toBe(true);
    expect(context.read).not.toHaveBeenCalled(); expect(context.send).not.toHaveBeenCalled();
    service.close(); expect(context.unregister).toHaveBeenCalledTimes(3);
  });
});
