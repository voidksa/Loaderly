export enum QuickCopyOutputKind {
  Video = 'video',
  Image = 'image',
  Gif = 'gif',
  Snapshot = 'snapshot',
  Audio = 'audio'
}

export type QuickCopyAction = {
  readonly kind: QuickCopyOutputKind;
  readonly label: string;
  readonly description: string;
  readonly requiresRange: boolean;
};

export type QuickCopyRequest = {
  readonly kind: QuickCopyOutputKind;
  readonly startSeconds: number;
  readonly endSeconds: number;
};

export type QuickCopyJobStatus = 'queued' | 'rendering' | 'copied' | 'saved' | 'failed';

export type QuickCopyJob = {
  readonly id: string;
  readonly kind: QuickCopyOutputKind;
  readonly label: string;
  readonly status: QuickCopyJobStatus;
  readonly rangeLabel: string;
  readonly destination?: 'clipboard' | 'file';
};

export type CreateQuickCopyJobInput = QuickCopyRequest & {
  readonly id: number | string;
};

export type QuickCopyValidationResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

const maxGifDurationSeconds = 15;

export const quickCopyActions: readonly QuickCopyAction[] = [
  {
    kind: QuickCopyOutputKind.Video,
    label: 'Copy video',
    description: 'Render the selected range as a share-ready video clip.',
    requiresRange: true
  },
  {
    kind: QuickCopyOutputKind.Image,
    label: 'Copy image',
    description: 'Copy the selected frame as an image.',
    requiresRange: false
  },
  {
    kind: QuickCopyOutputKind.Gif,
    label: 'Copy GIF',
    description: 'Render a short selected range as a GIF.',
    requiresRange: true
  },
  {
    kind: QuickCopyOutputKind.Snapshot,
    label: 'Copy snapshot',
    description: 'Copy the current preview frame immediately.',
    requiresRange: false
  },
  {
    kind: QuickCopyOutputKind.Audio,
    label: 'Copy audio',
    description: 'Render the selected range as an MP3 audio clip.',
    requiresRange: true
  }
];

export function validateQuickCopyRequest(request: QuickCopyRequest): QuickCopyValidationResult {
  if (request.endSeconds <= request.startSeconds) {
    return { ok: false, reason: 'Copy range must end after it starts.' };
  }

  if (
    request.kind === QuickCopyOutputKind.Gif &&
    request.endSeconds - request.startSeconds > maxGifDurationSeconds
  ) {
    return { ok: false, reason: 'GIF copy is limited to 15 seconds.' };
  }

  return { ok: true };
}

export function createQuickCopyJob(input: CreateQuickCopyJobInput): QuickCopyJob {
  const action = quickCopyActions.find((candidate) => candidate.kind === input.kind);

  return {
    id: `copy-${input.id}`,
    kind: input.kind,
    label: action?.label ?? 'Copy',
    status: 'queued',
    rangeLabel: formatRangeLabel(input.startSeconds, input.endSeconds)
  };
}

function formatRangeLabel(startSeconds: number, endSeconds: number): string {
  if (Math.abs(endSeconds - startSeconds) < 0.1) {
    return formatTimestamp(startSeconds);
  }

  return `${formatTimestamp(startSeconds)} - ${formatTimestamp(endSeconds)}`;
}

function formatTimestamp(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toFixed(2).padStart(5, '0')}`;
}
