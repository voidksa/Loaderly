import { describe, expect, it } from 'vitest';

import {
  editorLayerIdsForMedia,
  editorProjectTrackIdsForMedia,
  editorToolIdsForMedia,
  normalizeEditorLayerForMedia
} from './editorCapabilities';

describe('editor capabilities', () => {
  it('limits the audio editor to audio-safe tools and tracks', () => {
    expect(editorToolIdsForMedia('audio')).toEqual(['select', 'cuts', 'speed']);
    expect(editorLayerIdsForMedia('audio')).toEqual(['cuts', 'speed']);
    expect(editorProjectTrackIdsForMedia('audio')).toEqual(['media', 'cut', 'speed']);
  });

  it('keeps the full visual toolset for video media', () => {
    expect(editorToolIdsForMedia('video')).toEqual(['select', 'cuts', 'blur', 'zoom', 'speed', 'reframe', 'text', 'subtitles']);
    expect(editorLayerIdsForMedia('video')).toEqual(['cuts', 'subtitles', 'blur', 'zoom', 'speed', 'reframe', 'text']);
    expect(editorProjectTrackIdsForMedia('video')).toEqual(['media', 'cut', 'blur', 'zoom', 'speed', 'reframe', 'text', 'subtitles']);
  });

  it('falls back to cuts when an audio session restores a visual-only layer', () => {
    expect(normalizeEditorLayerForMedia('audio', 'blur')).toBe('cuts');
    expect(normalizeEditorLayerForMedia('audio', 'text')).toBe('cuts');
    expect(normalizeEditorLayerForMedia('audio', 'subtitles')).toBe('cuts');
    expect(normalizeEditorLayerForMedia('audio', 'reframe')).toBe('cuts');
    expect(normalizeEditorLayerForMedia('audio', 'speed')).toBe('speed');
  });
});
