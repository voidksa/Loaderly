import {normalizeDownloadUrl} from './downloadUrl';

export const PLAYLIST_LIMIT=1000;
export type PlaylistEntry={id:string;url:string;title:string;index:number;duration?:number;author?:string;available:boolean};
export type PlaylistPreview={title:string;entries:PlaylistEntry[];truncated:boolean};
export type PlaylistErrorCode='invalid_link'|'missing_tool'|'empty'|'canceled'|'mix_unavailable'|'unavailable';
export type PlaylistResult={ok:true;playlist:PlaylistPreview}|{ok:false;code:PlaylistErrorCode;message:string};

export function playlistErrorMessage(code:PlaylistErrorCode,ar=false):string {
  const messages:Record<PlaylistErrorCode,[string,string]>={
    invalid_link:['Paste a YouTube playlist link, then try again.','ألصق رابط قائمة تشغيل من يوتيوب، ثم حاول مجددًا.'],
    missing_tool:['Open Tools and install the download tool, then try again.','افتح الأدوات وثبّت أداة التنزيل، ثم حاول مجددًا.'],
    empty:['This playlist has no videos available to download. Check that it is public or unlisted.','لا تحتوي القائمة على مقاطع متاحة للتنزيل. تأكد أنها عامة أو غير مدرجة.'],
    canceled:['Playlist loading was canceled.','أُلغيت قراءة قائمة التشغيل.'],
    mix_unavailable:['YouTube could not open this mix. Open a video in the mix and copy its full link, then try again. You can also use a saved playlist.','تعذّر فتح هذا المزيج من يوتيوب. افتح مقطعًا داخل المزيج وانسخ رابطه كاملًا، ثم حاول مجددًا. يمكنك أيضًا استخدام قائمة تشغيل محفوظة.'],
    unavailable:['We could not read this playlist. Check your connection and that the playlist is public or unlisted, then try again.','تعذّرت قراءة القائمة. تحقق من اتصالك وأن القائمة عامة أو غير مدرجة، ثم حاول مجددًا.']
  };
  return messages[code][ar?1:0];
}

export function youtubePlaylistUrl(value:unknown):string|undefined {
  const normalized=normalizeDownloadUrl(value);if(!normalized)return;
  const url=new URL(normalized);
  if(!['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtu.be','www.youtu.be'].includes(url.hostname)||url.username||url.password)return;
  const id=url.searchParams.get('list');
  if(!id||! /^[a-zA-Z0-9_-]{2,150}$/.test(id))return;
  // Mixes live on the watch page. A /playlist URL loses the seed video and
  // YouTube rejects it as an unviewable playlist type.
  const video=['youtu.be','www.youtu.be'].includes(url.hostname)?url.pathname.slice(1):url.searchParams.get('v');
  if(id.startsWith('RD')&&video&&/^[a-zA-Z0-9_-]{11}$/.test(video))return `https://www.youtube.com/watch?v=${video}&list=${id}`;
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
