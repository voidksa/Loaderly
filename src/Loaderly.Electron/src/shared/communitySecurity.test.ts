import {describe,it,expect} from 'vitest';
import {normalizedLookCode,validateCatalog} from './community';
import {validDraft} from './communityDrafts';
import {encodeTheme,defaultAppearance,appearanceVariables,decodeTheme} from './app-preferences/appearance';
import {encodeVisualizer,defaultVisualizer,decodeVisualizer,shapeContours} from './editor-project/audioVisualizer';
import {encodeSoundPreset,decodeSoundPreset} from './audioPreset';
import {defaultAudioSettings,audioFilterChain} from './editor-project/audioProcessing';

const templates={theme:encodeTheme(defaultAppearance),visualizer:encodeVisualizer(defaultVisualizer),sound:encodeSoundPreset({audio:defaultAudioSettings})};
const marker='UNTRUSTED_PAYLOAD';
const extra=JSON.parse(`{"script":"${marker}","html":"${marker}","css":"${marker}","sourcePath":"${marker}","url":"${marker}","__proto__":{"polluted":"${marker}"},"constructor":{"prototype":{"polluted":"${marker}"}}}`);
describe('untrusted community codes stay bounded settings data',()=>{
 for(const kind of ['theme','visualizer','sound'] as const)it(`${kind}: drops scripts, paths and prototype keys at every settings level`,()=>{
  const value={...JSON.parse(templates[kind]),...extra};
  if(kind==='sound'){value.audio={...value.audio,...extra,space:{...value.audio.space,...extra}};value.speed={rate:1,mode:'normal',...extra};}
  if(kind==='visualizer'){value.settings={...value.settings,...extra,shape:{...value.settings.shape,...extra,typography:{text:'Safe text',font:'modern',...extra}}};}
  const code=normalizedLookCode(JSON.stringify(value),kind)!;
  expect(code).toBeTruthy();expect(code).not.toContain(marker);expect(code).not.toMatch(/__proto__|constructor/);expect(({} as Record<string,unknown>).polluted).toBeUndefined();
  const draft=validDraft({id:'design-11111111-1111-1111-1111-111111111111',kind,name:'Safe design',revision:0,code:JSON.stringify(value)});
  expect(draft?.code).toBe(code);
 });
 it('rejects CSS injection in theme colors, including nested palettes',()=>{
  for(const color of ['url(https://untrusted.invalid/image)','red;position:fixed','expression(alert(1))','#fff','<script>bad()</script>']){
   expect(normalizedLookCode(JSON.stringify({...JSON.parse(templates.theme),accent:color}),'theme')).toBeUndefined();
   expect(normalizedLookCode(JSON.stringify({...JSON.parse(templates.theme),colors:{dark:{background:color}}}),'theme')).toBeUndefined();
  }
  const variables=appearanceVariables(decodeTheme(templates.theme),true);expect(Object.values(variables).join(' ')).not.toMatch(/url\(|script|expression/);
 });
 it('does not accept a script, image or stylesheet as a design',()=>{
  for(const kind of ['theme','visualizer','sound'] as const)for(const code of ['(()=>alert(1))()','<svg onload="alert(1)"/>','@import "https://untrusted.invalid"','[1,2,3]','null','x'.repeat(320001)])expect(normalizedLookCode(code,kind)).toBeUndefined();
 });
 it('bounds visualizer geometry and rejects external images or fonts as settings',()=>{
  const settings=decodeVisualizer(JSON.stringify({format:'loaderly-visualizer',version:3,settings:{...defaultVisualizer,color:'url(https://untrusted.invalid)',image:'file:///private',count:1e10,shape:{points:[[-1,1e10]],paths:Array.from({length:100},()=>({points:Array.from({length:100},()=>[2,-1])})),typography:{text:'A',font:'https://untrusted.invalid/font'}}}}))!;
  expect(settings.color).toBe(defaultVisualizer.color);expect(settings).not.toHaveProperty('image');expect(settings.shape.typography?.font).toBe('modern');expect(settings.count).toBeLessThanOrEqual(1200);
  const points=shapeContours(settings.shape).flatMap(c=>c.points);expect(points.length).toBeLessThanOrEqual(4096);expect(points.every(p=>p.every(n=>n>=0&&n<=1))).toBe(true);
 });
 it('sound filter strings cannot be injected into numeric effects',()=>{
  const preset=decodeSoundPreset(JSON.stringify({format:'loaderly-sound',version:1,audio:{gainDb:'1;amovie=/private',bass:'12,amovie=https://untrusted.invalid',treble:1e50,space:{enabled:true,type:'amovie=/private',decay:1e99,feedback:1e99}}}))!;
  expect(audioFilterChain(preset.audio,10)).toBe('treble=g=12:f=3000');expect(preset.audio.space).toMatchObject({type:'hall',decay:8,feedback:85});
 });
 it('the catalog rejects non-approved links even when the settings are valid',()=>{
  const base={id:'safe',kind:'theme',name:'Safe',author:'owner',code:templates.theme,featured:false,updatedAt:'2026-10-10T00:00:00Z'};
  for(const url of ['javascript:alert(1)','file:///private','https://github.com.evil.invalid/voidksa/Loaderly/discussions/1','https://github.com/voidksa/Loaderly/discussions/1?redirect=evil','https://untrusted.invalid'])expect(validateCatalog({schema:1,updatedAt:'',looks:[{...base,url}]}).looks).toEqual([]);
 });
});
