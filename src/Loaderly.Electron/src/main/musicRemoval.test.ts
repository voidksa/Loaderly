import { mkdtemp, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { processDownloadAudio } from './musicRemoval';
import { probeStudioMedia } from './studioAnalysis';
import { studioProcess } from './studioProcess';
vi.mock('./studioAnalysis', () => ({ probeStudioMedia: vi.fn() }));
vi.mock('./studioProcess', () => ({ studioProcess: vi.fn() }));
const directories: string[] = [];
afterEach(async () => { for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true }); vi.resetAllMocks(); });
async function setup() {
  const directory = await mkdtemp(join(tmpdir(), 'loaderly-music-test-')); directories.push(directory);
  const source = join(directory, 'Speech.mp4'); await writeFile(source, 'original');
  vi.mocked(probeStudioMedia).mockResolvedValue({ duration: 10, audio: true, width: 640, height: 360, size: 1000 });
  vi.mocked(studioProcess).mockImplementation(async (_file, args) => { await writeFile(args.at(-1)!, 'processed'); return { stdout: Buffer.alloc(0), stderr: '' }; });
  const separate = vi.fn(async (_source: string, output: string) => { const path = join(output, 'vocals.wav'); await writeFile(path, 'voices'); return { paths: [path] }; });
  return { directory, source, context: { ffmpeg: 'ffmpeg', ffprobe: 'ffprobe', separate }, signal: new AbortController().signal };
}
it('keeps video, replaces only its audio and never overwrites an existing result', async () => {
  const { directory, source, context, signal } = await setup();
  await writeFile(join(directory, 'Speech [No music].mp4'), 'previous');
  const path = await processDownloadAudio(source, 'video', 'vocals', context, signal, () => {});
  expect(path).toBe(join(directory, 'Speech [No music] (2).mp4'));
  expect(await readFile(source, 'utf8')).toBe('original');
  expect(await readFile(join(directory, 'Speech [No music].mp4'), 'utf8')).toBe('previous');
  expect(vi.mocked(studioProcess).mock.calls[0][1]).toEqual(expect.arrayContaining(['0:v:0', '1:a:0', 'copy', 'aac']));
  expect((await readdir(directory)).some(file => file.startsWith('.loaderly-'))).toBe(false);
});
it('produces an audio-only MP3 and rejects incomplete output while retaining the source', async () => {
  const { source, context, signal, directory } = await setup();
  const path = await processDownloadAudio(source, 'audio', 'vocals', context, signal, () => {}); expect(path.endsWith('.mp3')).toBe(true);
  expect(vi.mocked(studioProcess).mock.calls[0][1]).toEqual(expect.arrayContaining(['-vn', 'libmp3lame']));
  vi.mocked(probeStudioMedia).mockResolvedValueOnce({ duration: 10, audio: true, width: 640, height: 360, size: 1000 }).mockResolvedValueOnce({ duration: 2, audio: true, width: 640, height: 360, size: 1000 });
  await expect(processDownloadAudio(source, 'video', 'vocals', context, signal, () => {})).rejects.toThrow('INVALID_PROCESSED_MEDIA');
  expect(await readFile(source, 'utf8')).toBe('original'); expect(await readdir(directory)).toEqual(expect.not.arrayContaining(['Speech [No music].mp4']));
});
it('cleans temporary processing files after cancellation and leaves the original intact', async () => {
  const { source, context, directory } = await setup(), controller = new AbortController();
  context.separate.mockImplementation(async () => { controller.abort(); throw new Error('TASK_CANCELED'); });
  await expect(processDownloadAudio(source, 'video', 'vocals', context, controller.signal, () => {})).rejects.toThrow('TASK_CANCELED');
  expect(await readdir(directory)).toEqual(['Speech.mp4']);
});
it('selects the instrumental stem for music-only downloads and never substitutes vocals', async () => {
  const { source, context, signal, directory } = await setup();
  context.separate.mockImplementation(async (_source, output) => {
    const paths = [join(output, 'vocals.wav'), join(output, 'instrumental.wav')];
    await Promise.all(paths.map(path => writeFile(path, path))); return { paths };
  });
  for (const kind of ['audio', 'video'] as const) {
    const path = await processDownloadAudio(source, kind, 'instrumental', context, signal, () => {});
    expect(path).toBe(join(directory, `Speech [Instrumental].${kind === 'audio' ? 'mp3' : 'mp4'}`));
    const args = vi.mocked(studioProcess).mock.lastCall![1];
    expect(args[args.indexOf('-i', args.indexOf('-i') + 1) + 1]).toMatch(/instrumental\.wav$/);
  }
  context.separate.mockResolvedValue({ paths: [join(directory, 'vocals.wav')] });
  await expect(processDownloadAudio(source, 'audio', 'instrumental', context, signal, () => {})).rejects.toThrow('INSTRUMENTAL_MISSING');
  expect(await readFile(source, 'utf8')).toBe('original');
});
