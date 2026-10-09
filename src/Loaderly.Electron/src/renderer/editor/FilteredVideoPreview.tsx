import { useEffect, useRef, type CSSProperties, type RefObject } from 'react';
import type { BlurEffectItem, ZoomEffectItem } from '../../shared/editor-project/editorProject';
import { regionAtKeyframeTime } from '../../shared/editor-project/editorEffectKeyframes';
import { blurAmount, pixelBlockSize } from '../../shared/editor-project/blurRendering';

type Props = {
  videoRef: RefObject<HTMLMediaElement | null>;
  blurs: readonly BlurEffectItem[];
  zoom?: ZoomEffectItem;
  zoomScale?: number;
  adjusting: boolean;
  style?: CSSProperties;
};

// Render real decoded pixels. CSS textures and backdrop-filter cannot reproduce
// mosaic blocks, source-pixel blur strength, or the export ordering of effects.
export function FilteredVideoPreview(props: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const latest = useRef(props);
  latest.current = props;
  useEffect(() => {
    let frame = 0, previous = '';
    const work = document.createElement('canvas');
    const mosaic = document.createElement('canvas');
    const draw = () => {
      frame = requestAnimationFrame(draw);
      const { videoRef, blurs, zoom, zoomScale, adjusting } = latest.current;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!(video instanceof HTMLVideoElement) || !canvas || video.readyState < 2 || video.seeking || !video.videoWidth) return;
      const scale = Math.min(1, 1600 / Math.max(video.videoWidth, video.videoHeight));
      const width = Math.round(video.videoWidth * scale), height = Math.round(video.videoHeight * scale);
      const time = video.currentTime;
      const regions = blurs.map(item => {
        const region = item.trackingEnabled ? regionAtKeyframeTime(item.region, item.keyframes, time) : item.region;
        const element = canvas.closest('.preview-frame')?.querySelector<HTMLElement>(`[data-blur-id="${CSS.escape(item.id)}"].dragging`);
        // Dragging updates the overlay directly for latency; reflect that movement
        // in the decoded-pixel preview before React commits the new region.
        if (adjusting && element) {
          const source = canvas.getBoundingClientRect(), box = element.getBoundingClientRect();
          return { ...region, x: (box.x + box.width / 2 - source.x) / source.width * 100,
            y: (box.y + box.height / 2 - source.y) / source.height * 100,
            width: box.width / source.width * 100, height: box.height / source.height * 100 };
        }
        return region;
      });
      const signature = JSON.stringify([video.currentSrc, time, width, height, blurs, regions, zoom, zoomScale, adjusting]);
      if (signature === previous) return;
      previous = signature;
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      if (work.width !== width || work.height !== height) { work.width = width; work.height = height; }
      const ctx = canvas.getContext('2d'), copy = work.getContext('2d'), pixels = mosaic.getContext('2d');
      if (!ctx || !copy || !pixels) return;
      ctx.clearRect(0, 0, width, height);
      const region = zoom && (zoom.trackingEnabled ? regionAtKeyframeTime(zoom.region, zoom.keyframes, time) : zoom.region);
      const factor = region && !adjusting ? Math.max(1, zoomScale ?? zoom?.scale ?? 1) : 1;
      const sw = video.videoWidth / factor, sh = video.videoHeight / factor;
      const sx = Math.max(0, Math.min(video.videoWidth - sw, (region?.x ?? 50) / 100 * video.videoWidth - sw / 2));
      const sy = Math.max(0, Math.min(video.videoHeight - sh, (region?.y ?? 50) / 100 * video.videoHeight - sh / 2));
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, width, height);
      blurs.forEach((item, index) => {
        if (item.hidden || item.strength <= 0 || time < item.startTime || time > item.endTime) return;
        const region = regions[index];
        const w = Math.max(1, Math.round(region.width / 100 * width)), h = Math.max(1, Math.round(region.height / 100 * height));
        const x = Math.max(0, Math.min(width - w, region.x / 100 * width - w / 2));
        const y = Math.max(0, Math.min(height - h, region.y / 100 * height - h / 2));
        copy.clearRect(0, 0, width, height);
        copy.drawImage(canvas, 0, 0);
        ctx.save();
        ctx.beginPath();
        if (item.shape === 'ellipse' || item.shape === 'face') ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        else if (item.shape === 'rounded') ctx.roundRect(x, y, w, h, Math.min(w, h) * .18);
        else ctx.rect(x, y, w, h);
        ctx.clip();
        if (item.style === 'pixelated') {
          const block = pixelBlockSize(item.strength) * scale;
          mosaic.width = Math.max(1, Math.round(w / block)); mosaic.height = Math.max(1, Math.round(h / block));
          pixels.imageSmoothingEnabled = true;
          pixels.imageSmoothingQuality = 'high';
          pixels.drawImage(work, x, y, w, h, 0, 0, mosaic.width, mosaic.height);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(mosaic, 0, 0, mosaic.width, mosaic.height, x, y, w, h);
        } else {
          ctx.filter = `blur(${blurAmount(item.strength) * scale}px)`;
          ctx.drawImage(work, 0, 0);
        }
        ctx.restore();
      });
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);
  return <canvas ref={canvasRef} className="filtered-video-preview" aria-hidden="true" style={props.style} />;
}
