import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { atomicJson } from './studioFiles';
import { retryMediaTransfer } from './downloadRetry';

export function ytDlpResumeArgs(directory:string,direct:boolean) {
  // DASH fragment state and direct HTTP offsets are different formats. Preserve
  // each in its own directory instead of truncating either on a recovery attempt.
  return ['--continue','--paths',directory,'--paths',`temp:${join(directory,direct?'yt-direct':'yt-fragments')}`];
}
export async function resumableYtDlpTransfer<T>(directory:string,attempt:(direct:boolean)=>Promise<T>) {
  const marker=join(directory,'transfer-strategy.json');
  let direct=await readFile(marker,'utf8').then(text=>JSON.parse(text).direct===true,()=>false).catch(()=>false);
  return retryMediaTransfer(async recovery=>{
    if(recovery==='direct'){direct=true;await atomicJson(marker,{direct:true});}
    return attempt(direct);
  });
}
