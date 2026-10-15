import type { DownloadAudioMode } from '../shared/downloadAudio';
import { copyFile, mkdtemp, rm, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { basename, dirname, join, parse } from 'node:path';
import { probeStudioMedia } from './studioAnalysis';
import { studioProcess } from './studioProcess';

type Context = {
  ffmpeg: string; ffprobe: string;
  separate: (source: string, output: string, signal: AbortSignal, progress: (percent: number) => void) => Promise<{ paths?: string[] }>;
};
export type MusicProgress = { phase: 'waiting-audio' | 'removing-music' | 'saving-audio'; percent?: number };
/** Save a separate verified result. Never overwrite the original or a previous export. */
export async function processDownloadAudio(source: string, kind: 'audio' | 'video', mode: Exclude<DownloadAudioMode, 'original'>, context: Context, signal: AbortSignal, progress: (value: MusicProgress) => void): Promise<string> {
  const original = await stat(source);
  if (!original.isFile()) throw new Error('ORIGINAL_NOT_FOUND');
  const media = await probeStudioMedia(context.ffprobe, source, signal);
  if (!media.audio) throw new Error('NO_AUDIO');
  if (kind === 'video' && !media.width) throw new Error('VIDEO_REQUIRED');
  const directory = await mkdtemp(join(dirname(source), '.loaderly-audio-separation-'));
  try {
    progress({ phase: 'waiting-audio' });
    const result = await context.separate(source, directory, signal, percent => progress({ phase: 'removing-music', percent }));
    const stemName = mode === 'instrumental' ? 'instrumental.wav' : 'vocals.wav';
    const separated = result.paths?.find(path => basename(path) === stemName);
    if (!separated) throw new Error(mode === 'instrumental' ? 'INSTRUMENTAL_MISSING' : 'VOCALS_MISSING');
    progress({ phase: 'saving-audio' });
    const extension = kind === 'audio' ? '.mp3' : '.mp4', temporary = join(directory, `output${extension}`);
    const args = ['-v', 'error', '-y', '-i', source, '-i', separated];
    if (kind === 'video') args.push('-map', '0:v:0', '-map', '1:a:0', '-map_metadata', '0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart');
    else args.push('-map', '1:a:0', '-map_metadata', '0', '-vn', '-c:a', 'libmp3lame', '-q:a', '0');
    args.push('-t', String(media.duration), temporary);
    await studioProcess(context.ffmpeg, args, { signal });
    const checked = await probeStudioMedia(context.ffprobe, temporary, signal);
    if (!checked.audio || checked.size < 64 || Math.abs(checked.duration - media.duration) > Math.max(1, media.duration * .01) || (kind === 'video' && (!checked.width || checked.width !== media.width || checked.height !== media.height))) throw new Error('INVALID_PROCESSED_MEDIA');
    const after = await stat(source);
    if (after.size !== original.size || after.mtimeMs !== original.mtimeMs) throw new Error('SOURCE_CHANGED');
    const stem = parse(source).name.slice(0, 150);
    for (let index = 0; index < 1000; index++) {
      signal.throwIfAborted();
      const target = join(dirname(source), `${stem} [${mode === 'instrumental' ? 'Instrumental' : 'No music'}]${index ? ` (${index + 1})` : ''}${extension}`);
      try { await copyFile(temporary, target, constants.COPYFILE_EXCL); return target; }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
    }
    throw new Error('OUTPUT_NAME_EXHAUSTED');
  } finally { await rm(directory, { recursive: true, force: true }); }
}
