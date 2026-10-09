import type { ReframeEffectItem } from '../editor-project/editorProject';
import { type ReframeBackground } from '../reframe/reframe';

export type ReframeFilterContext = {
  readonly sourceWidth: number;
  readonly sourceHeight: number;
};

export type ReframeFilterOutput = {
  readonly filter: string;
  readonly targetWidth: number;
  readonly targetHeight: number;
};

function backgroundToColor(bg: ReframeBackground): string {
  switch (bg.kind) {
    case 'black':
      return 'black';
    case 'white':
      return 'white';
    case 'blur':
      return 'black@0';
    case 'color':
      return bg.value;
  }
}

function scaleFilterExpression(targetWidth: number, targetHeight: number, ratio: 'decrease' | 'increase'): string {
  return `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=${ratio}:flags=lanczos`;
}

function fitFilter(item: ReframeEffectItem, nextLabel: string, inputLabel: string): string {
  const targetW = item.targetWidth;
  const targetH = item.targetHeight;
  const positionX = item.positionX;
  const positionY = item.positionY;
  // After scale with decrease, the video is at most targetW x targetH. We need to pad to exactly targetW x targetH.
  // pad=targetW:targetH:(targetW-iw)*positionX:(targetH-ih)*positionY
  const padX = `(ow-iw)*${positionX.toFixed(4)}`;
  const padY = `(oh-ih)*${positionY.toFixed(4)}`;
  return `[${inputLabel}]${scaleFilterExpression(targetW, targetH, 'decrease')},pad=${targetW}:${targetH}:${padX}:${padY}:${backgroundToColor(item.background as ReframeBackground)},setsar=1[${nextLabel}]`;
}

function fillFilter(item: ReframeEffectItem, nextLabel: string, inputLabel: string): string {
  const targetW = item.targetWidth;
  const targetH = item.targetHeight;
  const positionX = item.positionX;
  const positionY = item.positionY;
  // After scale with increase, the video is at least targetW x targetH. Crop to targetW x targetH.
  // cropX = (iw - targetW) * positionX
  // cropY = (ih - targetH) * positionY
  const cropX = `(iw-${targetW})*${positionX.toFixed(4)}`;
  const cropY = `(ih-${targetH})*${positionY.toFixed(4)}`;
  return `[${inputLabel}]${scaleFilterExpression(targetW, targetH, 'increase')},crop=${targetW}:${targetH}:${cropX}:${cropY},setsar=1[${nextLabel}]`;
}

function stretchFilter(item: ReframeEffectItem, nextLabel: string, inputLabel: string): string {
  const targetW = item.targetWidth;
  const targetH = item.targetHeight;
  return `[${inputLabel}]scale=${targetW}:${targetH}:flags=lanczos,setsar=1[${nextLabel}]`;
}

function originalFilter(item: ReframeEffectItem, nextLabel: string, inputLabel: string): string {
  const targetW = item.targetWidth;
  const targetH = item.targetHeight;
  const positionX = item.positionX;
  const positionY = item.positionY;
  // Pad to targetW x targetH, centered (or position-based)
  const padX = `(ow-iw)*${positionX.toFixed(4)}`;
  const padY = `(oh-ih)*${positionY.toFixed(4)}`;
  return `[${inputLabel}]crop=w='min(iw,${targetW})':h='min(ih,${targetH})':x='max(0,iw-${targetW})*${positionX.toFixed(4)}':y='max(0,ih-${targetH})*${positionY.toFixed(4)}',pad=${targetW}:${targetH}:${padX}:${padY}:${backgroundToColor(item.background as ReframeBackground)},setsar=1[${nextLabel}]`;
}

function fitWithBlurFilter(item: ReframeEffectItem, nextLabel: string, inputLabel: string): string {
  const targetW = item.targetWidth;
  const targetH = item.targetHeight;
  const positionX = item.positionX;
  const positionY = item.positionY;
  const bgSrc = `${nextLabel}_bg_src`;
  const fgSrc = `${nextLabel}_fg_src`;
  const bgLabel = `${nextLabel}_bg`;
  const fgLabel = `${nextLabel}_fg`;
  // Background: scale with increase, crop to target
  const bgFilter = `${scaleFilterExpression(targetW, targetH, 'increase')},crop=${targetW}:${targetH},boxblur=40:1`;
  // Foreground: scale with decrease, no crop
  const fgFilter = `${scaleFilterExpression(targetW, targetH, 'decrease')}`;
  // Overlay: position the foreground within the canvas
  const overlayX = `(W-w)*${positionX.toFixed(4)}`;
  const overlayY = `(H-h)*${positionY.toFixed(4)}`;
  return (
    `[${inputLabel}]split=2[${bgSrc}][${fgSrc}];` +
    `[${bgSrc}]${bgFilter}[${bgLabel}];` +
    `[${fgSrc}]${fgFilter},setsar=1[${fgLabel}];` +
    `[${bgLabel}][${fgLabel}]overlay=${overlayX}:${overlayY}[${nextLabel}]`
  );
}

export function buildReframeFilter(
  item: ReframeEffectItem,
  _ctx: ReframeFilterContext,
  nextLabel: string,
  inputLabel: string
): ReframeFilterOutput {
  const targetW = Math.max(2, Math.round(item.targetWidth));
  const targetH = Math.max(2, Math.round(item.targetHeight));

  let filter: string;
  switch (item.fitMode) {
    case 'original':
      filter = originalFilter(item, nextLabel, inputLabel);
      break;
    case 'stretch':
      filter = stretchFilter(item, nextLabel, inputLabel);
      break;
    case 'fill':
      filter = fillFilter(item, nextLabel, inputLabel);
      break;
    case 'fit':
    default:
      if (item.background.kind === 'blur') {
        filter = fitWithBlurFilter(item, nextLabel, inputLabel);
      } else {
        filter = fitFilter(item, nextLabel, inputLabel);
      }
      break;
  }

  return {
    targetWidth: targetW,
    targetHeight: targetH,
    filter
  };
}
