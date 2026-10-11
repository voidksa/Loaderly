import { execFile } from 'node:child_process';
import { StringDecoder } from 'node:string_decoder';
import type { TransferProgress } from '../shared/downloadProgress';

const marker = '__LOADERLY_TRANSFER__';
const planMarker = '__LOADERLY_TRANSFER_PLAN__';
const postMarker = '__LOADERLY_PROCESSING__';
export const downloadProgressArgs = [
  '--newline', '--progress', '--progress-delta', '0.2', '--no-colors',
  '--print', `before_dl:${planMarker}{"formats":%(requested_formats|null)j,"id":%(format_id|null)j,"total":%(filesize|null)j,"estimate":%(filesize_approx|null)j}`,
  '--progress-template', `download:${marker}{"status":%(progress.status|null)j,"downloaded":%(progress.downloaded_bytes|null)j,"total":%(progress.total_bytes|null)j,"estimate":%(progress.total_bytes_estimate|null)j,"speed":%(progress.speed|null)j,"eta":%(progress.eta|null)j,"id":%(info.format_id|null)j,"audio":%(info.acodec|null)j,"video":%(info.vcodec|null)j}`,
  '--progress-template', `postprocess:${postMarker}`
] as const;

function number(value:unknown):number|undefined {
  return typeof value==='number' && Number.isFinite(value) && value>=0 ? value : undefined;
}
type Part = {downloaded:number;total?:number;estimated:boolean};
/** Parse only explicitly marked machine output; unstructured tool logs are never progress. */
export function createDownloadProgressReader(notify:(state:TransferProgress)=>void) {
  const parts = new Map<string,Part>();
  let planned=false;
  return (line:string) => {
    if(line.startsWith(postMarker)) {notify({phase:'processing'});return true;}
    if(!line.startsWith(marker)&&!line.startsWith(planMarker))return false;
    try {
      const plan=line.startsWith(planMarker);
      const value=JSON.parse(line.slice(plan?planMarker.length:marker.length));
      if(!value||typeof value!=='object')return true;
      if(plan){
        parts.clear();
        const formats=Array.isArray(value.formats)&&value.formats.length?value.formats:[{format_id:value.id,filesize:value.total,filesize_approx:value.estimate}];
        for(const format of formats.slice(0,32)){
          if(!format||typeof format.format_id!=='string')continue;
          const exact=number(format.filesize),estimate=number(format.filesize_approx);
          parts.set(format.format_id,{downloaded:0,total:exact||estimate||undefined,estimated:!exact&&!!estimate});
        }
        planned=parts.size>0;
        return true;
      }
      if(!['downloading','finished'].includes(value.status))return true;
      const downloaded=number(value.downloaded);if(downloaded===undefined)return true;
      const id=typeof value.id==='string'?value.id:'media';
      const previous=parts.get(id);
      const exact=number(value.total),estimate=number(value.estimate);
      const total=exact||estimate||previous?.total;
      const part={downloaded,total,estimated:exact?false:estimate?true:previous?.estimated??false};
      // The final byte count replaces an estimated size once this transfer ends.
      if(value.status==='finished'&&downloaded>0){part.total=downloaded;part.estimated=false;}
      const knownPart=parts.has(id);
      parts.set(id,part);
      const aggregate=planned&&knownPart&&[...parts.values()].every(p=>!!p.total);
      const included=aggregate?[...parts.values()]:[part];
      const received=included.reduce((sum,p)=>sum+p.downloaded,0);
      const size=included.every(p=>!!p.total)?included.reduce((sum,p)=>sum+p.total!,0):undefined;
      notify({phase:'downloading',downloadedBytes:received,totalBytes:size,
        percent:size?Math.min(100,received/size*100):undefined,
        estimated:included.some(p=>p.estimated),speedBytesPerSecond:number(value.speed),
        etaSeconds:aggregate&&size&&number(value.speed)?Math.max(0,(size-received)/value.speed):number(value.eta),
        stream:aggregate?'media':value.video==='none'?'audio':value.audio==='none'?'video':'media'});
    }catch{/* Incomplete or unsupported progress records do not invent a percentage. */}
    return true;
  };
}

export function runDownloadProcess(tool:string,args:readonly string[],notify:(state:TransferProgress)=>void):Promise<{stdout:string}> {
  const read=createDownloadProgressReader(notify);
  return new Promise((resolve,reject)=>{
    const child=execFile(tool,[...args],{timeout:30*60*1000,windowsHide:true,maxBuffer:4*1024*1024,encoding:'utf8'},(error,stdout,stderr)=>{
      if(error){Object.assign(error,{stdout,stderr});reject(error);}else resolve({stdout});
    });
    for(const stream of [child.stdout,child.stderr]){
      const decoder=new StringDecoder('utf8');let pending='';
      const consume=(chunk:string)=>{
        pending+=chunk;
        let end:number;
        while((end=pending.search(/[\r\n]/))>=0){read(pending.slice(0,end));pending=pending.slice(end+1);}
        // Output records are bounded even if a third-party tool prints a huge line.
        if(pending.length>256*1024)pending='';
      };
      stream?.on('data',(chunk:Buffer)=>consume(decoder.write(chunk)));
      stream?.on('end',()=>{consume(decoder.end());if(pending)read(pending);});
    }
  });
}
