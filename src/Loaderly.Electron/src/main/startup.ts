import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, posix } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { StartupReason, StartupState } from '../shared/startup';

export interface StartupBackend {
  read(): Promise<StartupState>;
  set(enabled: boolean): Promise<void>;
  openSettings?(): Promise<void>;
  // Store packages declare their initial state in the manifest. Never override it on launch.
  systemDefault?: boolean;
}

export class StartupManager {
  private pending: Promise<unknown> = Promise.resolve();
  constructor(private backend: StartupBackend, private marker: string) {}
  private serial<T>(work: () => Promise<T>): Promise<T> {
    const next = this.pending.then(work);
    this.pending = next.catch(() => {});
    return next;
  }
  initialize(): Promise<void> {
    return this.serial(async () => {
      const state = await this.backend.read();
      if (!state.canChange || this.backend.systemDefault) return;
      await mkdir(dirname(this.marker), { recursive: true });
      try {
        // Record the one-time default BEFORE registering. Later OS changes, failures and
        // approval requests must not trigger automatic re-enabling on another launch.
        await writeFile(this.marker, JSON.stringify({ initialized: true }), { flag: 'wx', mode: 0o600 });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EEXIST') return;
        throw error;
      }
      if (!state.registered && !state.reason) await this.backend.set(true);
    });
  }
  get(): Promise<StartupState> { return this.serial(() => this.backend.read()); }
  set(enabled: boolean): Promise<StartupState> {
    return this.serial(async () => {
      const before = await this.backend.read();
      if (!before.canChange) return before;
      await mkdir(dirname(this.marker), { recursive: true });
      await writeFile(this.marker, JSON.stringify({ initialized: true }), { mode: 0o600 });
      await this.backend.set(enabled);
      const after = await this.backend.read();
      if (after.enabled !== enabled && !after.reason) throw Error('STARTUP_CHANGE_NOT_APPLIED');
      return after;
    });
  }
  async openSettings(): Promise<void> {
    if (!this.backend.openSettings) throw Error('STARTUP_SETTINGS_UNAVAILABLE');
    await this.backend.openSettings();
  }
}

export function unavailableStartup(reason: StartupReason): StartupBackend {
  return {
    read: async () => ({ enabled: false, registered: false, canChange: false, settingsAvailable: false, reason }),
    set: async () => { throw Error('STARTUP_UNAVAILABLE'); }
  };
}

// Desktop Entry escaping has two layers: string escapes, then Exec quoting.
// The path is always one argument; no shell is involved.
export function desktopExec(executable: string): string {
  if (!posix.isAbsolute(executable) || /[\r\n\0=]/.test(executable)) throw Error('INVALID_STARTUP_PATH');
  return '"' + executable.replace(/%/g, '%%').replace(/[\\"`$]/g, '\\$&').replace(/\\/g, '\\\\') + '"';
}

export function linuxStartup(configDirectory: string, executable: string): StartupBackend {
  const file = join(configDirectory, 'autostart', 'com.loaderly.app.desktop');
  // GLib probes the first token before expanding %% field codes. A fixed env
  // launcher keeps executable names containing '%' valid, without using a shell.
  const exec = `/usr/bin/env -- ${desktopExec(executable)}`;
  return {
    async read() {
      let content: string;
      try { content = await readFile(file, 'utf8'); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        return { enabled: false, registered: false, canChange: true, settingsAvailable: false };
      }
      const section = content.split(/^\[Desktop Entry\]\s*$/m)[1]?.split(/^\[/m)[0] ?? '';
      const keys = new Map(section.split(/\r?\n/).filter(line => !line.trimStart().startsWith('#')).map(line => {
        const at = line.indexOf('='); return [line.slice(0, at).trim(), line.slice(at + 1).trim()];
      }));
      const enabled = keys.get('Hidden') !== 'true' && keys.get('X-GNOME-Autostart-enabled') !== 'false'
        && keys.get('Type') === 'Application' && keys.get('Exec') === exec;
      return { enabled, registered: true, canChange: true, settingsAvailable: false };
    },
    async set(enabled) {
      // A Hidden entry also overrides an identically named system-wide entry.
      const content = `[Desktop Entry]\nType=Application\nVersion=1.0\nName=Loaderly\nComment=Open Loaderly when you sign in\nExec=${exec}\nTerminal=false\nStartupNotify=false\nHidden=${!enabled}\nX-GNOME-Autostart-enabled=${enabled}\n`;
      await mkdir(dirname(file), { recursive: true });
      const temporary = `${file}.${randomUUID()}.tmp`;
      try {
        await writeFile(temporary, content, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
        await rename(temporary, file);
      } finally { await unlink(temporary).catch(() => {}); }
    }
  };
}

type LoginApp = Pick<Electron.App, 'getLoginItemSettings' | 'setLoginItemSettings'>;
export function desktopStartup(app: LoginApp, platform: 'win32' | 'darwin', executable: string, openSettings: () => Promise<void>): StartupBackend {
  const options = platform === 'win32' ? { path: executable, args: [] as string[] } : {};
  return {
    async read() {
      // Electron 42 parses this lookup as a command line. Quoting preserves paths
      // containing spaces; setLoginItemSettings still receives the unquoted path.
      const item = app.getLoginItemSettings(platform === 'win32' ? { ...options, path: `"${executable}"` } : options);
      if (platform === 'darwin') return {
        enabled: item.openAtLogin && item.status !== 'requires-approval',
        registered: item.openAtLogin || item.status === 'requires-approval',
        canChange: true, settingsAvailable: true,
        ...(item.status === 'requires-approval' ? { reason: 'approval' as const } : {})
      };
      const ours = item.launchItems?.filter(entry => entry.name === 'Loaderly' && entry.scope === 'user') ?? [];
      const disabled = ours.some(entry => !entry.enabled);
      return {
        enabled: ours.some(entry => entry.enabled),
        registered: ours.length > 0,
        canChange: !disabled, settingsAvailable: true,
        ...(disabled ? { reason: 'disabled-by-user' as const } : {})
      };
    },
    async set(enabled) { app.setLoginItemSettings({ ...options, openAtLogin: enabled, ...(platform === 'win32' ? { name: 'Loaderly' } : {}) }); },
    openSettings
  };
}
