import {it,expect} from 'vitest';
import {AudioSpectrum} from './audioSpectrum';
import {videoDimensions} from './visualizerVideo';
it('produces silence without demo motion and identifies a real tone at the right FFT bin',()=>{const a=new AudioSpectrum(),zero=a.frame(new Float32Array(2048),0);expect(zero.spectrum.every(x=>x===0)).toBe(true);expect(zero.waveform.every(x=>x===128)).toBe(true);const tone=a.frame(Float32Array.from({length:2048},(_,i)=>.05*Math.sin(2*Math.PI*40*i/2048)),0);const peak=Math.max(...tone.spectrum);expect(tone.spectrum[40]).toBe(peak);expect(tone.spectrum[500]).toBeLessThan(10);});
it('has even codec dimensions for every output format',()=>{for(const size of ['landscape','portrait','square'] as const)for(const resolution of [720,1080] as const)expect(videoDimensions({size,resolution}).every(n=>n%2===0)).toBe(true);});
