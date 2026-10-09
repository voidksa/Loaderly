import {describe,it,expect} from 'vitest';
import {defaultVisualizer,encodeVisualizer,decodeVisualizer,normalizeVisualizer,visualizerShapePresets} from './audioVisualizer';
import {sampleShape,shapeCurve,fitShape} from './audioVisualizerDrawing';
describe('shareable visualizer appearance',()=>{
  it('round trips an independent appearance, including Arabic labels',()=>{
    const value={...defaultVisualizer,style:'ring' as const,title:'ليل هادئ',showTitle:false,count:120};
    expect(decodeVisualizer(encodeVisualizer(value))).toEqual(value);
  });
  it('rejects unrelated, malformed and oversized files',()=>{
    for(const source of ['{','{}',JSON.stringify({format:'loaderly-theme',version:1,settings:{}}),JSON.stringify({format:'loaderly-visualizer',version:3,settings:{}}),' '.repeat(16001)]) expect(decodeVisualizer(source)).toBeUndefined();
  });
  it('bounds rendering work and excludes unknown fields and unsafe colors',()=>{
    const value=normalizeVisualizer({count:999999,width:-1,sensitivity:Infinity,color:'url(https://example.test)',style:'script',title:'a'.repeat(500),apiKey:'private'});
    expect(value.count).toBe(160);expect(value.width).toBe(20);expect(value.sensitivity).toBe(1);expect(value.color).toBe(defaultVisualizer.color);expect(value.title).toHaveLength(160);expect(value).not.toHaveProperty('apiKey');
  });
  it('imports version 1 looks without changing their original style',()=>{
    const value=decodeVisualizer(JSON.stringify({format:'loaderly-visualizer',version:1,settings:{style:'wave',color:'#123456'}}));
    expect(value?.style).toBe('wave');expect(value?.color).toBe('#123456');expect(value?.shape.points.length).toBe(4);
  });
  it('round trips all custom paths without including unrelated fields',()=>{
    for(const preset of visualizerShapePresets){
      const value=normalizeVisualizer({...defaultVisualizer,style:'path',shape:preset.shape});
      expect(decodeVisualizer(encodeVisualizer(value))).toEqual(value);
      const samples=sampleShape(value.shape,160);expect(samples).toHaveLength(160);
      for(const {point,normal} of samples){expect(point.every(n=>Number.isFinite(n)&&n>=0&&n<=1)).toBe(true);expect(Math.hypot(...normal)).toBeCloseTo(1,5);}
    }
  });
  it('bounds imported points and keeps degenerate paths safe to render',()=>{
    const value=normalizeVisualizer({style:'path',shape:{points:Array.from({length:1000},(_,i)=>[i%2?-100:100,i/1000]),script:'alert(1)'}});
    expect(value.shape.points.length).toBeLessThanOrEqual(64);expect(value.shape).not.toHaveProperty('script');
    expect(shapeCurve(value.shape).every(p=>p.every(n=>n>=0&&n<=1))).toBe(true);
    expect(sampleShape({points:[[.5,.5],[.5,.5]],smooth:false,closed:false,mirror:false},80)).toEqual([]);
    expect(normalizeVisualizer({shape:{points:[[NaN,Infinity],['x',2]]}}).shape.points).toEqual(defaultVisualizer.shape.points);
  });
  it('places open path endpoints at the first and last samples',()=>{
    const samples=sampleShape({points:[[.1,.5],[.9,.5]],smooth:false,closed:false,mirror:true},16);
    expect(samples[0].point).toEqual([.1,.5]);expect(samples.at(-1)?.point).toEqual([.9,.5]);
  });
  it('fits a shallow hand-drawn curve to the available width while preserving its aspect',()=>{
    const shape={points:[[.1,.5],[.5,.45],[.9,.5]] as [number,number][],closed:false,smooth:true,mirror:true,aspect:2.5,amplitude:.5};
    const fit=fitShape(shape,800,400),points=sampleShape(shape,80);
    const xs=points.map(p=>fit.x+p.point[0]*fit.scale),ys=points.map(p=>fit.y+p.point[1]*fit.scale);
    expect(Math.max(...xs)-Math.min(...xs)).toBeGreaterThan(650);
    expect(Math.min(...xs)-fit.reach).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)+fit.reach).toBeLessThanOrEqual(800);
    expect(Math.min(...ys)-fit.reach).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ys)+fit.reach).toBeLessThanOrEqual(400);
    expect(points.at(-1)!.point[0]-points[0].point[0]).toBeCloseTo(2);
  });
  it('bounds movement strength and preserves it in shared shapes',()=>{
    const value=normalizeVisualizer({style:'path',shape:{...defaultVisualizer.shape,amplitude:0,aspect:2.5}});
    expect(decodeVisualizer(encodeVisualizer(value))).toEqual(value);
    expect(fitShape(value.shape,500,300).reach).toBe(0);
    expect(normalizeVisualizer({shape:{amplitude:30,aspect:999}}).shape.amplitude).toBe(1);
    expect(normalizeVisualizer({shape:{amplitude:-1,aspect:-1}}).shape.aspect).toBe(.25);
  });
});
