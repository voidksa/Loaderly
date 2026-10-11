import { posix, win32 } from 'node:path';

type MediaOutputKind = 'video' | 'image' | 'gif' | 'snapshot' | 'audio';

const outputExtensions: Record<MediaOutputKind, string> = {
  video: 'mp4',
  image: 'png',
  gif: 'gif',
  snapshot: 'png',
  audio: 'mp3'
};

export function suggestedMediaOutputFileName(
  sourcePath: string,
  kind: MediaOutputKind,
  platform: NodeJS.Platform = process.platform
): string {
  const path = platform === 'win32' ? win32 : posix;
  const name = path.parse(sourcePath).name || 'Export';
  return `${name}.${outputExtensions[kind]}`;
}
