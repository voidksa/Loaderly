import { describe, expect, it } from 'vitest';
import { mediaDisplayTitle, mediaFileFormat } from './mediaPresentation';

describe('media presentation', () => {
  it('keeps mixed-language names but omits the repeated file extension', () => {
    expect(mediaDisplayTitle('جولة الرياض [id].mp4')).toBe('جولة الرياض [id]');
    expect(mediaDisplayTitle('Sound session.mp3')).toBe('Sound session');
    expect(mediaDisplayTitle('Version 2.0')).toBe('Version 2.0');
  });
  it('reports the actual container without guessing from media kind', () => {
    expect(mediaFileFormat('C:/Media/audio.mp4', 'audio.mp3')).toBe('MP4');
    expect(mediaFileFormat('C:/Media/audio.MP3')).toBe('MP3');
    expect(mediaFileFormat(undefined, 'عنوان.m4a')).toBe('M4A');
    expect(mediaFileFormat()).toBeUndefined();
  });
});
