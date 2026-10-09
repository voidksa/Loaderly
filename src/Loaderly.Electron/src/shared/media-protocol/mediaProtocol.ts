import { extname } from 'node:path';

// Only the packaged renderer and the configured development renderer may read pixels.
export function mediaCorsHeaders(origin: string | null, developmentUrl?: string): Record<string, string> {
  let developmentOrigin: string | undefined;
  try { developmentOrigin = developmentUrl ? new URL(developmentUrl).origin : undefined; } catch { /* no dev origin */ }
  return origin === 'null' || (origin !== null && origin === developmentOrigin)
    ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' }
    : {};
}

export type MediaFileResponsePlan = {
  readonly status: 200 | 206 | 416;
  readonly start: number;
  readonly end: number;
  readonly contentLength: number;
  readonly headers: Record<string, string>;
};

type MediaFileResponsePlanInput = {
  readonly fileSizeBytes: number;
  readonly rangeHeader?: string | null;
  readonly contentType: string;
};

export function mediaContentTypeForPath(filePath: string): string {
  switch (extname(filePath).toLowerCase()) {
    case '.mp4':
    case '.m4v':
      return 'video/mp4';
    case '.mov':
      return 'video/quicktime';
    case '.webm':
      return 'video/webm';
    case '.mkv':
      return 'video/x-matroska';
    case '.mp3':
      return 'audio/mpeg';
    case '.m4a':
      return 'audio/mp4';
    case '.aac':
      return 'audio/aac';
    case '.wav':
      return 'audio/wav';
    case '.ogg':
    case '.opus':
      return 'audio/ogg';
    case '.flac':
      return 'audio/flac';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

export function mediaFileResponsePlan(input: MediaFileResponsePlanInput): MediaFileResponsePlan {
  const fileSizeBytes = Math.max(0, Math.floor(Number.isFinite(input.fileSizeBytes) ? input.fileSizeBytes : 0));
  const range = parseRangeHeader(input.rangeHeader, fileSizeBytes);

  if (range === 'unsatisfiable') {
    return {
      status: 416,
      start: 0,
      end: -1,
      contentLength: 0,
      headers: responseHeaders(input.contentType, '0', `bytes */${fileSizeBytes}`)
    };
  }

  if (range) {
    const contentLength = range.end - range.start + 1;

    return {
      status: 206,
      start: range.start,
      end: range.end,
      contentLength,
      headers: responseHeaders(input.contentType, String(contentLength), `bytes ${range.start}-${range.end}/${fileSizeBytes}`)
    };
  }

  return {
    status: 200,
    start: 0,
    end: fileSizeBytes - 1,
    contentLength: fileSizeBytes,
    headers: responseHeaders(input.contentType, String(fileSizeBytes))
  };
}

function responseHeaders(contentType: string, contentLength: string, contentRange?: string): Record<string, string> {
  return {
    'Accept-Ranges': 'bytes',
    'Content-Length': contentLength,
    ...(contentRange ? { 'Content-Range': contentRange } : {}),
    'Content-Type': contentType
  };
}

function parseRangeHeader(rangeHeader: string | null | undefined, fileSizeBytes: number): { readonly start: number; readonly end: number } | 'unsatisfiable' | undefined {
  const trimmed = rangeHeader?.trim();

  if (!trimmed) {
    return undefined;
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(trimmed);

  if (!match || fileSizeBytes <= 0) {
    return 'unsatisfiable';
  }

  const [, startValue, endValue] = match;

  if (!startValue && !endValue) {
    return 'unsatisfiable';
  }

  if (!startValue) {
    const suffixLength = Number.parseInt(endValue, 10);

    if (!Number.isFinite(suffixLength) || suffixLength <= 0) {
      return 'unsatisfiable';
    }

    return {
      start: Math.max(0, fileSizeBytes - suffixLength),
      end: fileSizeBytes - 1
    };
  }

  const start = Number.parseInt(startValue, 10);
  const requestedEnd = endValue ? Number.parseInt(endValue, 10) : fileSizeBytes - 1;

  if (!Number.isFinite(start) || !Number.isFinite(requestedEnd) || start >= fileSizeBytes || requestedEnd < start) {
    return 'unsatisfiable';
  }

  return {
    start,
    end: Math.min(requestedEnd, fileSizeBytes - 1)
  };
}
