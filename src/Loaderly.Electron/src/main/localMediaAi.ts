import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile, mkdtemp, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { studioProcess } from './studioProcess';
import type { Transcript } from '../shared/editor-project/studio';
import { LocalAiGate } from './localAiGate';
import { speechSampleOffsets, type SpeechAnalysis, type SpeechMode } from '../shared/speechPlan';

type AiAction='prepare'|'transcribe'|'separate'|'analyze-speech';
type AiInput={source?:string;duration?:number;engine?:'speech'|'separation';language?:string;model?:'base'|'small';speechMode?:SpeechMode;automatic?:boolean};

export class LocalMediaAi {
  private gate = new LocalAiGate();
  constructor(private root: string, private resources: string, private development: boolean, private ffmpeg: () => string) {}
  private runtime() {
    const binary=join(this.resources,this.development?'build':'','local-ai',process.platform==='win32'?'loaderly-ai.exe':'loaderly-ai');
    if(existsSync(binary))return {file:binary,prefix:[]};
    if(this.development && process.env.LOADERLY_AI_PYTHON && existsSync(process.env.LOADERLY_AI_PYTHON))return {file:process.env.LOADERLY_AI_PYTHON,prefix:[join(this.resources,'local-ai','worker.py')]};
    return undefined;
  }
  status() { const speechModels=(['base','small'] as const).filter(model=>existsSync(join(this.root,`speech-${model}-ready.json`)));return {runtime:!!this.runtime(),speech:speechModels.length>0,speechModels,separation:existsSync(join(this.root,'separation-ready.json'))}; }
  async run(action:AiAction, input:AiInput, output:string, signal?:AbortSignal, progress?:(value:number)=>void):Promise<{paths?:string[];transcript?:Transcript;analysis?:SpeechAnalysis}> {
    return this.gate.run(() => { progress?.(0); return this.execute(action, input, output, signal, progress); }, signal);
  }
  private async execute(action:AiAction, input:AiInput, output:string, signal?:AbortSignal, progress?:(value:number)=>void):Promise<{paths?:string[];transcript?:Transcript;analysis?:SpeechAnalysis}> {
    const runtime=this.runtime(); if(!runtime)throw new Error('LOCAL_RUNTIME_NOT_INSTALLED');
    const engine=input.engine??(action==='separate'?'separation':'speech');
    if(action!=='prepare' && action!=='analyze-speech' && (engine==='speech'?!this.status().speechModels.includes(input.model??'base'):!this.status().separation))throw new Error('LOCAL_MODEL_NOT_INSTALLED');
    await mkdir(this.root,{recursive:true}); await mkdir(output,{recursive:true}); const directory=await mkdtemp(join(this.root,'task-'));
    try {
      let source=input.source;
      if(action==='analyze-speech'){
        const offsets=speechSampleOffsets(input.duration!);source=join(directory,'sample.wav');
        const args=offsets.flatMap(offset=>['-ss',String(offset),'-t',String(offsets.length===1?24:8),'-i',input.source!]);
        const filters=offsets.map((_,i)=>`[${i}:a:0]aresample=16000,aformat=channel_layouts=mono[a${i}]`).join(';')+';'+offsets.map((_,i)=>`[a${i}]`).join('')+`concat=n=${offsets.length}:v=0:a=1[out]`;
        await studioProcess(this.ffmpeg(),['-v','error','-y',...args,'-filter_complex',filters,'-map','[out]','-ac','1','-ar','16000',source],{signal});
      }
      if(action==='separate') {source=join(directory,'source.wav'); await studioProcess(this.ffmpeg(),['-v','error','-y','-i',input.source!,'-vn','-ar','44100','-ac','2','-c:a','pcm_f32le',source],{signal});}
      const request=join(directory,'request.json'); await writeFile(request,JSON.stringify({action,engine,source,output,cache:join(this.root,'models'),language:input.language??'auto',model:input.model??'base',speechMode:input.speechMode??'speech',automatic:input.automatic===true}));
      const result=await studioProcess(runtime.file,[...runtime.prefix,'--request',request],{signal,env:{...process.env,PYTHONIOENCODING:'utf-8',PYTHONUTF8:'1',HF_HUB_DISABLE_TELEMETRY:'1'},onErrorLine:line=>{try{const p=JSON.parse(line);if(p.duration>0&&p.seconds>=0)progress?.(p.seconds/p.duration*100);}catch{/* Library logging is not a progress record. */}}});
      const record=JSON.parse(result.stdout.toString('utf8').trim().split('\n').at(-1)??'{}'); if(!record.ok)throw new Error(record.message??'LOCAL_TASK_FAILED');
      if(action==='prepare')await writeFile(join(this.root,`${engine==='speech'?`speech-${input.model??'base'}`:engine}-ready.json`),JSON.stringify({model:input.model??'base',installedAt:new Date().toISOString()}));
      if(action==='transcribe' && !record.transcript)record.transcript=JSON.parse(await readFile(join(output,'transcript.json'),'utf8'));
      return {paths:record.paths,transcript:record.transcript,analysis:record.analysis};
    } catch(error) {
      if(action!=='prepare')for(const file of ['transcript.partial','vocals.partial','instrumental.partial'])await unlink(join(output,file)).catch(()=>{});
      // The worker reports structured failures on stdout before exiting nonzero.
      // Preserve actionable model failures without exposing runtime tracebacks.
      const stdout=(error as {stdout?:string})?.stdout;
      if(stdout){let message:string|undefined;try{message=JSON.parse(stdout.trim().split('\n').at(-1)??'{}').message;}catch{/* Not a worker response. */}
        if(message==='MODEL_INTEGRITY_FAILED')throw new Error(message);
      }
      throw error;
    } finally { await rm(directory,{recursive:true,force:true}); }
  }
}
