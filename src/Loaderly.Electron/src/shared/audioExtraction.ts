import { sourceIdentityFromUrl } from './download-recovery/downloadRecovery';

export type ExtractAudioChoice = 'use' | 'replace' | 'keep' | 'cancel';
export type ExistingAudioFile = { readonly path: string; readonly source?: string };
export type ExtractAudioRequest = {
  readonly sourcePath: string;
  readonly source?: string;
  readonly knownAudio?: readonly ExistingAudioFile[];
  readonly choice?: ExtractAudioChoice;
  readonly existingPath?: string;
};
export type ExtractedAudioDetails = {
  readonly path: string;
  readonly fileUrl: string;
  readonly name: string;
  readonly sizeBytes: number;
  readonly durationSeconds?: number;
  readonly thumbnailUrl?: string;
};
export type ExtractAudioResult =
  | { readonly canceled: true }
  | { readonly canceled: false; readonly existing: { readonly path: string; readonly name: string } }
  | ({ readonly canceled: false; readonly reused: boolean; readonly replacedPath?: string } & ExtractedAudioDetails);

function localPathKey(value: string): string {
  const normalized = value.replaceAll('\\', '/').replace(/\/+$/, '');
  return /^[a-z]:\//i.test(normalized) || normalized.startsWith('//') ? normalized.toLowerCase() : normalized;
}
function remoteIdentity(value: string | undefined): string | undefined {
  if (!value) return;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return;
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    const service = host === 'youtu.be' || host === 'youtube.com' || host.endsWith('.youtube.com') ? 'youtube'
      : host === 'tiktok.com' || host.endsWith('.tiktok.com') ? 'tiktok'
      : host === 'instagram.com' || host.endsWith('.instagram.com') ? 'instagram' : host;
    const id = sourceIdentityFromUrl(value);
    if (id) return service + ':' + id;
    url.hash = '';
    return url.href;
  } catch { return; }
}
function filenameYoutubeIdentity(value: string): string | undefined {
  const file = value.replaceAll('\\', '/').split('/').pop() ?? '';
  const id = file.match(/\[([\w-]{11})\](?:[^\[\]]*)\.[a-z0-9]+$/i)?.[1];
  return id ? 'youtube:' + id : undefined;
}

// A title is not an identity: two unrelated clips can share the same name.
// The bracketed YouTube id also recognizes audio saved by earlier versions.
export function audioMatchesSource(request: Pick<ExtractAudioRequest, 'source' | 'sourcePath'>, candidate: ExistingAudioFile): boolean {
  const sourceIdentity = remoteIdentity(request.source) ?? filenameYoutubeIdentity(request.sourcePath);
  const candidateIdentity = remoteIdentity(candidate.source);
  if (sourceIdentity && candidateIdentity) return sourceIdentity === candidateIdentity;
  if (sourceIdentity && filenameYoutubeIdentity(candidate.path) === sourceIdentity) return true;
  if (remoteIdentity(request.source) || candidateIdentity) return false;
  return Boolean(candidate.source && localPathKey(candidate.source) === localPathKey(request.source || request.sourcePath));
}
