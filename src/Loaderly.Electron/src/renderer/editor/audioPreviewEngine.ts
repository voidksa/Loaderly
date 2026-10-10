import {audioSectionAt,type AudioSection} from '../../shared/editor-project/audioSections';
import {audioOutputTime,type AudioSettings,type AudioTimeline} from '../../shared/editor-project/audioProcessing';
import {speedTone} from '../../shared/editor-project/speedSound';
import {normalizeAudioSpace,spaceImpulse} from '../../shared/editor-project/audioSpace';

type Graph = {context: AudioContext; bass: BiquadFilterNode; treble: BiquadFilterNode; toneBass: BiquadFilterNode; toneTreble: BiquadFilterNode; highpass: BiquadFilterNode; lowpass: BiquadFilterNode; mix: GainNode; gain: GainNode; analyser: AnalyserNode; convolver: ConvolverNode; bypass: GainNode; effect: GainNode; spaceKey: string; spaceUpdated: number};
function createGraph(media: HTMLMediaElement): Graph {
  const context = new AudioContext(), source = context.createMediaElementSource(media);
  const bass = context.createBiquadFilter(), treble = context.createBiquadFilter();
  const mix = context.createGain(), gain = context.createGain(), analyser = context.createAnalyser();
  const toneBass = context.createBiquadFilter(), toneTreble = context.createBiquadFilter(), highpass = context.createBiquadFilter(), lowpass = context.createBiquadFilter();
  toneBass.type = 'lowshelf'; toneBass.frequency.value = 200;
  toneTreble.type = 'highshelf'; toneTreble.frequency.value = 3000;
  highpass.Q.value = lowpass.Q.value = Math.SQRT1_2;
  bass.type = 'lowshelf'; bass.frequency.value = 200;
  treble.type = 'highshelf'; treble.frequency.value = 3000;
  analyser.fftSize = 2048;
  const convolver = context.createConvolver(), bypass = context.createGain(), effect = context.createGain();
  convolver.normalize = false; effect.gain.value = 0;
  source.connect(toneBass).connect(toneTreble).connect(highpass).connect(lowpass).connect(bass).connect(treble);
  treble.connect(bypass).connect(mix); treble.connect(convolver).connect(effect).connect(mix);
  mix.connect(gain).connect(analyser).connect(context.destination);
  return { context, bass, treble, toneBass, toneTreble, highpass, lowpass, mix, gain, analyser, convolver, bypass, effect, spaceKey: '', spaceUpdated: -Infinity };
}

export type AudioPreviewState={settings:AudioSettings;timeline:AudioTimeline;sections:readonly AudioSection[]};
// Audio follows the media clock, even when the window is minimized and no frame is drawn.
export function startAudioPreview(getMedia:()=>HTMLMediaElement|null,getState:()=>AudioPreviewState,onAnalyser:(node:AnalyserNode|null)=>void){
 let active:HTMLMediaElement|null=null,graph:Graph|null=null,resetSpace=false;
 const resume=()=>{if(graph?.context.state==='suspended')void graph.context.resume().catch(()=>{});tick();};
 const seek=()=>{resetSpace=true;tick();};
 const events=['play','pause','timeupdate','loadedmetadata','seeked'] as const;
 const release=()=>{
  if(active){active.removeEventListener('playing',resume);active.removeEventListener('seeking',seek);active.removeEventListener('emptied',seek);for(const name of events)active.removeEventListener(name,tick);}
  if(graph)void graph.context.close().catch(()=>{});
  active=null;graph=null;onAnalyser(null);
 };
 function tick(){
  const media=getMedia();
  if(active&&active!==media)release();
  if(!media||media.readyState<1){if(graph)graph.gain.gain.value=0;return;}
  if(!graph){
   graph=createGraph(media);active=media;resetSpace=false;onAnalyser(graph.analyser);
   media.addEventListener('playing',resume);media.addEventListener('seeking',seek);media.addEventListener('emptied',seek);for(const name of events)media.addEventListener(name,tick);
   if(!media.paused&&graph.context.state==='suspended')void graph.context.resume().catch(()=>{});
  }
      const {settings:base,timeline:t,sections:parts}=getState();
      const s=audioSectionAt(parts,media.currentTime)?.settings??base;
      const space = normalizeAudioSpace(s.space), spaceKey = JSON.stringify(space);
      if ((spaceKey !== graph.spaceKey || resetSpace) && performance.now() - graph.spaceUpdated > 120) {
        if (space.enabled && space.mix > 0) {
          const impulse = spaceImpulse(space, graph.context.sampleRate), buffer = graph.context.createBuffer(2, impulse[0].length, graph.context.sampleRate);
          buffer.copyToChannel(new Float32Array(impulse[0]), 0); buffer.copyToChannel(new Float32Array(impulse[1]), 1);
          graph.convolver.buffer = buffer;
        }
        graph.bypass.gain.setTargetAtTime(space.enabled && space.mix > 0 ? 0 : 1, graph.context.currentTime, .015);
        graph.effect.gain.setTargetAtTime(space.enabled && space.mix > 0 ? 1 : 0, graph.context.currentTime, .015);
        graph.spaceKey = spaceKey; graph.spaceUpdated = performance.now(); resetSpace = false;
      }
      const speed = t.speeds?.find(item => media.currentTime >= item.startTime && media.currentTime < item.endTime);
      const rate = speed?.rate ?? 1;
      if (media.playbackRate !== rate) media.playbackRate = rate;
      const preservesPitch = speed?.mode !== 'normal';
      if (media.preservesPitch !== preservesPitch) media.preservesPitch = preservesPitch;
      const tone = speedTone(speed?.mode);
      graph.toneBass.gain.value = tone.bass; graph.toneTreble.gain.value = tone.treble;
      graph.highpass.type = tone.highpass ? 'highpass' : 'allpass';
      graph.lowpass.type = tone.lowpass ? 'lowpass' : 'allpass';
      graph.highpass.frequency.value = tone.highpass || 300;
      graph.lowpass.frequency.value = tone.lowpass || 3400;
      const position = audioOutputTime(media.currentTime, t), duration = audioOutputTime(Number.POSITIVE_INFINITY, t);
      const fadeIn = base.fadeIn ? Math.min(1, position / Math.min(base.fadeIn, duration || 1)) : 1;
      const fadeOut = base.fadeOut ? Math.min(1, Math.max(0, duration - position) / Math.min(base.fadeOut, duration || 1)) : 1;
      graph.bass.gain.value = s.bass; graph.treble.gain.value = s.treble;
      graph.mix.channelCount = s.mono ? 1 : 2; graph.mix.channelCountMode = 'explicit';
      graph.gain.gain.value = s.muted || media.paused ? 0 : 10 ** (s.gainDb / 20) * fadeIn * fadeOut;


 }
 tick();const timer=setInterval(tick,40);
 return()=>{clearInterval(timer);release();};
}
