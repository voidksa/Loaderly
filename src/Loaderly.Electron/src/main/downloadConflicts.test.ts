import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {mkdtemp,writeFile,readFile,rm,mkdir,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {downloadTitleKey,managedDownload,missingLibraryFiles,type DuplicateChoice} from './downloadConflicts';
let directory:string;
beforeEach(async()=>{directory=await mkdtemp(join(tmpdir(),'loaderly-duplicates-'));});
afterEach(async()=>{await rm(directory,{recursive:true,force:true});});
function options(choice:DuplicateChoice='keep'){
 return {directory,title:'Song',identity:'abc123',kind:'audio' as const,classify:async()=> 'audio' as const,choose:vi.fn(async()=>choice),download:vi.fn(async(stage:string)=>{const path=join(stage,'Song [abc123].mp3');await writeFile(path,'new');return {ok:true,path};})};
}
it('preserves separated outputs when downloading or replacing the original',async()=>{
 const vocals=join(directory,'Song [abc123] [No music].mp3'),music=join(directory,'Song [abc123] [Instrumental] (2).mp3');
 await writeFile(vocals,'voices');await writeFile(music,'music');
 const first=options('replace');const result=await managedDownload(first);
 expect(first.choose).not.toHaveBeenCalled();expect(result.path).toBe(join(directory,'Song [abc123].mp3'));
 const replace=options('replace');await managedDownload(replace);expect(replace.choose).toHaveBeenCalledWith(result.path);
 expect(await readFile(vocals,'utf8')).toBe('voices');expect(await readFile(music,'utf8')).toBe('music');
});
it('skips duplicates before downloading and keeps audio separate from video',async()=>{
 await writeFile(join(directory,'Song [abc123].mp4'),'existing');
 const skip=options('skip');expect(await managedDownload(skip)).toMatchObject({skipped:true});expect(skip.download).not.toHaveBeenCalled();
 const video={...options(),classify:async(path:string)=>path.endsWith('.mp4')?'video' as const:'audio' as const};
 const result=await managedDownload(video);expect(result.ok).toBe(true);expect(video.choose).not.toHaveBeenCalled();expect(await readFile(join(directory,'Song [abc123].mp4'),'utf8')).toBe('existing');
});
it('matches exact titles across sources and extensions, then numbers copies',async()=>{
 await writeFile(join(directory,'Song.wav'),'original');
 const first=await managedDownload(options());const second=await managedDownload(options());
 expect(first.path).toBe(join(directory,'Song [abc123] (2).mp3'));expect(second.path).toBe(join(directory,'Song [abc123] (3).mp3'));expect(await readFile(join(directory,'Song.wav'),'utf8')).toBe('original');
 expect(downloadTitleKey('Song ｜ title')).toBe(downloadTitleKey('Song | title'));
 expect(downloadTitleKey('Song [Live]')).not.toBe(downloadTitleKey('Song [Studio]'));
});
it('replaces only after a successful download and retains the original on failure',async()=>{
 const original=join(directory,'Song [abc123].mp3');await writeFile(original,'old');
 const failed=options('replace');failed.download.mockRejectedValue(new Error('offline'));
 await expect(managedDownload(failed)).rejects.toThrow('offline');expect(await readFile(original,'utf8')).toBe('old');
 const result=await managedDownload(options('replace'));expect(result.replacedPath).toBe(original);expect(await readFile(original,'utf8')).toBe('new');expect(await readdir(directory)).toEqual(['Song [abc123].mp3']);
});
it('keeps real extensions on replacement and never overwrites a different container',async()=>{
 const original=join(directory,'Song.wav');await writeFile(original,'old');await writeFile(join(directory,'Song.mp3'),'unrelated');
 const result=await managedDownload({...options('replace'),classify:async path=>path===join(directory,'Song.mp3')?'video':'audio'});expect(result.path).toBe(join(directory,'Song (2).mp3'));expect(await readFile(join(directory,'Song.mp3'),'utf8')).toBe('unrelated');expect(await missingLibraryFiles([original])).toEqual([original]);
});
it('serializes simultaneous matching downloads so the second sees the first',async()=>{
 const a=options('skip'),b=options('skip');const [first,second]=await Promise.all([managedDownload(a),managedDownload(b)]);expect(first.ok).toBe(true);expect(second.skipped).toBe(true);expect(b.download).not.toHaveBeenCalled();
});
it('preserves the original when the new media cannot be probed',async()=>{
 const original=join(directory,'Song.mp3');await writeFile(original,'original');
 await expect(managedDownload({...options('replace'),classify:async path=>path===original?'audio':undefined})).rejects.toThrow('could not be verified');
 expect(await readFile(original,'utf8')).toBe('original');expect(await readdir(directory)).toEqual(['Song.mp3']);
});
it('checks known library locations and removes only confirmed missing files',async()=>{
 const other=join(directory,'elsewhere');await mkdir(other);const original=join(other,'Song.mp3');await writeFile(original,'library');
 expect(await managedDownload({...options('skip'),knownFiles:[original]})).toMatchObject({skipped:true});
 const deleted=join(directory,'deleted.mp4'),unavailable=join(directory,'disconnected','Song.mp3');expect(await missingLibraryFiles([original,deleted,unavailable])).toEqual([deleted]);
});
