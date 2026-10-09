// A separate decoder keeps tracking seeks away from playback, cuts and autosave.
export async function loadTrackingVideo(source: string): Promise<HTMLVideoElement> {
  const video = document.createElement('video');
  video.crossOrigin = 'anonymous';
  video.muted = true;
  video.preload = 'auto';
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeout);
      video.removeEventListener('loadeddata', ready);
      video.removeEventListener('error', failed);
    };
    const ready = () => { cleanup(); resolve(); };
    const failed = () => { cleanup(); releaseTrackingVideo(video); reject(new Error('tracking-decode')); };
    const timeout = setTimeout(failed, 15000);
    video.addEventListener('loadeddata', ready);
    video.addEventListener('error', failed);
    video.src = source;
    video.load();
  });
  return video;
}

export function releaseTrackingVideo(video: HTMLVideoElement): void {
  video.pause();
  video.removeAttribute('src');
  video.load();
}

export async function seekTrackingVideo(video: HTMLVideoElement, seconds: number): Promise<void> {
  // duration itself is beyond the last decodable frame for some codecs.
  const target = Math.max(0, Math.min(seconds, Math.max(0, video.duration - 0.04)));
  if (!video.seeking && video.readyState >= 2 && Math.abs(video.currentTime - target) < 0.001) return;
  await new Promise<void>((resolve, reject) => {
    let frameRequest: number | undefined;
    let seekFinished = false;
    let frameFinished = !video.requestVideoFrameCallback;
    const cleanup = () => {
      clearTimeout(timeout);
      video.removeEventListener('seeked', ready);
      video.removeEventListener('error', failed);
      if (frameRequest !== undefined) video.cancelVideoFrameCallback(frameRequest);
    };
    const finish = () => { if (seekFinished && frameFinished) { cleanup(); resolve(); } };
    const ready = () => { seekFinished = true; finish(); };
    const failed = () => { cleanup(); reject(new Error('tracking-seek')); };
    const timeout = setTimeout(failed, 10000);
    // seeked can precede presentation of the decoded frame in Chromium.
    // Sampling then may read a stale frame, especially across a camera cut.
    if (video.requestVideoFrameCallback) frameRequest = video.requestVideoFrameCallback(() => { frameFinished = true; finish(); });
    video.addEventListener('seeked', ready);
    video.addEventListener('error', failed);
    video.currentTime = target;
  });
}
