const knownPlatformFolders: readonly { readonly pattern: RegExp; readonly folder: string }[] = [
  { pattern: /(^|\.)youtube\.com$/i, folder: 'YouTube' },
  { pattern: /(^|\.)youtu\.be$/i, folder: 'YouTube' },
  { pattern: /(^|\.)tiktok\.com$/i, folder: 'TikTok' },
  { pattern: /(^|\.)instagram\.com$/i, folder: 'Instagram' },
  { pattern: /(^|\.)x\.com$/i, folder: 'X' },
  { pattern: /(^|\.)twitter\.com$/i, folder: 'X' },
  { pattern: /(^|\.)facebook\.com$/i, folder: 'Facebook' },
  { pattern: /(^|\.)fb\.watch$/i, folder: 'Facebook' },
  { pattern: /(^|\.)vimeo\.com$/i, folder: 'Vimeo' },
  { pattern: /(^|\.)twitch\.tv$/i, folder: 'Twitch' },
  { pattern: /(^|\.)soundcloud\.com$/i, folder: 'SoundCloud' }
];

export function platformFolderForSource(source: string): string {
  const host = hostForSource(source);

  if (host.length === 0) {
    return 'Other';
  }

  const known = knownPlatformFolders.find((entry) => entry.pattern.test(host));

  return known?.folder ?? sanitizeFolderName(host);
}

export function resolveDownloadDirectory(baseDirectory: string, source: string, groupByPlatform: boolean): string {
  const separator = baseDirectory.includes('\\') ? '\\' : '/';
  const strippedBase = baseDirectory.replace(/[\\/]+$/, '');
  const normalizedBase = !strippedBase ? separator : /^[a-z]:$/i.test(strippedBase) ? strippedBase + separator : strippedBase;

  if (!groupByPlatform) {
    return normalizedBase;
  }

  return `${normalizedBase}${/[\\/]$/.test(normalizedBase) ? '' : separator}${platformFolderForSource(source)}`;
}

export function defaultLoaderlyDownloadDirectory(downloadsDirectory: string): string {
  const normalizedBase = downloadsDirectory.replace(/[\\/]+$/, '');
  const separator = normalizedBase.includes('\\') ? '\\' : '/';

  return `${normalizedBase}${separator}Loaderly`;
}

function hostForSource(source: string): string {
  try {
    return new URL(source).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

function sanitizeFolderName(value: string): string {
  return value
    .replace(/[<>:"/\\|?*\u0000-\u001F]+/g, '-')
    .replace(/\.+$/g, '')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'Other';
}
