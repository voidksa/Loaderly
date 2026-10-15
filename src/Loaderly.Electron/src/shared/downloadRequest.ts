import type { DownloadQuality } from './app-preferences/appPreferences';
export type DownloadUrlPayload = {
  scheduledAt?: number; rateKib?: number; rowId?: number; knownFiles?: readonly string[];
  downloadEngine?: import('./downloadEngine').DownloadEngine;
  locale?: 'en' | 'ar'; url: string; quality: DownloadQuality;
  downloadDirectory?: string; groupDownloadsByPlatform?: boolean;
  writeSubtitles?: boolean; subtitleLanguages?: string;
  audioMode?: import('./downloadAudio').DownloadAudioMode; removeMusic?: boolean; originalPath?: string; originalSubtitlePath?: string;
};
export type DownloadUrlResult = {
  paused?: boolean; ok: boolean; skipped?: boolean; replacedPath?: string;
  path?: string; fileUrl?: string; thumbnailUrl?: string; name?: string;
  sizeBytes?: number; durationSeconds?: number; subtitlePath?: string; message?: string;
  originalPath?: string;
};
