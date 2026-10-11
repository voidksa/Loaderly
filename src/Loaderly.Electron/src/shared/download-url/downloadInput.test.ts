import { describe, expect, it } from 'vitest';
import { localFileKindForInput } from './downloadInput';
import { normalizeDownloadUrl } from './downloadUrl';

describe('download input routing', () => {
  it.each([
    'http://media.example.com/video.mp4',
    'https://media.example.com/audio.mp3',
    '  HTTPS://media.example.com/VIDEO.MP4  ',
    'https://media.example.com/video.mp4?token=signed&download=1',
    'https://media.example.com/audio.mp3#t=5',
    'https://media.example.com/video.mp4?token=signed#t=5',
    'https://media.example.com/captions.srt',
    'http://127.0.0.1:65164/Lake-reflections-demo.mp4',
    'http://[::1]:8000/demo.mp3',
  ])('keeps %s out of the local importer and valid for the downloader', source => {
    expect(localFileKindForInput(source)).toBe('unknown');
    expect(normalizeDownloadUrl(source)).toBeDefined();
  });

  it.each([
    'C:\\Videos\\Lake reflections.mp4',
    'D:/Music/clip.MP3',
    '\\\\server\\media\\Lake reflections.mp4',
    '\\\\?\\C:\\Videos\\clip.mp4',
    '/home/user/Videos/clip.mp4',
    '/Users/user/Music/clip.mp3',
    './media/clip.webm',
    'file:///C:/Videos/Lake%20reflections.mp4',
    'file:///home/user/Videos/clip.mp4',
  ])('preserves supported local media routing for %s', source => {
    expect(localFileKindForInput(source)).toBe('media');
  });

  it.each(['C:\\Captions\\clip.srt', '\\\\server\\captions\\clip.vtt', '/home/user/clip.srt', 'file:///C:/Captions/clip.vtt'])(
    'preserves local subtitle routing for %s', source => {
      expect(localFileKindForInput(source)).toBe('subtitle');
    }
  );
});
