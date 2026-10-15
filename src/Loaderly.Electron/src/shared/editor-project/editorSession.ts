export const editorSessionStoragePrefix = 'loaderly:editor-session:v2:';
export const legacyEditorSessionStoragePrefix = 'loaderly:editor-session:';

export type EditorMediaStatus = 'ready' | 'edited' | 'downloading' | 'queued' | 'failed';
export type EditorMediaKind = 'video' | 'audio';

export type EditorMediaReadinessInput = {
  readonly filePath?: string;
  readonly mediaKind?: EditorMediaKind;
  readonly status: EditorMediaStatus;
};

function clampSeconds(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function finiteNumber(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

export function mediaIdentityForPath(filePath: string | undefined): string | undefined {
  const trimmed = filePath?.trim();

  if (!trimmed) {
    return undefined;
  }

  const normalized = trimmed.replaceAll('\\', '/');
  return /^[a-z]:\//i.test(normalized) || normalized.startsWith('//') ? normalized.toLowerCase() : normalized;
}

export function editorSessionStorageKeys(filePath: string | undefined): readonly string[] {
  const identity = mediaIdentityForPath(filePath);

  if (!identity) {
    return [];
  }

  const legacyKey = filePath ? `${legacyEditorSessionStoragePrefix}${filePath}` : undefined;
  if(identity.startsWith('/')&&!identity.startsWith('//'))return [
    `loaderly:editor-session:v3:${encodeURIComponent(identity)}`,
    legacyKey!, `${editorSessionStoragePrefix}${encodeURIComponent(identity.toLowerCase())}`
  ];
  const primaryKey = `${editorSessionStoragePrefix}${encodeURIComponent(identity)}`;

  return legacyKey && legacyKey !== primaryKey ? [primaryKey, legacyKey] : [primaryKey];
}

export function canOpenEditorForMedia(row: EditorMediaReadinessInput): boolean {
  return Boolean(row.filePath && (row.status === 'ready' || row.status === 'edited'));
}

export function playerScrubSecondsFromClientX(options: {
  readonly clientX: number;
  readonly left: number;
  readonly width: number;
  readonly durationSeconds: number;
  readonly isRtl?: boolean;
}): number {
  const width = Math.max(1, options.width);
  const visualRatio = Math.min(Math.max((options.clientX - options.left) / width, 0), 1);
  const ratio = options.isRtl ? 1 - visualRatio : visualRatio;

  return ratio * Math.max(0, options.durationSeconds);
}

export function playbackResumeSeconds(options: {
  readonly mediaCurrentSeconds: number;
  readonly requestedPlayheadSeconds: number;
  readonly lastKnownPlayheadSeconds: number;
  readonly playbackEndSeconds: number;
}): number {
  const playbackEndSeconds = Math.max(0.1, finiteNumber(options.playbackEndSeconds, 0.1));
  const lastKnownPlayheadSeconds = finiteNumber(options.lastKnownPlayheadSeconds, options.requestedPlayheadSeconds);
  const requestedPlayheadSeconds = finiteNumber(lastKnownPlayheadSeconds, finiteNumber(options.requestedPlayheadSeconds, 0));
  const mediaCurrentSeconds = finiteNumber(options.mediaCurrentSeconds, requestedPlayheadSeconds);
  const resumeSeconds = Math.abs(mediaCurrentSeconds - requestedPlayheadSeconds) > 0.35
    ? requestedPlayheadSeconds
    : mediaCurrentSeconds;

  if (resumeSeconds >= playbackEndSeconds - 0.04) {
    return 0;
  }

  return clampSeconds(resumeSeconds, 0, playbackEndSeconds);
}
