import { describe, expect, it } from 'vitest';
import { isRecoverableDownloadFileError, mediaFileNameMatchesSourceIdentity, sourceIdentityFromUrl } from './downloadRecovery';

describe('download recovery helpers', () => {
  it('detects Windows file-lock rename failures as recoverable', () => {
    expect(
      isRecoverableDownloadFileError(
        "ERROR: Unable to rename file: [WinError 32] The process cannot access the file because it is being used by another process: 'video.mp4.part-Frag63.part'"
      )
    ).toBe(true);
  });

  it('does not treat platform rate limits as file recovery cases', () => {
    expect(isRecoverableDownloadFileError('HTTP Error 429: Too Many Requests')).toBe(false);
  });

  it('extracts stable source identities from common media URLs', () => {
    expect(sourceIdentityFromUrl('https://www.youtube.com/watch?v=B3Qr1x-a29E')).toBe('B3Qr1x-a29E');
    expect(sourceIdentityFromUrl('https://www.youtube.com/shorts/abcDEF12345?feature=share')).toBe('abcDEF12345');
    expect(sourceIdentityFromUrl('https://youtu.be/qyKgnfneR14?si=8Z_TfQ2xDiysgQo0')).toBe('qyKgnfneR14');
    expect(sourceIdentityFromUrl('https://www.tiktok.com/@douglasclawlux/video/7646587453230320926?is_from_webapp=1')).toBe('7646587453230320926');
    expect(sourceIdentityFromUrl('https://www.instagram.com/reel/ABC123/')).toBe('ABC123');
  });

  it('matches recovered media files by source identity even when they were created before the retry', () => {
    expect(mediaFileNameMatchesSourceIdentity('C:\\Downloads\\Loaderly\\YouTube\\video title [B3Qr1x-a29E].mp4', 'B3Qr1x-a29E')).toBe(true);
    expect(mediaFileNameMatchesSourceIdentity('C:\\Downloads\\Loaderly\\TikTok\\clip [7646587453230320926].mp4', 'B3Qr1x-a29E')).toBe(false);
  });
});
