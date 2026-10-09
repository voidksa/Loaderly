import { hasSpeedSound } from './speedSound';
import type {
  BlurEffectItem,
  CutRangeItem,
  EditorProject,
  ReframeEffectItem,
  SpeedEffectItem,
  SubtitleLayerItem,
  TextLayerItem,
  TimelineItem,
  ZoomEffectItem
} from './editorProject';

export type RenderOutputKind = 'video' | 'gif' | 'image' | 'snapshot' | 'audio';

export type EditorRenderPlanInput = {
  readonly kind: RenderOutputKind;
  readonly startSeconds: number;
  readonly endSeconds: number;
  readonly frameSeconds: number;
};

export type EditorRenderPlan = {
  readonly range: {
    readonly startSeconds: number;
    readonly endSeconds: number;
    readonly frameSeconds: number;
  };
  readonly cutOutRanges: readonly CutRangeItem[];
  readonly blurItems: readonly BlurEffectItem[];
  readonly zoomItems: readonly ZoomEffectItem[];
  readonly speedItems: readonly SpeedEffectItem[];
  readonly reframeItems: readonly ReframeEffectItem[];
  readonly textOverlays: readonly TextLayerItem[];
  readonly subtitle?: SubtitleLayerItem;
  readonly unsupportedEffects: readonly string[];
};

export function buildEditorRenderPlan(project: EditorProject, input: EditorRenderPlanInput): EditorRenderPlan {
  const range = normalizeRenderRange(project.durationSeconds, input);
  const relevantItems = project.items.filter((item) => isRelevantItem(item, input.kind, range));
  const cutOutRanges = relevantItems.filter((item): item is CutRangeItem => item.type === 'cut-out');
  const blurItems = relevantItems.filter((item): item is BlurEffectItem => item.type === 'blur' && item.strength > 0);
  const zoomItems = relevantItems
    .filter((item): item is ZoomEffectItem => item.type === 'zoom' && item.scale > 1)
    .sort((left, right) => left.startTime - right.startTime || left.endTime - right.endTime);
  const speedItems = relevantItems.filter((item): item is SpeedEffectItem => item.type === 'speed' && hasSpeedSound(item.rate, item.mode));
  const reframeItems = relevantItems
    .filter((item): item is ReframeEffectItem => item.type === 'reframe' && item.targetWidth > 0 && item.targetHeight > 0)
    .sort((left, right) => left.startTime - right.startTime || left.endTime - right.endTime);
  const textOverlays = relevantItems
    .filter((item): item is TextLayerItem => item.type === 'text' && item.text.trim().length > 0)
    .sort((left, right) => left.zIndex - right.zIndex || left.startTime - right.startTime);
  const subtitle = relevantItems.find((item): item is SubtitleLayerItem => item.type === 'subtitle');
  const unsupportedEffects = unsupportedRenderEffects(input.kind, zoomItems, speedItems, reframeItems);

  return {
    range,
    cutOutRanges,
    blurItems,
    zoomItems,
    speedItems,
    reframeItems,
    textOverlays,
    subtitle,
    unsupportedEffects
  };
}

function normalizeRenderRange(durationSeconds: number, input: EditorRenderPlanInput): EditorRenderPlan['range'] {
  const duration = Math.max(0.1, finiteNumber(durationSeconds, 0.1));
  const startSeconds = clampTime(Math.min(input.startSeconds, input.endSeconds), duration);
  const endSeconds = clampTime(Math.max(input.startSeconds + 0.1, input.endSeconds), duration);
  const frameSeconds = clampTime(input.frameSeconds, duration);

  return {
    startSeconds,
    endSeconds: Math.max(startSeconds + 0.1, endSeconds),
    frameSeconds
  };
}

function isRelevantItem(item: TimelineItem, kind: RenderOutputKind, range: EditorRenderPlan['range']): boolean {
  if (item.hidden || item.type === 'media') {
    return false;
  }

  if (kind === 'audio') {
    return item.type === 'cut-out' || item.type === 'speed';
  }

  if (item.type === 'reframe') return true;

  if (kind === 'image' || kind === 'snapshot') {
    return range.frameSeconds >= item.startTime - 0.001 && range.frameSeconds <= item.endTime + 0.001;
  }

  return item.endTime > range.startSeconds && item.startTime < range.endSeconds;
}

function unsupportedRenderEffects(
  kind: RenderOutputKind,
  zoomItems: readonly ZoomEffectItem[],
  speedItems: readonly SpeedEffectItem[],
  reframeItems: readonly ReframeEffectItem[]
): readonly string[] {
  const unsupported: string[] = [];

  if (hasOverlappingItems([...speedItems].sort((a,b)=>a.startTime-b.startTime))) unsupported.push('overlapping speed effects');
  if (kind === 'audio') {
    return unsupported;
  }

  if (reframeItems.length > 1) unsupported.push('multiple canvas sizes');
  if (hasOverlappingItems(zoomItems)) {
    unsupported.push('overlapping zoom effects');
  }

  return unsupported;
}

function hasOverlappingItems(items: readonly { readonly startTime: number; readonly endTime: number }[]): boolean {
  for (let index = 1; index < items.length; index += 1) {
    if (items[index].startTime < items[index - 1].endTime - 0.001) {
      return true;
    }
  }

  return false;
}

function clampTime(value: number, max: number): number {
  return Math.max(0, Math.min(Math.max(0, max), finiteNumber(value, 0)));
}

function finiteNumber(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}
