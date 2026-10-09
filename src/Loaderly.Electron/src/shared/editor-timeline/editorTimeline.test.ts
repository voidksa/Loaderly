import { describe, expect, test } from 'vitest';

import {
  keptRangesFromCutOuts,
  snapSeconds,
  timelineSegmentVisualBounds,
  timelineViewportFromZoom,
  timelineViewportSecondsFromRatio,
  timelineZoomFromWheel
} from './editorTimeline';

describe('editor timeline helpers', () => {
  test('snaps to the nearest timeline point inside a small threshold', () => {
    expect(snapSeconds(3.94, [0, 4, 8], 15, 0.12)).toBe(4);
    expect(snapSeconds(4.2, [0, 4, 8], 15, 0.12)).toBe(4.2);
  });

  test('turns cut-out regions into kept export ranges', () => {
    expect(
      keptRangesFromCutOuts(
        { startSeconds: 0, endSeconds: 10 },
        [
          { startSeconds: 2, endSeconds: 4 },
          { startSeconds: 7, endSeconds: 8 }
        ]
      )
    ).toEqual([
      { startSeconds: 0, endSeconds: 2 },
      { startSeconds: 4, endSeconds: 7 },
      { startSeconds: 8, endSeconds: 10 }
    ]);
  });

  test('clips and merges overlapping cut-out regions before export', () => {
    expect(
      keptRangesFromCutOuts(
        { startSeconds: 10, endSeconds: 20 },
        [
          { startSeconds: 5, endSeconds: 12 },
          { startSeconds: 11, endSeconds: 14 },
          { startSeconds: 25, endSeconds: 28 }
        ]
      )
    ).toEqual([{ startSeconds: 14, endSeconds: 20 }]);
  });

  test('zooms the timeline around the pointer anchor', () => {
    const zoom = timelineZoomFromWheel(1, -120);
    const viewport = timelineViewportFromZoom({
      duration: 300,
      zoom,
      anchorSeconds: 120,
      anchorRatio: 0.4
    });

    expect(zoom).toBeGreaterThan(1);
    expect(timelineViewportSecondsFromRatio(0.4, viewport)).toBeCloseTo(120, 5);
    expect(viewport.endSeconds - viewport.startSeconds).toBeLessThan(300);
    expect(timelineZoomFromWheel(zoom, 120)).toBeLessThan(zoom);
  });

  test('maps small timeline items inside the visible zoom window', () => {
    const viewport = { startSeconds: 119, endSeconds: 121 };
    const bounds = timelineSegmentVisualBounds({ startSeconds: 119.4, endSeconds: 119.55 }, viewport);

    expect(bounds.visible).toBe(true);
    expect(bounds.startPercent).toBeCloseTo(20, 5);
    expect(bounds.widthPercent).toBeCloseTo(7.5, 5);
  });
});
