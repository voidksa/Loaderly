import {
  activeSubtitleCueIndex,
  addSubtitleCueAt,
  retimeSubtitleCuesForOutput,
  subtitleCuesForStillFrame,
  updateSubtitleCue,
  type EditorSubtitleCue
} from './editorSubtitles';

const cues: readonly EditorSubtitleCue[] = [
  { startSeconds: 1, endSeconds: 3, text: 'First' },
  { startSeconds: 5, endSeconds: 7, text: 'Second' }
];

describe('editor subtitles', () => {
  it('finds the cue active at the playhead', () => {
    expect(activeSubtitleCueIndex(cues, 2)).toBe(0);
    expect(activeSubtitleCueIndex(cues, 6)).toBe(1);
    expect(activeSubtitleCueIndex(cues, 4)).toBe(-1);
  });

  it('updates a cue while keeping timing valid', () => {
    const updated = updateSubtitleCue(cues, 0, { startSeconds: 2.9, endSeconds: 2.95, text: 'Edited' }, 10);

    expect(updated[0]).toEqual({ startSeconds: 2.9, endSeconds: 3, text: 'Edited' });
  });

  it('adds a cue at the playhead and keeps cues sorted', () => {
    const updated = addSubtitleCueAt(cues, 4, 10, 'Middle');

    expect(updated.map((cue) => cue.text)).toEqual(['First', 'Middle', 'Second']);
    expect(updated[1]).toEqual({ startSeconds: 4, endSeconds: 6, text: 'Middle' });
  });

  it('retimes edited cues for the exported output range', () => {
    const retimed = retimeSubtitleCuesForOutput(cues, 2, 6);

    expect(retimed).toEqual([
      { startSeconds: 0, endSeconds: 1, text: 'First' },
      { startSeconds: 3, endSeconds: 4, text: 'Second' }
    ]);
  });

  it('keeps only the active cue visible for still-frame export', () => {
    expect(subtitleCuesForStillFrame(cues, 6)).toEqual([{ startSeconds: 0, endSeconds: 10, text: 'Second' }]);
    expect(subtitleCuesForStillFrame(cues, 4)).toEqual([]);
  });
});
