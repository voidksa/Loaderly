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
  stepSeconds?: number
): readonly EffectRegionSegment[] {
  const safeStart = Math.max(0, finiteNumber(startSeconds, 0));
  const safeEnd = Math.max(safeStart + 0.05, finiteNumber(endSeconds, safeStart + 0.05));
  const sorted = normalizedKeyframes(keyframes);

  if (sorted.length === 0) {
    return [{ startSeconds: safeStart, endSeconds: safeEnd, region: baseRegion }];
  }

  const boundaries=[...new Set([safeStart,safeEnd,...sorted.map(k=>k.timeSeconds).filter(t=>t>safeStart&&t<safeEnd)])].sort((a,b)=>a-b);
  const segments: EffectRegionSegment[]=[];
  for(let index=1;index<boundaries.length;index++){
    const start=boundaries[index-1],end=boundaries[index],left=regionAtKeyframeTime(baseRegion,sorted,start),right=regionAtKeyframeTime(baseRegion,sorted,end);
    const movement=Math.max(Math.abs(left.x-right.x),Math.abs(left.y-right.y),Math.abs(left.width-right.width),Math.abs(left.height-right.height),Math.abs((left.rotation??0)-(right.rotation??0))/3,Math.abs((left.opacity??1)-(right.opacity??1))*100);
    const count=stepSeconds!==undefined?Math.ceil((end-start)/Math.max(1/60,finiteNumber(stepSeconds,.25))):Math.max(1,Math.min(Math.ceil(movement/.5),Math.ceil((end-start)*60)));
    for(let i=0;i<count;i++){
      const from=start+(end-start)*i/count,to=start+(end-start)*(i+1)/count;
      segments.push({startSeconds:Math.round(from*1000)/1000,endSeconds:Math.round(to*1000)/1000,region:regionAtKeyframeTime(baseRegion,sorted,(from+to)/2)});
    }
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
