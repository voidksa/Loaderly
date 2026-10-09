import { describe, expect, it } from 'vitest';

import {
  containMediaRect,
  moveEffectRegion,
  visibleEffectRegion,
  mediaRegionToPreviewRegion,
  previewPointToMediaPercent,
  rectPixelsToPercent
} from './editorPreviewGeometry';

describe('editor preview geometry', () => {
  it('fits a 16:9 video inside a square preview without losing media-relative coordinates', () => {
    const mediaRect = containMediaRect({ width: 1000, height: 1000 }, { width: 1920, height: 1080 });
    const mediaRectPercent = rectPixelsToPercent(mediaRect, { width: 1000, height: 1000 });
    const previewRegion = mediaRegionToPreviewRegion({ x: 50, y: 50, width: 20, height: 20 }, mediaRectPercent);

    expect(mediaRect).toEqual({ left: 0, top: 218.75, width: 1000, height: 562.5 });
    expect(previewRegion).toEqual({ x: 50, y: 50, width: 20, height: 11.25 });
  });

  it('maps points inside the displayed media rect back to video-frame percentages', () => {
    const mediaRect = containMediaRect({ width: 1000, height: 1000 }, { width: 1920, height: 1080 });

    expect(previewPointToMediaPercent({ x: 500, y: 500 }, mediaRect)).toEqual({ x: 50, y: 50 });
    expect(previewPointToMediaPercent({ x: 1000, y: 781.25 }, mediaRect)).toEqual({ x: 100, y: 100 });
  });

  it('keeps the same media percent after preview resize', () => {
    const small = containMediaRect({ width: 640, height: 360 }, { width: 1920, height: 1080 });
    const large = containMediaRect({ width: 1280, height: 720 }, { width: 1920, height: 1080 });

    expect(previewPointToMediaPercent({ x: small.left + small.width * 0.37, y: small.top + small.height * 0.62 }, small)).toEqual({
      x: 37,
      y: 62
    });
    expect(previewPointToMediaPercent({ x: large.left + large.width * 0.37, y: large.top + large.height * 0.62 }, large)).toEqual({
      x: 37,
      y: 62
    });
  });
});


describe('effect manipulation at frame edges', () => {
  it('moves a full-height zoom focus vertically without changing scale or size', () => {
    const region = { x: 50, y: 50, width: 80, height: 100 };
    expect(moveEffectRegion(region, 10, 90, true)).toEqual({ x: 10, y: 90, width: 80, height: 100 });
    expect(moveEffectRegion(region, -20, 120, true)).toEqual({ x: 0, y: 100, width: 80, height: 100 });
  });
  it('keeps blur masks within the source and preserves their size', () => {
    expect(moveEffectRegion({ x: 50, y: 50, width: 20, height: 30 }, 0, 100)).toEqual({ x: 10, y: 85, width: 20, height: 30 });
  });
  it.each([[0, 0], [100, 0], [0, 100], [100, 100]])('keeps all handles visible at focus %s, %s', (x, y) => {
    const region = { x, y, width: 80, height: 100 };
    const visible = visibleEffectRegion(region);
    expect(visible.x - visible.width / 2).toBeGreaterThanOrEqual(0);
    expect(visible.y - visible.height / 2).toBeGreaterThanOrEqual(0);
    expect(visible.x + visible.width / 2).toBeLessThanOrEqual(100);
    expect(visible.y + visible.height / 2).toBeLessThanOrEqual(100);
    expect(region).toEqual({ x, y, width: 80, height: 100 });
  });
});
