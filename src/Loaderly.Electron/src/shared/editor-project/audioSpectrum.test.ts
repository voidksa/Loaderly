import {it,expect} from 'vitest';
import {AudioSpectrum} from './audioSpectrum';
import {videoDimensions} from './visualizerVideo';
import {visualizerBands,visualizerLevel} from './audioVisualizerDrawing';
it('uses energy between FFT samples and fills the music range without inventing motion',()=>{
 const spectrum=new Uint8Array(1024);spectrum.fill(100,1,512);
 const bands=visualizerBands(spectrum,48);expect(bands).toHaveLength(48);expect(bands.every(x=>x>0)).toBe(true);expect(bands.at(-1)).toBeCloseTo(100/255);
 spectrum.fill(0);expect(visualizerBands(spectrum,48).every(x=>x===0)).toBe(true);
 spectrum[501]=200;expect(visualizerBands(spectrum,48).at(-1)).toBeGreaterThan(0);
 expect(visualizerBands(new Uint8Array(),48).every(x=>x===0)).toBe(true);
});
it('produces silence without demo motion and identifies a real tone at the right FFT bin',()=>{const a=new AudioSpectrum(),zero=a.frame(new Float32Array(2048),0);expect(zero.spectrum.every(x=>x===0)).toBe(true);expect(zero.waveform.every(x=>x===128)).toBe(true);const tone=a.frame(Float32Array.from({length:2048},(_,i)=>.05*Math.sin(2*Math.PI*40*i/2048)),0);const peak=Math.max(...tone.spectrum);expect(tone.spectrum[40]).toBe(peak);expect(tone.spectrum[500]).toBeLessThan(10);});
it('has even codec dimensions for every output format',()=>{for(const size of ['landscape','portrait','square'] as const)for(const resolution of [720,1080] as const)expect(videoDimensions({size,resolution}).every(n=>n%2===0)).toBe(true);});
it('keeps quiet energy quiet, follows increasing levels and never amplifies silence',()=>{
 for(const sensitivity of [.25,1,1.25,3]) {
  expect(visualizerLevel(0,sensitivity)).toBe(0);
  const levels=[.1,.25,.5,.75,1].map(band=>visualizerLevel(band,sensitivity));
  expect(levels.every((value,i)=>value>=0&&value<=1&&(!i||value>=levels[i-1]))).toBe(true);
 }
 expect(visualizerLevel(.4,1.25)).toBeLessThan(.18);
 expect(visualizerLevel(.85,1.25)).toBeGreaterThan(.8);
});
it('responds to a real pulse and decays after the sound ends',()=>{
 const analyser=new AudioSpectrum(),tone=Float32Array.from({length:2048},(_,i)=>.04*Math.sin(2*Math.PI*40*i/2048));
 const before=analyser.frame(new Float32Array(2048),.72);
 const attack=analyser.frame(tone,.72);
 const sustained=analyser.frame(tone,.72);
 expect(attack.spectrum[40]).toBeGreaterThan(before.spectrum[40]);
 expect(sustained.spectrum[40]).toBeGreaterThanOrEqual(attack.spectrum[40]);
 let released=sustained;
 for(let i=0;i<35;i++)released=analyser.frame(new Float32Array(2048),.72);
 expect(released.spectrum[40]).toBe(0);
});
