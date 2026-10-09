import { describe, it, expect } from 'vitest';
import { audioSpeedFilterChain, hasSpeedSound, normalizeSpeedMode } from './speedSound';
describe('speed sound export', () => {
  it('normalizes sample rate before reinterpretation to avoid changing 48kHz input duration', () => {
    expect(audioSpeedFilterChain(.75, 'normal')).toBe('aresample=44100,asetrate=33075,aresample=44100');
  });
  it('keeps tone processing at 1x and falls back safely for unknown modes', () => {
    for (const mode of ['warm','bright','radio']) expect(hasSpeedSound(1,mode)).toBe(true);
    expect(hasSpeedSound(1,'normal')).toBe(false);
    expect(normalizeSpeedMode('arbitrary-filter')).toBe('preserve-pitch');
    expect(audioSpeedFilterChain(1,'radio')).toContain('highpass=f=300');
  });
  it('decomposes the full supported speed range into supported tempo factors', () => {
    expect(audioSpeedFilterChain(.25,'preserve-pitch')).toBe('atempo=0.5,atempo=0.5');
    expect(audioSpeedFilterChain(8,'preserve-pitch')).toBe('atempo=2,atempo=2,atempo=2');
  });
});
