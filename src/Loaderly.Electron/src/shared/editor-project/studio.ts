import type { EditorSubtitleCue } from './editorSubtitles';
import { normalizeStudioMotion, type StudioMotionPoint } from './studioMotion';

export type StudioOutputPreset = { name: string; kind: 'video' | 'audio' | 'gif'; width: number; height: number; crf: number; directory?: string };
export function normalizeOutputPreset(value: unknown): StudioOutputPreset | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const p = record(value);
  return { name: label(p.name, 'Custom'), kind: p.kind === 'audio' || p.kind === 'gif' ? p.kind : 'video', width: Math.floor(finite(p.width, 0, 0, 3840) / 2) * 2, height: Math.floor(finite(p.height, 0, 0, 3840) / 2) * 2, crf: Math.round(finite(p.crf, 20, 12, 35)), directory: label(p.directory) || undefined };
}
export type NamedRange = { id: string; name: string; start: number; end: number; preset?: StudioOutputPreset };
export type StudioMarker = { id: string; name: string; time: number };
export type StudioColor = { brightness: number; contrast: number; saturation: number; warmth: number };
export type StudioOverlay = {
  id: string; kind: 'image' | 'text'; path?: string; text?: string;
  start: number; end: number; x: number; y: number; width: number; opacity: number;
  animation: 'none' | 'fade' | 'slide' | 'zoom'; color: string; fontSize: number; locked?: boolean;
  keyframes?: StudioMotionPoint[];
};
export type StudioAudio = { normalize: boolean; targetLufs: number; peakDb: number; denoise: number; noiseSample?: {start:number;end:number}; extraPath: string; extraStart: number; extraOffset?: number; extraDuration?: number; extraGain: number; replace: boolean; duck: boolean };
export type StudioEdits = {
  outputPreset?: StudioOutputPreset;
  schema: 1; ranges: NamedRange[]; markers: StudioMarker[]; overlays: StudioOverlay[];
  color: StudioColor; colorRange?: { start: number; end: number }; audio: StudioAudio; reverse: boolean; reverseAudio?: boolean; freezeAt: number; freezeDuration: number;
  wordCaptions: boolean; captionColor: string; captionStyle?: 'plain' | 'box' | 'pop';
};
export const emptyStudioEdits = (): StudioEdits => ({
  schema: 1, ranges: [], markers: [], overlays: [],
  color: { brightness: 0, contrast: 1, saturation: 1, warmth: 0 },
  audio: { normalize: false, targetLufs: -16, peakDb: -1, denoise: 0, extraPath: '', extraStart: 0, extraGain: 0, replace: false, duck: false },
  reverse: false, freezeAt: 0, freezeDuration: 0, wordCaptions: false, captionColor: '#f5c542'
});
const finite = (value: unknown, fallback: number, min: number, max: number) => typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
const label = (value: unknown, fallback = '') => typeof value === 'string' ? value.slice(0, 1000) : fallback;
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const hex = (value: unknown, fallback: string) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
export function normalizeStudioEdits(value: unknown, duration = 24 * 3600): StudioEdits {
  const v = record(value), a = record(v.audio), c = record(v.color), d = emptyStudioEdits();
  duration = finite(duration, 24 * 3600, 0.001, 7 * 24 * 3600);
  return {
    ...d,
    outputPreset: normalizeOutputPreset(v.outputPreset),
    ranges: (Array.isArray(v.ranges) ? v.ranges : []).slice(0, 200).map((r, i) => {
      const p = record(r); return { id: label(p.id, `clip-${i}`), name: label(p.name, `Clip ${i + 1}`), start: finite(p.start, 0, 0, duration), end: finite(p.end, duration, 0, duration), preset: normalizeOutputPreset(p.preset) };
    }).filter(r => r.end > r.start + .01),
    markers: (Array.isArray(v.markers) ? v.markers : []).slice(0, 1000).map((r, i) => { const p = record(r); return { id: label(p.id, `marker-${i}`), name: label(p.name), time: finite(p.time, 0, 0, duration) }; }),
    overlays: (Array.isArray(v.overlays) ? v.overlays : []).slice(0, 50).map((r, i): StudioOverlay => {
      const p = record(r); return { id: label(p.id, `overlay-${i}`), kind: p.kind === 'text' ? 'text' : 'image', path: label(p.path), text: label(p.text),
        start: finite(p.start, 0, 0, duration), end: finite(p.end, duration, 0, duration), x: finite(p.x, 5, 0, 100), y: finite(p.y, 5, 0, 100), width: finite(p.width, 20, 1, 100), opacity: finite(p.opacity, 1, 0, 1),
        animation: ['fade', 'slide', 'zoom'].includes(String(p.animation)) ? p.animation as StudioOverlay['animation'] : 'none', color: hex(p.color, '#ffffff'), fontSize: finite(p.fontSize, 36, 8, 300), locked: p.locked === true, keyframes: normalizeStudioMotion(p.keyframes,duration) };
    }).filter(o => o.end > o.start && (o.kind === 'text' || Boolean(o.path))),
    color: { brightness: finite(c.brightness, 0, -1, 1), contrast: finite(c.contrast, 1, .1, 3), saturation: finite(c.saturation, 1, 0, 3), warmth: finite(c.warmth, 0, -1, 1) },
    audio: { normalize: a.normalize === true, targetLufs: finite(a.targetLufs, -16, -36, -9), peakDb: finite(a.peakDb, -1, -9, -.1), denoise: finite(a.denoise, 0, 0, 30),
      noiseSample: a.noiseSample && Number(record(a.noiseSample).end)>Number(record(a.noiseSample).start)+.1 ? {start:finite(record(a.noiseSample).start,0,0,604799),end:finite(record(a.noiseSample).end,1,0,604800)} : undefined,
      extraPath: label(a.extraPath), extraStart: finite(a.extraStart, 0, 0, duration), extraOffset: finite(a.extraOffset, 0, 0, 604800), extraDuration: finite(a.extraDuration, 0, 0, 604800), extraGain: finite(a.extraGain, 0, -60, 12), replace: a.replace === true, duck: a.duck === true },
    colorRange: v.colorRange ? { start: finite(record(v.colorRange).start, 0, 0, duration), end: finite(record(v.colorRange).end, duration, 0, duration) } : undefined,
    reverse: v.reverse === true, reverseAudio: v.reverseAudio !== false, freezeAt: finite(v.freezeAt, 0, 0, duration), freezeDuration: finite(v.freezeDuration, 0, 0, 30),
    wordCaptions: v.wordCaptions === true, captionColor: hex(v.captionColor, '#f5c542'), captionStyle: v.captionStyle === 'plain' || v.captionStyle === 'pop' ? v.captionStyle : 'box'
  };
}
export function hasStudioProcessing(edits: StudioEdits): boolean {
  const { color: c, audio: a } = edits;
  return Boolean(edits.outputPreset || edits.overlays.length || edits.reverse || edits.freezeDuration || edits.wordCaptions || c.brightness || c.contrast !== 1 || c.saturation !== 1 || c.warmth || a.normalize || a.denoise || a.extraPath);
}
export type SourcePiece = { start: number; end: number; rate: number; outputStart: number };
export function sourcePieces(start: number, end: number, cuts: readonly { startSeconds: number; endSeconds: number }[] = [], speeds: readonly { startSeconds: number; endSeconds: number; rate: number }[] = []): SourcePiece[] {
  const points = [...new Set([start, end, ...cuts.flatMap(c => [c.startSeconds, c.endSeconds]), ...speeds.flatMap(s => [s.startSeconds, s.endSeconds])].filter(Number.isFinite).map(v => Math.max(start, Math.min(end, v))))].sort((a, b) => a - b);
  const pieces: SourcePiece[] = []; let time = 0;
  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1], to = points[i], mid = (from + to) / 2;
    if (to <= from || cuts.some(c => mid >= c.startSeconds && mid < c.endSeconds)) continue;
    const rate = finite(speeds.find(s => mid >= s.startSeconds && mid < s.endSeconds)?.rate, 1, .25, 8);
    pieces.push({ start: from, end: to, rate, outputStart: time }); time += (to - from) / rate;
  }
  return pieces;
}
export function projectInterval(start: number, end: number, pieces: readonly SourcePiece[]): { start: number; end: number }[] {
  return pieces.flatMap(p => { const a = Math.max(start, p.start), b = Math.min(end, p.end); return b > a ? [{ start: p.outputStart + (a - p.start) / p.rate, end: p.outputStart + (b - p.start) / p.rate }] : []; });
}
export function suggestSilenceCuts(silences: readonly { start: number; end: number }[], duration: number, padding = .12, minimum = .5): { startSeconds: number; endSeconds: number }[] {
  return silences.flatMap(s => { const start = Math.max(0, s.start + padding), end = Math.min(duration, s.end - padding); return end - start >= minimum ? [{ startSeconds: start, endSeconds: end }] : []; });
}
export function shiftSubtitleCues(cues: readonly EditorSubtitleCue[], offset: number, duration: number, selected?: readonly number[]): EditorSubtitleCue[] {
  if (!Number.isFinite(offset)) return [...cues];
  return cues.map((c, i) => selected && !selected.includes(i) ? { ...c } : { ...c, startSeconds: Math.max(0, Math.min(duration, c.startSeconds + offset)), endSeconds: Math.max(0, Math.min(duration, c.endSeconds + offset)) }).filter(c => c.endSeconds > c.startSeconds);
}
export function splitSubtitleCue(cue: EditorSubtitleCue, at: number, character: number): EditorSubtitleCue[] {
  if (at <= cue.startSeconds || at >= cue.endSeconds || character <= 0 || character >= cue.text.length) return [cue];
  return [{ ...cue, endSeconds: at, text: cue.text.slice(0, character).trim() }, { ...cue, startSeconds: at, text: cue.text.slice(character).trim() }];
}
export function mergeSubtitleCues(cues: readonly EditorSubtitleCue[], indices: readonly number[]): EditorSubtitleCue[] {
  const selected = cues.filter((_, i) => indices.includes(i)); if (selected.length < 2) return [...cues];
  return [...cues.filter((_, i) => !indices.includes(i)), { startSeconds: Math.min(...selected.map(c => c.startSeconds)), endSeconds: Math.max(...selected.map(c => c.endSeconds)), text: selected.map(c => c.text).join(' ') }].sort((a, b) => a.startSeconds - b.startSeconds);
}
export type TranscriptWord = { start: number; end: number; text: string; probability?: number };
export type Transcript = { language: string; cues: EditorSubtitleCue[]; words: TranscriptWord[] };
export function normalizeTranscript(value: unknown): Transcript | undefined {
  const v = record(value);
  if (!Array.isArray(v.cues) || !Array.isArray(v.words)) return undefined;
  const cues = v.cues.slice(0, 30000).map(item => { const c = record(item); return { startSeconds: finite(c.startSeconds, 0, 0, 604800), endSeconds: finite(c.endSeconds, 0, 0, 604800), text: label(c.text) }; }).filter(c => c.endSeconds > c.startSeconds && c.text.trim());
  const words = v.words.slice(0, 100000).map(item => { const w = record(item); return { start: finite(w.start, 0, 0, 604800), end: finite(w.end, 0, 0, 604800), text: label(w.text), probability: finite(w.probability, 0, 0, 1) }; }).filter(w => w.end > w.start && w.text.trim());
  return { language: label(v.language, 'auto'), cues, words };
}
export type LocalTask = 'transcribe' | 'separate';
export type TaskProgress = { id: string; state: 'queued' | 'running' | 'completed' | 'failed' | 'canceled'; progress?: number; message?: string; paths?: string[] };
