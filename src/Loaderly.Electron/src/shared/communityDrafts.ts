import {normalizedLookCode,type CommunityLook} from './community';
export type DesignDraft={id:string;kind:CommunityLook['kind'];name:string;code:string;revision:number;updatedAt:string;published:boolean};
export type DraftRequest={action:'list'}|{action:'save';draft:DesignDraft}|{action:'publish'|'unpublish'|'delete';id:string;revision:number};
export type DraftResult={ok:boolean;drafts?:DesignDraft[];draft?:DesignDraft;error?:string};
export function validDraft(value:unknown):DesignDraft|undefined{
 const v=value as DesignDraft;
 if(!v||!/^design-[a-f0-9-]{36}$/.test(v.id)||!['theme','visualizer','sound'].includes(v.kind)||typeof v.name!=='string'||!v.name.trim()||v.name.length>80||typeof v.code!=='string'||v.code.length>320000||!Number.isSafeInteger(v.revision)||v.revision<0)return;
 const code=normalizedLookCode(v.code,v.kind);if(!code)return;
 return {id:v.id,kind:v.kind,name:v.name.trim().replace(/[\u0000-\u001f]/g,''),code,revision:v.revision,updatedAt:typeof v.updatedAt==='string'?v.updatedAt:'',published:v.published===true};
}
