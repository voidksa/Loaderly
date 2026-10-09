import { describe, expect, it } from 'vitest';
import { MAX_DOWNLOAD_URL_LENGTH, normalizeDownloadUrl } from './downloadUrl';

describe('download URL normalization', () => {
  it('accepts and normalizes HTTP and HTTPS URLs', () => {
    expect(normalizeDownloadUrl('  HTTPS://Example.COM:443/watch?v=abc#clip  ')).toBe(
      'https://example.com/watch?v=abc#clip'
    );
    expect(normalizeDownloadUrl('http://media.example.com/video')).toBe('http://media.example.com/video');
  });

  it('rejects option-like values before they can reach yt-dlp', () => {
    expect(normalizeDownloadUrl('--config-location=C:\\unsafe.conf')).toBeUndefined();
    expect(normalizeDownloadUrl('   -o C:\\unsafe-output')).toBeUndefined();
  });

  it('rejects unsupported schemes, ambiguous inputs, and malformed URLs', () => {
    expect(normalizeDownloadUrl('ftp://example.com/video')).toBeUndefined();
    expect(normalizeDownloadUrl('file:///C:/video.mp4')).toBeUndefined();
    expect(normalizeDownloadUrl('//example.com/video')).toBeUndefined();
    expect(normalizeDownloadUrl('example.com/video')).toBeUndefined();
    expect(normalizeDownloadUrl('https://')).toBeUndefined();
    expect(normalizeDownloadUrl('https://example.com/video\n--exec=calc')).toBeUndefined();
    expect(normalizeDownloadUrl('')).toBeUndefined();
    expect(normalizeDownloadUrl(undefined)).toBeUndefined();
  });

  it('enforces a bounded URL length', () => {
    const oversizedUrl = `https://example.com/${'a'.repeat(MAX_DOWNLOAD_URL_LENGTH)}`;
    expect(normalizeDownloadUrl(oversizedUrl)).toBeUndefined();
  });
});
