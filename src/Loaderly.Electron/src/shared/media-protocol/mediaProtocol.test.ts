import { describe, expect, it } from 'vitest';
import { mediaFileResponsePlan, mediaCorsHeaders } from './mediaProtocol';

describe('media protocol response planning', () => {
  it('allows pixel reads only for the packaged renderer or configured dev origin', () => {
    expect(mediaCorsHeaders('null')).toEqual({ 'Access-Control-Allow-Origin': 'null', Vary: 'Origin' });
    expect(mediaCorsHeaders('http://localhost:5173', 'http://localhost:5173/editor')).toHaveProperty('Access-Control-Allow-Origin', 'http://localhost:5173');
    expect(mediaCorsHeaders('https://untrusted.example')).toEqual({});
    expect(mediaCorsHeaders(null)).toEqual({});
    expect(mediaCorsHeaders('http://localhost:9999', 'http://localhost:5173')).toEqual({});
  });
  it('serves seekable byte ranges for video playback', () => {
    expect(mediaFileResponsePlan({ fileSizeBytes: 1000, rangeHeader: 'bytes=200-499', contentType: 'video/mp4' })).toEqual({
      status: 206,
      start: 200,
      end: 499,
      contentLength: 300,
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Length': '300',
        'Content-Range': 'bytes 200-499/1000',
        'Content-Type': 'video/mp4'
      }
    });
  });

  it('supports open-ended and suffix byte ranges', () => {
    expect(mediaFileResponsePlan({ fileSizeBytes: 1000, rangeHeader: 'bytes=900-', contentType: 'video/mp4' })).toMatchObject({
      status: 206,
      start: 900,
      end: 999,
      contentLength: 100
    });
    expect(mediaFileResponsePlan({ fileSizeBytes: 1000, rangeHeader: 'bytes=-250', contentType: 'video/mp4' })).toMatchObject({
      status: 206,
      start: 750,
      end: 999,
      contentLength: 250
    });
  });

  it('returns a 416 plan for unsatisfiable video ranges', () => {
    expect(mediaFileResponsePlan({ fileSizeBytes: 1000, rangeHeader: 'bytes=1200-1400', contentType: 'video/mp4' })).toEqual({
      status: 416,
      start: 0,
      end: -1,
      contentLength: 0,
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Length': '0',
        'Content-Range': 'bytes */1000',
        'Content-Type': 'video/mp4'
      }
    });
  });
});
