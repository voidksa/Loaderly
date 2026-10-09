export type TimeRange = {
  readonly startSeconds: number;
  readonly endSeconds: number;
};

export type TimelineViewportInput = {
  readonly duration: number;
  readonly zoom: number;
  readonly anchorSeconds?: number;
  readonly anchorRatio?: number;
  readonly previousStartSeconds?: number;
};

export type TimelineSegmentVisualBounds = {
  readonly visible: boolean;
  readonly startPercent: number;
  readonly widthPercent: number;
};

export const timelineMinZoom = 1;
export const timelineMaxZoom = 24;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

export function snapSeconds(value: number, snapPoints: readonly number[], duration: number, thresholdSeconds = 0.14): number {
  const safeValue = clamp(value, 0, Math.max(0, duration));
  let nearest = safeValue;
  let nearestDistance = thresholdSeconds;

  for (const point of snapPoints) {
    const safePoint = clamp(point, 0, Math.max(0, duration));
    const distance = Math.abs(safeValue - safePoint);

    if (distance <= nearestDistance) {
      nearest = safePoint;
      nearestDistance = distance;
    }
  }

  return nearest;
}

export function timelineZoomFromWheel(currentZoom: number, deltaY: number): number {
  const safeZoom = clamp(currentZoom, timelineMinZoom, timelineMaxZoom);
  const direction = deltaY < 0 ? 1 : -1;
  const factor = Math.pow(1.22, direction);

  return clamp(safeZoom * factor, timelineMinZoom, timelineMaxZoom);
}

export function timelineViewportFromZoom(input: TimelineViewportInput): TimeRange {
  const duration = Math.max(0.1, input.duration);
  const zoom = clamp(input.zoom, timelineMinZoom, timelineMaxZoom);
  const visibleDuration = duration / zoom;
  const maxStart = Math.max(0, duration - visibleDuration);
  const anchorRatio = clamp(input.anchorRatio ?? 0.5, 0, 1);
  const fallbackAnchor = (input.previousStartSeconds ?? 0) + visibleDuration * anchorRatio;
  const anchorSeconds = clamp(input.anchorSeconds ?? fallbackAnchor, 0, duration);
  const startSeconds = clamp(anchorSeconds - visibleDuration * anchorRatio, 0, maxStart);

  return {
    startSeconds,
    endSeconds: startSeconds + visibleDuration
  };
}

export function timelineViewportSecondsFromRatio(ratio: number, viewport: TimeRange): number {
  const startSeconds = Math.min(viewport.startSeconds, viewport.endSeconds);
  const endSeconds = Math.max(viewport.startSeconds, viewport.endSeconds);

  return startSeconds + (endSeconds - startSeconds) * clamp(ratio, 0, 1);
}

export function timelineViewportRatioForSeconds(seconds: number, viewport: TimeRange): number {
  const startSeconds = Math.min(viewport.startSeconds, viewport.endSeconds);
  const endSeconds = Math.max(viewport.startSeconds, viewport.endSeconds);
  const duration = Math.max(0.001, endSeconds - startSeconds);

  return clamp((seconds - startSeconds) / duration, 0, 1);
}

export function timelineSegmentVisualBounds(range: TimeRange, viewport: TimeRange): TimelineSegmentVisualBounds {
  const viewportStart = Math.min(viewport.startSeconds, viewport.endSeconds);
  const viewportEnd = Math.max(viewport.startSeconds, viewport.endSeconds);
  const viewportDuration = Math.max(0.001, viewportEnd - viewportStart);
  const rangeStart = Math.min(range.startSeconds, range.endSeconds);
  const rangeEnd = Math.max(range.startSeconds, range.endSeconds);
  const visibleStart = Math.max(rangeStart, viewportStart);
  const visibleEnd = Math.min(rangeEnd, viewportEnd);

  if (visibleEnd <= visibleStart) {
    return {
      visible: false,
      startPercent: rangeEnd <= viewportStart ? 0 : 100,
      widthPercent: 0
    };
  }

  return {
    visible: true,
    startPercent: ((visibleStart - viewportStart) / viewportDuration) * 100,
    widthPercent: ((visibleEnd - visibleStart) / viewportDuration) * 100
  };
}

export function normalizeTimeRange(range: TimeRange, duration = Number.POSITIVE_INFINITY): TimeRange | undefined {
  const safeDuration = Number.isFinite(duration) ? Math.max(0, duration) : Number.POSITIVE_INFINITY;
  const startSeconds = clamp(Math.min(range.startSeconds, range.endSeconds), 0, safeDuration);
  const endSeconds = clamp(Math.max(range.startSeconds, range.endSeconds), 0, safeDuration);

  if (endSeconds <= startSeconds + 0.02) {
    return undefined;
  }

  return { startSeconds, endSeconds };
}

export function normalizeCutOutRanges(cutOutRanges: readonly TimeRange[], selection: TimeRange): readonly TimeRange[] {
  const normalizedSelection = normalizeTimeRange(selection);

  if (!normalizedSelection) {
    return [];
  }

  const ranges = cutOutRanges
    .map((range) =>
      normalizeTimeRange({
        startSeconds: clamp(range.startSeconds, normalizedSelection.startSeconds, normalizedSelection.endSeconds),
        endSeconds: clamp(range.endSeconds, normalizedSelection.startSeconds, normalizedSelection.endSeconds)
      })
    )
    .filter((range): range is TimeRange => Boolean(range))
    .sort((left, right) => left.startSeconds - right.startSeconds);
  const merged: TimeRange[] = [];

  for (const range of ranges) {
    const previous = merged.at(-1);

    if (!previous || range.startSeconds > previous.endSeconds + 0.02) {
      merged.push(range);
      continue;
    }

    merged[merged.length - 1] = {
      startSeconds: previous.startSeconds,
      endSeconds: Math.max(previous.endSeconds, range.endSeconds)
    };
  }

  return merged;
}

export function keptRangesFromCutOuts(selection: TimeRange, cutOutRanges: readonly TimeRange[]): readonly TimeRange[] {
  const normalizedSelection = normalizeTimeRange(selection);

  if (!normalizedSelection) {
    return [];
  }

  const normalizedCuts = normalizeCutOutRanges(cutOutRanges, normalizedSelection);
  const kept: TimeRange[] = [];
  let cursor = normalizedSelection.startSeconds;

  for (const cut of normalizedCuts) {
    if (cut.startSeconds > cursor + 0.02) {
      kept.push({ startSeconds: cursor, endSeconds: cut.startSeconds });
    }

    cursor = Math.max(cursor, cut.endSeconds);
  }

  if (cursor < normalizedSelection.endSeconds - 0.02) {
    kept.push({ startSeconds: cursor, endSeconds: normalizedSelection.endSeconds });
  }

  return kept;
}
