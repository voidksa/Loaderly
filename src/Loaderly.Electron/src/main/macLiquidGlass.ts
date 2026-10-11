import type {BrowserWindow, BrowserWindowConstructorOptions} from 'electron';
import {createRequire} from 'node:module';

type GlassWindow = Pick<BrowserWindow, 'getNativeWindowHandle'|'setVibrancy'|'isDestroyed'|'webContents'|'once'|'setWindowButtonVisibility'>;
type LiquidGlass = {addView(handle:Buffer, options:{cornerRadius:number;opaque:boolean}):number};
type Environment = {platform:NodeJS.Platform;systemVersion:string;arch:string};

export function supportsMacLiquidGlass(environment:Environment):boolean {
 return environment.platform==='darwin' && Number(environment.systemVersion.split('.')[0])>=26 &&
  (environment.arch==='arm64'||environment.arch==='x64');
}

export function createMacLiquidGlass(environment:Environment,load:()=>LiquidGlass) {
 let library:LiquidGlass|null|undefined;
 const windows=new WeakMap<GlassWindow,{ready:boolean;attached:boolean;failed:boolean;cornerRadius:number}>();
 const getLibrary=()=>{
  if(!supportsMacLiquidGlass(environment))return null;
  if(library===undefined){
   try {library=load();if(typeof library?.addView!=='function')library=null;}
   catch {library=null;} // Optional native module: older/unsupported installations keep Electron vibrancy.
  }
  return library;
 };
 return {
  windowOptions():BrowserWindowConstructorOptions {
   return getLibrary()?{transparent:true}:{};
  },
  register(win:GlassWindow,refresh:()=>void,options={cornerRadius:0,windowButtons:false}) {
   if(!getLibrary()||windows.has(win))return;
   const state={ready:false,attached:false,failed:false,cornerRadius:options.cornerRadius};
   windows.set(win,state);
   const onLoad=()=>{
    if(win.isDestroyed())return;
    state.ready=true;
    if(options.windowButtons)win.setWindowButtonVisibility(true);
    refresh();
   };
   win.webContents.on('did-finish-load',onLoad);
   win.once('closed',()=>{
    windows.delete(win);
    if(!win.webContents.isDestroyed())win.webContents.removeListener('did-finish-load',onLoad);
   });
  },
  apply(win:GlassWindow,enabled:boolean):boolean {
   const state=windows.get(win);
   if(!state||state.failed||!state.ready||win.isDestroyed())return false;
   try {
    // Vibrancy and NSGlassEffectView must never be enabled together.
    win.setVibrancy(null);
    if(enabled&&!state.attached){
     const id=getLibrary()?.addView(win.getNativeWindowHandle(),{cornerRadius:state.cornerRadius,opaque:false});
     if(typeof id!=='number'||!Number.isInteger(id)||id<0)throw new Error('Native glass unavailable');
     state.attached=true;
    }
    // 1.1.1 has no remove/update API. Retain a single view for the window's
    // lifetime; applyWindowAppearance covers it with an opaque WebContents
    // background when glass is off or Reduce Transparency is enabled.
    // Never rebuild it on focus, theme updates, navigation or preference changes.
    return true;
   } catch {
    state.failed=true;
    return false;
   }
  }
 };
}

const requireOptional=createRequire(import.meta.url);
export const macLiquidGlass=createMacLiquidGlass({
 platform:process.platform,
 systemVersion:process.platform==='darwin'?process.getSystemVersion():'',
 arch:process.arch
},()=>{
 // Do not statically import this Darwin-only package: its loader runs before
 // its own platform check and cannot be evaluated on Windows or Linux.
 const module=requireOptional('electron-liquid-glass');
 return module.default??module;
});
