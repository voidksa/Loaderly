import { describe, expect, it, vi } from 'vitest';
import { hasLinuxTrayHost } from './linuxTray';

const properties = (host: boolean, items = ['org.kde.StatusNotifierItem-123-1/StatusNotifierItem']) => `
  array [
    dict entry (
      string "IsStatusNotifierHostRegistered"
      variant boolean ${host}
    )
    dict entry (
      string "RegisteredStatusNotifierItems"
      variant array [ ${items.map(item => `string "${item}"`).join('\n')} ]
    )
  ]`;

describe('Linux close-to-tray availability', () => {
  it('accepts a live host only when this process has registered an item', async () => {
    const call = vi.fn().mockResolvedValueOnce(properties(true)).mockResolvedValueOnce('uint32 123');
    expect(await hasLinuxTrayHost(123, call)).toBe(true);
    expect(call.mock.calls[1][3]).toEqual(['string:org.kde.StatusNotifierItem-123-1']);
  });
  it('supports unique D-Bus names used by indicator implementations', async () => {
    const call = vi.fn().mockResolvedValueOnce(properties(true, [':1.42/StatusNotifierItem']))
      .mockResolvedValueOnce('method return\n uint32 123');
    expect(await hasLinuxTrayHost(123, call)).toBe(true);
  });
  it('does not confuse another application icon with our own', async () => {
    const call = vi.fn().mockResolvedValueOnce(properties(true)).mockResolvedValueOnce('uint32 456');
    expect(await hasLinuxTrayHost(123, call)).toBe(false);
  });
  it('rejects a watcher without a visible host or a registered item', async () => {
    expect(await hasLinuxTrayHost(123, vi.fn().mockResolvedValue(properties(false)))).toBe(false);
    expect(await hasLinuxTrayHost(123, vi.fn().mockResolvedValue(properties(true, [])))).toBe(false);
  });
  it('fails safely for missing tools, timeouts, malformed replies and vanished item owners', async () => {
    expect(await hasLinuxTrayHost(123, vi.fn().mockRejectedValue(new Error('ENOENT')))).toBe(false);
    expect(await hasLinuxTrayHost(123, vi.fn().mockResolvedValue('unrecognized reply'))).toBe(false);
    const call = vi.fn().mockResolvedValueOnce(properties(true)).mockRejectedValueOnce(new Error('No owner'));
    expect(await hasLinuxTrayHost(123, call)).toBe(false);
  });
});
