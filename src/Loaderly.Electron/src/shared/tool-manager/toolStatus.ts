export const toolNames = ['yt-dlp', 'ffmpeg', 'ffprobe', 'deno'] as const;
export type ToolName = typeof toolNames[number];
export type ToolStatus = {
  readonly name: string;
  readonly available: boolean;
  readonly path?: string;
  readonly version?: string;
  readonly latestVersion?: string;
  readonly updateAvailable?: boolean;
  readonly updateSupported?: boolean;
  readonly message?: string;
  readonly checkError?: string;
};

export function parseToolVersion(value: string): string | undefined {
  return value.match(/(?:^|\s|v)(\d+(?:\.\d+){1,3})(?=[^\d.]|$)/)?.[1];
}

// Unknown/nightly builds must never be presented as older stable releases.
export function isNewerToolVersion(installed: string, latest: string): boolean | undefined {
  if (/\bgit\b|nightly|\bN-\d/i.test(installed)) return undefined;
  const left = parseToolVersion(installed)?.split('.').map(Number);
  const right = parseToolVersion(latest)?.split('.').map(Number);
  if (!left || !right) return undefined;
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    if ((left[i] ?? 0) !== (right[i] ?? 0)) return (right[i] ?? 0) > (left[i] ?? 0);
  }
  return false;
}
