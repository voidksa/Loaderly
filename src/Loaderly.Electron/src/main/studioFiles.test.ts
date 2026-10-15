import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, it, expect } from 'vitest';
import { openPortableProject, savePortableProject, validateProject } from './studioFiles';
import { emptyStudioEdits } from '../shared/editor-project/studio';
describe('portable editor projects', () => {
 it('rejects malformed timeline nodes without silently discarding edits',()=>{
  for(const snapshot of [{textOverlays:[null]},{cutOutRanges:[{id:1,startSeconds:'0',endSeconds:3}]},{blurItems:[{id:'blur',name:'Blur',startTime:0,endTime:3,region:null,strength:5}]},{subtitleFile:{path:'',name:'Captions',cues:[{text:42,startSeconds:0,endSeconds:1}]}}])expect(()=>validateProject({schema:1,name:'Invalid',sourcePath:'source.mp4',snapshot,edits:emptyStudioEdits(),revisions:[]})).toThrow('INVALID_PROJECT');
 });
 it('deduplicates collected assets and removes only new copies if collection fails',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'loaderly-project-'));
  try{const source=join(dir,'voice.wav');await writeFile(source,'voice');const target=join(dir,'work.loaderly');
   const value={schema:1,name:'Project',sourcePath:source,snapshot:{sourcePath:source},edits:emptyStudioEdits(),revisions:[]};
   await savePortableProject(target,value,true);const files=await readdir(`${target}.assets`);expect(files).toHaveLength(1);
   await expect(savePortableProject(target,{...value,edits:{...value.edits,audio:{...value.edits.audio,extraPath:join(dir,'missing.wav')}}},true)).rejects.toThrow();
   expect(await readdir(`${target}.assets`)).toEqual(files);expect((await openPortableProject(target)).missing).toEqual([]);
  }finally{await rm(dir,{recursive:true,force:true});}
 });
  it('collects Arabic media paths, resolves relative assets, and excludes credentials', async () => {
    const dir = await mkdtemp(join(tmpdir(),'loaderly-project-'));
    try {
      const source = join(dir,'مقطع.wav'); await writeFile(source,'fixture'); const target = join(dir,'project.loaderly');
      await savePortableProject(target,{schema:1,name:'مشروع',sourcePath:source,snapshot:{playheadSeconds:3,apiKey:'secret'},edits:{...emptyStudioEdits(),outputPreset:{name:'Saved',kind:'video',width:720,height:0,crf:20,directory:'C:\\another-device\\outputs'}},revisions:[]},true);
      expect(await readFile(target,'utf8')).not.toContain('secret'); const result=await openPortableProject(target);
      expect(result.missing).toEqual([]); expect(result.project.snapshot.playheadSeconds).toBe(3); expect(await readFile(result.project.sourcePath,'utf8')).toBe('fixture');
      expect(result.project.edits.outputPreset?.directory).toBeUndefined();
    } finally { await rm(dir,{recursive:true,force:true}); }
  });
  it('rejects unsupported schema and escaping relative media paths', async () => {
    expect(()=>validateProject({schema:2})).toThrow('INVALID_PROJECT'); const dir=await mkdtemp(join(tmpdir(),'loaderly-project-'));
    try { const path=join(dir,'bad.loaderly'); await writeFile(path,JSON.stringify({schema:1,name:'bad',sourcePath:'../secret.wav',snapshot:{},edits:emptyStudioEdits()})); await expect(openPortableProject(path)).rejects.toThrow('INVALID_MEDIA_PATH'); }
    finally { await rm(dir,{recursive:true,force:true}); }
  });
});
