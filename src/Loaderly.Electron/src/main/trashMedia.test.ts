import {expect,it} from 'vitest';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {trashMediaFiles} from './trashMedia';
it('trashes selected media once, never directories, and preserves failures',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'loaderly-trash-test-'));
 try{const first=join(dir,'first.mp3'),second=join(dir,'second.wav'),other=join(dir,'note.txt');await Promise.all([writeFile(first,'test'),writeFile(second,'test'),writeFile(other,'keep')]);const calls:string[]=[];
 const result=await trashMediaFiles([first,first,second,other,dir,'relative.mp3'],async path=>{calls.push(path);if(path===second)throw Error('locked');});
 expect(calls).toEqual([first,second]);expect(result.removed).toEqual([first]);expect(result.failed).toContain(second);expect(result.failed).toContain(dir);expect(result.failed).toContain(other);
 }finally{await rm(dir,{recursive:true,force:true});}
});
