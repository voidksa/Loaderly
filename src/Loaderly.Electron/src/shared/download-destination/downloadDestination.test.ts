import { describe, expect, it } from 'vitest';
import { defaultLoaderlyDownloadDirectory, platformFolderForSource, resolveDownloadDirectory } from './downloadDestination';
import { normalizePreferences } from '../app-preferences/appPreferences';

describe('download destination', () => {
  it('groups known video platforms into stable folders', () => {
    expect(platformFolderForSource('https://www.youtube.com/watch?v=qyKgnfneR14')).toBe('YouTube');
    expect(platformFolderForSource('https://youtu.be/qyKgnfneR14?si=abc')).toBe('YouTube');
    expect(platformFolderForSource('https://www.tiktok.com/@douglasclawlux/video/7646587453230320926?is_from_webapp=1')).toBe('TikTok');
    expect(platformFolderForSource('https://www.instagram.com/reel/example/')).toBe('Instagram');
  });

  it('keeps unknown platforms in a safe host folder', () => {
    expect(platformFolderForSource('https://media.example.com/watch/123')).toBe('media.example.com');
  });

  it('uses platform folders only when grouping is enabled', () => {
    expect(resolveDownloadDirectory('C:\\Downloads\\Loaderly', 'https://www.youtube.com/watch?v=qyKgnfneR14', true)).toBe('C:\\Downloads\\Loaderly\\YouTube');
    expect(resolveDownloadDirectory('C:\\Downloads\\Loaderly', 'https://www.youtube.com/watch?v=qyKgnfneR14', false)).toBe('C:\\Downloads\\Loaderly');
  });

  it('defaults Loaderly downloads to the user Downloads folder', () => {
    expect(defaultLoaderlyDownloadDirectory('C:\\Users\\Example\\Downloads')).toBe('C:\\Users\\Example\\Downloads\\Loaderly');
    expect(defaultLoaderlyDownloadDirectory('/Users/Example/Downloads/')).toBe('/Users/Example/Downloads/Loaderly');
  });
  it('keeps drive roots absolute and preserves spaces in chosen folder names', () => {
    expect(resolveDownloadDirectory('R:\\', 'https://youtu.be/example', false)).toBe('R:\\');
    expect(resolveDownloadDirectory('R:\\', 'https://youtu.be/example', true)).toBe('R:\\YouTube');
    expect(resolveDownloadDirectory('/', 'https://youtu.be/example', false)).toBe('/');
    expect(resolveDownloadDirectory('/Volumes/R play list 1 ', 'https://youtu.be/example', false)).toBe('/Volumes/R play list 1 ');
    expect(normalizePreferences({ downloadDirectory: '/Volumes/R play list 1 ' }).downloadDirectory).toBe('/Volumes/R play list 1 ');
  });
});
