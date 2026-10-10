export type DuplicateChoice = 'skip' | 'keep' | 'replace';
export type DownloadIdentity = {rowId:number;source:string;title:string;thumbnailUrl?:string};
export type DuplicateDownloadPrompt = {id:string;title:string;path:string;source:string;thumbnailUrl?:string};

export function youtubeThumbnailUrl(source:string):string|undefined {
  try {
    const url=new URL(source);
    if(!['http:','https:'].includes(url.protocol))return;
    const host=url.hostname.toLowerCase().replace(/^www\./,'');
    const id=host==='youtu.be'?url.pathname.slice(1).split('/')[0]:['youtube.com','m.youtube.com','music.youtube.com'].includes(host)?url.searchParams.get('v')??url.pathname.match(/^\/(?:shorts|embed)\/([^/]+)/)?.[1]:undefined;
    return id&&/^[\w-]{11}$/.test(id)?`https://i.ytimg.com/vi/${id}/default.jpg`:undefined;
  }catch{return;}
}
