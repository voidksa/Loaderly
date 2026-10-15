import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { it, expect } from 'vitest';
import { studioProcess } from './studioProcess';

it('cancels a tool and its worker before returning to the caller',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'loaderly-process-')),file=join(directory,'heartbeat');
 const worker=`const fs=require('node:fs');setInterval(()=>fs.appendFileSync(${JSON.stringify(file)},'x'),30);`;
 const parent=`require('node:child_process').spawn(process.execPath,['-e',${JSON.stringify(worker)}],{stdio:'inherit'});setInterval(()=>{},1000);`;
 const controller=new AbortController();const work=studioProcess(process.execPath,['-e',parent],{signal:controller.signal});
 const result=work.then(()=>false,()=>true);
 try{for(let i=0;i<100;i++){if(await readFile(file).then(b=>b.length>2,()=>false))break;await new Promise(r=>setTimeout(r,30));}
  expect((await readFile(file)).length).toBeGreaterThan(2);controller.abort();expect(await result).toBe(true);
  const before=await readFile(file,'utf8');await new Promise(r=>setTimeout(r,200));expect(await readFile(file,'utf8')).toBe(before);
 }finally{controller.abort();await result;await rm(directory,{recursive:true,force:true});}
},10000);
