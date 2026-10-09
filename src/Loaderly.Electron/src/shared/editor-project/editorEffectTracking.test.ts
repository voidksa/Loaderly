import { describe, expect, it } from 'vitest';

import { findBestTemplateMatch, zoomScaleForRegion } from './editorEffectTracking';

describe('editor effect tracking helpers', () => {
  it('derives zoom scale from the active tracked region size', () => {
    expect(zoomScaleForRegion({ x: 50, y: 50, width: 50, height: 50 })).toBe(2);
    expect(zoomScaleForRegion({ x: 50, y: 50, width: 20, height: 20 })).toBe(5);
    expect(zoomScaleForRegion({ x: 50, y: 50, width: 100, height: 100 })).toBe(1);
    expect(zoomScaleForRegion({ x: 50, y: 50, width: 4, height: 4 })).toBe(8);
  });

  it('finds the closest template match inside a search window', () => {
    const frame = [
      0, 0, 0, 0, 0,
      0, 8, 8, 1, 9,
      0, 8, 8, 5, 7,
      0, 0, 0, 0, 0
    ];
    const template = [
      1, 9,
      5, 7
    ];

    const match = findBestTemplateMatch({
      frame,
      frameWidth: 5,
      frameHeight: 4,
      template,
      templateWidth: 2,
      templateHeight: 2,
      searchWindow: { x: 0, y: 0, width: 5, height: 4 }
    });

    expect(match).toEqual({ x: 3, y: 1, score: 0 });
  });
});
