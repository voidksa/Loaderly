export const subtitlesSkippedRateLimitMessage = 'SUBTITLES_SKIPPED_RATE_LIMIT';
export const subtitlesSkippedUnavailableMessage = 'SUBTITLES_SKIPPED_UNAVAILABLE';

export function isRecoverableDownloadFileError(message: string): boolean {
  return /WinError 32|being used by another process|Unable to rename file|file access|EBUSY|EPERM|resource busy/i.test(message);
}

export function sourceIdentityFromUrl(source: string): string | undefined {
  try {
    const url = new URL(source);
    const host = url.hostname.replace(/^www\./i, '').toLowerCase();

    if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
      const parts = url.pathname.split('/').filter(Boolean);

      if (parts[0] === 'shorts' || parts[0] === 'embed' || parts[0] === 'live') {
        return cleanSourceIdentity(parts[1]);
      }

      return cleanSourceIdentity(url.searchParams.get('v') ?? undefined);
    }

    if (host === 'youtu.be') {
      return cleanSourceIdentity(url.pathname.split('/').filter(Boolean)[0]);
    }

    if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) {
      const videoIndex = url.pathname.split('/').findIndex((part) => part === 'video');
      return videoIndex >= 0 ? cleanSourceIdentity(url.pathname.split('/')[videoIndex + 1]) : undefined;
    }

    if (host === 'instagram.com' || host.endsWith('.instagram.com')) {
      const parts = url.pathname.split('/').filter(Boolean);
      const mediaIndex = parts.findIndex((part) => part === 'reel' || part === 'p');
      return mediaIndex >= 0 ? cleanSourceIdentity(parts[mediaIndex + 1]) : undefined;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export function mediaFileNameMatchesSourceIdentity(filePath: string, sourceIdentity: string | undefined): boolean {
  if (!sourceIdentity) {
    return false;
  }

  return filePath.toLowerCase().includes(sourceIdentity.toLowerCase());
}

function cleanSourceIdentity(value: string | undefined): string | undefined {
  const cleaned = value?.trim();

  return cleaned && cleaned.length >= 3 ? decodeURIComponent(cleaned) : undefined;
}
