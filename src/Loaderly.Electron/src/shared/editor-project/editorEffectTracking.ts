import type { EditorOverlayRect } from './editorProject';

export type TemplateMatchInput = {
  readonly frame: ArrayLike<number>;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly template: ArrayLike<number>;
  readonly templateWidth: number;
  readonly templateHeight: number;
  readonly searchWindow: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
};

export type TemplateMatchResult = {
  readonly x: number;
  readonly y: number;
  readonly score: number;
};

export function zoomScaleForRegion(region: EditorOverlayRect): number {
  const width = Number.isFinite(region.width) ? region.width : 100;
  const scale = 100 / Math.max(1, width);
  return Math.round(clamp(scale, 1, 8) * 100) / 100;
}

export function findBestTemplateMatch(input: TemplateMatchInput): TemplateMatchResult | undefined {
  const frameWidth = Math.floor(input.frameWidth);
  const frameHeight = Math.floor(input.frameHeight);
  const templateWidth = Math.floor(input.templateWidth);
  const templateHeight = Math.floor(input.templateHeight);

  if (
    frameWidth <= 0 ||
    frameHeight <= 0 ||
    templateWidth <= 0 ||
    templateHeight <= 0 ||
    templateWidth > frameWidth ||
    templateHeight > frameHeight ||
    input.frame.length < frameWidth * frameHeight ||
    input.template.length < templateWidth * templateHeight
  ) {
    return undefined;
  }

  const startX = Math.floor(clamp(input.searchWindow.x, 0, frameWidth - templateWidth));
  const startY = Math.floor(clamp(input.searchWindow.y, 0, frameHeight - templateHeight));
  const endX = Math.floor(clamp(input.searchWindow.x + input.searchWindow.width - templateWidth, startX, frameWidth - templateWidth));
  const endY = Math.floor(clamp(input.searchWindow.y + input.searchWindow.height - templateHeight, startY, frameHeight - templateHeight));
  let best: TemplateMatchResult | undefined;

  for (let y = startY; y <= endY; y += 1) {
    for (let x = startX; x <= endX; x += 1) {
      let totalDifference = 0;

      for (let row = 0; row < templateHeight; row += 1) {
        const frameOffset = (y + row) * frameWidth + x;
        const templateOffset = row * templateWidth;

        for (let column = 0; column < templateWidth; column += 1) {
          totalDifference += Math.abs(input.frame[frameOffset + column] - input.template[templateOffset + column]);
        }
      }

      const score = Math.round((totalDifference / (templateWidth * templateHeight)) * 1000) / 1000;
      if (!best || score < best.score) {
        best = { x, y, score };
      }
    }
  }

  return best;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}
