import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { studioProcess } from './studioProcess';
import { atomicJson } from './studioFiles';

export async function cachedStudioAnalysis(ffmpeg: string, ffprobe: string, path: string, cache: string, signal?: AbortSignal, threshold = -35, minimum = .5) {
  const info = await stat(path), key = createHash('sha256').update(JSON.stringify([2,path,info.size,info.mtimeMs,threshold,minimum])).digest('hex');
  const target = join(cache, `${key}.analysis.json`);
  const cached = await readFile(target,'utf8').then(JSON.parse).catch(()=>undefined);
  if (cached && Array.isArray(cached.peaks) && Array.isArray(cached.silences)) return cached as Awaited<ReturnType<typeof analyzeStudioMedia>>;
  const result = await analyzeStudioMedia(ffmpeg,ffprobe,path,signal,threshold,minimum);
  const after = await stat(path); if (after.size === info.size && after.mtimeMs === info.mtimeMs) await atomicJson(target,result);
  return result;
}
export async function measureStudioLoudness(ffmpeg: string, source: string, signal?: AbortSignal) {
  const {stderr} = await studioProcess(ffmpeg,['-v','info','-i',source,'-vn','-af','loudnorm=print_format=json','-f','null','-'],{signal});
  const match = stderr.match(/\{\s*"input_i"[\s\S]*?\}/); if (!match) throw new Error('NO_AUDIO');
  const data = JSON.parse(match[0]);
  return { lufs: Number.isFinite(Number(data.input_i)) ? Number(data.input_i) : null, peak: Number.isFinite(Number(data.input_tp)) ? Number(data.input_tp) : null };
}

export async function probeStudioMedia(ffprobe: string, path: string, signal?: AbortSignal, still = false) {
  const result = await studioProcess(ffprobe, ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', path], { signal, maxOutput: 1024 * 1024 });
  const data = JSON.parse(result.stdout.toString('utf8'));
  const video = data.streams?.find((s: { codec_type: string }) => s.codec_type === 'video');
  const duration = still ? .04 : Number(data.format?.duration); if (!Number.isFinite(duration) || duration <= 0) throw new Error('INVALID_MEDIA_DURATION');
  return { duration, width: Number(video?.width) || 0, height: Number(video?.height) || 0, audio: Boolean(data.streams?.some((s: { codec_type: string }) => s.codec_type === 'audio')), size: Number(data.format?.size) || 0 };
}
export async function analyzeStudioMedia(ffmpeg: string, ffprobe: string, path: string, signal?: AbortSignal, threshold = -35, minimum = .5) {
  const media = await probeStudioMedia(ffprobe, path, signal);
  if (!media.audio) return { ...media, peaks: [], silences: [] };
  const peaks = new Array<number>(Math.min(12000, Math.max(100, Math.ceil(media.duration * 20)))).fill(0);
  const rate = 2000, samplesPerBucket = Math.max(1, Math.ceil(media.duration * rate / peaks.length)); let index = 0, remainder: Buffer = Buffer.alloc(0), silenceStart: number | undefined;
  const silences: { start: number; end: number }[] = [];
  await studioProcess(ffmpeg, ['-v', 'info', '-i', path, '-vn', '-af', `silencedetect=n=${Math.max(-80, Math.min(-10, threshold))}dB:d=${Math.max(.1, Math.min(10, minimum))}`, '-ac', '1', '-ar', String(rate), '-f', 'f32le', 'pipe:1'], {
    signal,
    onData: chunk => {
      const data = remainder.length ? Buffer.concat([remainder, chunk]) : chunk;
      let offset = 0;
      for (; offset + 4 <= data.length; offset += 4) { const sample = Math.abs(data.readFloatLE(offset)); const bucket = Math.min(peaks.length - 1, Math.floor(index++ / samplesPerBucket)); if (Number.isFinite(sample)) peaks[bucket] = Math.max(peaks[bucket], Math.min(1, sample)); }
      remainder = data.subarray(offset);
    },
    onErrorLine: line => {
      const start = /silence_start: ([\d.]+)/.exec(line), end = /silence_end: ([\d.]+)/.exec(line);
      if (start) silenceStart = Number(start[1]);
      if (end && silenceStart !== undefined) { silences.push({ start: silenceStart, end: Number(end[1]) }); silenceStart = undefined; }
    }
  });
  if (silenceStart !== undefined) silences.push({ start: silenceStart, end: media.duration });
  return { ...media, peaks, silences };
}
export async function createStudioProxy(ffmpeg: string, source: string, cache: string, signal?: AbortSignal) {
  const info = await stat(source), key = createHash('sha256').update(`${source}\0${info.size}\0${info.mtimeMs}`).digest('hex');
  await mkdir(cache, { recursive: true }); const output = join(cache, `${key}.mp4`);
  if ((await stat(output).catch(() => undefined))?.size) return output;
  try { await studioProcess(ffmpeg, ['-v', 'error', '-y', '-i', source, '-map', '0:v:0', '-map', '0:a:0?', '-vf', "scale=w='min(960,iw)':h=-2", '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', output], { signal }); return output; }
  catch (error) { await unlink(output).catch(() => {}); throw error; }
}
