import { sourceIdentityFromUrl } from './download-recovery/downloadRecovery';
import type { DownloadAudioMode } from './downloadAudio';

export type ExtractAudioChoice = 'use' | 'replace' | 'keep' | 'cancel';
export type ExistingAudioFile = { readonly path: string; readonly source?: string; readonly audioMode?: DownloadAudioMode };
export type ExtractAudioRequest = {
  readonly sourcePath: string;
  readonly source?: string;
  readonly audioMode?: DownloadAudioMode;
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
export function audioMatchesSource(request: Pick<ExtractAudioRequest, 'source' | 'sourcePath' | 'audioMode'>, candidate: ExistingAudioFile): boolean {
  const mode = (value: DownloadAudioMode | undefined, path: string) => value ?? (/\[Instrumental\]/i.test(path) ? 'instrumental' : /\[No music\]/i.test(path) ? 'vocals' : 'original');
  if (mode(request.audioMode, request.sourcePath) !== mode(candidate.audioMode, candidate.path)) return false;
  const sourceIdentity = remoteIdentity(request.source) ?? filenameYoutubeIdentity(request.sourcePath);
  const candidateIdentity = remoteIdentity(candidate.source);
  if (sourceIdentity && candidateIdentity) return sourceIdentity === candidateIdentity;
  if (sourceIdentity && filenameYoutubeIdentity(candidate.path) === sourceIdentity) return true;
  if (remoteIdentity(request.source) || candidateIdentity) return false;
  return Boolean(candidate.source && localPathKey(candidate.source) === localPathKey(request.source || request.sourcePath));
}

export function audioExtractionError(error: unknown, ar: boolean): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/no audio track|NO_AUDIO/i.test(message)) return ar ? 'هذا الملف لا يحتوي على مسار صوتي.' : 'This file has no audio track.';
  if (/ffmpeg was not found|MEDIA_TOOL_MISSING/i.test(message)) return ar ? 'أداة معالجة الوسائط غير متاحة. افتح الأدوات لتجهيزها ثم أعد المحاولة.' : 'The media tool is unavailable. Set it up in Tools, then retry.';
  if (/Source.*not found|ENOENT/i.test(message)) return ar ? 'تعذر العثور على الملف. تحقق من موقعه ثم أعد المحاولة.' : 'The file could not be found. Check its location, then retry.';
  if (/EACCES|EPERM|Permission denied|Access is denied/i.test(message)) return ar ? 'تعذر حفظ الصوت في المجلد. تحقق من صلاحية الوصول إليه وأن الملف غير مستخدم.' : 'Could not save audio in the folder. Check access permissions and whether the file is in use.';
  if (/ENOSPC|No space left/i.test(message)) return ar ? 'لا توجد مساحة كافية لحفظ الصوت. وفّر مساحة ثم أعد المحاولة.' : 'There is not enough space to save audio. Free some space, then retry.';
  if (/existing audio.*changed|existing audio.*no longer/i.test(message)) return ar ? 'تغير الملف الصوتي المحفوظ. أعد الاستخراج لتحديث الخيارات.' : 'The saved audio changed. Extract again to refresh the choices.';
  return ar ? 'تعذر استخراج الصوت. أعد المحاولة، وتحقق من تحديث أدوات الوسائط إذا استمر الخطأ.' : 'Could not extract audio. Retry, and check for media tool updates if the error continues.';
}
