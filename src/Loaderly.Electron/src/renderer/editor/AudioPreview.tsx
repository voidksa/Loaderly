import type {AudioSection} from '../../shared/editor-project/audioSections';
import {drawVisualizerScene,type VisualizerVideoScene} from '../../shared/editor-project/visualizerVideo';
import {useEffect,useRef,type RefObject} from 'react';
import type {AudioSettings,AudioTimeline} from '../../shared/editor-project/audioProcessing';
import {defaultVisualizer,type AudioVisualizerSettings} from '../../shared/editor-project/audioVisualizer';
import {drawVisualizer} from '../../shared/editor-project/audioVisualizerDrawing';
import {startAudioPreview} from './audioPreviewEngine';

export function useAudioPreview(mediaRef:RefObject<HTMLMediaElement|null>,settings:AudioSettings,timeline:AudioTimeline,sections:readonly AudioSection[]=[]){
 const analyser=useRef<AnalyserNode|null>(null),latest=useRef({settings,timeline,sections});
 latest.current={settings,timeline,sections};
 useEffect(()=>startAudioPreview(()=>mediaRef.current,()=>latest.current,node=>{analyser.current=node;}),[mediaRef]);
 return analyser;
}
export function AudioVisualizer({ analyser, playing, settings = defaultVisualizer, scene }: { analyser: RefObject<AnalyserNode | null>; playing: boolean; settings?:AudioVisualizerSettings;scene?:VisualizerVideoScene }) {
  const ref = useRef<HTMLCanvasElement>(null), latest = useRef({playing,settings,scene}); latest.current={playing,settings,scene};
  const sceneImage=useRef<HTMLImageElement|undefined>(undefined);
  useEffect(()=>{sceneImage.current=undefined;if(!scene?.image)return;const image=new Image();image.src=scene.image;let active=true;void image.decode().then(()=>{if(active)sceneImage.current=image;}).catch(()=>{});return()=>{active=false;};},[scene?.image]);
  useEffect(() => {
    let frame = 0;
    const spectrum = new Uint8Array(1024), waveform = new Uint8Array(2048);
    const draw = () => {
      frame = requestAnimationFrame(draw);
      const canvas = ref.current, ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      const {playing,settings:s,scene:composition}=latest.current;
      const width=Math.max(1,canvas.clientWidth),height=Math.max(1,canvas.clientHeight),dpr=Math.min(devicePixelRatio,2);
      if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);}
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
      if(analyser.current&&playing){analyser.current.smoothingTimeConstant=s.smoothing;analyser.current.getByteFrequencyData(spectrum);analyser.current.getByteTimeDomainData(waveform);}else {spectrum.fill(0);waveform.fill(128);}
      if(composition)drawVisualizerScene(ctx,width,height,composition,spectrum,waveform,sceneImage.current);else drawVisualizer(ctx,width,height,s,spectrum,waveform);
    };
    frame=requestAnimationFrame(draw);return()=>cancelAnimationFrame(frame);
  },[analyser]);
  return <canvas ref={ref} className="audio-visualizer" aria-hidden="true" />;
}
