import { describe, expect, it } from 'vitest';
import { clampRangeValue } from './cropPreview';

describe('cropPreview', () => {
  describe('clampRangeValue', () => {
    it('returns the value when within range', () => {
      expect(clampRangeValue(0, 0, 100)).toBe(0);
      expect(clampRangeValue(50, 0, 100)).toBe(50);
      expect(clampRangeValue(100, 0, 100)).toBe(100);
    });

    it('clamps to min when below range', () => {
      expect(clampRangeValue(-5, 0, 100)).toBe(0);
    });

    it('clamps to max when above range', () => {
      expect(clampRangeValue(150, 0, 100)).toBe(100);
    });

    it('returns 0 for non-finite values', () => {
      expect(clampRangeValue(Number.NaN, 0, 100)).toBe(0);
      expect(clampRangeValue(Number.POSITIVE_INFINITY, 0, 100)).toBe(0);
    });
  });

  describe('crop aspect ratio', () => {
    const computeAspect = (sourceWidth: number, sourceHeight: number, left: number, right: number, top: number, bottom: number) => {
      const sourceAspect = sourceWidth / Math.max(1, sourceHeight);
      const widthRatio = Math.max(0.02, 1 - left / 100 - right / 100);
      const heightRatio = Math.max(0.02, 1 - top / 100 - bottom / 100);
      return sourceAspect * (widthRatio / heightRatio);
    };

    it('returns the source aspect ratio when no crop is applied', () => {
      const aspect = computeAspect(1920, 1080, 0, 0, 0, 0);
      expect(aspect).toBeCloseTo(16 / 9, 4);
    });

    it('narrows the aspect ratio when cropping horizontally', () => {
      const aspect = computeAspect(1920, 1080, 41, 41, 0, 0);
      // Cropped width = 18% of 1920 = 345.6
      // Height = 1080
      // Aspect = 345.6 / 1080 = 0.32
      expect(aspect).toBeCloseTo(0.32, 2);
    });

    it('produces a non-positive aspect ratio for heavy crops (handled by min ratio)', () => {
      // widthRatio = 1 - 49 - 49 = 0.02 (minimum)
      const aspect = computeAspect(1920, 1080, 49, 49, 0, 0);
      expect(aspect).toBeGreaterThan(0);
    });

    it('widens the aspect ratio when cropping vertically', () => {
      const aspect = computeAspect(1920, 1080, 0, 0, 20, 20);
      // widthRatio = 1.0
      // heightRatio = 0.6
      // aspect = 1.778 * (1.0/0.6) = 2.963
      expect(aspect).toBeCloseTo(2.96, 1);
    });
  });

  describe('visible center calculation', () => {
    const computeCenter = (start: number, end: number) => (start + end) / 2;

    it('returns 50 for symmetric horizontal crop', () => {
      expect(computeCenter(41, 59)).toBe(50);
    });

    it('shifts center for asymmetric horizontal crop', () => {
      expect(computeCenter(30, 90)).toBe(60);
    });

    it('returns 50 for no crop', () => {
      expect(computeCenter(0, 100)).toBe(50);
    });
  });
});
