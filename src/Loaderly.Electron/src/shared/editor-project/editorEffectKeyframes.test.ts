import { describe, expect, it } from 'vitest';

import { regionAtKeyframeTime, regionSegmentsForExport, upsertRegionKeyframe } from './editorEffectKeyframes';

describe('editor effect keyframes', () => {
  it('returns the base region without keyframes', () => {
    expect(regionAtKeyframeTime({ x: 10, y: 20, width: 30, height: 40 }, [], 4)).toEqual({
      x: 10,
      y: 20,
      width: 30,
      height: 40
    });
  });

  it('interpolates region movement between two keyframes', () => {
    const keyframes = [
      { timeSeconds: 0, region: { x: 10, y: 10, width: 20, height: 20 } },
      { timeSeconds: 10, region: { x: 90, y: 70, width: 40, height: 30 } }
    ];

    expect(regionAtKeyframeTime({ x: 0, y: 0, width: 10, height: 10 }, keyframes, 5)).toEqual({
      x: 50,
      y: 40,
      width: 30,
      height: 25,
      opacity: undefined,
      rotation: undefined
    });
  });

  it('replaces a nearby keyframe instead of duplicating it', () => {
    const keyframes = upsertRegionKeyframe(
      [{ timeSeconds: 2, region: { x: 10, y: 10, width: 20, height: 20 } }],
      2.01,
      { x: 30, y: 30, width: 24, height: 24 }
    );

    expect(keyframes).toEqual([{ timeSeconds: 2.01, region: { x: 30, y: 30, width: 24, height: 24 } }]);
  });

  it('expands keyframed movement into short export segments', () => {
    const segments = regionSegmentsForExport(
      { x: 0, y: 0, width: 20, height: 20 },
      [
        { timeSeconds: 0, region: { x: 10, y: 10, width: 20, height: 20 } },
        { timeSeconds: 1, region: { x: 90, y: 90, width: 20, height: 20 } }
      ],
      0,
      1,
      0.5
    );

    expect(segments).toEqual([
      { startSeconds: 0, endSeconds: 0.5, region: { x: 30, y: 30, width: 20, height: 20, opacity: undefined, rotation: undefined } },
      { startSeconds: 0.5, endSeconds: 1, region: { x: 70, y: 70, width: 20, height: 20, opacity: undefined, rotation: undefined } }
    ]);
  });
});
