export type EditorSubtitleCue = {
  readonly startSeconds: number;
  readonly endSeconds: number;
  readonly text: string;
};

export function activeSubtitleCueIndex(cues: readonly EditorSubtitleCue[], playheadSeconds: number): number {
  const seconds = finiteNumber(playheadSeconds, 0);

  return cues.findIndex((cue) => seconds >= cue.startSeconds - 0.001 && seconds <= cue.endSeconds + 0.001);
}

export function updateSubtitleCue(
  cues: readonly EditorSubtitleCue[],
  index: number,
  patch: Partial<EditorSubtitleCue>,
  durationSeconds: number
): readonly EditorSubtitleCue[] {
  if (index < 0 || index >= cues.length) {
    return cues;
  }

  return cues.map((cue, cueIndex) => (cueIndex === index ? normalizeSubtitleCue({ ...cue, ...patch }, durationSeconds) : cue));
}

export function addSubtitleCueAt(
  cues: readonly EditorSubtitleCue[],
  playheadSeconds: number,
  durationSeconds: number,
  text = ''
): readonly EditorSubtitleCue[] {
  const duration = Math.max(0.1, finiteNumber(durationSeconds, 0.1));
  const startSeconds = clampTime(playheadSeconds, duration);
  const endSeconds = clampTime(Math.min(duration, startSeconds + 2), duration);
  const nextCue = normalizeSubtitleCue(
    {
      startSeconds,
      endSeconds: Math.max(startSeconds + 0.1, endSeconds),
      text
    },
    duration
  );

  return [...cues, nextCue].sort((left, right) => left.startSeconds - right.startSeconds || left.endSeconds - right.endSeconds);
}

export function retimeSubtitleCuesForOutput(
  cues: readonly EditorSubtitleCue[],
  startSeconds: number,
  endSeconds: number
): readonly EditorSubtitleCue[] {
  const outputStart = Math.max(0, finiteNumber(startSeconds, 0));
  const outputEnd = Math.max(outputStart + 0.1, finiteNumber(endSeconds, outputStart + 0.1));
  const outputDuration = outputEnd - outputStart;

  return cues
    .map((cue) => ({
      startSeconds: Math.max(0, cue.startSeconds - outputStart),
      endSeconds: Math.min(outputDuration, Math.max(0, cue.endSeconds - outputStart)),
      text: cue.text
    }))
    .filter((cue) => cue.endSeconds > 0 && cue.startSeconds < outputDuration && cue.endSeconds > cue.startSeconds + 0.001);
}

export function subtitleCuesForStillFrame(cues: readonly EditorSubtitleCue[], frameSeconds: number): readonly EditorSubtitleCue[] {
  const seconds = finiteNumber(frameSeconds, 0);

  return cues
    .filter((cue) => seconds >= cue.startSeconds - 0.001 && seconds <= cue.endSeconds + 0.001)
    .map((cue) => ({ ...cue, startSeconds: 0, endSeconds: 10 }));
}

function normalizeSubtitleCue(cue: EditorSubtitleCue, durationSeconds: number): EditorSubtitleCue {
  const duration = Math.max(0.1, finiteNumber(durationSeconds, 0.1));
  const startSeconds = clampTime(cue.startSeconds, duration);
  const requestedEnd = clampTime(cue.endSeconds, duration);
  const endSeconds = Math.max(startSeconds + 0.1, requestedEnd);

  return {
    startSeconds,
    endSeconds: Math.min(duration, endSeconds),
    text: cue.text
  };
}

function clampTime(value: number, durationSeconds: number): number {
  return Math.max(0, Math.min(durationSeconds, finiteNumber(value, 0)));
}

function finiteNumber(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}
