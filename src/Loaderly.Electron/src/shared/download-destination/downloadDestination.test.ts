import { describe, expect, it } from 'vitest';
import { defaultLoaderlyDownloadDirectory, platformFolderForSource, resolveDownloadDirectory } from './downloadDestination';

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
    expect(defaultLoaderlyDownloadDirectory('C:\\Users\\voidk\\Downloads')).toBe('C:\\Users\\voidk\\Downloads\\Loaderly');
    expect(defaultLoaderlyDownloadDirectory('/Users/voidk/Downloads/')).toBe('/Users/voidk/Downloads/Loaderly');
  });
});
