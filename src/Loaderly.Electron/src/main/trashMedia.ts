import {lstat} from 'node:fs/promises';
import {isAbsolute,extname} from 'node:path';

export async function trashMediaFiles(input:unknown,trash:(path:string)=>Promise<void>) {
  if(!Array.isArray(input)||input.length>10000)throw Error('Invalid file selection.');
  const removed:string[]=[],failed:string[]=[];
  for(const path of new Set(input)){
    if(typeof path!=='string'||path.length>32768||!isAbsolute(path)||!['.mp4','.mkv','.webm','.mov','.avi','.m4v','.mp3','.wav','.flac','.m4a','.aac','.ogg','.opus','.wma','.aiff','.aif','.mpeg','.mpg','.3gp','.ts'].includes(extname(path).toLowerCase())){if(typeof path==='string')failed.push(path);continue;}
    try{const info=await lstat(path);if(!info.isFile()||info.isSymbolicLink())throw Error();await trash(path);removed.push(path);}
    catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')removed.push(path);else failed.push(path);}
  }
  return {removed,failed};
}
