export type LocalFileKind = 'media' | 'subtitle' | 'unknown';

export function localFileKindForInput(value: string): LocalFileKind {
  const normalized = value.trim().toLowerCase();

  // A direct media URL belongs in the download queue, not the filesystem importer.
  if (/^https?:\/\//.test(normalized)) {
    return 'unknown';
  }

  if (/\.(srt|vtt)$/.test(normalized)) {
    return 'subtitle';
  }

  if (/\.(mp4|mov|mkv|webm|avi|m4v|mp3|wav|flac|m4a|aac|ogg|opus)$/.test(normalized)) {
    return 'media';
  }

  return 'unknown';
}
