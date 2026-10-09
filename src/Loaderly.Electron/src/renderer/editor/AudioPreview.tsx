import { useEffect, useRef, type RefObject } from 'react';
import { audioOutputTime, type AudioSettings, type AudioTimeline } from '../../shared/editor-project/audioProcessing';
import { defaultVisualizer, type AudioVisualizerSettings } from '../../shared/editor-project/audioVisualizer';
import { drawVisualizer } from '../../shared/editor-project/audioVisualizerDrawing';
import { speedTone } from '../../shared/editor-project/speedSound';

type Graph = {context: AudioContext; bass: BiquadFilterNode; treble: BiquadFilterNode; toneBass: BiquadFilterNode; toneTreble: BiquadFilterNode; highpass: BiquadFilterNode; lowpass: BiquadFilterNode; mix: GainNode; gain: GainNode; analyser: AnalyserNode};
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
  source.connect(toneBass).connect(toneTreble).connect(highpass).connect(lowpass).connect(bass).connect(treble).connect(mix).connect(gain).connect(analyser).connect(context.destination);
  return { context, bass, treble, toneBass, toneTreble, highpass, lowpass, mix, gain, analyser };
}
export function useAudioPreview(mediaRef: RefObject<HTMLMediaElement | null>, settings: AudioSettings, timeline: AudioTimeline) {
  const analyser = useRef<AnalyserNode | null>(null), latest = useRef({ settings, timeline });
  latest.current = { settings, timeline };
  useEffect(() => {
    let frame = 0, active: HTMLMediaElement | null = null, graph: Graph | null = null;
    const resume = () => { if (graph?.context.state === 'suspended') void graph.context.resume().catch(() => {}); };
    const release = () => {
      active?.removeEventListener('playing', resume);
      if (graph) void graph.context.close();
      active = null; graph = null; analyser.current = null;
    };
    const tick = () => {
      frame = requestAnimationFrame(tick);
      const media = mediaRef.current;
      if (active && active !== media) release();
      if (!media || media.readyState < 1) return;
      if (!graph) {
        graph = createGraph(media); active = media;
        media.addEventListener('playing', resume);
        if (!media.paused) resume();
      }
      const { settings: s, timeline: t } = latest.current;
      const speed = t.speeds?.find(item => media.currentTime >= item.startTime && media.currentTime < item.endTime);
      media.playbackRate = speed?.rate ?? 1;
      media.preservesPitch = speed?.mode !== 'normal';
      const tone = speedTone(speed?.mode);
      graph.toneBass.gain.value = tone.bass; graph.toneTreble.gain.value = tone.treble;
      graph.highpass.type = tone.highpass ? 'highpass' : 'allpass';
      graph.lowpass.type = tone.lowpass ? 'lowpass' : 'allpass';
      graph.highpass.frequency.value = tone.highpass || 300;
      graph.lowpass.frequency.value = tone.lowpass || 3400;
      const position = audioOutputTime(media.currentTime, t), duration = audioOutputTime(Number.POSITIVE_INFINITY, t);
      const fadeIn = s.fadeIn ? Math.min(1, position / Math.min(s.fadeIn, duration || 1)) : 1;
      const fadeOut = s.fadeOut ? Math.min(1, Math.max(0, duration - position) / Math.min(s.fadeOut, duration || 1)) : 1;
      graph.bass.gain.value = s.bass; graph.treble.gain.value = s.treble;
      graph.mix.channelCount = s.mono ? 1 : 2; graph.mix.channelCountMode = 'explicit';
      graph.gain.gain.value = s.muted ? 0 : 10 ** (s.gainDb / 20) * fadeIn * fadeOut;
      analyser.current = graph.analyser;
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); release(); };
  }, [mediaRef]);
  return analyser;
}
export function AudioVisualizer({ analyser, playing, settings = defaultVisualizer }: { analyser: RefObject<AnalyserNode | null>; playing: boolean; settings?:AudioVisualizerSettings }) {
  const ref = useRef<HTMLCanvasElement>(null), latest = useRef({playing,settings}); latest.current={playing,settings};
  useEffect(() => {
    let frame = 0;
    const spectrum = new Uint8Array(1024), waveform = new Uint8Array(2048);
    const draw = () => {
      frame = requestAnimationFrame(draw);
      const canvas = ref.current, ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      const {playing,settings:s}=latest.current;
      const width=Math.max(1,canvas.clientWidth),height=Math.max(1,canvas.clientHeight),dpr=Math.min(devicePixelRatio,2);
      if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);}
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
      if(analyser.current&&playing){analyser.current.smoothingTimeConstant=s.smoothing;analyser.current.getByteFrequencyData(spectrum);analyser.current.getByteTimeDomainData(waveform);}else {spectrum.fill(0);waveform.fill(128);}
      drawVisualizer(ctx,width,height,s,spectrum,waveform);
    };
    frame=requestAnimationFrame(draw);return()=>cancelAnimationFrame(frame);
  },[analyser]);
  return <canvas ref={ref} className="audio-visualizer" aria-hidden="true" />;
}
