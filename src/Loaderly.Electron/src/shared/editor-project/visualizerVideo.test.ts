import {describe,expect,it} from 'vitest';
import {defaultVisualizer,normalizeVisualizer} from './audioVisualizer';
import {layoutVisualizerScene} from './visualizerVideo';

describe('visualizer caption placement',()=>{
  it('moves titles with the spectrum instead of clamping text independently',()=>{
    const s=normalizeVisualizer({...defaultVisualizer,height:25,title:'Hr',subtitle:'Rh',showTitle:true,showSubtitle:true});
    const first=layoutVisualizerScene(1280,720,{...s,positionY:30});
    const moved=layoutVisualizerScene(1280,720,{...s,positionY:60});
    expect(moved.titleY-first.titleY).toBeCloseTo(moved.cy-first.cy);
    expect(moved.subtitleY-first.subtitleY).toBeCloseTo(moved.cy-first.cy);
    expect(moved.cy).toBeGreaterThan(first.cy);
  });
  it.each([[1280,720],[720,1280],[1080,1080]])('keeps both captions below the spectrum and within %s x %s', (width,height)=>{
    for(const positionY of [10,50,74,90]) for(const textSize of [10,24,48]) {
      const s=normalizeVisualizer({...defaultVisualizer,width:100,height:80,positionY,textSize,subtitle:'نص إضافي',showTitle:true,showSubtitle:true});
      const p=layoutVisualizerScene(width,height,s);
      expect(p.h).toBeGreaterThan(0);
      expect(p.cy-p.h/2).toBeGreaterThanOrEqual(p.padding-.001);
      expect(p.titleY).toBeGreaterThan(p.cy+p.h/2);
      expect(p.subtitleY).toBeGreaterThan(p.titleY+p.font);
      expect(p.titleY+p.textHeight).toBeLessThanOrEqual(height-p.padding+.001);
      expect(p.cx-p.w/2).toBeGreaterThanOrEqual(p.padding-.001);
      expect(p.cx+p.w/2).toBeLessThanOrEqual(width-p.padding+.001);
    }
  });
  it('uses the same proportional positions in preview and video export',()=>{
    const s=normalizeVisualizer({...defaultVisualizer,positionY:90,subtitle:'Rh',showTitle:true,showSubtitle:true,textSize:48});
    const preview=layoutVisualizerScene(480,270,s),video=layoutVisualizerScene(1920,1080,s);
    for(const key of ['w','h','cx','cy','font','titleY','subtitleY','textHeight','padding'] as const) expect(video[key]).toBeCloseTo(preview[key]*4);
  });
  it('does not reserve blank subtitle or hidden title space',()=>{
    const p=layoutVisualizerScene(1280,720,{...defaultVisualizer,showTitle:false,showSubtitle:true,subtitle:''});
    expect(p.textHeight).toBe(0);
    expect(p.titleY).toBe(p.cy+p.h/2);
  });
});
