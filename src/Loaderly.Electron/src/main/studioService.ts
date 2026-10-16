import type { DownloadAudioMode } from '../shared/downloadAudio';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, readdir, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join } from 'node:path';
import { cpus, totalmem } from 'node:os';
import { recommendedSpeechModel, type SpeechAnalysis } from '../shared/speechPlan';
import { prepareDownloadDirectory } from './downloadDirectory';
import type { StudioRequest, StudioResponse } from '../shared/studioApi';
import { normalizeOutputPreset, normalizeStudioEdits, normalizeTranscript } from '../shared/editor-project/studio';
import { cachedStudioAnalysis, measureStudioLoudness, createStudioProxy, probeStudioMedia } from './studioAnalysis';
import { serializeStudioSubtitles } from '../shared/editor-project/studioCaptions';
import { openPortableProject, safeOutputName, savePortableProject } from './studioFiles';
import { StudioQueue, type StudioJob } from './studioQueue';
import { LocalMediaAi } from './localMediaAi';
import { studioProcess } from './studioProcess';
import { processDownloadAudio, type MusicProgress } from './musicRemoval';

type JobPayload={request:StudioRequest;output:string};
type Context={root:string;resources:string;development:boolean;tool:(name:'ffmpeg'|'ffprobe')=>string;notify:(jobs:StudioJob[])=>void;render:(payload:unknown,output:string,signal:AbortSignal)=>Promise<void>;pick:(kind:'images'|'audio'|'files'|'project-media'|'project'|'save-project'|'directory',ar:boolean)=>Promise<string[]>};
export class StudioService {
  hasPendingWork() { return this.controllers.size > 0 || this.queue.list().some(job => job.state === 'queued' || job.state === 'running'); }
  private queue:StudioQueue<JobPayload>;
  private ready:Promise<void>;
  private ai:LocalMediaAi;
  private controllers=new Map<string,AbortController>();
  private cacheInUse=new Set<string>();
  private speechPlans=new Map<string,SpeechAnalysis>();
  private async speechPlan(source:string,signal?:AbortSignal){
    const info=await stat(source);if(!info.isFile())throw Error('MISSING_MEDIA');
    const key=JSON.stringify([source,info.size,info.mtimeMs]);let analysis=this.speechPlans.get(key);
    if(!analysis){
      const media=await probeStudioMedia(this.context.tool('ffprobe'),source,signal);if(!media.audio)throw Error('NO_AUDIO');
      const result=await this.ai.run('analyze-speech',{source,duration:media.duration},join(this.context.root,'studio-cache'),signal);
      if(!result.analysis)throw Error('AUDIO_ANALYSIS_FAILED');analysis=result.analysis;
      if(this.speechPlans.size>=20)this.speechPlans.clear();this.speechPlans.set(key,analysis);
    }
    const installed=this.ai.status().speechModels,model=recommendedSpeechModel(installed,totalmem(),cpus().length);
    return {...analysis,model,modelReady:installed.includes(model)};
  }
  assertSeparationReady() {
    const state = this.ai.status();
    if (!state.runtime) throw new Error('LOCAL_RUNTIME_NOT_INSTALLED');
    if (!state.separation) throw new Error('LOCAL_MODEL_NOT_INSTALLED');
  }
  async processDownloadAudio(source: string, kind: 'video' | 'audio', mode: Exclude<DownloadAudioMode, 'original'>, signal: AbortSignal, progress: (value: MusicProgress) => void) {
    this.assertSeparationReady();
    return processDownloadAudio(source, kind, mode, {
      ffmpeg: this.context.tool('ffmpeg'), ffprobe: this.context.tool('ffprobe'),
      separate: (source, output, signal, notify) => this.ai.run('separate', { source }, output, signal, notify)
    }, signal, progress);
  }
  constructor(private context:Context){
    this.ai=new LocalMediaAi(join(context.root,'local-ai'),context.resources,context.development,()=>context.tool('ffmpeg'));
    this.queue=new StudioQueue<JobPayload>(join(context.root,'studio-jobs.json'),async(job,signal,progress)=>this.execute(job.payload,signal,progress),context.notify);
    this.ready=this.queue.load();
  }
  private async execute({request:r,output}:JobPayload,signal:AbortSignal,progress:(p:number)=>void){
    const folderError=await prepareDownloadDirectory(output,process.platform,true);if(folderError)throw Error(folderError);
    if(r.kind==='render'){
      const payload=r.render as {kind?:string}; const extension=payload.kind==='audio'?'mp3':payload.kind==='gif'?'gif':payload.kind==='image'||payload.kind==='snapshot'?'png':'mp4';
      const target=join(output,safeOutputName(r.name??'Clip',extension));
      try {await this.context.render(r.render,target,signal);return {paths:[target]};}catch(error){await unlink(target).catch(()=>{});throw error;}
    }
    if(r.kind==='transcribe'||r.kind==='separate'){
      const target=join(output,safeOutputName(r.kind,'results'));
      const plan=r.kind==='transcribe'&&(!r.speechMode||r.speechMode==='auto')?await this.speechPlan(r.source!,signal):undefined;
      const result=await this.ai.run(r.kind,{source:r.source,language:r.language,model:r.model??plan?.model,speechMode:plan?.mode??r.speechMode,automatic:!!plan&&plan.reason!=='quiet'},target,signal,progress);
      if(r.kind==='transcribe'){
        const transcript=normalizeTranscript(result.transcript);
        if(!transcript)throw new Error('INVALID_TRANSCRIPT');
        return {...result,message:transcript.cues.length?undefined:'NO_SPEECH_DETECTED'};
      }
      return result;
    }
    if(r.kind==='convert'){
      if(!r.source)throw new Error('MISSING_MEDIA');const media=await probeStudioMedia(this.context.tool('ffprobe'),r.source,signal),format=['mp4','mp3','wav','webm'].includes(r.format??'')?r.format!:'mp4';
      const target=join(output,safeOutputName(r.name??'Converted',format)),args=['-v','error','-y','-i',r.source];
      if(format==='mp4'||format==='webm'){
        if(!media.width||!media.height)throw new Error('VIDEO_REQUIRED');
        const size=normalizeOutputPreset(r.conversionSize),width=size?.width||0,height=size?.height||0;
        // Fit inside the chosen bounds without stretching or upscaling.
        const ratio=Math.min(1,width?width/media.width:1,height?height/media.height:1);
        args.push('-vf',`scale=${Math.max(2,Math.floor(media.width*ratio/2)*2)}:${Math.max(2,Math.floor(media.height*ratio/2)*2)}`,'-pix_fmt','yuv420p');
      }
      if(format==='mp3'||format==='wav')args.push('-vn','-c:a',format==='mp3'?'libmp3lame':'pcm_s16le');
      else {args.push('-c:v',format==='webm'?'libvpx-vp9':'libx264','-c:a',format==='webm'?'libopus':'aac');if(r.targetMb&&Number.isFinite(r.targetMb)){const bitrate=Math.floor(r.targetMb*1024*1024*8/media.duration-128000);if(bitrate<64000)throw new Error('TARGET_SIZE_TOO_SMALL');args.push('-b:v',String(bitrate),'-b:a','128k');}else args.push('-crf',format==='webm'?'30':'20');}
      args.push(target);try{await studioProcess(this.context.tool('ffmpeg'),args,{signal});return {paths:[target]};}catch(error){await unlink(target).catch(()=>{});throw error;}
    }
    throw new Error('UNKNOWN_TASK');
  }
  async request(r:StudioRequest):Promise<StudioResponse>{
    try{
      await this.ready;if(!r||typeof r.action!=='string')throw new Error('INVALID_REQUEST');
      if(r.action==='jobs')return {ok:true,jobs:this.queue.list()};
      if(r.action==='dismiss-jobs'){
        if(!Array.isArray(r.ids)||r.ids.some(id=>typeof id!=='string'))throw new Error('INVALID_REQUEST');
        await this.queue.dismiss(r.ids,r.restoreJobs===true);return {ok:true,jobs:this.queue.list()};
      }
      if(r.action==='cancel'){if(r.id)this.controllers.get(r.id)?.abort();await this.queue.cancel(r.id??'');return {ok:true};}
      if(r.action==='retry'){await this.queue.retry(r.id??'');return {ok:true};}
      if(r.action==='move'){await this.queue.move(r.id??'',r.direction===-1?-1:1);return {ok:true};}
      if(r.action==='local-status')return {ok:true,local:this.ai.status()};
      if(r.action==='default-output'){
        if(!r.source||!isAbsolute(r.source)||!(await stat(r.source)).isFile())throw Error('MISSING_MEDIA');
        const directory=dirname(r.source);
        const error=await prepareDownloadDirectory(directory,process.platform,false);if(error)throw Error(error);
        return {ok:true,path:directory};
      }
      if(r.action==='speech-plan'){
        if(!r.source)throw Error('MISSING_MEDIA');
        const controller=new AbortController(),id=r.id??'speech-plan';this.controllers.set(id,controller);
        try{return {ok:true,speechPlan:await this.speechPlan(r.source,controller.signal)};}finally{this.controllers.delete(id);}
      }
      if(r.action==='read-transcript'){
        if(!r.source||(await stat(r.source)).size>16*1024*1024)throw new Error('INVALID_TRANSCRIPT');
        const transcript=normalizeTranscript(JSON.parse(await readFile(r.source,'utf8')));if(!transcript)throw new Error('INVALID_TRANSCRIPT');
        if(!transcript.cues.length)throw new Error('NO_SPEECH_DETECTED');
        return {ok:true,transcript};
      }
      if(r.action==='preview'){
        const controller=new AbortController(),id=r.id??'preview',cache=join(this.context.root,'studio-cache');this.controllers.set(id,controller);await mkdir(cache,{recursive:true});
        const input=r.render as {kind?:string};const payload={...input,kind:input.kind==='gif'?'video':input.kind}; const path=join(cache,safeOutputName('preview',payload.kind==='audio'?'mp3':payload.kind==='image'||payload.kind==='snapshot'?'png':'mp4'));
        try{await this.context.render(payload,path,controller.signal);this.cacheInUse.add(path);const thumbnail=r.thumbnail&&path.endsWith('.png')&&(await stat(path)).size<180000?'data:image/png;base64,'+(await readFile(path)).toString('base64'):undefined;return {ok:true,path,thumbnail};}catch(error){await unlink(path).catch(()=>{});throw error;}finally{this.controllers.delete(id);}
      }
      if(r.action==='prepare-local'){
        const controller=new AbortController(),id=r.id??'prepare-local';this.controllers.set(id,controller);
        try{await this.ai.run('prepare',{engine:r.engine,model:r.model},join(this.context.root,'local-ai'),controller.signal);return {ok:true,local:this.ai.status()};}finally{this.controllers.delete(id);}
      }
      if(r.action==='export-subtitles'){
        const cues=normalizeTranscript({language:'auto',cues:r.cues,words:[]})?.cues;if(!cues)throw new Error('INVALID_TRANSCRIPT');
        if(!cues.length)throw new Error('NO_SPEECH_DETECTED');
        const [directory]=await this.context.pick('directory',r.locale==='ar');if(!directory)return {ok:true,canceled:true};
        const format=r.subtitleFormat==='vtt'?'vtt':'srt',path=join(directory,safeOutputName(r.name??'Captions',format));await writeFile(path,serializeStudioSubtitles(cues,format),'utf8');return {ok:true,path};
      }
      if(r.action.startsWith('pick-'))return {ok:true,paths:await this.context.pick(r.action==='pick-directory'?'directory':r.action==='pick-images'?'images':r.action==='pick-audio'?'audio':r.action==='pick-project-media'?'project-media':'files',r.locale==='ar')};
      if(r.action==='save-project'){const [path]=await this.context.pick('save-project',r.locale==='ar');if(!path)return {ok:true,canceled:true};await savePortableProject(path,r.project,r.collect===true);return {ok:true,path};}
      if(r.action==='open-project'){const [path]=await this.context.pick('project',r.locale==='ar');if(!path)return {ok:true,canceled:true};return {ok:true,...await openPortableProject(path)};}
      if(r.action==='analyze'||r.action==='proxy'||r.action==='measure'){
        if(!r.source||!(await stat(r.source)).isFile())throw new Error('MISSING_MEDIA');
        const controller=new AbortController(),id=r.id??r.action;this.controllers.set(id,controller);
        try{if(r.action==='measure')return {ok:true,loudness:await measureStudioLoudness(this.context.tool('ffmpeg'),r.source,controller.signal)};
          if(r.action==='analyze')return {ok:true,analysis:await cachedStudioAnalysis(this.context.tool('ffmpeg'),this.context.tool('ffprobe'),r.source,join(this.context.root,'studio-cache'),controller.signal,Number.isFinite(r.threshold)?r.threshold:undefined,Number.isFinite(r.minimum)?r.minimum:undefined)};
          const path=await createStudioProxy(this.context.tool('ffmpeg'),r.source,join(this.context.root,'studio-cache'),controller.signal);this.cacheInUse.add(path);return {ok:true,path};
        }finally{this.controllers.delete(id);}
      }
      if(r.action==='enqueue'){
        if(!['render','convert','transcribe','separate'].includes(r.kind??''))throw new Error('UNKNOWN_TASK');
        if(JSON.stringify(r.render??{}).length>16*1024*1024)throw new Error('PROJECT_TOO_LARGE');
        if(r.edits)r={...r,edits:normalizeStudioEdits(r.edits)};
        const output=r.outputDirectory||(await this.context.pick('directory',r.locale==='ar'))[0];if(!output)return {ok:true,canceled:true};
        if(!isAbsolute(output)||!(await stat(output)).isDirectory())throw new Error('INVALID_OUTPUT_DIRECTORY');
        const sources=r.kind==='convert'?r.paths?.slice(0,200):[r.source];let id:string|undefined;
        if(r.kind==='render'&&r.renders?.length){for(const render of r.renders.slice(0,200)){const item=render as {label?:string;outputPreset?:{directory?:string}};id=await this.queue.add(String(item.label??r.name??'Clip'),'render',{request:{...r,name:item.label??r.name,render,renders:undefined},output:item.outputPreset?.directory||output});}}
        else for(const source of sources??[])id=await this.queue.add(r.name??r.kind!,r.kind!,{request:{...r,source},output},Number.isFinite(r.scheduledAt)?r.scheduledAt:undefined);
        return {ok:true,id,jobs:this.queue.list()};
      }
      if(r.action==='duplicates'){
        const bySize=new Map<number,string[]>();for(const path of [...new Set(r.paths??[])].slice(0,2000)){const info=await stat(path).catch(()=>undefined);if(info?.isFile()&&info.size>0)bySize.set(info.size,[...(bySize.get(info.size)??[]),path]);}
        const duplicates:{paths:string[];bytes:number}[]=[];
        for(const [size,paths] of bySize){if(paths.length<2)continue;const groups=new Map<string,string[]>();for(const path of paths){const before=await stat(path);if(before.size!==size)continue;const hash=createHash('sha256');for await(const chunk of createReadStream(path))hash.update(chunk);const after=await stat(path);if(after.size!==before.size||after.mtimeMs!==before.mtimeMs||after.ino!==before.ino)throw new Error('SOURCE_CHANGED');const key=hash.digest('hex');groups.set(key,[...(groups.get(key)??[]),path]);}for(const same of groups.values())if(same.length>1)duplicates.push({paths:same,bytes:size*(same.length-1)});}
        return {ok:true,duplicates};
      }
      if(r.action==='storage'||r.action==='clean-cache'){
        const directory=join(this.context.root,'studio-cache');let bytes=0;const busy=this.controllers.size>0||this.queue.list().some(j=>j.state==='running');
        if(r.action==='clean-cache'&&busy)throw new Error('CACHE_IN_USE');
        for(const entry of await readdir(directory,{withFileTypes:true}).catch(()=>[])){if(!entry.isFile())continue;const path=join(directory,entry.name);if(r.action==='clean-cache'&&!this.cacheInUse.has(path))await unlink(path);else bytes+=(await stat(path)).size;}
        return {ok:true,cacheBytes:bytes};
      }
      throw new Error('UNKNOWN_ACTION');
    }catch(error){return {ok:false,message:error instanceof Error?error.message:'TASK_FAILED'};}
  }
  async close(){for(const c of this.controllers.values())c.abort();await this.queue.stop();}
}
