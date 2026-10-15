import { useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type KeyboardEvent, type Ref } from 'react';
import { AudioLines, Maximize2, Minimize2, Pause, Play, Volume2, VolumeX } from 'lucide-react';

function clock(seconds: number) {
  const value = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const minutes = Math.floor(value / 60);
  return `${minutes}:${String(value % 60).padStart(2, '0')}`;
}

export type StudioPlayerHandle = { position: () => number; seek: (seconds: number) => void; playRange: (start: number, end: number) => void; pause: () => void };
export function StudioPreviewPlayer({ src, ar, source = false, playerRef, onReady, onPositionCommit, onPlayingChange }: { src: string; ar: boolean; source?: boolean; playerRef?: Ref<StudioPlayerHandle>; onReady?: (ready: boolean) => void; onPositionCommit?: (seconds: number) => void; onPlayingChange?: (playing: boolean) => void }) {
  const container = useRef<HTMLDivElement>(null), media = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false), [duration, setDuration] = useState(0), [position, setPosition] = useState(0);
  const [volume, setVolume] = useState(1), [muted, setMuted] = useState(false), [fullscreen, setFullscreen] = useState(false);
  const [audioOnly, setAudioOnly] = useState(false), [ready, setReady] = useState(false), [error, setError] = useState('');
  const t = (en: string, arabic: string) => ar ? arabic : en;
  const stopAt = useRef<number | undefined>(undefined);
  const decodedFrame = useRef<number | undefined>(undefined), commitPosition = useRef(onPositionCommit);
  commitPosition.current = onPositionCommit;
  // The transport can reach duration, where no frame exists. Commit the frame
  // actually displayed by Chromium so the before/after renderer uses that frame.
  useEffect(() => {
    const element = media.current;
    decodedFrame.current = undefined;
    if (!element || !onPositionCommit || !element.requestVideoFrameCallback) return;
    let callback = 0;
    const presented: VideoFrameRequestCallback = (_now, metadata) => {
      decodedFrame.current = metadata.mediaTime;
      if (element.paused) commitPosition.current?.(metadata.mediaTime);
      callback = element.requestVideoFrameCallback(presented);
    };
    callback = element.requestVideoFrameCallback(presented);
    return () => element.cancelVideoFrameCallback(callback);
  }, [src, !!onPositionCommit]);
  useEffect(() => { onReady?.(ready); }, [ready, onReady]);
  useEffect(() => {
    const element = media.current;
    let frame = 0;
    const tick = () => {
      if (element && stopAt.current !== undefined && element.currentTime >= stopAt.current) {
        element.pause(); element.currentTime = stopAt.current; stopAt.current = undefined;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); element?.pause(); };
  }, [src]);
  useImperativeHandle(playerRef, () => ({
    position: () => media.current?.currentTime ?? 0,
    seek,
    pause: () => { media.current?.pause(); stopAt.current = undefined; },
    playRange: (start, end) => {
      const element = media.current;
      if (!element || !ready) return;
      seek(start); stopAt.current = end;
      void element.play().catch(() => setError(t('Could not play this file.', 'تعذر تشغيل هذا الملف.')));
    }
  }));
  useEffect(() => {
    setPlaying(false); setDuration(0); setPosition(0); setReady(false); setError(''); setAudioOnly(false); stopAt.current = undefined;
  }, [src]);
  useEffect(() => {
    const changed = () => setFullscreen(document.fullscreenElement === container.current);
    document.addEventListener('fullscreenchange', changed);
    return () => document.removeEventListener('fullscreenchange', changed);
  }, []);
  const syncTime = () => {
    const element = media.current;
    if (!element) return;
    setDuration(Number.isFinite(element.duration) ? element.duration : 0);
    setPosition(element.currentTime);
  };
  async function togglePlayback() {
    const element = media.current;
    if (!element || !ready) return;
    stopAt.current = undefined;
    if (!element.paused) { element.pause(); return; }
    if (element.ended) element.currentTime = 0;
    try { await element.play(); setError(''); }
    catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) setError(t('Could not play this preview. Create it again and retry.', 'تعذر تشغيل المعاينة. أنشئها مجددًا وأعد المحاولة.')); }
  }
  function seek(seconds: number) {
    if (!media.current || !duration) return;
    stopAt.current = undefined;
    media.current.currentTime = Math.max(0, Math.min(duration, seconds));
    setPosition(media.current.currentTime);
  }
  function changeVolume(next: number) {
    if (!media.current || !Number.isFinite(next)) return;
    const level = Math.max(0, Math.min(1, next));
    media.current.volume = level;
    media.current.muted = false;
    // volumechange is asynchronous. Update controlled inputs in this interaction,
    // so a quick following key or drag never sees the previous slider position.
    setVolume(level);
    setMuted(false);
  }
  function toggleMute() {
    const element = media.current;
    if (!element) return;
    if (element.volume === 0) { changeVolume(1); return; }
    element.muted = !element.muted;
    setMuted(element.muted);
    setVolume(element.volume);
  }
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === container.current) await document.exitFullscreen();
      else await container.current?.requestFullscreen();
    } catch { setError(t('Could not open fullscreen. You can keep using this preview.', 'تعذر فتح ملء الشاشة. يمكنك متابعة المعاينة هنا.')); }
  }
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // Keep these shortcuts inside the preview. Inputs and buttons retain their normal keys.
    if (event.key === 'Escape' && document.fullscreenElement === container.current) {
      event.preventDefault(); event.stopPropagation(); void toggleFullscreen(); return;
    }
    if (event.target !== event.currentTarget) return;
    if (event.code === 'Space') { event.preventDefault(); event.stopPropagation(); void togglePlayback(); }
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); event.stopPropagation(); seek(position + (event.key === 'ArrowLeft' ? -5 : 5)); }
  }
  const fill = (value: number): CSSProperties => ({ '--preview-range-fill': `${value}%` } as CSSProperties);
  return <div ref={container} className={`studio-preview-player${audioOnly ? ' studio-preview-player--audio' : ''}`} role="group" aria-label={source ? t('Source player', 'مشغّل الملف الأصلي') : t('Rendered preview player', 'مشغّل معاينة الناتج')} tabIndex={0} onKeyDown={onKeyDown}>
    <div className="studio-preview-player__picture">
      <video ref={media} src={src} playsInline preload="auto" aria-label={source ? t('Source media', 'الملف الأصلي') : t('Rendered preview', 'معاينة الناتج')}
        onLoadedMetadata={() => { syncTime(); setAudioOnly(media.current?.videoWidth === 0); }}
        onLoadedData={() => setReady(true)} onCanPlay={() => setReady(true)} onDurationChange={syncTime} onTimeUpdate={syncTime}
        onSeeked={() => { if (media.current?.paused) onPositionCommit?.(decodedFrame.current ?? media.current.currentTime); }}
        onPlay={() => { setPlaying(true); onPlayingChange?.(true); }} onPause={() => { setPlaying(false); onPlayingChange?.(false); onPositionCommit?.(decodedFrame.current ?? media.current?.currentTime ?? 0); }} onEnded={() => { setPlaying(false); onPlayingChange?.(false); onPositionCommit?.(decodedFrame.current ?? media.current?.currentTime ?? 0); syncTime(); }}
        onVolumeChange={() => { setVolume(media.current?.volume ?? 1); setMuted(media.current?.muted ?? false); }}
        onError={() => { setReady(false); setPlaying(false); setError(source ? t('This file cannot play here. Open a compatible MP4 or audio file.', 'تعذر تشغيل هذا الملف هنا. افتح ملف MP4 أو ملف صوت مدعوم.') : t('Could not load this preview. Create it again and retry.', 'تعذر تحميل المعاينة. أنشئها مجددًا وأعد المحاولة.')); }}/>
      {audioOnly && <div className="studio-preview-player__audio"><AudioLines aria-hidden="true" size={44}/><span>{t('Audio preview', 'معاينة الصوت')}</span></div>}
    </div>
    <div className="preview-control-strip studio-preview-player__controls">
      <button className="preview-control-button" type="button" disabled={!ready} aria-label={playing ? t('Pause preview', 'إيقاف المعاينة مؤقتًا') : t('Play preview', 'تشغيل المعاينة')} onClick={() => void togglePlayback()}>{playing ? <Pause size={16} aria-hidden="true"/> : <Play size={16} aria-hidden="true"/>}</button>
      <span className="studio-preview-player__time" dir="ltr">{clock(position)} / {clock(duration)}</span>
      <input className="studio-preview-player__seek" type="range" min={0} max={duration || 1} step={0.01} value={Math.min(position, duration)} disabled={!ready || !duration} dir="ltr" style={fill(duration ? position / duration * 100 : 0)} aria-label={t('Preview position', 'موضع المعاينة')} aria-valuetext={`${clock(position)} / ${clock(duration)}`} onChange={e => seek(e.currentTarget.valueAsNumber)}/>
      <div className="studio-preview-player__sound">
        <button className="preview-control-button preview-control-button--ghost" type="button" aria-pressed={muted || volume === 0} aria-label={muted || volume === 0 ? t('Unmute preview', 'إلغاء كتم المعاينة') : t('Mute preview', 'كتم المعاينة')} onClick={toggleMute}>{muted || volume === 0 ? <VolumeX size={16} aria-hidden="true"/> : <Volume2 size={16} aria-hidden="true"/>}</button>
        <input type="range" min={0} max={1} step={0.01} value={muted ? 0 : volume} dir="ltr" style={fill(muted ? 0 : volume * 100)} aria-label={t('Preview volume', 'صوت المعاينة')} aria-valuetext={`${Math.round((muted ? 0 : volume) * 100)}%`} onChange={e => changeVolume(e.currentTarget.valueAsNumber)}/>
      </div>
      <button className="preview-control-button preview-control-button--ghost" type="button" aria-pressed={fullscreen} aria-label={fullscreen ? t('Exit fullscreen preview', 'الخروج من معاينة ملء الشاشة') : t('Fullscreen preview', 'معاينة بملء الشاشة')} onClick={() => void toggleFullscreen()}>{fullscreen ? <Minimize2 size={16} aria-hidden="true"/> : <Maximize2 size={16} aria-hidden="true"/>}</button>
    </div>
    {error && <p className="studio-preview-player__message" role="status">{error}</p>}
  </div>;
}
