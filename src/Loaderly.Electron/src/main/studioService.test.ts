import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { StudioService } from './studioService';
import { LocalMediaAi } from './localMediaAi';

const roots:string[]=[];const services:StudioService[]=[];
afterEach(async()=>{for(const service of services.splice(0))await service.close();for(const root of roots.splice(0))await rm(root,{recursive:true,force:true});vi.restoreAllMocks();});
async function setup(){
  const root=await mkdtemp(join(tmpdir(),'loaderly-output-'));roots.push(root);
  const pick=vi.fn(async()=>[root]),render=vi.fn(async(_payload:unknown,_output:string,_signal:AbortSignal)=>{});
  const service=new StudioService({root,resources:root,development:false,tool:()=>'',notify:()=>{},pick,render});services.push(service);
  return {root,pick,render,service};
}
it('uses the chosen results folder without another picker and renders the current source payload',async()=>{
  const {root,pick,render,service}=await setup();
  const payload={kind:'audio',source:'current-source.mp3'};
  const result=await service.request({action:'enqueue',kind:'render',name:'Test',render:payload,outputDirectory:root});
  expect(result.ok).toBe(true);expect(pick).not.toHaveBeenCalled();
  await vi.waitFor(()=>expect(render).toHaveBeenCalled());expect(render.mock.calls[0][0]).toEqual(payload);
});
it('rejects stale output folders without creating a task',async()=>{
  const {root,service,render}=await setup();const file=join(root,'file');await writeFile(file,'not a directory');
  expect(await service.request({action:'enqueue',kind:'render',render:{},outputDirectory:file})).toMatchObject({ok:false,message:'INVALID_OUTPUT_DIRECTORY'});
  expect((await service.request({action:'jobs'})).jobs).toEqual([]);expect(render).not.toHaveBeenCalled();
});
it('cancels the legacy destination prompt without enqueueing',async()=>{
  const {service,pick}=await setup();pick.mockResolvedValueOnce([]);
  expect(await service.request({action:'enqueue',kind:'render',render:{}})).toMatchObject({ok:true,canceled:true});
  expect((await service.request({action:'jobs'})).jobs).toEqual([]);
});
it('rejects empty and unusable transcripts without reporting that subtitles were added',async()=>{
  const {root,service,pick}=await setup();const source=join(root,'transcript.json');
  for(const cues of [[],[{startSeconds:2,endSeconds:1,text:'invalid'}],[{startSeconds:0,endSeconds:1,text:'  '}]] ){
    await writeFile(source,JSON.stringify({language:'en',cues,words:[]}));
    expect(await service.request({action:'read-transcript',source})).toMatchObject({ok:false,message:'NO_SPEECH_DETECTED'});
  }
  expect(await service.request({action:'export-subtitles',cues:[]})).toMatchObject({ok:false,message:'NO_SPEECH_DETECTED'});
  expect(pick).not.toHaveBeenCalled();
});
it('loads recognized text and timing, and distinguishes an invalid result from empty speech',async()=>{
  const {root,service}=await setup();const source=join(root,'transcript.json');
  const transcript={language:'ar',cues:[{startSeconds:1,endSeconds:3,text:'مرحبا بك'}],words:[{start:1,end:2,text:'مرحبا',probability:.9}]};
  await writeFile(source,JSON.stringify(transcript));
  expect(await service.request({action:'read-transcript',source})).toEqual({ok:true,transcript});
  await writeFile(source,'{}');
  expect(await service.request({action:'read-transcript',source})).toMatchObject({ok:false,message:'INVALID_TRANSCRIPT'});
});
it('records empty recognition as an actionable outcome and forwards music mode',async()=>{
  const {root,service}=await setup();
  const run=vi.spyOn(LocalMediaAi.prototype,'run').mockResolvedValue({paths:[join(root,'transcript.json')],transcript:{language:'en',cues:[],words:[]}});
  await service.request({action:'enqueue',kind:'transcribe',source:'song.mp3',speechMode:'music',outputDirectory:root});
  await vi.waitFor(async()=>expect((await service.request({action:'jobs'})).jobs?.[0]).toMatchObject({state:'completed',message:'NO_SPEECH_DETECTED'}));
  expect(run.mock.calls[0][1]).toMatchObject({source:'song.mp3',speechMode:'music'});
});
