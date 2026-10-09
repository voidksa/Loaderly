import { describe, expect, it } from 'vitest';
import { computeReframeScale } from './reframe';

describe('computeReframeScale - Fit mode math', () => {
  it('16:9 → 9:16: scale to fit, video scaled to 1080x608 with 0px horizontal pad, 656px vertical pad', () => {
    const result = computeReframeScale(1920, 1080, 1080, 1920, 'fit', 0.5, 0.5);
    // scale = min(1080/1920, 1920/1080) = min(0.5625, 1.778) = 0.5625
    expect(result.scaleX).toBeCloseTo(0.5625, 4);
    expect(result.scaleY).toBeCloseTo(0.5625, 4);
    // rendered = 1920*0.5625 = 1080, 1080*0.5625 = 607.5
    expect(result.renderedWidth).toBeCloseTo(1080, 1);
    expect(result.renderedHeight).toBeCloseTo(607.5, 1);
    // visible = same as rendered
    expect(result.visibleWidth).toBeCloseTo(1080, 1);
    expect(result.visibleHeight).toBeCloseTo(607.5, 1);
    // offsetX = (1080 - 1080) * 0.5 = 0 (centered horizontally)
    expect(result.offsetX).toBeCloseTo(0, 1);
    // offsetY = (1920 - 607.5) * 0.5 = 656.25 (centered vertically)
    expect(result.offsetY).toBeCloseTo(656.25, 1);
    // Fit mode should have NO crop
    expect(result.cropX).toBe(0);
    expect(result.cropY).toBe(0);
  });

  it('9:16 → 1:1 Fit: scale to fit, video fits within the canvas', () => {
    const result = computeReframeScale(1080, 1920, 1080, 1080, 'fit', 0.5, 0.5);
    // scale = min(1080/1080, 1080/1920) = min(1, 0.5625) = 0.5625
    expect(result.scaleX).toBeCloseTo(0.5625, 4);
    expect(result.renderedWidth).toBeCloseTo(607.5, 1);
    expect(result.renderedHeight).toBeCloseTo(1080, 1);
    // visible = rendered (no crop)
    expect(result.visibleWidth).toBeCloseTo(607.5, 1);
    expect(result.visibleHeight).toBeCloseTo(1080, 1);
  });

  it('16:9 → 1:1 Fit: video shrinks to fit, no crop', () => {
    const result = computeReframeScale(1920, 1080, 1080, 1080, 'fit', 0.5, 0.5);
    // scale = min(1080/1920, 1080/1080) = min(0.5625, 1) = 0.5625
    expect(result.scaleX).toBeCloseTo(0.5625, 4);
    expect(result.renderedWidth).toBeCloseTo(1080, 1);
    expect(result.renderedHeight).toBeCloseTo(607.5, 1);
  });
});

describe('computeReframeScale - Fill mode math', () => {
  it('16:9 → 9:16 Fill: scale to cover, video fills the canvas with horizontal crop', () => {
    const result = computeReframeScale(1920, 1080, 1080, 1920, 'fill', 0.5, 0.5);
    // scale = max(1080/1920, 1920/1080) = max(0.5625, 1.778) = 1.778
    expect(result.scaleX).toBeCloseTo(1.778, 3);
    // rendered = 1920*1.778 = 3413.3
    expect(result.renderedWidth).toBeCloseTo(3413.3, 1);
    // rendered height = 1080*1.778 = 1920
    expect(result.renderedHeight).toBeCloseTo(1920, 1);
    // cropX = (3413.3 - 1080) * 0.5 = 1166.67 (centered)
    expect(result.cropX).toBeCloseTo(1166.67, 1);
    // visible = targetW (after crop)
    expect(result.visibleWidth).toBe(1080);
    expect(result.visibleHeight).toBe(1920);
    // offsetX = -cropX (video is shifted left to crop the right side)
    expect(result.offsetX).toBeCloseTo(-1166.67, 1);
  });

  it('9:16 → 16:9 Fill: video fills horizontally, crops vertically', () => {
    const result = computeReframeScale(1080, 1920, 1920, 1080, 'fill', 0.5, 0.5);
    // scale = max(1920/1080, 1080/1920) = max(1.778, 0.5625) = 1.778
    expect(result.scaleX).toBeCloseTo(1.778, 3);
    // rendered = 1080*1.778 = 1920
    expect(result.renderedWidth).toBeCloseTo(1920, 1);
    // rendered = 1920*1.778 = 3413.3
    expect(result.renderedHeight).toBeCloseTo(3413.3, 1);
    // cropY = (3413.3 - 1080) * 0.5 = 1166.67
    expect(result.cropY).toBeCloseTo(1166.67, 1);
  });
});

describe('computeReframeScale - Stretch mode', () => {
  it('stretches video to fill the canvas (aspect ratio changed)', () => {
    const result = computeReframeScale(1920, 1080, 1080, 1080, 'stretch', 0.5, 0.5);
    expect(result.scaleX).toBe(1080 / 1920);
    expect(result.scaleY).toBe(1080 / 1080);
    expect(result.offsetX).toBe(0);
    expect(result.offsetY).toBe(0);
  });
});

describe('computeReframeScale - Original mode', () => {
  it('keeps original size, centers within canvas', () => {
    const result = computeReframeScale(1920, 1080, 3840, 2160, 'original', 0.5, 0.5);
    expect(result.scaleX).toBe(1);
    expect(result.scaleY).toBe(1);
    // Center: (3840 - 1920) * 0.5 = 960
    expect(result.offsetX).toBe(960);
    // (2160 - 1080) * 0.5 = 540
    expect(result.offsetY).toBe(540);
  });

  it('positionX = 0 puts the video at the left edge', () => {
    const result = computeReframeScale(1920, 1080, 3840, 2160, 'original', 0, 0.5);
    expect(result.offsetX).toBe(0);
  });
});
