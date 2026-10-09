import type { EditorOverlayRect } from './editorProject';

export type PreviewSize = {
  readonly width: number;
  readonly height: number;
};

export type PreviewRect = {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
};

export function moveEffectRegion(region: EditorOverlayRect, x: number, y: number, freeFocus = false): EditorOverlayRect {
  const width = clampPercent(region.width, 1), height = clampPercent(region.height, 1);
  return { ...region, width, height,
    x: Math.max(freeFocus ? 0 : width / 2, Math.min(freeFocus ? 100 : 100 - width / 2, x)),
    y: Math.max(freeFocus ? 0 : height / 2, Math.min(freeFocus ? 100 : 100 - height / 2, y)) };
}

// A focus region may extend past the source. Keep its editing outline and handles
// within the visible source, without moving the stored focus back to the middle.
export function visibleEffectRegion(region: EditorOverlayRect): EditorOverlayRect {
  const left = Math.max(0, region.x - region.width / 2), top = Math.max(0, region.y - region.height / 2);
  const right = Math.min(100, region.x + region.width / 2), bottom = Math.min(100, region.y + region.height / 2);
  return { ...region, x: (left + right) / 2, y: (top + bottom) / 2, width: Math.max(1, right - left), height: Math.max(1, bottom - top) };
}

export function containMediaRect(container: PreviewSize, media: PreviewSize): PreviewRect {
  const containerWidth = Math.max(1, finiteNumber(container.width, 1));
  const containerHeight = Math.max(1, finiteNumber(container.height, 1));
  const mediaWidth = Math.max(1, finiteNumber(media.width, containerWidth));
  const mediaHeight = Math.max(1, finiteNumber(media.height, containerHeight));
  const scale = Math.min(containerWidth / mediaWidth, containerHeight / mediaHeight);
  const width = mediaWidth * scale;
  const height = mediaHeight * scale;

  return {
    left: roundGeometryNumber((containerWidth - width) / 2),
    top: roundGeometryNumber((containerHeight - height) / 2),
    width: roundGeometryNumber(width),
    height: roundGeometryNumber(height)
  };
}

export function rectPixelsToPercent(rect: PreviewRect, container: PreviewSize): PreviewRect {
  const width = Math.max(1, finiteNumber(container.width, 1));
  const height = Math.max(1, finiteNumber(container.height, 1));

  return {
    left: (rect.left / width) * 100,
    top: (rect.top / height) * 100,
    width: (rect.width / width) * 100,
    height: (rect.height / height) * 100
  };
}

export function mediaRegionToPreviewRegion(region: EditorOverlayRect, mediaRectPercent: PreviewRect): EditorOverlayRect {
  return {
    ...region,
    x: mediaRectPercent.left + (mediaRectPercent.width * clampPercent(region.x)) / 100,
    y: mediaRectPercent.top + (mediaRectPercent.height * clampPercent(region.y)) / 100,
    width: (mediaRectPercent.width * clampPercent(region.width, 1)) / 100,
    height: (mediaRectPercent.height * clampPercent(region.height, 1)) / 100
  };
}

export function previewPointToMediaPercent(point: { readonly x: number; readonly y: number }, mediaRect: PreviewRect): { readonly x: number; readonly y: number } {
  return {
    x: roundPreviewPercent(((point.x - mediaRect.left) / Math.max(1, mediaRect.width)) * 100),
    y: roundPreviewPercent(((point.y - mediaRect.top) / Math.max(1, mediaRect.height)) * 100)
  };
}

export function previewRectFromFrameRect(frameRect: DOMRect, mediaRect: PreviewRect): PreviewRect {
  return {
    left: frameRect.left + mediaRect.left,
    top: frameRect.top + mediaRect.top,
    width: mediaRect.width,
    height: mediaRect.height
  };
}

function finiteNumber(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function clampPercent(value: number, minimum = 0): number {
  return Math.max(minimum, Math.min(100, finiteNumber(value, minimum)));
}

function roundPreviewPercent(value: number): number {
  return Math.round(Math.max(0, Math.min(100, finiteNumber(value, 0))) * 10) / 10;
}

function roundGeometryNumber(value: number): number {
  const rounded = Math.round(finiteNumber(value, 0) * 1000) / 1000;
  return Object.is(rounded, -0) ? 0 : rounded;
}
