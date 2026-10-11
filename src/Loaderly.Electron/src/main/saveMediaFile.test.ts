import { afterEach, beforeEach, expect, it } from 'vitest';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { reserveEditedCopy, saveMediaFile } from './saveMediaFile';
let directory: string;
beforeEach(async () => { directory = await mkdtemp(join(tmpdir(), 'loaderly-save-')); });
afterEach(async () => { await rm(directory, { recursive: true, force: true }); });
it('replaces the original only after a complete render', async () => {
  const original = join(directory, 'أغنيتي.mp3'); await writeFile(original, 'original');
  const result = await saveMediaFile(original, async staging => {
    expect(await readFile(original, 'utf8')).toBe('original');
    await writeFile(staging, 'edited'); return { ok: true };
  });
  expect(result).toEqual({ ok: true, path: original });
  expect(await readFile(original, 'utf8')).toBe('edited');
  expect(await readdir(directory)).toEqual(['أغنيتي.mp3']);
});
it.each(['failure', 'empty', 'throw'])('preserves the original after %s', async failure => {
  const original = join(directory, 'Song.mp3'); await writeFile(original, 'original');
  const result = await saveMediaFile(original, async staging => {
    await writeFile(staging, failure === 'empty' ? '' : 'incomplete');
    if (failure === 'throw') throw Error('Disk disconnected');
    return { ok: failure === 'empty', message: 'Encoder failed' };
  });
  expect(result.ok).toBe(false); expect(await readFile(original, 'utf8')).toBe('original');
  expect(await readdir(directory)).toEqual(['Song.mp3']);
});
it('keeps both and reserves concurrent copies without overwriting existing files', async () => {
  const original = join(directory, 'Song.mp3'); await writeFile(original, 'original');
  const [a,b] = await Promise.all([reserveEditedCopy(original, 'Song.mp3'), reserveEditedCopy(original, 'Song.mp3')]);
  expect(a).not.toBe(b);
  await saveMediaFile(a, async staging => { await writeFile(staging, 'edited'); return {ok:true}; }, true);
  await saveMediaFile(b, async () => ({ok:false}), true);
  expect(await readFile(original, 'utf8')).toBe('original');
  expect(await readFile(a, 'utf8')).toBe('edited');
  expect((await readdir(directory)).length).toBe(2);
});
