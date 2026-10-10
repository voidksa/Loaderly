import type {BrowserWindow} from 'electron';
import {release} from 'node:os';
import {appearanceVariables,type Appearance} from '../shared/app-preferences/appearance';

export function supportsDesktopGlass(platform:NodeJS.Platform, osRelease:string):boolean {
 return platform==='darwin'||(platform==='win32'&&Number(osRelease.split('.')[2])>=22621);
}
export function applyWindowAppearance(win:BrowserWindow,value:Appearance,dark:boolean):boolean {
 const glass=!!value.glass&&supportsDesktopGlass(process.platform,release());
 try {
  if(process.platform==='darwin') win.setVibrancy(glass?'under-window':null);
  if(process.platform==='win32'&&supportsDesktopGlass(process.platform,release())) win.setBackgroundMaterial(glass?'acrylic':'none');
  win.setBackgroundColor(glass?'#00000000':appearanceVariables(value,dark)['--background']);
  return glass;
 } catch {
  win.setBackgroundColor(appearanceVariables(value,dark)['--background']);
  return false;
 }
}
