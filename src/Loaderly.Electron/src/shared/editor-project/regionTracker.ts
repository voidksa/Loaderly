export type PixelTrackingRect = { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
type AdaptiveTrackingMatch = { readonly rect: PixelTrackingRect; readonly score: number };
function clampRangeValue(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }
export function patchContrast(patch: Uint8ClampedArray): number {
  const mean = patch.reduce((sum, value) => sum + value, 0) / patch.length;
  return Math.sqrt(patch.reduce((sum, value) => sum + (value - mean) ** 2, 0) / patch.length);
}
export function frameCorrelation(left: Uint8ClampedArray, right: Uint8ClampedArray): number {
  let a = 0, b = 0, aa = 0, bb = 0, ab = 0, count = 0;
  for (let i = 0; i < Math.min(left.length, right.length); i += 31) {
    const x = left[i], y = right[i];
    a += x; b += y; aa += x * x; bb += y * y; ab += x * y; count++;
  }
  const denominator = Math.sqrt((aa - a * a / count) * (bb - b * b / count));
  return denominator > 0 ? (ab - a * b / count) / denominator : 0;
}
export function sampleLumaPatch(
    frame: Uint8ClampedArray,
    frameWidth: number,
    frameHeight: number,
    rect: PixelTrackingRect,
    sampleWidth: number,
    sampleHeight: number
  ): Uint8ClampedArray {
    const patch = new Uint8ClampedArray(sampleWidth * sampleHeight);

    for (let y = 0; y < sampleHeight; y += 1) {
      const sourceY = Math.round(clampRangeValue(rect.y + ((y + 0.5) / sampleHeight) * rect.height, 0, frameHeight - 1));

      for (let x = 0; x < sampleWidth; x += 1) {
        const sourceX = Math.round(clampRangeValue(rect.x + ((x + 0.5) / sampleWidth) * rect.width, 0, frameWidth - 1));
        patch[y * sampleWidth + x] = frame[sourceY * frameWidth + sourceX];
      }
    }

    return patch;
  }

  function scoreLumaPatch(
    frame: Uint8ClampedArray,
    frameWidth: number,
    frameHeight: number,
    rect: PixelTrackingRect,
    template: Uint8ClampedArray,
    templateWidth: number,
    templateHeight: number
  ): number {
    let sumA = 0, sumB = 0, sumAA = 0, sumBB = 0, sumAB = 0;

    for (let y = 0; y < templateHeight; y += 1) {
      const sourceY = Math.round(clampRangeValue(rect.y + ((y + 0.5) / templateHeight) * rect.height, 0, frameHeight - 1));

      for (let x = 0; x < templateWidth; x += 1) {
        const sourceX = Math.round(clampRangeValue(rect.x + ((x + 0.5) / templateWidth) * rect.width, 0, frameWidth - 1));
        const a = frame[sourceY * frameWidth + sourceX], b = template[y * templateWidth + x];
        sumA += a; sumB += b; sumAA += a * a; sumBB += b * b; sumAB += a * b;
      }
    }

    const count = templateWidth * templateHeight;
    const varianceA = sumAA - sumA * sumA / count, varianceB = sumBB - sumB * sumB / count;
    if (varianceA < count * 16 || varianceB < count * 16) return 100;
    const correlation = (sumAB - sumA * sumB / count) / Math.sqrt(varianceA * varianceB);
    return 100 * (1 - Math.min(1, correlation));
  }

export function findAdaptiveTrackingMatch(
    frame: Uint8ClampedArray,
    frameWidth: number,
    frameHeight: number,
    template: Uint8ClampedArray,
    templateWidth: number,
    templateHeight: number,
    previousRect: PixelTrackingRect
  ): AdaptiveTrackingMatch | undefined {
    const centerX = previousRect.x + previousRect.width / 2;
    const centerY = previousRect.y + previousRect.height / 2;
    const radiusX = Math.max(22, previousRect.width * 1.35);
    const radiusY = Math.max(22, previousRect.height * 1.35);
    const step = Math.max(2, Math.round(Math.max(previousRect.width, previousRect.height) / 18));
    const scaleCandidates = [1, 0.94, 1.06];
    let best: AdaptiveTrackingMatch | undefined;

    for (const scale of scaleCandidates) {
      const width = Math.round(clampRangeValue(previousRect.width * scale, 8, frameWidth));
      const height = Math.round(clampRangeValue(previousRect.height * scale, 8, frameHeight));
      const minX = Math.floor(clampRangeValue(centerX - radiusX - width / 2, 0, Math.max(0, frameWidth - width)));
      const maxX = Math.ceil(clampRangeValue(centerX + radiusX - width / 2, minX, Math.max(0, frameWidth - width)));
      const minY = Math.floor(clampRangeValue(centerY - radiusY - height / 2, 0, Math.max(0, frameHeight - height)));
      const maxY = Math.ceil(clampRangeValue(centerY + radiusY - height / 2, minY, Math.max(0, frameHeight - height)));

      const startX = minX + ((previousRect.x - minX) % step + step) % step;
      const startY = minY + ((previousRect.y - minY) % step + step) % step;
      for (let y = startY; y <= maxY; y += step) {
        for (let x = startX; x <= maxX; x += step) {
          const rect = { x, y, width, height };
          const score = scoreLumaPatch(frame, frameWidth, frameHeight, rect, template, templateWidth, templateHeight);

          if (!best || score < best.score) {
            best = { rect, score };
          }
        }
      }
    }

    if (best) {
      const coarse = best.rect;
      for (const scale of scaleCandidates) {
        const width = Math.round(clampRangeValue(previousRect.width * scale, 8, frameWidth));
        const height = Math.round(clampRangeValue(previousRect.height * scale, 8, frameHeight));
        for (let y = Math.max(0, coarse.y - step); y <= Math.min(frameHeight - height, coarse.y + step); y++) {
          for (let x = Math.max(0, coarse.x - step); x <= Math.min(frameWidth - width, coarse.x + step); x++) {
            const rect = { x, y, width, height };
            const score = scoreLumaPatch(frame, frameWidth, frameHeight, rect, template, templateWidth, templateHeight);
            if (score < best.score) best = { rect, score };
          }
        }
      }
    }
    return best;
  }
