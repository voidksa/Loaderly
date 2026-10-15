import { describe, expect, it, vi } from 'vitest';
import { hasLinuxTrayHost, linuxTrayAnchor, linuxTrayUsesNativeMenu } from './linuxTray';

describe('Linux tray activation',()=>{
 it('places a popup by the cursor when StatusNotifierItem reports zero bounds',()=>{
  expect(linuxTrayAnchor({x:0,y:0,width:0,height:0},{x:0,y:0},{x:1810,y:1060})).toEqual({x:1810,y:1060,width:1,height:1});
 });
 it('honors activation coordinates and negative monitor coordinates',()=>{
  expect(linuxTrayAnchor(undefined,{x:-1200,y:1020},{x:20,y:20})).toEqual({x:-1200,y:1020,width:1,height:1});
 });
 it('uses reported icon bounds when the host provides them',()=>{
  const bounds={x:900,y:1050,width:24,height:24};
  expect(linuxTrayAnchor(bounds,{x:200,y:200},{x:20,y:20})).toEqual(bounds);
 });
 it('avoids inventing a position when X11 cannot supply a current cursor',()=>{
  expect(linuxTrayAnchor({x:0,y:0,width:0,height:0},{x:0,y:0},undefined)).toBeUndefined();
  expect(linuxTrayAnchor(undefined,{x:NaN,y:0},{x:0,y:NaN})).toBeUndefined();
  expect(linuxTrayAnchor(undefined,{x:0,y:0},{x:0,y:0})).toEqual({x:0,y:0,width:1,height:1});
 });
 it('keeps native menus on Wayland where popup positioning is unavailable',()=>{
  expect(linuxTrayUsesNativeMenu({XDG_SESSION_TYPE:'wayland'})).toBe(true);
  expect(linuxTrayUsesNativeMenu({XDG_SESSION_TYPE:'x11'})).toBe(false);
 });
});

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
