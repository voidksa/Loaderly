import {normalizeDownloadUrl} from './downloadUrl';

export const PLAYLIST_LIMIT=1000;
export type PlaylistEntry={id:string;url:string;title:string;index:number;duration?:number;author?:string;available:boolean};
export type PlaylistPreview={title:string;entries:PlaylistEntry[];truncated:boolean};
export type PlaylistResult={ok:true;playlist:PlaylistPreview}|{ok:false;message:string};

export function youtubePlaylistUrl(value:unknown):string|undefined {
  const normalized=normalizeDownloadUrl(value);if(!normalized)return;
  const url=new URL(normalized);
  if(!['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtu.be','www.youtu.be'].includes(url.hostname)||url.username||url.password)return;
  const id=url.searchParams.get('list');
  if(!id||! /^[a-zA-Z0-9_-]{2,150}$/.test(id))return;
  return `https://www.youtube.com/playlist?list=${id}`;
}

export function parsePlaylist(value:unknown):PlaylistPreview {
  if(!value||typeof value!=='object'||!Array.isArray((value as any).entries))throw Error('Could not read this playlist.');
  const raw=value as Record<string,any>;const seen=new Set<string>();
  const entries:PlaylistEntry[]=[];
  for(const [position,item] of raw.entries.slice(0,PLAYLIST_LIMIT).entries()) {
    if(!item||typeof item!=='object')continue;
    const id=typeof item.id==='string'?item.id:'';
    if(!/^[a-zA-Z0-9_-]{11}$/.test(id)||seen.has(id))continue;
    seen.add(id);
    const title=typeof item.title==='string'?item.title.slice(0,500):'Untitled video';
    entries.push({id,url:`https://www.youtube.com/watch?v=${id}`,title,index:position+1,
      duration:Number.isFinite(item.duration)&&item.duration>=0?item.duration:undefined,
      author:typeof item.channel==='string'?item.channel.slice(0,150):undefined,
      available:!['private','needs_auth','premium_only','subscriber_only'].includes(item.availability)&&!/^\[(?:Private|Deleted) video\]$/i.test(title)});
  }
  return {title:typeof raw.title==='string'?raw.title.slice(0,300):'YouTube playlist',entries,truncated:raw.entries.length>PLAYLIST_LIMIT||(Number.isFinite(raw.playlist_count)&&raw.playlist_count>PLAYLIST_LIMIT)};
}

export function selectedPlaylistEntries(entries:PlaylistEntry[],ids:readonly string[]):PlaylistEntry[] {
  const selected=new Set(ids);
  return entries.filter(entry=>entry.available&&selected.has(entry.id));
}
