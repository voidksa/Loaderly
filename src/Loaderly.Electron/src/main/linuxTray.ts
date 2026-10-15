import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
type Point = {x: number; y: number};
type Bounds = Point & {width: number; height: number};

export function linuxTrayUsesNativeMenu(environment = process.env): boolean {
  return environment.XDG_SESSION_TYPE === 'wayland' || !!environment.WAYLAND_DISPLAY;
}

export function linuxTrayAnchor(bounds: Bounds|undefined, position: Point|undefined, cursor: Point|undefined): Bounds|undefined {
  if (bounds && bounds.width > 0 && bounds.height > 0 && [bounds.x,bounds.y,bounds.width,bounds.height].every(Number.isFinite)) return bounds;
  // StatusNotifierItem has no getBounds implementation. Use the activation
  // point, or a freshly queried X11 cursor in DIP when activation is (0, 0).
  // Do not substitute Electron's potentially stale last-known cursor here.
  const point = position && Number.isFinite(position.x) && Number.isFinite(position.y) && (position.x !== 0 || position.y !== 0) ? position : cursor;
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
  return {...point, width: 1, height: 1};
}
type BusCall = (destination: string, path: string, method: string, args: string[]) => Promise<string>;

const callSessionBus: BusCall = async (destination, path, method, args) => {
  const { stdout } = await execFileAsync('dbus-send', [
    '--session', '--print-reply', '--reply-timeout=800', `--dest=${destination}`, path, method, ...args
  ], { timeout: 1000, maxBuffer: 64 * 1024, encoding: 'utf8' });
  return stdout;
};

// Creating a Tray does not prove the desktop displays it. Require a live host
// AND a registered item owned by this process before allowing a hidden window.
// Missing D-Bus tools, legacy-only trays and unresponsive hosts fail closed.
export async function hasLinuxTrayHost(pid = process.pid, call: BusCall = callSessionBus): Promise<boolean> {
  try {
    const properties = await call('org.kde.StatusNotifierWatcher', '/StatusNotifierWatcher',
      'org.freedesktop.DBus.Properties.GetAll', ['string:org.kde.StatusNotifierWatcher']);
    if (!/string "IsStatusNotifierHostRegistered"\s+variant\s+boolean true\b/.test(properties)) return false;
    const items = properties.match(/string "RegisteredStatusNotifierItems"\s+variant\s+array\s*\[([^\]]*)\]/)?.[1] ?? '';
    const services = [...new Set([...items.matchAll(/string "([:\w.-]+)(?:\/[^"\s]*)?"/g)].map(match => match[1]))];
    const owners = await Promise.all(services.slice(0, 32).map(async service => {
      try {
        const reply = await call('org.freedesktop.DBus', '/org/freedesktop/DBus',
          'org.freedesktop.DBus.GetConnectionUnixProcessID', [`string:${service}`]);
        return Number(reply.match(/\buint32 (\d+)\b/)?.[1]) === pid;
      } catch { return false; }
    }));
    return owners.some(Boolean);
  } catch { return false; }
}
