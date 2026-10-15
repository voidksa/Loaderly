import {BrowserWindow} from 'electron';
import {spawn} from 'node:child_process';
import {mkdtemp,rm,open,stat,rename,unlink} from 'node:fs/promises';
import {join,dirname,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {AudioSpectrum} from '../shared/editor-project/audioSpectrum';
import {normalizeVisualizer} from '../shared/editor-project/audioVisualizer';
import {videoDimensions,type VisualizerVideoOptions,type VisualizerExportProgress} from '../shared/editor-project/visualizerVideo';

export async function runEncoder(executable:string,args:readonly string[],signal:AbortSignal){
  signal.throwIfAborted();
  await new Promise<void>((resolve,reject)=>{const child=spawn(executable,[...args],{windowsHide:true,signal,stdio:['ignore','ignore','pipe']});let message='';child.stderr.on('data',data=>{message=(message+data).slice(-3000);});child.once('error',reject);child.once('close',code=>code===0?resolve():reject(Error(message||'Media processing failed')));});
}
export async function exportVisualizerVideo(input:{sourcePath:string;outputPath:string;options:VisualizerVideoOptions;ffmpeg:string;signal:AbortSignal;prepareAudio:(path:string,signal:AbortSignal)=>Promise<void>;notify:(progress:VisualizerExportProgress)=>void}) {
  const {outputPath,ffmpeg,signal,notify}=input;
  if(resolve(outputPath)===resolve(input.sourcePath))throw Error('Choose a different output file');
  const scene={...input.options.scene,settings:normalizeVisualizer(input.options.scene.settings)};
  scene.title=String(scene.title??'').slice(0,160);
  for(const key of ['logoX','logoY','logoSize'] as const)scene[key]=Math.max(key==='logoSize'?5:0,Math.min(100,Number(scene[key])||20));
  if(scene.image && (scene.image.length>12_000_000||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(scene.image)))throw Error('Choose a PNG, JPEG or WebP image under 8 MB');
  const [width,height]=videoDimensions(input.options),workspace=await mkdtemp(join(tmpdir(),'Loaderly-video-')),audio=join(workspace,'audio.wav'),pcm=join(workspace,'audio.f32');
  const partial=join(dirname(outputPath),`.Loaderly-${randomUUID()}.mp4`);let window:BrowserWindow|undefined;
  try {
    notify({phase:'preparing',percent:0});await input.prepareAudio(audio,signal);
    await runEncoder(ffmpeg,['-v','error','-y','-i',audio,'-ac','1','-ar','48000','-f','f32le',pcm],signal);
    const length=(await stat(pcm)).size/4,duration=length/48000,frames=Math.ceil(duration*30);
    if(!frames)throw Error('No audio in selected range');
    window=new BrowserWindow({show:false,width,height,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
    window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
    if(process.env.ELECTRON_RENDERER_URL)await window.loadURL(process.env.ELECTRON_RENDERER_URL+'/visualizer.html');else await window.loadFile(join(__dirname,'../renderer/visualizer.html'));
    await window.webContents.executeJavaScript(`window.visualizerRenderer.setup(${JSON.stringify(scene)},${width},${height},${JSON.stringify(input.options.captions??[])})`);
    const child=spawn(ffmpeg,['-v','error','-y','-f','image2pipe','-framerate','30','-i','pipe:0','-i',audio,'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-t',String(duration),'-movflags','+faststart',partial],{windowsHide:true,signal,stdio:['pipe','ignore','pipe']});
    let failure:Error|undefined,message='';child.stderr.on('data',data=>{message=(message+data).slice(-2000);});
    const finished=new Promise<void>((res,rej)=>{child.once('error',rej);child.once('close',code=>code===0?res():rej(Error(message||'Video encoding failed')));});
    void finished.catch(error=>{failure=error;});child.stdin.on('error',error=>{failure=error;});
    const file=await open(pcm,'r'),analyser=new AudioSpectrum();
    try {for(let frame=0;frame<frames;frame++){
      signal.throwIfAborted();if(failure)throw failure;
      const end=Math.min(length,Math.round(frame/30*48000)),start=Math.max(0,end-2048),bytes=Buffer.alloc(8192);
      await file.read(bytes,(2048-(end-start))*4,(end-start)*4,start*4);
      const samples=Float32Array.from({length:2048},(_,i)=>bytes.readFloatLE(i*4)),data=analyser.frame(samples,scene.settings.smoothing);
      const png=await window.webContents.executeJavaScript(`window.visualizerRenderer.frame(${JSON.stringify(Array.from(data.spectrum))},${JSON.stringify(Array.from(data.waveform))},${frame/30})`) as string;
      await new Promise<void>((res,rej)=>child.stdin.write(Buffer.from(png,'base64'),error=>error?rej(error):res()));
      if(frame%15===0)notify({phase:'rendering',percent:Math.floor(frame/frames*98)});
    }child.stdin.end();notify({phase:'finishing',percent:99});await finished;
    }catch(error){child.kill();await finished.catch(()=>{});throw error;}finally{await file.close();}
    signal.throwIfAborted();await rename(partial,outputPath);notify({phase:'complete',percent:100,path:outputPath});return {ok:true,path:outputPath};
  }finally{window?.destroy();await unlink(partial).catch(()=>{});await rm(workspace,{recursive:true,force:true});}
}
