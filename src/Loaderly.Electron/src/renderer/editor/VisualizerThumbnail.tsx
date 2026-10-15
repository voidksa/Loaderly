import {useEffect, useRef} from 'react';
import {normalizeVisualizer} from '../../shared/editor-project/audioVisualizer';
import {drawVisualizer} from '../../shared/editor-project/audioVisualizerDrawing';

// The same renderer as playback/export, with a fixed sample for still previews.
const spectrum = Uint8Array.from({length:1024},(_,i)=>Math.round(90+100*Math.abs(Math.sin(i*.043))*Math.exp(-i/600)));
const wave = Uint8Array.from({length:2048},(_,i)=>128+Math.round(48*Math.sin(i*.035)*Math.sin(i*.004)));
export function VisualizerThumbnail({settings}:{settings:unknown}) {
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const ctx=ref.current?.getContext('2d');if(!ctx)return;
    const s=normalizeVisualizer(settings);
    ctx.fillStyle=s.background;ctx.fillRect(0,0,220,80);
    ctx.save();ctx.translate(8,7);drawVisualizer(ctx,204,66,{...s,count:Math.min(s.count,80),glow:Math.min(s.glow,4)},spectrum,wave);ctx.restore();
  },[settings]);
  return <canvas ref={ref} width={220} height={80} aria-hidden="true"/>;
}
