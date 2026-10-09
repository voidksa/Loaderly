import { describe, expect, it } from 'vitest';
import { findAdaptiveTrackingMatch, patchContrast, sampleLumaPatch, frameCorrelation } from './regionTracker';

describe('region motion matching', () => {
  const width = 96, height = 72;
  function frame(x: number, y: number, brightness = 0) {
    const pixels = new Uint8ClampedArray(width * height).fill(24);
    for (let row = 0; row < 20; row++) for (let col = 0; col < 20; col++) {
      pixels[(y + row) * width + x + col] = 40 + ((row * 37 + col * 23 + row * col * 7) % 150) + brightness;
    }
    return pixels;
  }
  it('tracks translation in both directions despite a lighting change, without shrinking a stationary target', () => {
    const rect = { x: 36, y: 24, width: 20, height: 20 };
    const template = sampleLumaPatch(frame(36, 24), width, height, rect, 20, 20);
    for (const [x, y] of [[36, 24], [42, 28], [30, 20]]) {
      const result = findAdaptiveTrackingMatch(frame(x, y, 15), width, height, template, 20, 20, rect)!;
      expect(result.rect).toEqual({ ...rect, x, y });
      expect(result.score).toBeLessThan(1);
    }
  });
  it('rejects a featureless or missing target instead of reporting a valid track', () => {
    const rect = { x: 36, y: 24, width: 20, height: 20 };
    const template = sampleLumaPatch(frame(36, 24), width, height, rect, 20, 20);
    expect(patchContrast(new Uint8ClampedArray(400).fill(30))).toBe(0);
    expect(findAdaptiveTrackingMatch(new Uint8ClampedArray(width * height).fill(30), width, height, template, 20, 20, rect)!.score).toBeGreaterThan(45);
  });
  it('distinguishes a small motion from an unrelated camera cut', () => {
    const first = frame(36, 24);
    expect(frameCorrelation(first, frame(38, 24))).toBeGreaterThan(0.15);
    expect(frameCorrelation(first, first.map(value => 255 - value))).toBeLessThan(0.15);
  });
});
