import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { extractAudioFile } from './extractAudio';
let directory: string, sourcePath: string, existingPath: string, outputDirectory: string;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'loaderly-extract-'));
  sourcePath = join(directory, 'video.mp4'); existingPath = join(directory, 'another-folder', 'Saved song.mp3'); outputDirectory = join(directory, 'Extracted');
  await mkdir(join(directory, 'another-folder')); await writeFile(sourcePath, 'video:unchanged'); await writeFile(existingPath, 'audio:original');
});
afterEach(async () => { await rm(directory, { recursive: true, force: true }); });
const source = 'https://youtu.be/L9O4per-Uhw';
const request = () => ({ sourcePath, source, knownAudio: [{ path: existingPath, source: 'https://youtube.com/watch?v=L9O4per-Uhw' }] });
const services = () => ({ directory: outputDirectory, playableAudio: async (path: string) => (await readFile(path, 'utf8')).startsWith('audio:'), render: vi.fn(async (_source: string, target: string) => { await writeFile(target, 'audio:new'); return { ok: true }; }) });

it('asks about an existing clip in another folder before rendering', async () => {
  const tools = services(); expect(await extractAudioFile(request(), tools)).toEqual({ existingPath }); expect(tools.render).not.toHaveBeenCalled();
});
it('cancel does not touch either file or render', async () => {
  const tools = services(); expect(await extractAudioFile({ ...request(), choice: 'cancel' }, tools)).toEqual({ canceled: true });
  expect(tools.render).not.toHaveBeenCalled(); expect(await readFile(existingPath, 'utf8')).toBe('audio:original'); expect(await readFile(sourcePath, 'utf8')).toBe('video:unchanged');
});
it('use existing opens the existing path without creating output', async () => {
  const tools = services(); expect(await extractAudioFile({ ...request(), choice: 'use', existingPath }, tools)).toEqual({ path: existingPath, reused: true }); expect(tools.render).not.toHaveBeenCalled();
  expect(await readdir(directory)).toEqual(['another-folder', 'video.mp4']);
});
it('replaces the same MP3 only after verifying a new staged file', async () => {
  const tools = services(); tools.render.mockImplementation(async (_source, target) => { expect(await readFile(existingPath, 'utf8')).toBe('audio:original'); expect(target).not.toBe(existingPath); await writeFile(target, 'audio:new'); return { ok: true }; });
  expect(await extractAudioFile({ ...request(), choice: 'replace', existingPath }, tools)).toEqual({ path: existingPath, reused: false, replacedPath: existingPath });
  expect(await readFile(existingPath, 'utf8')).toBe('audio:new'); expect(await readFile(sourcePath, 'utf8')).toBe('video:unchanged'); expect(await readdir(join(directory, 'another-folder'))).toEqual(['Saved song.mp3']);
});
it.each(['encoder failure', 'invalid output', 'empty output', 'exception'])('keeps existing audio intact after %s', async failure => {
  const tools = services(); tools.render.mockImplementation(async (_source, target) => { await writeFile(target, failure === 'empty output' ? '' : 'broken'); if (failure === 'exception') throw Error('Disconnected drive'); return { ok: failure !== 'encoder failure' }; });
  await expect(extractAudioFile({ ...request(), choice: 'replace', existingPath }, tools)).rejects.toThrow();
  expect(await readFile(existingPath, 'utf8')).toBe('audio:original'); expect(await readdir(join(directory, 'another-folder'))).toEqual(['Saved song.mp3']);
});
it('refuses to overwrite audio changed during extraction', async () => {
  const tools = services(); tools.render.mockImplementation(async (_source, target) => { await writeFile(existingPath, 'audio:changed elsewhere'); await writeFile(target, 'audio:new'); return { ok: true }; });
  await expect(extractAudioFile({ ...request(), choice: 'replace', existingPath }, tools)).rejects.toThrow('changed'); expect(await readFile(existingPath, 'utf8')).toBe('audio:changed elsewhere');
});
it('keep both uses readable numbered names without timestamps or overwriting', async () => {
  const tools = services(); const first = await extractAudioFile({ ...request(), choice: 'keep', existingPath }, tools), second = await extractAudioFile({ ...request(), choice: 'keep', existingPath }, tools);
  expect(first).toEqual({ path: join(outputDirectory, 'video - audio.mp3'), reused: false, replacedPath: undefined });
  expect(second).toEqual({ path: join(outputDirectory, 'video - audio (2).mp3'), reused: false, replacedPath: undefined }); expect(await readFile(existingPath, 'utf8')).toBe('audio:original');
});
it('does not replace a same-title clip with a different source id', async () => {
  const result = await extractAudioFile({ ...request(), knownAudio: [{ path: existingPath, source: 'https://youtu.be/abcdefghijk' }] }, services());
  expect(result).toEqual({ path: join(outputDirectory, 'video - audio.mp3'), reused: false, replacedPath: undefined }); expect(await readFile(existingPath, 'utf8')).toBe('audio:original');
});
it('replaces a non-MP3 audio with a verified MP3 using its real extension', async () => {
  const wav = join(directory, 'another-folder', 'Saved song.wav'); await writeFile(wav, 'audio:wave');
  const result = await extractAudioFile({ ...request(), knownAudio: [{ path: wav, source }], choice: 'replace', existingPath: wav }, services());
  expect(result).toEqual({ path: join(directory, 'another-folder', 'Saved song (2).mp3'), reused: false, replacedPath: wav });
  expect(await readFile(existingPath, 'utf8')).toBe('audio:original'); expect(await readdir(join(directory, 'another-folder'))).toEqual(['Saved song (2).mp3', 'Saved song.mp3']);
});
it('detects an already extracted local source from preserved metadata', async () => {
  expect(await extractAudioFile({ sourcePath, knownAudio: [{ path: existingPath, source: sourcePath }] }, services())).toEqual({ existingPath });
});
it('does not let folder scanning override a known different source identity', async () => {
  await mkdir(outputDirectory);
  const misleading = join(outputDirectory, 'Song [L9O4per-Uhw].mp3'); await writeFile(misleading, 'audio:unrelated');
  const result = await extractAudioFile({ sourcePath, source, knownAudio: [{ path: misleading, source: 'https://youtu.be/abcdefghijk' }] }, services());
  expect(result).toEqual({ path: join(outputDirectory, 'video - audio.mp3'), reused: false, replacedPath: undefined });
  expect(await readFile(misleading, 'utf8')).toBe('audio:unrelated');
});
