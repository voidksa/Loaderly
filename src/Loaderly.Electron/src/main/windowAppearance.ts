import type {BrowserWindow} from 'electron';
import {release} from 'node:os';
import {appearanceVariables,type Appearance} from '../shared/app-preferences/appearance';
import {macLiquidGlass} from './macLiquidGlass';

type AppearanceWindow = Pick<BrowserWindow,'setVibrancy'|'setBackgroundMaterial'|'setBackgroundColor'>;
const appliedAppearance = new WeakMap<AppearanceWindow,string>();

export function supportsDesktopGlass(platform:NodeJS.Platform, osRelease:string):boolean {
 return platform==='darwin'||(platform==='win32'&&Number(osRelease.split('.')[2])>=22621);
}
export function applyWindowAppearance(win:AppearanceWindow,value:Appearance,dark:boolean,environment={platform:process.platform,release:release(),reduceTransparency:false},refreshMaterial=false):boolean {
 const supported=supportsDesktopGlass(environment.platform,environment.release);
 const glass=!!value.glass&&supported&&!environment.reduceTransparency;
 const opaque=appearanceVariables(value,dark)['--background'];
 const background=glass?'#00000000':opaque;
 const signature=`${environment.platform}:${glass}:${background}`;
 // A focus change rechecks support, but must not rebuild an unchanged native
 // material. Repeated compositor mutations can flash during desktop switching.
 if(appliedAppearance.get(win)===signature&&!refreshMaterial)return glass;
 const material=(enabled:boolean)=>{
  if(environment.platform==='darwin'&&!macLiquidGlass.apply(win as BrowserWindow,enabled)) win.setVibrancy(enabled?'under-window':null);
  if(environment.platform==='win32'&&supported) win.setBackgroundMaterial(enabled?'acrylic':'none');
 };
 try {
  material(glass);
  win.setBackgroundColor(background);
  appliedAppearance.set(win,signature);
  return glass;
 } catch {
  appliedAppearance.delete(win);
  // Also clear a previously active native backdrop before restoring opacity.
  try { material(false); } catch { /* The compositor may be unavailable. */ }
  win.setBackgroundColor(opaque);
  return false;
 }
}

type InactiveAppearanceWindow = AppearanceWindow & Pick<BrowserWindow,'isDestroyed'|'isVisible'|'isFocused'|'isMinimized'>;

export function retainInactiveWindowGlass(win:InactiveAppearanceWindow,value:Appearance,dark:boolean,environment={platform:process.platform,release:release(),reduceTransparency:false}):boolean|undefined {
 if(environment.platform!=='win32'||!value.glass||environment.reduceTransparency||!supportsDesktopGlass(environment.platform,environment.release))return undefined;
 if(win.isDestroyed()||!win.isVisible()||win.isMinimized()||win.isFocused())return undefined;
 // Electron 42's native setter restores WM_NCACTIVATE appearance through
 // DefWindowProc without activating the window or taking keyboard focus.
 // Run once after deactivation, never by repeatedly reclaiming foreground focus.
 return applyWindowAppearance(win,value,dark,environment,true);
}
