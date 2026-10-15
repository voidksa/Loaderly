import { app, shell } from 'electron';
import { join, posix } from 'node:path';
import { release } from 'node:os';
import { StartupManager, desktopStartup, linuxStartup, unavailableStartup, type StartupBackend } from './startup';
import { windowsStartupTask } from './windowsStartupTask';

export function createStartupManager(): StartupManager {
  let backend: StartupBackend;
  if (!app.isPackaged || app.commandLine.hasSwitch('user-data-dir') || process.env.LOADERLY_EXPORT_VALIDATION_PAYLOAD || process.env.LOADERLY_EXPORT_VALIDATION_PAYLOAD_PATH) {
    backend = unavailableStartup('development');
  } else if (process.platform === 'win32') {
    const openSettings = () => shell.openExternal('ms-settings:startupapps');
    backend = process.windowsStore ? windowsStartupTask(openSettings) : desktopStartup(app, 'win32', process.execPath, openSettings);
  } else if (process.platform === 'darwin') {
    backend = /\/AppTranslocation\/|^\/Volumes\//.test(process.execPath)
      ? unavailableStartup('temporary')
      : desktopStartup(app, 'darwin', process.execPath, () => shell.openExternal(Number.parseInt(release()) >= 22 ? 'x-apple.systempreferences:com.apple.LoginItems-Settings.extension' : 'x-apple.systempreferences:com.apple.preferences.users'));
  } else if (process.platform === 'linux') {
    // AppImage's mounted executable disappears after exit. Register the persistent
    // AppImage instead; installed deb/tar builds use their actual executable.
    const executable = process.env.APPIMAGE || process.execPath;
    const config = process.env.XDG_CONFIG_HOME;
    backend = /\/\.mount_[^/]+\//.test(executable) || /[\r\n\0=]/.test(executable) || !posix.isAbsolute(executable)
      ? unavailableStartup('temporary')
      : linuxStartup(config && posix.isAbsolute(config) ? config : join(app.getPath('home'), '.config'), executable);
  } else backend = unavailableStartup('unavailable');
  return new StartupManager(backend, join(app.getPath('userData'), 'startup-initialized.json'));
}
