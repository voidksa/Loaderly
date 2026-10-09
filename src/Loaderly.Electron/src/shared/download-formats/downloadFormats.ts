import type { DownloadQuality } from '../app-preferences/appPreferences';

export type DownloadFormatQuality = DownloadQuality;
const videoContainerArgs = ['--merge-output-format', 'mp4', '--remux-video', 'mp4'] as const;

export function isFinalDownloadPath(path: string, quality: DownloadFormatQuality): boolean {
  return quality !== 'audio' || /\.mp3$/i.test(path);
}

export function downloadFormatArgs(quality: DownloadFormatQuality): readonly string[] {
  switch (quality) {
    case 'audio':
      return ['-f', 'bestaudio/best', '--extract-audio', '--audio-format', 'mp3', '--audio-quality', '0'];
    case '2160p':
    case '1440p':
    case '1080p':
    case '720p':
    case '480p':
    case '360p': {
      const height = Number.parseInt(quality, 10);
      return [
        ...videoContainerArgs,
        '-f',
        `bv*[height<=${height}][vcodec^=avc1][ext=mp4]+ba[ext=m4a]/`
          + `bv*[height<=${height}][vcodec^=avc1]+ba/b`
          + `[height<=${height}][ext=mp4]/best[height<=${height}]/bv*+ba/best`,
        '-S',
        `res:${height},vcodec:h264,acodec:aac,ext:mp4:m4a`
      ];
    }
    case 'best':
      return [
        ...videoContainerArgs,
        '-f',
        'bv*[vcodec^=avc1][ext=mp4]+ba[ext=m4a]/bv*+ba/best',
        '-S',
        'res,vcodec:h264,acodec:aac,ext:mp4:m4a'
      ];
  }
}

export function isDownloadFormatQuality(value: unknown): value is DownloadFormatQuality {
  return (
    value === 'best' ||
    value === '2160p' ||
    value === '1440p' ||
    value === '1080p' ||
    value === '720p' ||
    value === '480p' ||
    value === '360p' ||
    value === 'audio'
  );
}
