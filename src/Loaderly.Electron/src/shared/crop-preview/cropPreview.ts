export function clampRangeValue(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

export function computeCroppedAspect(
  sourceWidth: number,
  sourceHeight: number,
  leftPercent: number,
  rightPercent: number,
  topPercent: number,
  bottomPercent: number
): number {
  const sourceAspect = sourceWidth / Math.max(1, sourceHeight);
  const widthRatio = Math.max(0.02, 1 - leftPercent / 100 - rightPercent / 100);
  const heightRatio = Math.max(0.02, 1 - topPercent / 100 - bottomPercent / 100);
  return sourceAspect * (widthRatio / heightRatio);
}

export function computeVisibleCenter(startPercent: number, endPercent: number): number {
  return (startPercent + endPercent) / 2;
}

export function isCropActive(
  crop: { top: number; bottom: number; left: number; right: number } | undefined
): boolean {
  if (!crop) {
    return false;
  }
  return crop.top > 0 || crop.bottom > 0 || crop.left > 0 || crop.right > 0;
}
