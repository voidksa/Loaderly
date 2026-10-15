import {describe,it,expect} from 'vitest';
import {applyVisualizerPreset,visualizerPresets,defaultVisualizer,encodeVisualizer,decodeVisualizer,normalizeVisualizer,visualizerShapePresets,visualizerCodeLimit} from './audioVisualizer';
import {sampleShape,shapeCurve,fitShape,sampleContours,drawVisualizer} from './audioVisualizerDrawing';
describe('shareable visualizer appearance',()=>{
  it('round trips an independent appearance, including Arabic labels',()=>{
    const value={...defaultVisualizer,style:'ring' as const,title:'ليل هادئ',showTitle:false,count:120};
    expect(decodeVisualizer(encodeVisualizer(value))).toEqual(value);
  });
  it('rejects unrelated, malformed and oversized files',()=>{
    for(const source of ['{','{}',JSON.stringify({format:'loaderly-theme',version:1,settings:{}}),JSON.stringify({format:'loaderly-visualizer',version:4,settings:{}}),' '.repeat(visualizerCodeLimit+1)]) expect(decodeVisualizer(source)).toBeUndefined();
  });
  it('bounds rendering work and excludes unknown fields and unsafe colors',()=>{
    const value=normalizeVisualizer({count:999999,width:-1,sensitivity:Infinity,color:'url(https://example.test)',style:'script',title:'a'.repeat(500),apiKey:'private'});
    expect(value.count).toBe(160);expect(value.width).toBe(20);expect(value.sensitivity).toBe(defaultVisualizer.sensitivity);expect(value.color).toBe(defaultVisualizer.color);expect(value.title).toHaveLength(160);expect(value).not.toHaveProperty('apiKey');
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
      expect(shapeCurve(value.shape).every(point=>point.every(n=>Number.isFinite(n)&&n>=0&&n<=1))).toBe(true);
      for(const {point,normal} of samples){expect(point.every((n,i)=>Number.isFinite(n)&&n>=0&&n<=(i===0?(value.shape.aspect??1):1))).toBe(true);expect(Math.hypot(...normal)).toBeCloseTo(1,5);}
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
  it('round trips words, independent contours, finishes and horizontal placement',()=>{
    const settings=normalizeVisualizer({...defaultVisualizer,style:'path',positionX:40,count:800,shape:{paths:[{points:[[0,0],[.2,1]],closed:false},{points:[[.8,0],[1,1]],closed:false}],aspect:8,stroke:'line',thickness:3,typography:{text:'صوت AB',font:'modern',weight:600,spacing:2,slant:5,stretch:90}}});
    const code=encodeVisualizer(settings);expect(JSON.parse(code).version).toBe(3);expect(decodeVisualizer(code)).toEqual(settings);expect(settings.count).toBe(800);
    const parts=sampleContours(settings.shape,800);expect(parts).toHaveLength(2);expect(parts[0].every(p=>p.point[0]<=1.6)).toBe(true);expect(parts[1].every(p=>p.point[0]>=6.4)).toBe(true);
    const fit=fitShape(settings.shape,800,400);expect(fit.x+8*fit.scale+fit.reach).toBeLessThanOrEqual(800);
  });
  it('bounds compound geometry and rejects unknown typography fields',()=>{
    const paths=Array.from({length:1000},()=>({points:Array.from({length:1000},(_,i)=>[i/1000,1]),closed:true}));
    const shape=normalizeVisualizer({shape:{paths,stroke:'script',thickness:999,typography:{text:'a'.repeat(100),font:'remote-font',url:'https://example.test'}}}).shape;
    expect(shape.paths!.length).toBeLessThanOrEqual(96);expect(shape.paths!.reduce((n,p)=>n+p.points.length,0)).toBeLessThanOrEqual(4096);expect(shape.paths!.every(p=>p.points.length<=256)).toBe(true);expect(shape.thickness).toBe(8);expect(shape.typography!.text).toHaveLength(40);expect(shape.typography).not.toHaveProperty('url');expect(shape.stroke).toBeUndefined();
  });
  it('never draws a connecting segment between separate outline parts',()=>{
    const s=normalizeVisualizer({style:'path',shape:{paths:[{points:[[0,0],[0,1]],closed:false},{points:[[1,0],[1,1]],closed:false}],stroke:'line',amplitude:0}});
    const segments:number[][][]=[],ctx={createLinearGradient:()=>({addColorStop:()=>{}}),beginPath:()=>segments.push([]),moveTo:(x:number,y:number)=>segments.at(-1)!.push([x,y]),lineTo:(x:number,y:number)=>segments.at(-1)!.push([x,y]),stroke:()=>{},closePath:()=>{}};
    drawVisualizer(ctx as unknown as CanvasRenderingContext2D,400,300,s,new Uint8Array(1024),new Uint8Array(2048));expect(segments).toHaveLength(2);for(const part of segments)expect(new Set(part.map(p=>p[0])).size).toBe(1);
  });
});

it('keeps user captions when applying a visualizer look',()=>{
 const current=normalizeVisualizer({title:'عنواني',subtitle:'My subtitle',showSubtitle:true});
 const next=applyVisualizerPreset(current,visualizerPresets[1].settings);
 expect(next.style).toBe('wave');expect(next.title).toBe(current.title);expect(next.subtitle).toBe(current.subtitle);expect(next.showSubtitle).toBe(true);
});
it('limits ordinary shapes even after importing compound typography',()=>{
 const shape={paths:[{points:[[0,0],[1,1]],closed:false}]};
 expect(normalizeVisualizer({style:'bars',shape,count:1200}).count).toBe(160);
 expect(normalizeVisualizer({style:'path',shape:{paths:[]},count:1200}).count).toBe(160);
});
it('distributes audio response through all compound contours at low detail',()=>{
 const paths=Array.from({length:32},(_,i)=>({points:[[i/32,.2],[i/32,.8]],closed:false}));
 const s=normalizeVisualizer({style:'path',count:16,shape:{paths,stroke:'bars',amplitude:1}});
 const lengths:number[]=[],points:number[][]=[];
 const ctx={createLinearGradient:()=>({addColorStop:()=>{}}),beginPath:()=>{points.length=0;},moveTo:(x:number,y:number)=>points.push([x,y]),lineTo:(x:number,y:number)=>points.push([x,y]),stroke:()=>lengths.push(Math.hypot(points[1][0]-points[0][0],points[1][1]-points[0][1]))};
 const spectrum=new Uint8Array(1024);spectrum.fill(255,0,220);
 drawVisualizer(ctx as unknown as CanvasRenderingContext2D,600,300,s,spectrum,new Uint8Array(2048));
 expect(lengths.slice(25,50).every(n=>n>1)).toBe(true);expect(lengths.at(-1)).toBe(.5);
});
it('keeps dot centers and radii within the drawing area',()=>{
 const dots:number[][]=[];const ctx={createLinearGradient:()=>({addColorStop:()=>{}}),beginPath:()=>{},arc:(x:number,y:number,r:number)=>dots.push([x,y,r]),fill:()=>{}};
 drawVisualizer(ctx as unknown as CanvasRenderingContext2D,800,300,normalizeVisualizer({style:'dots',sensitivity:3}),new Uint8Array(1024).fill(255),new Uint8Array(2048));
 expect(dots.every(([x,y,r])=>x-r>=0&&x+r<=800&&y-r>=0&&y+r<=300)).toBe(true);
});

it('gives every outline and dotted preset audible movement without moving in silence or at zero strength',()=>{
 const capture=(shape:typeof defaultVisualizer.shape,spectrum:Uint8Array)=>{
  const points:number[][]=[];
  const ctx={createLinearGradient:()=>({addColorStop:()=>{}}),beginPath:()=>{},closePath:()=>{},stroke:()=>{},fill:()=>{},moveTo:(x:number,y:number)=>points.push([x,y]),lineTo:(x:number,y:number)=>points.push([x,y]),arc:(x:number,y:number)=>points.push([x,y])};
  drawVisualizer(ctx as unknown as CanvasRenderingContext2D,800,400,normalizeVisualizer({...defaultVisualizer,style:'path',shape}),spectrum,new Uint8Array(2048).fill(128));
  return points;
 };
 const silent=new Uint8Array(1024),voice=new Uint8Array(1024);voice.fill(190,1,100);
 for(const preset of visualizerShapePresets.filter(p=>p.shape.stroke==='line'||p.shape.stroke==='dots')){
  const shape=normalizeVisualizer({shape:preset.shape}).shape,rest=capture(shape,silent),moving=capture(shape,voice);
  expect(rest.length).toBe(moving.length);
  expect(Math.max(...moving.map((p,i)=>Math.hypot(p[0]-rest[i][0],p[1]-rest[i][1])))).toBeGreaterThan(2);
  expect(capture({...shape,amplitude:0},voice)).toEqual(capture({...shape,amplitude:0},silent));
  expect(capture({...shape,mirror:true},voice)).toHaveLength(moving.length*2);
  expect(capture({...shape,amplitude:1},new Uint8Array(1024).fill(255)).every(([x,y])=>x>=4&&x<=796&&y>=4&&y<=396)).toBe(true);
 }
});
