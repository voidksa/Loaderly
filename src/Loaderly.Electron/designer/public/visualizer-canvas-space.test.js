import {describe,it,expect} from 'vitest';
import {canvasSpace,reframeShape,boundedGroupDelta} from './visualizer-canvas-space.js';
import {normalizeVisualizer,encodeVisualizer,decodeVisualizer,defaultVisualizer} from '../../src/shared/editor-project/audioVisualizer';
import {fitShape} from '../../src/shared/editor-project/audioVisualizerDrawing';

describe('visualizer drawing canvas coordinates',()=>{
 it('expands a small shape to an editable full canvas without moving its existing points',()=>{
  const shape=normalizeVisualizer({style:'path',shape:{points:[[.2,.2],[.8,.2],[.8,.8],[.2,.8]],closed:true,aspect:1}}).shape;
  const from={x:300,y:150,sx:100,sy:100},to=canvasSpace(900,500,(900-24)/(500-24)),next=reframeShape(shape,from,to);
  next.points.forEach((p,i)=>{expect(to.x+p[0]*to.sx).toBeCloseTo(from.x+shape.points[i][0]*from.sx);expect(to.y+p[1]*to.sy).toBeCloseTo(from.y+shape.points[i][1]*from.sy);});
  expect(to.sx).toBeGreaterThan(850);expect(to.sy).toBeGreaterThan(450);
  expect(next.points.every(p=>p.every(n=>n>=0&&n<=1))).toBe(true);
  const moved=[...next.points[0]];moved[0]=.95;
  expect(to.x+moved[0]*to.sx).toBeGreaterThan(from.x+from.sx+350);
 });
 it('retains the rendered shape proportions and existing file format',()=>{
  const original=normalizeVisualizer({...defaultVisualizer,style:'path',shape:{points:[[.1,.15],[.85,.3],[.55,.9]],aspect:1.3,closed:true}});
  const from={x:200,y:80,sx:195,sy:150},to=canvasSpace(900,500,(900-24)/(500-24));
  const reframed=normalizeVisualizer({...original,shape:reframeShape(original.shape,from,to)}),roundtrip=decodeVisualizer(encodeVisualizer(reframed));
  expect(roundtrip).toEqual(reframed);expect(JSON.parse(encodeVisualizer(reframed)).version).toBe(2);
  const before=fitShape(original.shape,700,350),after=fitShape(reframed.shape,700,350);
  original.shape.points.forEach((point,i)=>{const p=reframed.shape.points[i];expect(after.x+p[0]*reframed.shape.aspect*after.scale).toBeCloseTo(before.x+point[0]*original.shape.aspect*before.scale,0);expect(after.y+p[1]*after.scale).toBeCloseTo(before.y+point[1]*before.scale,0);});
 });
 it('preserves disconnected text contours, metadata and shape styles',()=>{
  const original=normalizeVisualizer({style:'path',shape:{paths:[{points:[[.1,.1],[.2,.8]],closed:false},{points:[[.7,.1],[.9,.8]],closed:true}],aspect:2,stroke:'line',thickness:3,mirror:true,typography:{text:'صوت A',font:'modern'}}});
  const next=normalizeVisualizer({...original,shape:reframeShape(original.shape,{x:50,y:40,sx:300,sy:150},canvasSpace(800,450,1.8))});
  expect(next.shape.paths).toHaveLength(2);expect(next.shape.paths.map(p=>p.closed)).toEqual([false,true]);expect(next.shape.stroke).toBe('line');expect(next.shape.typography.text).toBe('صوت A');
  expect(decodeVisualizer(encodeVisualizer(next))).toEqual(next);expect(JSON.parse(encodeVisualizer(next)).version).toBe(3);
 });
 it('keeps group distances intact at all four canvas edges',()=>{
  const points=[[.2,.3],[.6,.8]];
  for(const requested of [[-3,0],[3,0],[0,-3],[0,3],[3,3]]){
   const delta=boundedGroupDelta(points,requested),moved=points.map(point=>point.map((n,i)=>n+delta[i]));
   expect(moved.every(point=>point.every(n=>n>=0&&n<=1))).toBe(true);
   expect(moved[1][0]-moved[0][0]).toBeCloseTo(.4);expect(moved[1][1]-moved[0][1]).toBeCloseTo(.5);
  }
 });
 it('keeps proportional drawing coordinates inside resized viewports',()=>{
  for(const [w,h] of [[1000,500],[320,220],[900,250]]){const b=canvasSpace(w,h,1.8);expect(b.x).toBeGreaterThanOrEqual(4);expect(b.y).toBeGreaterThanOrEqual(4);expect(b.x+b.sx).toBeLessThanOrEqual(w-4);expect(b.y+b.sy).toBeLessThanOrEqual(h-4);expect(b.sx/b.sy).toBeCloseTo(1.8);}
 });
 it('does not crop a shape that already fills the output width',()=>{
  const shape=normalizeVisualizer({style:'path',shape:{points:[[0,.5],[1,.5]],closed:false,aspect:1,amplitude:0}}).shape;
  const fit=fitShape(shape,900,400),next=reframeShape(shape,{x:fit.x,y:50+fit.y,sx:fit.scale,sy:fit.scale},canvasSpace(900,500,(900-24)/(500-24)));
  expect(next.points.every(point=>point.every(n=>n>=0&&n<=1))).toBe(true);
 });
});
