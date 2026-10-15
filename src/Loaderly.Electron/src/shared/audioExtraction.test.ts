import { expect, it } from 'vitest';
import { audioMatchesSource } from './audioExtraction';

it('matches the same YouTube clip across URL forms and different folders', () => {
  expect(audioMatchesSource({ sourcePath: 'D:/Videos/clip.mp4', source: 'https://youtu.be/L9O4per-Uhw?si=test' }, { path: 'E:/Music/song.mp3', source: 'https://www.youtube.com/watch?v=L9O4per-Uhw&list=other' })).toBe(true);
});
it('recognizes old library filenames with a source id without comparing titles', () => {
  expect(audioMatchesSource({ sourcePath: 'D:/Videos/clip [L9O4per-Uhw].mp4' }, { path: 'E:/Music/another name [L9O4per-Uhw].mp3' })).toBe(true);
  expect(audioMatchesSource({ sourcePath: 'D:/Videos/song.mp4', source: 'https://youtu.be/L9O4per-Uhw' }, { path: 'E:/Music/song.mp3', source: 'https://youtu.be/abcdefghijk' })).toBe(false);
  expect(audioMatchesSource({ sourcePath: 'D:/Videos/song.mp4' }, { path: 'E:/Music/song.mp3' })).toBe(false);
});
it('trusts explicit source metadata over a misleading old filename', () => {
  expect(audioMatchesSource({ sourcePath: 'D:/Videos/song.mp4', source: 'https://youtu.be/L9O4per-Uhw' }, { path: 'E:/Music/song [L9O4per-Uhw].mp3', source: 'https://youtu.be/abcdefghijk' })).toBe(false);
});
it('keeps source services distinct and local paths tied to their full location', () => {
  expect(audioMatchesSource({ sourcePath: '/videos/a.mp4', source: 'https://youtube.com/watch?v=abcdefghijk' }, { path: '/music/a.mp3', source: 'https://instagram.com/p/abcdefghijk' })).toBe(false);
  expect(audioMatchesSource({ sourcePath: 'D:\\Videos\\song.mp4' }, { path: 'E:/Music/song - audio.mp3', source: 'd:/videos/song.mp4' })).toBe(true);
  expect(audioMatchesSource({ sourcePath: '/Videos/song.mp4' }, { path: '/Music/song - audio.mp3', source: '/Elsewhere/song.mp4' })).toBe(false);
});
it('does not reuse a different separated version of the same clip', () => {
  const source = 'https://youtu.be/L9O4per-Uhw';
  expect(audioMatchesSource({ source, sourcePath: 'clip [No music].mp4' }, { source, path: 'original.mp3' })).toBe(false);
  expect(audioMatchesSource({ source, sourcePath: 'clip.mp4', audioMode: 'instrumental' }, { source, path: 'renamed.mp3', audioMode: 'vocals' })).toBe(false);
  expect(audioMatchesSource({ source, sourcePath: 'clip [Instrumental].mp4' }, { source, path: 'clip [Instrumental] - audio.mp3' })).toBe(true);
});
