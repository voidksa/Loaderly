import { describe, expect, it } from 'vitest';
import { downloadFormatArgs, isDownloadFormatQuality, isFinalDownloadPath } from './downloadFormats';

describe('downloadFormatArgs', () => {
  it('returns audio extraction args for audio quality', () => {
    const args = downloadFormatArgs('audio');
    expect(args).toContain('--extract-audio');
    expect(args).toContain('--audio-format');
    expect(args).toContain('mp3');
    expect(args).toContain('--audio-quality');
    expect(args).toContain('0');
    expect(args[args.indexOf('-f') + 1]).toBe('bestaudio/best');
    expect(args).not.toContain('--remux-video');
    expect(args).not.toContain('--merge-output-format');
  });

  it('returns h264+mp4 video args with height filter for 1080p', () => {
    const args = downloadFormatArgs('1080p');
    const formatIndex = args.indexOf('-f');
    const sortIndex = args.indexOf('-S');

    expect(formatIndex).toBeGreaterThan(-1);
    expect(sortIndex).toBeGreaterThan(-1);

    const format = args[formatIndex + 1];
    const sort = args[sortIndex + 1];

    expect(format).toContain('height<=1080');
    expect(format).toContain('bv*');
    expect(format).toContain('+ba');
    expect(format).toContain('best[height<=1080]');
    expect(sort).toContain('res:1080');
  });

  it('returns h264+mp4 video args with height filter for 720p', () => {
    const args = downloadFormatArgs('720p');
    const formatIndex = args.indexOf('-f');
    const format = args[formatIndex + 1];
    expect(format).toContain('height<=720');
    expect(args[args.indexOf('-S') + 1]).toContain('res:720');
  });

  it('returns best args with res as primary sort key for best quality', () => {
    const args = downloadFormatArgs('best');
    const formatIndex = args.indexOf('-f');
    const sortIndex = args.indexOf('-S');

    expect(formatIndex).toBeGreaterThan(-1);
    expect(sortIndex).toBeGreaterThan(-1);

    const format = args[formatIndex + 1];
    const sort = args[sortIndex + 1];

    expect(format).toContain('bv*');
    expect(format).toContain('+ba');
    expect(format).toContain('best');
    expect(sort).toContain('res');
    expect(sort).not.toContain('res:');
  });

  it('always includes -f and -S args for video qualities', () => {
    const resolutions = ['2160p', '1440p', '1080p', '720p', '480p', '360p'] as const;
    for (const quality of resolutions) {
      const args = downloadFormatArgs(quality);
      expect(args).toContain('-f');
      expect(args).toContain('-S');
      expect(args.indexOf('-S')).toBeGreaterThan(args.indexOf('-f'));
    }
  });

  it('sorts by capped resolution so yt-dlp picks the highest stream under the cap, not worst', () => {
    // Regression for the original bug: the -S flag must mention the resolution cap
    // so yt-dlp sorts each branch by res, otherwise the bare `best` fallback
    // picks the lowest-quality muxed stream.
    const args = downloadFormatArgs('1080p');
    const sort = args[args.indexOf('-S') + 1];
    expect(sort.startsWith('res:1080')).toBe(true);
  });
});

describe('audio output recovery', () => {
  it('never accepts an intermediate MP4 or M4A as the final MP3', () => {
    expect(isFinalDownloadPath('clip.mp4', 'audio')).toBe(false);
    expect(isFinalDownloadPath('clip.m4a', 'audio')).toBe(false);
    expect(isFinalDownloadPath('clip.mp3.part', 'audio')).toBe(false);
    expect(isFinalDownloadPath('clip.MP3', 'audio')).toBe(true);
    expect(isFinalDownloadPath('clip.mp4', 'best')).toBe(true);
  });
});

describe('isDownloadFormatQuality', () => {
  it('returns true for valid quality values', () => {
    expect(isDownloadFormatQuality('best')).toBe(true);
    expect(isDownloadFormatQuality('1080p')).toBe(true);
    expect(isDownloadFormatQuality('720p')).toBe(true);
    expect(isDownloadFormatQuality('audio')).toBe(true);
  });

  it('returns false for invalid values', () => {
    expect(isDownloadFormatQuality('144p')).toBe(false);
    expect(isDownloadFormatQuality('worst')).toBe(false);
    expect(isDownloadFormatQuality(null)).toBe(false);
    expect(isDownloadFormatQuality(undefined)).toBe(false);
    expect(isDownloadFormatQuality(1080)).toBe(false);
  });
});
