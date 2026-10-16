import type { StudioEdits, Transcript } from './editor-project/studio';
import type { PortableProject } from '../main/studioFiles';
import type { StudioJob } from '../main/studioQueue';
export type StudioRequest = {
  ids?: string[]; restoreJobs?: boolean;
  action: 'speech-plan' | 'default-output' | 'analyze' | 'measure' | 'export-subtitles' | 'proxy' | 'preview' | 'read-transcript' | 'pick-images' | 'pick-audio' | 'pick-files' | 'pick-project-media' | 'pick-directory' | 'save-project' | 'open-project' | 'jobs' | 'dismiss-jobs' | 'enqueue' | 'cancel' | 'retry' | 'move' | 'local-status' | 'prepare-local' | 'duplicates' | 'storage' | 'clean-cache';
  threshold?: number; minimum?: number; subtitleFormat?: 'srt'|'vtt'; cues?: import('./editor-project/editorSubtitles').EditorSubtitleCue[];
  thumbnail?: boolean;
  speechMode?: import('./speechPlan').SpeechMode;
  outputDirectory?: string;
  conversionSize?: { width: number; height: number };
  locale?: 'ar' | 'en'; source?: string; paths?: string[]; project?: PortableProject; collect?: boolean;
  id?: string; direction?: -1 | 1; kind?: 'render' | 'convert' | 'transcribe' | 'separate'; name?: string;
  render?: unknown; renders?: unknown[]; edits?: StudioEdits; scheduledAt?: number; engine?: 'speech' | 'separation'; language?: 'auto' | 'ar' | 'en'; model?: 'base' | 'small'; format?: 'mp4' | 'mp3' | 'wav' | 'webm'; targetMb?: number;
};
export type StudioResponse = {
  ok: boolean; canceled?: boolean; message?: string; id?: string; path?: string; paths?: string[];
  thumbnail?: string;
  speechPlan?: import('./speechPlan').SpeechPlan;
  analysis?: { duration: number; width: number; height: number; audio: boolean; size: number; peaks: number[]; silences: { start: number; end: number }[] };
  project?: PortableProject; missing?: string[]; jobs?: StudioJob[]; transcript?: Transcript;
  local?: { runtime: boolean; speech: boolean; speechModels: ('base'|'small')[]; separation: boolean }; duplicates?: { paths: string[]; bytes: number }[]; cacheBytes?: number;
  loudness?: { lufs: number|null; peak: number|null };
};
