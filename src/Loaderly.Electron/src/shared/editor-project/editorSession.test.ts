import { describe, expect, it } from 'vitest';
import { canOpenEditorForMedia, editorSessionStorageKeys, mediaIdentityForPath, playerScrubSecondsFromClientX, playbackResumeSeconds } from './editorSession';

describe('editor session persistence helpers', () => {
  it('normalizes media paths into stable per-media identities', () => {
    expect(mediaIdentityForPath('C:\\Users\\Void\\Videos\\Clip.MP4')).toBe('c:/users/void/videos/clip.mp4');
  });

  it('returns the current key before the legacy key for safe migration', () => {
    const keys = editorSessionStorageKeys('C:\\Media\\clip.mp4');

    expect(keys[0]).toContain('loaderly:editor-session:v2:');
    expect(keys[1]).toBe('loaderly:editor-session:C:\\Media\\clip.mp4');
  });

  it('allows ready audio downloads to open the editor', () => {
    expect(canOpenEditorForMedia({ filePath: 'C:\\Media\\song.mp3', mediaKind: 'audio', status: 'ready' })).toBe(true);
    expect(canOpenEditorForMedia({ filePath: 'C:\\Media\\song.mp3', mediaKind: 'audio', status: 'edited' })).toBe(true);
  });

  it('keeps unfinished media out of the editor', () => {
    expect(canOpenEditorForMedia({ filePath: 'C:\\Media\\song.mp3', mediaKind: 'audio', status: 'downloading' })).toBe(false);
    expect(canOpenEditorForMedia({ filePath: undefined, mediaKind: 'audio', status: 'ready' })).toBe(false);
  });
});

describe('player scrubber calculations', () => {
  it('maps a pointer position to playback seconds', () => {
    expect(playerScrubSecondsFromClientX({ clientX: 150, left: 100, width: 200, durationSeconds: 20 })).toBe(5);
  });

  it('mirrors the scrubber position in RTL layouts', () => {
    expect(playerScrubSecondsFromClientX({ clientX: 150, left: 100, width: 200, durationSeconds: 20, isRtl: true })).toBe(15);
  });

  it('clamps pointer positions outside the scrubber', () => {
    expect(playerScrubSecondsFromClientX({ clientX: 500, left: 100, width: 200, durationSeconds: 20 })).toBe(20);
    expect(playerScrubSecondsFromClientX({ clientX: 0, left: 100, width: 200, durationSeconds: 20 })).toBe(0);
  });
});

describe('player resume calculations', () => {
  it('resumes from the last paused frame even when React state has not rendered yet', () => {
    expect(
      playbackResumeSeconds({
        mediaCurrentSeconds: 7.4,
        requestedPlayheadSeconds: 0,
        lastKnownPlayheadSeconds: 7.4,
        playbackEndSeconds: 20
      })
    ).toBe(7.4);
  });

  it('honors a scrubbed playhead when the media element has not accepted the seek yet', () => {
    expect(
      playbackResumeSeconds({
        mediaCurrentSeconds: 0,
        requestedPlayheadSeconds: 12,
        lastKnownPlayheadSeconds: 12,
        playbackEndSeconds: 20
      })
    ).toBe(12);
  });

  it('restarts only when playback is already at the end', () => {
    expect(
      playbackResumeSeconds({
        mediaCurrentSeconds: 19.99,
        requestedPlayheadSeconds: 19.99,
        lastKnownPlayheadSeconds: 19.99,
        playbackEndSeconds: 20
      })
    ).toBe(0);
  });
});
