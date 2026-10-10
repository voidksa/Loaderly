import {decodeSoundPreset,encodeSoundPreset} from './audioPreset';
import {decodeTheme,encodeTheme} from './app-preferences/appearance';
import {decodeVisualizer,encodeVisualizer} from './editor-project/audioVisualizer';
export type CommunityLook={id:string;kind:'theme'|'visualizer'|'sound';name:string;author:string;url:string;updatedAt:string;code:string;featured:boolean};
export type CommunityCatalog={schema:1;updatedAt:string;looks:CommunityLook[];offline?:boolean};
export function normalizedLookCode(code:string,kind:CommunityLook['kind']):string|undefined {
  try {
  if(kind==='sound'){const value=decodeSoundPreset(code);return value?encodeSoundPreset(value):undefined;}
  if(kind==='theme'){const value=decodeTheme(code);return value?encodeTheme(value):undefined;}
  const value=decodeVisualizer(code);return value?encodeVisualizer(value):undefined;
  }catch{return;}
}
export function validateCatalog(value:unknown):CommunityCatalog {
  const c=value as CommunityCatalog;
  if(!c||c.schema!==1||!Array.isArray(c.looks)||c.looks.length>200||typeof c.updatedAt!=='string')throw Error('Invalid community catalog');
  const looks:CommunityLook[]=[],ids=new Set<string>();
  for(const l of c.looks){
    if(!l||!['theme','visualizer','sound'].includes(l.kind)||typeof l.id!=='string'||l.id.length>80||ids.has(l.id)||typeof l.code!=='string'||l.code.length>320000||typeof l.name!=='string'||typeof l.author!=='string'||typeof l.updatedAt!=='string'||!Number.isFinite(Date.parse(l.updatedAt))||!(/^https:\/\/github\.com\/voidksa\/Loaderly\/discussions\/\d+$/.test(l.url)||/^https:\/\/loaderly-docs\.voidksa\.workers\.dev\/api\/community\/design\?id=design-[a-f0-9-]{36}$/.test(l.url)))continue;
    const code=normalizedLookCode(l.code,l.kind);if(!code)continue;
    ids.add(l.id);looks.push({id:l.id,kind:l.kind,name:l.name.slice(0,100),author:l.author.slice(0,40),url:l.url,updatedAt:l.updatedAt,code,featured:l.featured===true});
  }
  return {schema:1,updatedAt:c.updatedAt,looks};
}
