import type { EditorOverlayRect, EffectRegionKeyframe } from './editorProject';

export type { EffectRegionKeyframe };

export type EffectRegionSegment = {
  readonly startSeconds: number;
  readonly endSeconds: number;
  readonly region: EditorOverlayRect;
};

export function regionAtKeyframeTime(
  baseRegion: EditorOverlayRect,
  keyframes: readonly EffectRegionKeyframe[] | undefined,
  timeSeconds: number
): EditorOverlayRect {
  const sorted = normalizedKeyframes(keyframes);

  if (sorted.length === 0) {
    return baseRegion;
  }

  if (timeSeconds <= sorted[0].timeSeconds) {
    return sorted[0].region;
  }

  const last = sorted[sorted.length - 1];
  if (timeSeconds >= last.timeSeconds) {
    return last.region;
  }

  for (let index = 0; index < sorted.length - 1; index += 1) {
    const left = sorted[index];
    const right = sorted[index + 1];

    if (timeSeconds >= left.timeSeconds && timeSeconds <= right.timeSeconds) {
      const span = Math.max(0.001, right.timeSeconds - left.timeSeconds);
      const progress = (timeSeconds - left.timeSeconds) / span;
      return interpolateRegion(left.region, right.region, progress);
    }
  }

  return baseRegion;
}

export function upsertRegionKeyframe(
  keyframes: readonly EffectRegionKeyframe[] | undefined,
  timeSeconds: number,
  region: EditorOverlayRect
): readonly EffectRegionKeyframe[] {
  const roundedTime = Math.round(Math.max(0, finiteNumber(timeSeconds, 0)) * 1000) / 1000;
  const next = normalizedKeyframes(keyframes).filter((keyframe) => Math.abs(keyframe.timeSeconds - roundedTime) > 0.025);

  next.push({ timeSeconds: roundedTime, region });
  return normalizedKeyframes(next);
}

export function removeRegionKeyframeNear(
  keyframes: readonly EffectRegionKeyframe[] | undefined,
  timeSeconds: number
): readonly EffectRegionKeyframe[] {
  return normalizedKeyframes(keyframes).filter((keyframe) => Math.abs(keyframe.timeSeconds - timeSeconds) > 0.025);
}

export function regionSegmentsForExport(
  baseRegion: EditorOverlayRect,
  keyframes: readonly EffectRegionKeyframe[] | undefined,
  startSeconds: number,
  endSeconds: number,
  stepSeconds = 0.25
): readonly EffectRegionSegment[] {
  const safeStart = Math.max(0, finiteNumber(startSeconds, 0));
  const safeEnd = Math.max(safeStart + 0.05, finiteNumber(endSeconds, safeStart + 0.05));
  const sorted = normalizedKeyframes(keyframes);

  if (sorted.length === 0) {
    return [{ startSeconds: safeStart, endSeconds: safeEnd, region: baseRegion }];
  }

  const step = Math.max(0.05, finiteNumber(stepSeconds, 0.25));
  const segments: EffectRegionSegment[] = [];
  let cursor = safeStart;

  while (cursor < safeEnd - 0.001) {
    const next = Math.min(safeEnd, cursor + step);
    const sampleTime = cursor + (next - cursor) / 2;
    segments.push({
      startSeconds: Math.round(cursor * 1000) / 1000,
      endSeconds: Math.round(next * 1000) / 1000,
      region: regionAtKeyframeTime(baseRegion, sorted, sampleTime)
    });
    cursor = next;
  }

  return segments;
}

function normalizedKeyframes(keyframes: readonly EffectRegionKeyframe[] | undefined): readonly EffectRegionKeyframe[] {
  return (keyframes ?? [])
    .filter((keyframe) => Number.isFinite(keyframe.timeSeconds))
    .slice()
    .sort((left, right) => left.timeSeconds - right.timeSeconds);
}

function interpolateRegion(left: EditorOverlayRect, right: EditorOverlayRect, progress: number): EditorOverlayRect {
  return {
    x: interpolate(left.x, right.x, progress),
    y: interpolate(left.y, right.y, progress),
    width: interpolate(left.width, right.width, progress),
    height: interpolate(left.height, right.height, progress),
    rotation: interpolateOptional(left.rotation, right.rotation, progress),
    opacity: interpolateOptional(left.opacity, right.opacity, progress)
  };
}

function interpolate(left: number, right: number, progress: number): number {
  return Math.round((left + (right - left) * progress) * 10) / 10;
}

function interpolateOptional(left: number | undefined, right: number | undefined, progress: number): number | undefined {
  if (left === undefined && right === undefined) {
    return undefined;
  }

  return interpolate(left ?? right ?? 0, right ?? left ?? 0, progress);
}

function finiteNumber(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}
