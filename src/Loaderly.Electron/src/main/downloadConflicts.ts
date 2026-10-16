import {constants} from 'node:fs';
import {copyFile,lstat,mkdir,mkdtemp,readFile,readdir,rename,rm,stat} from 'node:fs/promises';
import {dirname,extname,isAbsolute,join,parse} from 'node:path';
import {randomUUID} from 'node:crypto';
import {LocalAiGate} from './localAiGate';
import {atomicJson} from './studioFiles';

export type DuplicateChoice='skip'|'replace'|'keep';
type Kind='audio'|'video';
const extensions=new Set(['.mp4','.mkv','.webm','.mov','.avi','.m4v','.mp3','.wav','.flac','.m4a','.aac','.ogg','.opus','.wma','.aiff','.aif','.mpeg','.mpg','.3gp','.ts']);
const locks=new Map<string,{gate:LocalAiGate;users:number}>();
export function downloadTitleKey(value:string) {
 return value.normalize('NFC').replace(/[<>:"/\\|?*＜＞：＂／＼｜？＊\x00-\x1f]/g,'_').replace(/[ .]+$/,'').trim().toLowerCase();
}
function fileTitleKey(stem:string,identity?:string){
 const numbered=stem.replace(/\s*\(\d+\)$/,'');
 const suffix=numbered.match(/\s+\[([^\]]+)\]$/);
 // Preserve title annotations such as [Live]; only strip a source identifier.
 return downloadTitleKey(suffix&&(suffix[1]===identity||/^[\w-]{11}$|^\d{12,}$/.test(suffix[1]))?numbered.slice(0,suffix.index):numbered);
}
export async function missingLibraryFiles(input:unknown):Promise<string[]> {
 if(!Array.isArray(input)||input.length>10000)throw Error('Invalid library file list.');
 const missing:string[]=[];
 for(const path of new Set(input)){
  if(typeof path!=='string'||!isAbsolute(path)||!extensions.has(extname(path).toLowerCase()))continue;
  try{await stat(path);}catch(error){
   // An unavailable folder or removable drive must not erase the library.
   if((error as NodeJS.ErrnoException).code==='ENOENT'&&await stat(dirname(path)).then(s=>s.isDirectory(),()=>false))missing.push(path);
  }
 }
 return missing;
}
export async function managedDownload(options:{directory:string;title:string;identity?:string;kind:Kind;knownFiles?:readonly string[];
 stagingKey?:string; resumeOwner?:string; signal?:AbortSignal;
 classify:(path:string)=>Promise<Kind|undefined>; choose:(path:string)=>Promise<DuplicateChoice>;
 download:(stage:string)=>Promise<{ok:boolean;path?:string;message?:string;subtitlePath?:string}>;
}):Promise<{ok:boolean;path?:string;message?:string;subtitlePath?:string;skipped?:boolean;replacedPath?:string}> {
 const key=options.directory+'\0'+downloadTitleKey(options.title);
 const lock=locks.get(key)??{gate:new LocalAiGate(),users:0};locks.set(key,lock);lock.users++;
 try{return await lock.gate.run(()=>run(options),options.signal);}finally{if(--lock.users===0)locks.delete(key);}
}
async function run(options:Parameters<typeof managedDownload>[0]){
 const check=()=>{if(options.signal?.aborted)throw Error('TASK_CANCELED');};check();
 const entries=await readdir(options.directory);
 const candidates=[...new Set([...entries.map(name=>join(options.directory,name)),...(options.knownFiles??[]).slice(0,10000)])];
 let duplicate:string|undefined;
 for(const path of candidates){
  check();
  if(!isAbsolute(path)||!extensions.has(extname(path).toLowerCase()))continue;
  const stem=parse(path).name;
  // Separation outputs share the remote id but are not copies of the raw download.
  // Replacing one here would silently put original audio in a processed filename.
  const identityTag=options.identity?`[${options.identity}]`:undefined;
  if(identityTag&&stem.includes(identityTag)&&/^\s+\[(?:No music|Instrumental)\](?:\s+\(\d+\))?$/.test(stem.slice(stem.lastIndexOf(identityTag)+identityTag.length)))continue;
  if(fileTitleKey(stem,options.identity)!==downloadTitleKey(options.title)&&downloadTitleKey(stem)!==downloadTitleKey(options.title)&&!(options.identity&&stem.includes(`[${options.identity}]`)))continue;
  const info=await lstat(path).catch(()=>undefined);if(!info?.isFile()||info.isSymbolicLink())continue;
  if(await options.classify(path)===options.kind){duplicate=path;break;}
 }
 const resumable=typeof options.stagingKey==='string'&&/^[a-f0-9]{64}$/.test(options.stagingKey);
 const stage=resumable?join(options.directory,`.loaderly-partial-${options.stagingKey}`):await mkdtemp(join(options.directory,'.loaderly-download-'));
 if(resumable){await mkdir(stage,{recursive:true});const info=await lstat(stage);if(!info.isDirectory()||info.isSymbolicLink())throw Error('Invalid download staging directory.');}
 let completed=false;
 try{
 const original=duplicate?await stat(duplicate):undefined;
 const fingerprint=original?JSON.stringify([duplicate,original.size,original.mtimeMs,original.ctimeMs,original.ino]):undefined;
 let remembered:DuplicateChoice|undefined;
 if(resumable&&options.resumeOwner&&fingerprint){try{const saved=JSON.parse(await readFile(join(stage,'duplicate-choice.json'),'utf8'));if(saved.owner===options.resumeOwner&&saved.fingerprint===fingerprint&&['replace','keep'].includes(saved.choice))remembered=saved.choice;}catch{/* No choice for this task and this file. */}}
 const choice=duplicate?(remembered??await options.choose(duplicate)):'keep';
 if(choice==='skip'){check();return {ok:false,skipped:true};}
 if(resumable&&options.resumeOwner&&fingerprint)await atomicJson(join(stage,'duplicate-choice.json'),{owner:options.resumeOwner,fingerprint,choice});
 check();
  const result=await options.download(stage);
  check();
  if(!result.ok||!result.path)return result;
  if(dirname(result.path)!==stage)throw Error('Unexpected download output location.');
  if(await options.classify(result.path)!==options.kind)throw Error('The downloaded media could not be verified. The existing file was kept.');
  check();
  const file=parse(result.path), replace=choice==='replace'?duplicate:undefined;
  const targetDirectory=replace?dirname(replace):options.directory;
  const stem=replace?parse(replace).name:file.name;
  let target=join(targetDirectory,stem+file.ext),suffix=2;
  if(duplicate&&choice==='keep')target=join(targetDirectory,`${stem} (${suffix++})${file.ext}`);
  // Copy with EXCL reserves the name even when another download finishes now.
  if(!replace){
   for(;;){try{await copyFile(result.path,target,constants.COPYFILE_EXCL);break;}catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error;target=join(targetDirectory,`${stem} (${suffix++})${file.ext}`);}}
  }else{
   const latest=await lstat(replace);
   if(!latest.isFile()||latest.isSymbolicLink()||latest.size!==original!.size||latest.mtimeMs!==original!.mtimeMs)throw Error('The existing file changed while downloading. It was not replaced. Try again.');
   if(target!==replace){
    // A different container must keep its real extension and never overwrite an unrelated file.
    while(await stat(target).then(()=>true,()=>false))target=join(targetDirectory,`${stem} (${suffix++})${file.ext}`);
   }
   const incoming=join(targetDirectory,`.loaderly-incoming-${randomUUID()}`),backup=join(targetDirectory,`.loaderly-backup-${randomUUID()}`);
   await copyFile(result.path,incoming,constants.COPYFILE_EXCL);
   let backedUp=false;
   // COPYFILE_EXCL also works on FAT32/exFAT removable drives, which do not
   // support hard links. Keep a recoverable backup until the copy succeeds.
   try{await rename(replace,backup);backedUp=true;await copyFile(incoming,target,constants.COPYFILE_EXCL);}
   catch(error){if(backedUp)await copyFile(backup,replace,constants.COPYFILE_EXCL).then(()=>rm(backup),()=>{});throw error;}
   finally{await rm(incoming,{force:true});}
   await rm(backup,{force:true}).catch(()=>{});
  }
  let subtitlePath:string|undefined;
  for(const name of await readdir(stage)){
   if(!name.startsWith(file.name+'.')||!['.srt','.vtt','.ass'].includes(extname(name)))continue;
   const destination=join(targetDirectory,parse(target).name+name.slice(file.name.length));
   try{await copyFile(join(stage,name),destination,constants.COPYFILE_EXCL);if(join(stage,name)===result.subtitlePath)subtitlePath=destination;}catch{/* Existing captions stay untouched. */}
  }
  completed=true;return {...result,path:target,subtitlePath,replacedPath:replace};
 }finally{if(completed||!resumable)await rm(stage,{recursive:true,force:true});}
}
