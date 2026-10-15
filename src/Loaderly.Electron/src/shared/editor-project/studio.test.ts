import { describe, expect, it } from 'vitest';
import { normalizeStudioEdits, projectInterval, sourcePieces, suggestSilenceCuts, shiftSubtitleCues, splitSubtitleCue, mergeSubtitleCues, emptyStudioEdits, hasStudioProcessing } from './studio';
describe('studio edits and source timing', () => {
  it('keeps legacy projects visually unchanged', () => expect(hasStudioProcessing(normalizeStudioEdits(undefined))).toBe(false));
  it('bounds invalid settings and discards empty ranges', () => {
    const result = normalizeStudioEdits({ color: { contrast: Infinity }, ranges: [{ start: 8, end: 2 }], audio: { targetLufs: 100 }, overlays: [{ kind: 'text', text: 'مرحبا', start: 0, end: 2, opacity: -4 }] }, 10);
    expect(result.color.contrast).toBe(1); expect(result.audio.targetLufs).toBe(-9); expect(result.ranges).toEqual([]); expect(result.overlays[0].opacity).toBe(0);
  });
  it('maps a source overlay across a cut and a speed region', () => {
    const pieces = sourcePieces(10, 20, [{ startSeconds: 12, endSeconds: 14 }], [{ startSeconds: 16, endSeconds: 20, rate: 2 }]);
    expect(projectInterval(11, 19, pieces)).toEqual([{ start: 1, end: 2 }, { start: 2, end: 4 }, { start: 4, end: 5.5 }]);
    expect(projectInterval(12, 14, pieces)).toEqual([]);
  });
  it('preserves speech margins in silence suggestions', () => expect(suggestSilenceCuts([{ start: 1, end: 3 }, { start: 4, end: 4.2 }], 5, .2, .5)).toEqual([{ startSeconds: 1.2, endSeconds: 2.8 }]));
  it('shifts selected cues while keeping Arabic text intact and bounding time', () => {
    const cues = [{ startSeconds: 1, endSeconds: 3, text: 'مرحبا بك' }, { startSeconds: 4, endSeconds: 5, text: 'Hello' }];
    expect(shiftSubtitleCues(cues, -2, 10, [0])).toEqual([{ ...cues[0], startSeconds: 0, endSeconds: 1 }, cues[1]]);
    const split = splitSubtitleCue(cues[0], 2, 5); expect(split.map(c => c.text)).toEqual(['مرحبا', 'بك']); expect(mergeSubtitleCues(split, [0, 1])).toEqual([cues[0]]);
  });
  it('detects extra processing independently of ranges and markers', () => {
    const e = emptyStudioEdits(); e.ranges.push({ id: 'a', name: 'A', start: 0, end: 1 }); expect(hasStudioProcessing(e)).toBe(false); e.audio.denoise = 10; expect(hasStudioProcessing(e)).toBe(true);
  });
});
