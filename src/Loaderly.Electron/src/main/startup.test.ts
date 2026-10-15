import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StartupManager, desktopStartup, desktopExec, linuxStartup, unavailableStartup, type StartupBackend } from './startup';
import { startupTaskState } from './windowsStartupTask';
import { validateStartupRequest } from '../shared/startup';
import type { StartupState } from '../shared/startup';

const directories: string[] = [];
afterEach(async () => { await Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true }))); });
async function temporary() { const directory = await mkdtemp(join(tmpdir(), 'loaderly-startup-')); directories.push(directory); return directory; }
function fakeBackend() {
  let state: StartupState = { enabled: false, registered: false, canChange: true, settingsAvailable: true };
  const backend: StartupBackend = {
    read: vi.fn(async () => ({ ...state })),
    set: vi.fn(async enabled => { state = { ...state, enabled, registered: enabled }; })
  };
  return { backend, external: (next: Partial<StartupState>) => { state = { ...state, ...next }; } };
}

describe('one-time default and OS authority', () => {
  it('enables once and never overrides an external removal on later launches', async () => {
    const marker = join(await temporary(), 'startup.json'), { backend, external } = fakeBackend();
    await new StartupManager(backend, marker).initialize();
    expect(backend.set).toHaveBeenCalledExactlyOnceWith(true);
    external({ enabled: false, registered: false });
    const reopened = new StartupManager(backend, marker);
    await reopened.initialize();
    expect((await reopened.get()).enabled).toBe(false);
    expect(backend.set).toHaveBeenCalledTimes(1);
    expect((await reopened.set(true)).enabled).toBe(true);
    expect((await reopened.set(false)).enabled).toBe(false);
    await new StartupManager(backend, marker).initialize();
    expect(backend.set).toHaveBeenCalledTimes(3);
  });
  it('preserves an existing disabled entry on the first launch', async () => {
    const { backend, external } = fakeBackend(); external({ registered: true });
    await new StartupManager(backend, join(await temporary(), 'marker')).initialize();
    expect(backend.set).not.toHaveBeenCalled();
  });
  it('does not repeatedly request approval or retry a failed registration on launch', async () => {
    const { backend } = fakeBackend(), marker = join(await temporary(), 'marker');
    backend.set = vi.fn(async () => { throw Error('OS refused'); });
    await expect(new StartupManager(backend, marker).initialize()).rejects.toThrow('OS refused');
    await new StartupManager(backend, marker).initialize();
    expect(backend.set).toHaveBeenCalledTimes(1);
  });
  it('does not override a disabled Store task using a missing local marker', async () => {
    const { backend, external } = fakeBackend(); backend.systemDefault = true; external({ registered: true });
    await new StartupManager(backend, join(await temporary(), 'marker')).initialize();
    expect(backend.set).not.toHaveBeenCalled();
  });
  it('serializes initialization and fast successive changes; last choice wins', async () => {
    const { backend } = fakeBackend(), manager = new StartupManager(backend, join(await temporary(), 'marker'));
    await Promise.all([manager.initialize(), manager.set(false), manager.set(true), manager.set(false)]);
    expect((await manager.get()).enabled).toBe(false);
    expect(backend.set).toHaveBeenCalledTimes(4);
  });
  it('reports readback failure rather than claiming the toggle was saved', async () => {
    const { backend } = fakeBackend(); backend.set = vi.fn(async () => {});
    await expect(new StartupManager(backend, join(await temporary(), 'marker')).set(true)).rejects.toThrow('STARTUP_CHANGE_NOT_APPLIED');
  });
  it('does not write OS settings or a marker for development profiles', async () => {
    const marker = join(await temporary(), 'marker'), manager = new StartupManager(unavailableStartup('development'), marker);
    await manager.initialize();
    expect(await manager.set(true)).toMatchObject({ enabled: false, canChange: false, reason: 'development' });
    await expect(readFile(marker)).rejects.toMatchObject({ code: 'ENOENT' });
  });
});

describe('Linux autostart file', () => {
  it('enables, disables, persists and reads external desktop changes in an isolated XDG folder', async () => {
    const directory = await temporary(), executable = '/home/person/My Apps/Loaderly.AppImage';
    const backend = linuxStartup(directory, executable), path = join(directory, 'autostart', 'com.loaderly.app.desktop');
    expect(await backend.read()).toMatchObject({ enabled: false, registered: false });
    await backend.set(true);
    expect(await backend.read()).toMatchObject({ enabled: true });
    expect(await readFile(path, 'utf8')).toContain('Exec=/usr/bin/env -- "\/home/person/My Apps/Loaderly.AppImage"');
    await writeFile(path, (await readFile(path, 'utf8')).replace('Hidden=false', 'Hidden=true'));
    expect((await backend.read()).enabled).toBe(false);
    await backend.set(true);
    await writeFile(path, (await readFile(path, 'utf8')).replace('X-GNOME-Autostart-enabled=true', 'X-GNOME-Autostart-enabled=false'));
    expect((await backend.read()).enabled).toBe(false);
    await backend.set(false);
    expect((await linuxStartup(directory, executable).read()).enabled).toBe(false);
    expect(await readFile(path, 'utf8')).toContain('Hidden=true');
  });
  it('only touches Loaderly, with a Hidden override when disabled', async () => {
    const directory = await temporary(); await mkdir(join(directory, 'autostart'));
    const other = join(directory, 'autostart', 'other.desktop'); await writeFile(other, 'keep');
    await linuxStartup(directory, '/opt/Loaderly/loaderly').set(false);
    expect(await readFile(other, 'utf8')).toBe('keep');
  });
  it('does not report a stale executable or a non-application entry as enabled', async () => {
    const directory = await temporary(); await linuxStartup(directory, '/old/loaderly').set(true);
    expect(await linuxStartup(directory, '/new/loaderly').read()).toMatchObject({ enabled: false, registered: true });
  });
  it('quotes reserved characters as one desktop argument without shell expansion', () => {
    expect(desktopExec('/tmp/a$`"\\%b')).toBe('"/tmp/a\\\\$\\\\`\\\\"\\\\\\\\%%b"');
  });
  it.each(['relative', '/a\nb', '/a\rb', '/a\0b', '/a=b'])('rejects unrepresentable paths: %j', path => {
    expect(() => desktopExec(path)).toThrow('INVALID_STARTUP_PATH');
  });
});

describe('native platform readback', () => {
  it('reads the named Windows launch item with a quoted lookup, and writes an unquoted path', async () => {
    const native = { getLoginItemSettings: vi.fn(() => ({ openAtLogin: false, launchItems: [{ name: 'Loaderly', enabled: true, scope: 'user', args: [], path: 'C:\\My Apps\\Loaderly.exe' }] })), setLoginItemSettings: vi.fn() };
    const backend = desktopStartup(native as unknown as Electron.App, 'win32', 'C:\\My Apps\\Loaderly.exe', async () => {});
    expect((await backend.read()).enabled).toBe(true);
    expect(native.getLoginItemSettings).toHaveBeenCalledWith({ path: '"C:\\My Apps\\Loaderly.exe"', args: [] });
    await backend.set(false);
    expect(native.setLoginItemSettings).toHaveBeenCalledWith({ path: 'C:\\My Apps\\Loaderly.exe', args: [], name: 'Loaderly', openAtLogin: false });
    native.getLoginItemSettings.mockReturnValue({ openAtLogin: false, launchItems: [{ name: 'Loaderly', enabled: false, scope: 'user', args: [], path: 'C:\\My Apps\\Loaderly.exe' }] });
    expect(await backend.read()).toMatchObject({ enabled: false, canChange: false, reason: 'disabled-by-user' });
  });
  it('keeps macOS approval pending and allows cancellation', async () => {
    const native = { getLoginItemSettings: vi.fn(() => ({ openAtLogin: true, status: 'requires-approval' })), setLoginItemSettings: vi.fn() };
    const backend = desktopStartup(native as unknown as Electron.App, 'darwin', '/Applications/Loaderly.app', async () => {});
    expect(await backend.read()).toMatchObject({ enabled: false, registered: true, canChange: true, reason: 'approval' });
    await backend.set(false); expect(native.setLoginItemSettings).toHaveBeenCalledWith({ openAtLogin: false });
  });
  it.each(['DisabledByUser', 'DisabledByPolicy', 'EnabledByPolicy'])('respects Store system control %s', value => {
    expect(startupTaskState(value)).toMatchObject({ enabled: value === 'EnabledByPolicy', canChange: false });
  });
  it.each(['Enabled', 'Disabled'])('allows Store in-app switching for %s', value => {
    expect(startupTaskState(value)).toMatchObject({ enabled: value === 'Enabled', canChange: true });
  });
  it('rejects unexpected native responses', () => { expect(() => startupTaskState('Failed')).toThrow(); });
  it.each([null, true, { action: 'set', enabled: 'true' }, { action: 'execute', enabled: true }])('rejects invalid IPC payloads', value => {
    expect(() => validateStartupRequest(value)).toThrow('INVALID_STARTUP_REQUEST');
  });
});
