import { mkdtemp, mkdir, writeFile, rm, rename } from 'node:fs/promises';
import { join, basename, dirname } from 'node:path';
import worker from './pytubeWorker.py?raw';
import type { DownloadUrlPayload, DownloadUrlResult } from '../shared/downloadRequest';
import type { TransferProgress } from '../shared/downloadProgress';
import { isYouTubeMediaUrl } from '../shared/downloadEngine';
import { studioProcess } from './studioProcess';
import { PytubefixManager, isolatedPythonEnvironment } from './pytubefixManager';

type WorkerResult = { ok: boolean; message?: string; title: string; id: string; streams?: { kind: 'video' | 'audio'; path: string }[]; captions?: string[]; captionWarning?: boolean };
export class PytubeDownload {
  constructor(private manager: PytubefixManager, private root: string, private ffmpeg: () => string | undefined) {}
  private async run(action: 'metadata' | 'download', payload: DownloadUrlPayload, output?: string, notify: (p: TransferProgress) => void = () => {}, signal?: AbortSignal): Promise<WorkerResult> {
    if (!isYouTubeMediaUrl(payload.url)) throw Error('The backup engine supports YouTube videos only. Use Automatic for other sites.');
    const runtime = this.manager.runtime();
    if (!runtime) throw Error('Install the optional pytubefix engine from Tools first.');
    await mkdir(this.root, { recursive: true }); const task = await mkdtemp(join(this.root, 'request-'));
    try {
      const script = join(task, 'worker.py'), request = join(task, 'request.json');
      await writeFile(script, worker); await writeFile(request, JSON.stringify({ ...payload, action, output }));
      const result = await studioProcess(runtime.python, ['-I', script, request], {
        signal, env: isolatedPythonEnvironment(this.root), maxOutput: 2 * 1024 * 1024,
        onErrorLine: line => { try { const data = JSON.parse(line); if (data.phase === 'subtitles' || data.phase === 'downloading') notify(data); } catch { /* Not a progress message. */ } }
      });
      const data = JSON.parse(result.stdout.toString('utf8').trim().split('\n').at(-1)!) as WorkerResult;
      if (!data.ok || !data.title || !/^[\w-]{11}$/.test(data.id)) throw Error(data.message ?? 'The backup engine returned an invalid result.');
      return data;
    } catch (error) {
      if (signal?.aborted) throw error;
      let message: string | undefined;
      try { message = JSON.parse(String((error as { stdout?: string }).stdout).trim().split('\n').at(-1)!).message; } catch { /* No structured error. */ }
      throw message ? Error(message) : error;
    } finally { await rm(task, { recursive: true, force: true }); }
  }
  metadata(payload: DownloadUrlPayload, signal?: AbortSignal) { return this.run('metadata', payload, undefined, undefined, signal ? AbortSignal.any([signal, AbortSignal.timeout(90_000)]) : AbortSignal.timeout(90_000)); }
  async download(payload: DownloadUrlPayload, output: string, notify: (p: TransferProgress) => void, signal?: AbortSignal): Promise<DownloadUrlResult> {
    const ffmpeg = this.ffmpeg(); if (!ffmpeg) throw Error('FFmpeg was not found. Install it from Tools.');
    const result = await this.run('download', payload, output, notify, signal);
    if (!result.streams?.length || result.streams.some(stream => dirname(stream.path) !== output || !/^backup-source-(video|audio)\.bin$/.test(basename(stream.path)))) throw Error('Unexpected backup download output.');
    const stem = `${result.title.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/[ .]+$/, '').slice(0, 110) || 'Video'} [${result.id}]`;
    const audioOnly = payload.quality === 'audio', path = join(output, stem + (audioOnly ? '.mp3' : '.mp4'));
    notify({ phase: 'processing' });
    const inputs = result.streams.flatMap(stream => ['-i', stream.path]);
    const video = result.streams.findIndex(stream => stream.kind === 'video'), audio = result.streams.findIndex(stream => stream.kind === 'audio');
    await studioProcess(ffmpeg, ['-v','error','-nostdin','-y',...inputs,...(audioOnly ? ['-vn','-c:a','libmp3lame','-b:a','192k'] : ['-map',`${video}:v:0`,'-map',`${audio < 0 ? video : audio}:a:0`,'-c:v','copy','-c:a','aac','-b:a','192k','-movflags','+faststart']),path], { signal });
    let subtitlePath: string | undefined;
    for (const caption of result.captions ?? []) {
      if (dirname(caption) !== output || !/^backup-caption\.[a-z\d_.-]+\.srt$/i.test(basename(caption))) continue;
      const destination = join(output, stem + basename(caption).slice('backup-caption'.length));
      await rename(caption, destination); subtitlePath ??= destination;
    }
    notify({ phase: 'finalizing' });
    return { ok: true, path, subtitlePath, message: result.captionWarning ? 'The video was saved, but subtitles were unavailable with the backup engine.' : undefined };
  }
}
