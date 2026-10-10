import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {validateCatalog} from '../shared/community';
import {releaseOrigin} from '../shared/releases';
import starterCatalog from '../shared/community-starters.json';
export async function boundedResponse(response:Response,limit:number):Promise<string>{
  if(!response.body)throw Error('Empty response');
  const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit)throw Error('Response too large');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  return Buffer.concat(chunks).toString('utf8');
}
export async function communityCatalog(directory:string){
  const cache=join(directory,'community-catalog.json');
  try{
    const response=await fetch(releaseOrigin+'/api/community',{signal:AbortSignal.timeout(12000),redirect:'error'});
    if(!response.ok)throw Error('Community unavailable');
    const catalog=validateCatalog(JSON.parse(await boundedResponse(response,6_000_000)));
    await mkdir(directory,{recursive:true});await writeFile(cache+'.tmp',JSON.stringify(catalog));await rename(cache+'.tmp',cache);return catalog;
  }catch{
    try{return {...validateCatalog(JSON.parse(await readFile(cache,'utf8'))),offline:true};}catch{return {...validateCatalog(starterCatalog),offline:true};}
  }
}
