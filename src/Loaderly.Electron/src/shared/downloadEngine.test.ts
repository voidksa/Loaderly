import {describe,it,expect} from 'vitest';
import {isYouTubeMediaUrl,shouldTryBackup,normalizeDownloadEngine} from './downloadEngine';
import {shortcutLabel} from './ui/shortcutLabel';
describe('optional YouTube fallback',()=>{
  const url='https://www.youtube.com/watch?v=jNQXAC9IVRw';
  it('limits backup attempts to recognized YouTube video links',()=>{
    for(const value of [url,'https://youtu.be/jNQXAC9IVRw','https://m.youtube.com/shorts/jNQXAC9IVRw'])expect(isYouTubeMediaUrl(value)).toBe(true);
    for(const value of ['https://youtube.com.evil.test/watch?v=jNQXAC9IVRw','https://youtube.com/playlist?list=123','https://user:pass@youtube.com/watch?v=jNQXAC9IVRw','https://example.org/video'])expect(shouldTryBackup(value,'Unable to extract signature')).toBe(false);
    expect(normalizeDownloadEngine('unknown')).toBe('auto');
  });
  it('retries extractor failures but preserves cancellation, storage and access failures',()=>{
    for(const error of ['Unable to extract signature','Requested format is not available','yt-dlp was not found.','Unable to download video data: HTTP Error 403'])expect(shouldTryBackup(url,Error(error))).toBe(true);
    for(const error of ['TASK_CANCELED','ENOSPC disk full','EACCES permission denied','Private video: sign in','Sign in to confirm you are not a bot','HTTP Error 429','Video removed','Network unreachable','Age-restricted content'])expect(shouldTryBackup(url,Error(error))).toBe(false);
  });
  it('shows only the current platform keys',()=>{
    for(const platform of ['win32','linux'])expect(shortcutLabel('Mod+Shift+Alt+V',platform)).toBe('Ctrl + Shift + Alt + V');
    expect(shortcutLabel('Mod+Shift+Alt+V','darwin')).toBe('⌘ + ⇧ + ⌥ + V');
  });
});
