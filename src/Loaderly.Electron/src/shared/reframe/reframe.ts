export type ReframeFitMode = 'fit' | 'fill' | 'stretch' | 'original';

export type ReframeBackground =
  | { readonly kind: 'black' }
  | { readonly kind: 'white' }
  | { readonly kind: 'blur' }
  | { readonly kind: 'color'; readonly value: string };

export type ReframePreset = {
  readonly id: string;
  readonly label: string;
  readonly width: number;
  readonly height: number;
};

export const REFRAME_PRESETS: readonly ReframePreset[] = [
  { id: 'original', label: 'Original', width: 0, height: 0 },
  { id: '9:16', label: '9:16 Vertical', width: 1080, height: 1920 },
  { id: '16:9', label: '16:9 Landscape', width: 1920, height: 1080 },
  { id: '1:1', label: '1:1 Square', width: 1080, height: 1080 },
  { id: '4:5', label: '4:5 Portrait', width: 1080, height: 1350 }
];

export const DEFAULT_REFRAME_BACKGROUND: ReframeBackground = { kind: 'black' };
export const DEFAULT_REFRAME_FIT_MODE: ReframeFitMode = 'fit';
export const DEFAULT_REFRAME_PRESET = 'original';

export function isReframeFitMode(value: unknown): value is ReframeFitMode {
  return value === 'fit' || value === 'fill' || value === 'stretch' || value === 'original';
}

export function isReframeBackground(value: unknown): value is ReframeBackground {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as { kind?: unknown; value?: unknown };
  if (record.kind === 'black' || record.kind === 'white' || record.kind === 'blur') {
    return true;
  }
  if (record.kind === 'color' && typeof record.value === 'string') {
    return true;
  }
  return false;
}

export function reframeBackgroundToHex(background: ReframeBackground): string {
  switch (background.kind) {
    case 'black':
      return 'black';
    case 'white':
      return 'white';
    case 'blur':
      return 'black@0';
    case 'color':
      return background.value;
  }
}

export function reframeBackgroundLabel(background: ReframeBackground): string {
  switch (background.kind) {
    case 'black':
      return 'Black';
    case 'white':
      return 'White';
    case 'blur':
      return 'Blur';
    case 'color':
      return background.value;
  }
}

export function reframeFitModeLabel(mode: ReframeFitMode): string {
  switch (mode) {
    case 'fit':
      return 'Fit';
    case 'fill':
      return 'Fill';
    case 'stretch':
      return 'Stretch';
    case 'original':
      return 'Original';
  }
}

export function ensureEvenDimension(value: number): number {
  if (value <= 0) {
    return 0;
  }
  return value % 2 === 0 ? value : value - 1;
}

export function clampDimension(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return Math.round(value);
}

export type ReframeScale = {
  readonly width: number;
  readonly height: number;
  readonly scaleX: number;
  readonly scaleY: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly renderedWidth: number;
  readonly renderedHeight: number;
  readonly visibleWidth: number;
  readonly visibleHeight: number;
  readonly cropX: number;
  readonly cropY: number;
};

export function computeReframeScale(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  fitMode: ReframeFitMode,
  positionX: number,
  positionY: number
): ReframeScale {
  const empty: ReframeScale = {
    width: targetWidth,
    height: targetHeight,
    scaleX: 1,
    scaleY: 1,
    offsetX: 0,
    offsetY: 0,
    renderedWidth: 0,
    renderedHeight: 0,
    visibleWidth: 0,
    visibleHeight: 0,
    cropX: 0,
    cropY: 0
  };

  if (sourceWidth <= 0 || sourceHeight <= 0 || targetWidth <= 0 || targetHeight <= 0) {
    return empty;
  }

  if (fitMode === 'original') {
    return {
      width: targetWidth,
      height: targetHeight,
      scaleX: 1,
      scaleY: 1,
      offsetX: (targetWidth - sourceWidth) * positionX,
      offsetY: (targetHeight - sourceHeight) * positionY,
      renderedWidth: sourceWidth,
      renderedHeight: sourceHeight,
      visibleWidth: sourceWidth,
      visibleHeight: sourceHeight,
      cropX: 0,
      cropY: 0
    };
  }

  if (fitMode === 'stretch') {
    return {
      width: targetWidth,
      height: targetHeight,
      scaleX: targetWidth / sourceWidth,
      scaleY: targetHeight / sourceHeight,
      offsetX: 0,
      offsetY: 0,
      renderedWidth: targetWidth,
      renderedHeight: targetHeight,
      visibleWidth: targetWidth,
      visibleHeight: targetHeight,
      cropX: 0,
      cropY: 0
    };
  }

  if (fitMode === 'fit') {
    // scale = min(targetW/sourceW, targetH/sourceH)
    const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
    const renderedWidth = sourceWidth * scale;
    const renderedHeight = sourceHeight * scale;
    // offsetX/Y are the position of the video top-left within the canvas
    const offsetX = (targetWidth - renderedWidth) * positionX;
    const offsetY = (targetHeight - renderedHeight) * positionY;
    return {
      width: targetWidth,
      height: targetHeight,
      scaleX: scale,
      scaleY: scale,
      offsetX,
      offsetY,
      renderedWidth,
      renderedHeight,
      visibleWidth: renderedWidth,
      visibleHeight: renderedHeight,
      cropX: 0,
      cropY: 0
    };
  }

  // fill mode
  // scale = max(targetW/sourceW, targetH/sourceH)
  const scale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const renderedWidth = sourceWidth * scale;
  const renderedHeight = sourceHeight * scale;
  // cropX = (renderedW - targetW) * positionX
  const cropX = (renderedWidth - targetWidth) * positionX;
  const cropY = (renderedHeight - targetHeight) * positionY;
  return {
    width: targetWidth,
    height: targetHeight,
    scaleX: scale,
    scaleY: scale,
    offsetX: -cropX,
    offsetY: -cropY,
    renderedWidth,
    renderedHeight,
    visibleWidth: targetWidth,
    visibleHeight: targetHeight,
    cropX,
    cropY
  };
}

export function resolveReframePreset(
  presetId: string,
  sourceWidth: number,
  sourceHeight: number
): { width: number; height: number } {
  const preset = REFRAME_PRESETS.find((candidate) => candidate.id === presetId);
  if (!preset) {
    return { width: sourceWidth, height: sourceHeight };
  }
  if (preset.id === 'original') {
    return { width: sourceWidth, height: sourceHeight };
  }
  return { width: preset.width, height: preset.height };
}

export function findReframePresetId(width: number, height: number, sourceWidth: number, sourceHeight: number): string {
  if (width === sourceWidth && height === sourceHeight) {
    return 'original';
  }
  const match = REFRAME_PRESETS.find(
    (preset) => preset.id !== 'original' && preset.width === width && preset.height === height
  );
  return match?.id ?? 'custom';
}
