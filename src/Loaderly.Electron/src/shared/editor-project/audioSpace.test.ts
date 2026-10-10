import { describe, it, expect } from 'vitest';
import { normalizeAudioSpace, spaceImpulse, spacePreset, spaceTypes } from './audioSpace';
import { normalizeAudioSettings } from './audioProcessing';
describe('shared echo and reverb', () => {
  it('bypasses old projects and rejects invalid persisted parameters', () => {
    expect(spaceImpulse({})).toEqual([Float32Array.of(1), Float32Array.of(1)]);
    expect(normalizeAudioSpace({type:'bad',mix:Infinity,feedback:900,decay:-5})).toMatchObject({type:'hall',mix:25,feedback:85,decay:.2});
    expect(normalizeAudioSettings({space:spacePreset('plate')}).space).toEqual(spacePreset('plate'));
  });
  it.each(spaceTypes)('%s is deterministic, bounded and finite', type => {
    const s = spacePreset(type), a = spaceImpulse(s, 8000), b = spaceImpulse(s, 8000);
    expect(a).toEqual(b);
    expect(a[0].length).toBeLessThanOrEqual(80001);
    expect(a.every(channel => channel.every(Number.isFinite))).toBe(true);
    expect(a[0][0]).toBeCloseTo(1-s.mix/100,5);
    expect(a[0].some((v,i)=>i>0&&v!==0)).toBe(true);
  });
  it('places alternating echoes at the selected delay and produces mono space at zero width', () => {
    const s = {...spacePreset('ping-pong'), mix:100, delayMs:100}, [left,right] = spaceImpulse(s,8000);
    expect(left[800]).toBe(0); expect(right[800]).toBeGreaterThan(0);
    expect(left[1600]).toBeGreaterThan(0); expect(right[1600]).toBe(0);
    const mono = spaceImpulse({...spacePreset('hall'),width:0},8000);
    expect(mono[0]).toEqual(mono[1]);
  });
});
