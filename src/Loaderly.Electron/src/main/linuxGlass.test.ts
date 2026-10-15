import {EventEmitter} from 'node:events';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {createLinuxGlass} from './linuxGlass';

afterEach(()=>vi.useRealTimers());
function setup(platform: NodeJS.Platform='linux',wayland=false) {
  let owner=99;
  const atoms=new Map<string,number>();
  const client=Object.assign(new EventEmitter(),{
    screenNum:1,
    InternAtom:vi.fn((_only:boolean,name:string,reply:Function)=>{atoms.set(name,atoms.size+100);reply(null,atoms.get(name));}),
    GetSelectionOwner:vi.fn((_atom:number,reply:Function)=>reply(null,owner)),
    QueryPointer:vi.fn((_root:number,reply:Function)=>reply(null,{rootX:1696,rootY:1060,sameScreen:1})),
    ChangeProperty:vi.fn(),DeleteProperty:vi.fn(),terminate:vi.fn()
  });
  const load=vi.fn(()=>({createClient:vi.fn((_options:unknown,reply:Function)=>{queueMicrotask(()=>reply(null,{client,screen:[{root:20},{root:21}]}));return client;})}));
  const controller=createLinuxGlass({platform,display:':92.1',wayland},load);
  const win={isDestroyed:()=>false,getNativeWindowHandle:()=>Buffer.from([42,0,0,0,0,0,0,0])};
  return {controller,client,load,atoms,win,setOwner:(next:number)=>{owner=next;}};
}
describe('Linux desktop glass',()=>{
  it.each(['win32','darwin'] as const)('never loads X11 or changes window creation on %s',async platform=>{
    const {controller,load,client}=setup(platform);
    await controller.initialize();
    expect(load).not.toHaveBeenCalled();
    expect(controller.windowOptions()).toEqual({});
    expect(controller.isSupported()).toBe(false);
    expect(await controller.cursorPoint()).toBeUndefined();
    expect(client.QueryPointer).not.toHaveBeenCalled();
    controller.dispose();
  });
  it('keeps native Wayland opaque without opening an Xwayland connection',async()=>{
    const {controller,load}=setup('linux',true);
    await controller.initialize();expect(load).not.toHaveBeenCalled();expect(controller.windowOptions()).toEqual({});
    expect(await controller.cursorPoint()).toBeUndefined();
  });
  it('reads fresh root coordinates on every activation even without a compositor',async()=>{
    const {controller,client,setOwner}=setup();setOwner(0);await controller.initialize();
    expect(controller.isSupported()).toBe(false);
    expect(await controller.cursorPoint()).toEqual({x:1696,y:1060});
    client.QueryPointer.mockImplementation((_root,reply)=>reply(null,{rootX:-1200,rootY:20,sameScreen:1}));
    expect(await controller.cursorPoint()).toEqual({x:-1200,y:20});
    expect(client.QueryPointer).toHaveBeenNthCalledWith(1,21,expect.any(Function));
    expect(client.QueryPointer).toHaveBeenCalledTimes(2);
    controller.dispose();expect(await controller.cursorPoint()).toBeUndefined();
  });
  it('does not return an invalid position when X11 is disconnected or unresponsive',async()=>{
    const {controller,client}=setup();await controller.initialize();
    client.QueryPointer.mockImplementation((_root,reply)=>reply(new Error('Disconnected')));
    expect(await controller.cursorPoint()).toBeUndefined();
    client.QueryPointer.mockImplementation((_root,reply)=>reply(null,{rootX:0,rootY:0,sameScreen:0}));
    expect(await controller.cursorPoint()).toBeUndefined();
    client.QueryPointer.mockImplementation((_root,reply)=>reply(null,{rootX:NaN,rootY:0,sameScreen:1}));
    expect(await controller.cursorPoint()).toBeUndefined();
    vi.useFakeTimers();client.QueryPointer.mockImplementation(()=>{});
    const result=controller.cursorPoint();await vi.advanceTimersByTimeAsync(201);
    expect(await result).toBeUndefined();controller.dispose();
  });
  it('requires an active compositor on the selected X11 screen and reacts to loss/recovery',async()=>{
    const {controller,client,atoms,setOwner}=setup();
    const changed=vi.fn();controller.onChange(changed);
    setOwner(0);await controller.initialize();
    expect(controller.windowOptions()).toEqual({transparent:true});
    expect(controller.isSupported()).toBe(false);
    expect(atoms.has('_NET_WM_CM_S1')).toBe(true);
    setOwner(99);await controller.refresh();expect(controller.isSupported()).toBe(true);
    setOwner(0);await controller.refresh();expect(controller.isSupported()).toBe(false);
    expect(changed).toHaveBeenCalledTimes(2);
    controller.dispose();expect(client.terminate).toHaveBeenCalledOnce();
  });
  it('requests full-window blur only on its own window and removes both hints when disabled',async()=>{
    const {controller,client,atoms,win}=setup();await controller.initialize();
    controller.apply(win,true);
    expect(client.ChangeProperty).toHaveBeenCalledWith(0,42,atoms.get('_KDE_NET_WM_BLUR_BEHIND_REGION'),6,32,Buffer.alloc(0));
    expect(client.ChangeProperty).toHaveBeenCalledWith(0,42,atoms.get('_NET_WM_BYPASS_COMPOSITOR'),6,32,Buffer.from([2,0,0,0]));
    controller.apply(win,false);
    expect(client.DeleteProperty).toHaveBeenCalledWith(42,atoms.get('_KDE_NET_WM_BLUR_BEHIND_REGION'));
    expect(client.DeleteProperty).toHaveBeenCalledWith(42,atoms.get('_NET_WM_BYPASS_COMPOSITOR'));
    controller.dispose();
  });
  it('does not apply blur after a window has closed and fails opaque on connection error',async()=>{
    const {controller,client,win}=setup();await controller.initialize();
    controller.apply({...win,isDestroyed:()=>true},true);expect(client.ChangeProperty).not.toHaveBeenCalled();
    client.emit('error',new Error('Display unavailable'));expect(controller.isSupported()).toBe(false);
    controller.dispose();
  });
  it('handles missing X11 dependencies and unresponsive display servers without blocking startup',async()=>{
    const missing=createLinuxGlass({platform:'linux',display:':92',wayland:false},()=>{throw Error('Unavailable');});
    await missing.initialize();expect(missing.isSupported()).toBe(false);
    vi.useFakeTimers();
    const stalledClient=Object.assign(new EventEmitter(),{terminate:vi.fn()});
    const stalled=createLinuxGlass({platform:'linux',display:':92',wayland:false},()=>({createClient:()=>stalledClient} as never));
    const started=stalled.initialize();await vi.advanceTimersByTimeAsync(1201);await started;
    expect(stalled.isSupported()).toBe(false);expect(stalledClient.terminate).toHaveBeenCalledOnce();stalled.dispose();
  });
});
