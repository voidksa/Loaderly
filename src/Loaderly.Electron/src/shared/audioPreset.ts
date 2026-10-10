import {normalizeAudioSettings,type AudioSettings} from './editor-project/audioProcessing';
import {normalizeSpeedMode,type SpeedSoundMode} from './editor-project/speedSound';
export type SoundPreset={audio:AudioSettings;speed?:{rate:number;mode:SpeedSoundMode}};
export function normalizeSoundPreset(value:SoundPreset):SoundPreset{
 const result:SoundPreset={audio:normalizeAudioSettings(value.audio)};
 if(value.speed&&typeof value.speed.rate==='number'&&Number.isFinite(value.speed.rate))result.speed={rate:Math.max(.25,Math.min(8,value.speed.rate)),mode:normalizeSpeedMode(value.speed.mode)};
 return result;
}
export function encodeSoundPreset(value:SoundPreset){return JSON.stringify({format:'loaderly-sound',version:1,...normalizeSoundPreset(value)},null,2);}
export function decodeSoundPreset(code:string):SoundPreset|undefined{
 if(typeof code!=='string'||code.length>8192)return;
 try{const v=JSON.parse(code);if(v?.format!=='loaderly-sound'||v.version!==1||!v.audio||typeof v.audio!=='object'||Array.isArray(v.audio))return;
  if(v.speed&&(!Number.isFinite(v.speed.rate)||v.speed.rate<.25||v.speed.rate>8||!['normal','preserve-pitch','warm','bright','radio'].includes(v.speed.mode)))return;
  return normalizeSoundPreset(v);
 }catch{return;}
}
