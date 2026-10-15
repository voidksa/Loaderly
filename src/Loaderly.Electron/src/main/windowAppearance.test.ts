import {describe,it,expect,vi} from 'vitest';
import {supportsDesktopGlass,applyWindowAppearance,retainInactiveWindowGlass} from './windowAppearance';
import {defaultAppearance,appearanceVariables} from '../shared/app-preferences/appearance';
import {macLiquidGlass} from './macLiquidGlass';
import {linuxGlass} from './linuxGlass';

it('toggles Linux alpha without touching Windows or macOS materials',()=>{
 const support=vi.spyOn(linuxGlass,'isSupported').mockReturnValue(true);
 const linuxApply=vi.spyOn(linuxGlass,'apply').mockImplementation(()=>{});
 const macApply=vi.spyOn(macLiquidGlass,'apply');
 try {
  const win={setVibrancy:vi.fn(),setBackgroundMaterial:vi.fn(),setBackgroundColor:vi.fn()};
  const environment={platform:'linux' as const,release:'6.14',reduceTransparency:false};
  expect(supportsDesktopGlass('linux','6.14')).toBe(true);
  expect(applyWindowAppearance(win,{...defaultAppearance,glass:true},true,environment)).toBe(true);
  expect(win.setBackgroundColor).toHaveBeenLastCalledWith('#00000000');
  expect(linuxApply).toHaveBeenLastCalledWith(win,true);
  support.mockReturnValue(false);
  expect(applyWindowAppearance(win,{...defaultAppearance,glass:true},true,environment)).toBe(false);
  expect(win.setBackgroundColor).toHaveBeenLastCalledWith(appearanceVariables(defaultAppearance,true)['--background']);
  expect(linuxApply).toHaveBeenLastCalledWith(win,false);
  expect(win.setVibrancy).not.toHaveBeenCalled();expect(win.setBackgroundMaterial).not.toHaveBeenCalled();expect(macApply).not.toHaveBeenCalled();
 } finally {support.mockRestore();linuxApply.mockRestore();macApply.mockRestore();}
});
describe('desktop glass compatibility',()=>{
 it('keeps native resizing and falls back on unsupported systems',()=>{
  expect(supportsDesktopGlass('darwin','')).toBe(true);
  expect(supportsDesktopGlass('win32','10.0.22631')).toBe(true);
  expect(supportsDesktopGlass('win32','10.0.22621')).toBe(true);
  expect(supportsDesktopGlass('win32','10.0.22000')).toBe(false);
  expect(supportsDesktopGlass('win32','unknown')).toBe(false);
  expect(supportsDesktopGlass('linux','6.14.0')).toBe(false);
 });
});
it('uses Liquid Glass only on macOS and covers it when transparency is disabled',()=>{
 const native=vi.spyOn(macLiquidGlass,'apply').mockReturnValue(true);
 try {
  const win={setVibrancy:vi.fn(),setBackgroundMaterial:vi.fn(),setBackgroundColor:vi.fn()};
  const env={platform:'darwin' as const,release:'25.0.0',reduceTransparency:false};
  expect(applyWindowAppearance(win,{...defaultAppearance,glass:true},true,env)).toBe(true);
  expect(native).toHaveBeenLastCalledWith(win,true);
  expect(win.setVibrancy).not.toHaveBeenCalled();
  expect(win.setBackgroundColor).toHaveBeenLastCalledWith('#00000000');
  for(const appearance of [{...defaultAppearance,glass:false},{...defaultAppearance,glass:true}]){
   expect(applyWindowAppearance(win,appearance,true,{...env,reduceTransparency:true})).toBe(false);
   expect(native).toHaveBeenLastCalledWith(win,false);
   expect(win.setBackgroundColor).toHaveBeenLastCalledWith(appearanceVariables(appearance,true)['--background']);
  }
  native.mockClear();
  for(const platform of ['win32','linux'] as const)applyWindowAppearance(win,{...defaultAppearance,glass:true},true,{...env,platform,release:'10.0.22631'});
  expect(native).not.toHaveBeenCalled();
 } finally {native.mockRestore();}
});
it.each(['win32','darwin','linux'] as const)('applies and resets the correct native backdrop on %s',platform=>{
 const win={setVibrancy:vi.fn(),setBackgroundMaterial:vi.fn(),setBackgroundColor:vi.fn()};
 const environment={platform,release:'10.0.22631',reduceTransparency:false};
 expect(applyWindowAppearance(win,{...defaultAppearance,glass:true},true,environment)).toBe(platform!=='linux');
 if(platform==='darwin')expect(win.setVibrancy).toHaveBeenLastCalledWith('under-window');
 if(platform==='win32')expect(win.setBackgroundMaterial).toHaveBeenLastCalledWith('acrylic');
 if(platform==='linux'){expect(win.setVibrancy).not.toHaveBeenCalled();expect(win.setBackgroundMaterial).not.toHaveBeenCalled();}
 expect(applyWindowAppearance(win,{...defaultAppearance,glass:true},false,{...environment,reduceTransparency:true})).toBe(false);
 expect(win.setBackgroundColor).toHaveBeenLastCalledWith(appearanceVariables(defaultAppearance,false)['--background']);
});
it('restores an opaque background after a native compositor failure',()=>{
 const win={setVibrancy:vi.fn(),setBackgroundMaterial:vi.fn().mockImplementationOnce(()=>{throw Error('Unavailable');}),setBackgroundColor:vi.fn()};
 expect(applyWindowAppearance(win,{...defaultAppearance,glass:true},true,{platform:'win32',release:'10.0.22631',reduceTransparency:false})).toBe(false);
 expect(win.setBackgroundMaterial).toHaveBeenLastCalledWith('none');
 expect(win.setBackgroundColor).toHaveBeenLastCalledWith(appearanceVariables(defaultAppearance,true)['--background']);
});
it('does not rebuild the native material when the same window regains focus',()=>{
 const win={setVibrancy:vi.fn(),setBackgroundMaterial:vi.fn(),setBackgroundColor:vi.fn()};
 const environment={platform:'win32' as const,release:'10.0.22631',reduceTransparency:false};
 const appearance={...defaultAppearance,glass:true};
 for(let focus=0;focus<5;focus++)expect(applyWindowAppearance(win,appearance,true,environment)).toBe(true);
 expect(win.setBackgroundMaterial).toHaveBeenCalledTimes(1);
 expect(win.setBackgroundColor).toHaveBeenCalledTimes(1);
 expect(applyWindowAppearance(win,appearance,true,{...environment,reduceTransparency:true})).toBe(false);
 expect(win.setBackgroundMaterial).toHaveBeenLastCalledWith('none');
 expect(applyWindowAppearance(win,appearance,true,environment)).toBe(true);
 expect(win.setBackgroundMaterial).toHaveBeenLastCalledWith('acrylic');
 expect(win.setBackgroundMaterial).toHaveBeenCalledTimes(3);
});
it('retries a failed compositor update when the window regains focus',()=>{
 const win={setVibrancy:vi.fn(),setBackgroundMaterial:vi.fn().mockImplementationOnce(()=>{throw Error('Unavailable');}),setBackgroundColor:vi.fn()};
 const environment={platform:'win32' as const,release:'10.0.22631',reduceTransparency:false};
 const appearance={...defaultAppearance,glass:true};
 expect(applyWindowAppearance(win,appearance,true,environment)).toBe(false);
 expect(applyWindowAppearance(win,appearance,true,environment)).toBe(true);
 expect(win.setBackgroundMaterial).toHaveBeenLastCalledWith('acrylic');
 expect(win.setBackgroundColor).toHaveBeenLastCalledWith('#00000000');
});

describe('inactive glass appearance',()=>{
 const setup=()=>({setVibrancy:vi.fn(),setBackgroundMaterial:vi.fn(),setBackgroundColor:vi.fn(),isDestroyed:vi.fn(()=>false),isVisible:vi.fn(()=>true),isFocused:vi.fn(()=>false),isMinimized:vi.fn(()=>false)});
 const environment={platform:'win32' as NodeJS.Platform,release:'10.0.22631',reduceTransparency:false};
 const appearance={...defaultAppearance,glass:true};
 it('refreshes native appearance after deactivation while normal updates remain cached',()=>{
  const win=setup();
  applyWindowAppearance(win,appearance,true,environment);
  applyWindowAppearance(win,appearance,true,environment);
  expect(win.setBackgroundMaterial).toHaveBeenCalledTimes(1);
  expect(retainInactiveWindowGlass(win,appearance,true,environment)).toBe(true);
  expect(win.setBackgroundMaterial).toHaveBeenCalledTimes(2);
  expect(win.setBackgroundMaterial).toHaveBeenLastCalledWith('acrylic');
 });
 it.each(['isDestroyed','isFocused','isMinimized','isVisible'] as const)('ignores a stale deactivation when %s changes',property=>{
  const win=setup();win[property].mockReturnValue(property!=='isVisible');
  expect(retainInactiveWindowGlass(win,appearance,true,environment)).toBeUndefined();
  expect(win.setBackgroundMaterial).not.toHaveBeenCalled();
 });
 it.each([{...environment,reduceTransparency:true},{...environment,platform:'linux' as const},{...environment,platform:'darwin' as const},{...environment,release:'10.0.22000'}])('respects platform and system fallback %j',env=>{
  const win=setup();expect(retainInactiveWindowGlass(win,appearance,true,env)).toBeUndefined();
  expect(win.setBackgroundMaterial).not.toHaveBeenCalled();
 });
 it('does not restore glass after the user has disabled it',()=>{
  const win=setup();expect(retainInactiveWindowGlass(win,{...appearance,glass:false},true,environment)).toBeUndefined();
  expect(win.setBackgroundMaterial).not.toHaveBeenCalled();
 });
 it('reports an attempted native failure and allows the next focus update to recover',()=>{
  const win=setup();applyWindowAppearance(win,appearance,true,environment);
  win.setBackgroundMaterial.mockImplementationOnce(()=>{throw Error('Unavailable');});
  expect(retainInactiveWindowGlass(win,appearance,true,environment)).toBe(false);
  expect(win.setBackgroundColor).toHaveBeenLastCalledWith(appearanceVariables(appearance,true)['--background']);
  expect(applyWindowAppearance(win,appearance,true,environment)).toBe(true);
  expect(win.setBackgroundColor).toHaveBeenLastCalledWith('#00000000');
 });
});
