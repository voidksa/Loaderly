import {EventEmitter} from 'node:events';
import {describe,expect,it,vi} from 'vitest';
import {createMacLiquidGlass,supportsMacLiquidGlass} from './macLiquidGlass';

const environment={platform:'darwin' as const,systemVersion:'26.0.1',arch:'arm64'};
function setup(load=vi.fn(()=>({addView:vi.fn(()=>0)}))) {
 const controller=createMacLiquidGlass(environment,load);
 const native=load();load.mockClear();
 const win=Object.assign(new EventEmitter(),{
  webContents:Object.assign(new EventEmitter(),{isDestroyed:()=>false}),
  isDestroyed:vi.fn(()=>false),getNativeWindowHandle:vi.fn(()=>Buffer.alloc(8)),
  setVibrancy:vi.fn(),setWindowButtonVisibility:vi.fn()
 });
 const window=win as unknown as Parameters<typeof controller.register>[0];
 const refresh=vi.fn();
 controller.register(window,refresh,{cornerRadius:12,windowButtons:true});
 return {controller,native,win,window,refresh,load};
}

describe('macOS Liquid Glass',()=>{
 it.each([
  {platform:'win32',systemVersion:'26.0',arch:'x64'},
  {platform:'linux',systemVersion:'26.0',arch:'x64'},
  {platform:'darwin',systemVersion:'15.7',arch:'arm64'},
  {platform:'darwin',systemVersion:'',arch:'arm64'},
  {platform:'darwin',systemVersion:'26.0',arch:'ia32'}
 ] as const)('does not load a native addon on %j',env=>{
  const load=vi.fn();const controller=createMacLiquidGlass(env,load);
  expect(supportsMacLiquidGlass(env)).toBe(false);
  expect(controller.windowOptions()).toEqual({});
  expect(load).not.toHaveBeenCalled();
 });
 it.each(['arm64','x64'])('supports macOS 26 and newer on %s',arch=>{
  expect(supportsMacLiquidGlass({...environment,arch})).toBe(true);
  expect(supportsMacLiquidGlass({...environment,arch,systemVersion:'27.0'})).toBe(true);
 });
 it('keeps legacy window construction if the optional addon is missing or invalid',()=>{
  for(const load of [()=>{throw Error('MODULE_NOT_FOUND');},()=>({})]){
   const controller=createMacLiquidGlass(environment,load as never);
   expect(controller.windowOptions()).toEqual({});
   expect(controller.windowOptions()).toEqual({});
  }
 });
 it('waits for content load, clears vibrancy, and creates only one native view',()=>{
  const native={addView:vi.fn(()=>0)};
  const {controller,win,window,refresh,load}=setup(vi.fn(()=>native));
  expect(controller.windowOptions()).toEqual({transparent:true});
  expect(load).toHaveBeenCalledTimes(1);
  expect(controller.apply(window,true)).toBe(false);
  expect(native.addView).not.toHaveBeenCalled();
  win.webContents.emit('did-finish-load');
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(win.setWindowButtonVisibility).toHaveBeenCalledWith(true);
  for(let i=0;i<10;i++)expect(controller.apply(window,true)).toBe(true);
  expect(native.addView).toHaveBeenCalledExactlyOnceWith(win.getNativeWindowHandle(),{cornerRadius:12,opaque:false});
  expect(win.setVibrancy.mock.invocationCallOrder[0]).toBeLessThan(native.addView.mock.invocationCallOrder[0]);
  expect(controller.apply(window,false)).toBe(true);
  win.webContents.emit('did-finish-load');
  expect(controller.apply(window,true)).toBe(true);
  expect(native.addView).toHaveBeenCalledTimes(1);
 });
 it('does not attach glass while transparency is disabled',()=>{
  const native={addView:vi.fn(()=>0)};
  const {controller,win,window}=setup(vi.fn(()=>native));
  win.webContents.emit('did-finish-load');
  expect(controller.apply(window,false)).toBe(true);
  expect(native.addView).not.toHaveBeenCalled();
 });
 it.each(['throw',-1,undefined,NaN])('returns control to legacy vibrancy after native failure %s',result=>{
  const native={addView:vi.fn(()=>{if(result==='throw')throw Error('Native failure');return result as number;})};
  const {controller,win,window}=setup(vi.fn(()=>native));
  win.webContents.emit('did-finish-load');
  expect(controller.apply(window,true)).toBe(false);
  expect(controller.apply(window,true)).toBe(false);
  expect(native.addView).toHaveBeenCalledTimes(1);
 });
 it('never accesses a destroyed window and clears its registration',()=>{
  const native={addView:vi.fn(()=>0)};
  const {controller,win,window,refresh}=setup(vi.fn(()=>native));
  win.isDestroyed.mockReturnValue(true);
  win.webContents.emit('did-finish-load');
  expect(refresh).not.toHaveBeenCalled();
  expect(controller.apply(window,true)).toBe(false);
  win.emit('closed');
  expect(win.webContents.listenerCount('did-finish-load')).toBe(0);
  expect(native.addView).not.toHaveBeenCalled();
 });
});
