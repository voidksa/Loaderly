import { mediaTransferFailure } from './downloadTransferFailure';

export const downloadEngines = ['auto', 'yt-dlp', 'pytubefix'] as const;
export type DownloadEngine = typeof downloadEngines[number];
export function normalizeDownloadEngine(value: unknown): DownloadEngine { return downloadEngines.includes(value as DownloadEngine) ? value as DownloadEngine : 'auto'; }
export function isYouTubeMediaUrl(value: string): boolean {
  try {
    const url = new URL(value), host = url.hostname.toLowerCase();
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return false;
    return (host === 'youtu.be' && /^\/[\w-]{11}\/?$/.test(url.pathname)) ||
      ((host === 'youtube.com' || host.endsWith('.youtube.com')) && ((url.pathname === '/watch' && /^[\w-]{11}$/.test(url.searchParams.get('v') ?? '')) || /^\/(shorts|live|embed)\/[\w-]{11}\/?$/.test(url.pathname)));
  } catch { return false; }
}
/** Only extractor/media compatibility failures warrant changing an engine.
 * Authentication, blocked access, cancellations and local failures keep their cause. */
export function shouldTryBackup(url: string, error: unknown): boolean {
  if (!isYouTubeMediaUrl(url)) return false;
  const detail = error as { message?: string; stderr?: string } | undefined;
  const message = typeof error === 'string' ? error : `${detail?.message ?? ''} ${detail?.stderr ?? ''}`;
  if (/cancel|abort|ENOSPC|EACCES|EPERM|disk|permission|private video|sign in|login|log in|age.restrict|not available in your country|members.only|copyright|removed|HTTP Error (429|401)|confirm.*bot|ENOTFOUND|ECONN|network.*unreachable/i.test(message)) return false;
  return !!mediaTransferFailure(error) || /yt-dlp was not found|unable to extract|could not extract|signature|nsig|n challenge|player.*(error|failed)|requested format.*not available|Could not read the download title|no video formats found/i.test(message);
}

