import { expect, it } from 'vitest';
import { downloadAudioMode, downloadAudioModes, downloadAudioLabel } from './downloadAudio';
import { normalizePreferences } from './app-preferences/appPreferences';
import { normalizeQuickCapture } from './quickCapture';

it('migrates the old toggle and respects an explicit original choice', () => {
  expect(downloadAudioMode({ removeMusic: true })).toBe('vocals');
  expect(normalizePreferences({ removeMusic: true }).audioMode).toBe('vocals');
  expect(normalizeQuickCapture({ removeMusic: true }).audioMode).toBe('vocals');
  expect(downloadAudioMode({ audioMode: 'original', removeMusic: true })).toBe('original');
  expect(downloadAudioMode({ audioMode: 'invalid' })).toBe('original');
});
it('persists each sound choice separately in regular and quick downloads', () => {
  for (const audioMode of downloadAudioModes) {
    const restored = normalizePreferences(JSON.parse(JSON.stringify({ audioMode, quickCapture: { audioMode } })));
    expect(restored.audioMode).toBe(audioMode);
    expect(restored.quickCapture.audioMode).toBe(audioMode);
  }
  for (const ar of [true, false]) expect(new Set(downloadAudioModes.map(mode => downloadAudioLabel(mode, ar))).size).toBe(3);
});
