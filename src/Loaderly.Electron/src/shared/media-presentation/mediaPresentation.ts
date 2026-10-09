const mediaSuffix = /\.(?:mp4|m4v|mov|mkv|webm|mp3|m4a|aac|wav|flac|ogg|opus)$/i;

export function mediaDisplayTitle(title: string): string {
  const cleaned = title.replace(mediaSuffix, '');
  return cleaned.trim() ? cleaned : title;
}

export function mediaFileFormat(path?: string, title?: string): string | undefined {
  const match = mediaSuffix.exec(path || title || '');
  return match?.[0].slice(1).toUpperCase();
}
