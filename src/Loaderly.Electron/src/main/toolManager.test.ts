import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ToolManager } from './toolManager';

vi.mock('node:child_process', () => ({
  execFile: (_path: string, _args: string[], _options: unknown, callback: (error: Error | null, value?: unknown) => void) => callback(null, { stdout: '2026.10.01\n', stderr: '' })
}));

const payload = Buffer.from('verified-test-binary');
const digest = createHash('sha256').update(payload).digest('hex');
const release = (sha = digest, url = 'https://github.com/yt-dlp/yt-dlp/releases/download/2026.10.01/yt-dlp.exe') => ({
  tag_name: '2026.10.01', assets: [{ name: 'yt-dlp.exe', browser_download_url: url, digest: `sha256:${sha}` }]
});
let root: string;
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'loaderly-tool-test-')); });
afterEach(async () => { vi.unstubAllGlobals(); await rm(root, { recursive: true, force: true }); });

describe('managed tool installation', () => {
  it('preserves local availability when release checks fail', async () => {
    const installed = join(root, 'bundled.exe');
    await writeFile(installed, 'existing');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Offline')));
    const manager = new ToolManager(root, () => installed);
    expect(await manager.check('yt-dlp')).toMatchObject({ available: true, checkError: 'Offline' });
  });
  it('installs a missing tool and resolves the verified managed executable', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => url.includes('api.github.com') ? Response.json(release()) : new Response(payload)));
    const manager = new ToolManager(root, () => undefined);
    expect(await manager.install('yt-dlp')).toMatchObject({ ok: true, status: { available: true, updateAvailable: false } });
    expect(await readFile(manager.resolve('yt-dlp')!)).toEqual(payload);
    expect(new ToolManager(root, () => undefined).resolve('yt-dlp')).toBe(manager.resolve('yt-dlp'));
  });
  it('keeps the previous executable on checksum failure', async () => {
    const installed = join(root, 'bundled.exe');
    await writeFile(installed, 'original');
    vi.stubGlobal('fetch', vi.fn(async (url: string) => url.includes('api.github.com') ? Response.json(release('0'.repeat(64))) : new Response(payload)));
    const manager = new ToolManager(root, () => installed);
    expect(await manager.install('yt-dlp')).toMatchObject({ ok: false, message: expect.stringContaining('checksum') });
    expect(manager.resolve('yt-dlp')).toBe(installed);
    expect(await readFile(installed, 'utf8')).toBe('original');
  });
  it('rejects untrusted assets and unknown tool names before downloading', async () => {
    const fetchMock = vi.fn(async () => Response.json(release(digest, 'https://example.com/yt-dlp.exe')));
    vi.stubGlobal('fetch', fetchMock);
    const manager = new ToolManager(root, () => undefined);
    expect((await manager.install('../bad')).ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect((await manager.install('yt-dlp')).ok).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('serializes installation and keeps a missing tool missing on network failure', async () => {
    let rejectFetch!: (error: Error) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise((_resolve, reject) => { rejectFetch = reject; })));
    const manager = new ToolManager(root, () => undefined);
    const pending = manager.install('yt-dlp');
    expect(await manager.install('ffmpeg')).toMatchObject({ ok: false, message: expect.stringContaining('in progress') });
    rejectFetch(new Error('Offline'));
    expect((await pending).ok).toBe(false);
    expect(manager.resolve('yt-dlp')).toBeUndefined();
  });
});
