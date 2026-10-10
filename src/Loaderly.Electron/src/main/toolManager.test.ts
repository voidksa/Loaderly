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
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllGlobals(); await rm(root, { recursive: true, force: true }); });

describe('managed tool installation', () => {
  it('coalesces repeated checks, backs off network failures, and retries after a minute', async () => {
    let now = 100_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    vi.stubGlobal('fetch', fetchMock);
    const manager = new ToolManager(root, () => 'bundled', { platform: 'win32', arch: 'x64' });
    const statuses = await Promise.all(Array.from({ length: 20 }, () => manager.check('yt-dlp')));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(statuses[0]).toMatchObject({ available: true, checkError: expect.stringContaining('Check your connection') });
    now += 31_000;
    await manager.check('yt-dlp');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    now += 31_000;
    fetchMock.mockResolvedValue(Response.json(release()));
    expect(await manager.check('yt-dlp')).toMatchObject({ available: true, latestVersion: '2026.10.01', updateAvailable: false });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('distinguishes service rate limits from timeouts', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 403, headers: { 'x-ratelimit-remaining': '0' } })));
    expect(await new ToolManager(root, () => undefined).check('yt-dlp')).toMatchObject({ checkError: expect.stringContaining('limited requests') });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('timeout', 'TimeoutError')));
    expect(await new ToolManager(root, () => undefined).check('yt-dlp')).toMatchObject({ checkError: expect.stringContaining('too long') });
  });
  it('reports download progress, cancels a stalled stream, and permits a fresh installation', async () => {
    const progress: unknown[] = [];
    let streamStarted!: () => void;
    const started = new Promise<void>(resolve => { streamStarted = resolve; });
    vi.stubGlobal('fetch', vi.fn(async (url: string, options?: RequestInit) => {
      if (url.includes('api.github.com')) return Response.json(release());
      return new Response(new ReadableStream({ start(controller) {
        controller.enqueue(payload.subarray(0, 4));
        options?.signal?.addEventListener('abort', () => controller.error(options.signal?.reason), { once: true });
        streamStarted();
      } }));
    }));
    const manager = new ToolManager(root, () => undefined, { platform: 'win32', arch: 'x64' });
    const pending = manager.install('yt-dlp', value => progress.push(value));
    await started;
    manager.cancel();
    expect(await pending).toMatchObject({ ok: false, message: expect.stringContaining('canceled') });
    expect(manager.resolve('yt-dlp')).toBeUndefined();
    expect(progress).toContainEqual({ name: 'yt-dlp', phase: 'downloading', received: 0 });
    vi.stubGlobal('fetch', vi.fn(async (url: string) => url.includes('api.github.com') ? Response.json(release()) : new Response(payload)));
    expect(await manager.install('yt-dlp')).toMatchObject({ ok: true });
  });
  it.each([
    { platform: 'darwin' as const, arch: 'arm64', asset: 'yt-dlp_macos' },
    { platform: 'darwin' as const, arch: 'x64', asset: 'yt-dlp_macos' },
    { platform: 'linux' as const, arch: 'x64', asset: 'yt-dlp_linux' },
    { platform: 'linux' as const, arch: 'arm64', asset: 'yt-dlp_linux_aarch64' }
  ])('installs the executable for $platform/$arch', async target => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => url.includes('api.github.com') ? Response.json({
      tag_name: '2026.10.01', assets: [{ name: target.asset, digest: `sha256:${digest}`, browser_download_url: `https://github.com/yt-dlp/yt-dlp/releases/download/2026.10.01/${target.asset}` }]
    }) : new Response(payload)));
    const manager = new ToolManager(root, () => undefined, target);
    expect(await manager.install('yt-dlp')).toMatchObject({ ok: true, status: { available: true, updateSupported: true } });
    expect(manager.resolve('yt-dlp')).toMatch(/[\\/]yt-dlp$/);
    expect(await readFile(manager.resolve('yt-dlp')!)).toEqual(payload);
  });
  it('keeps the tested bundled FFmpeg pair and does not fetch a generic preview replacement', async () => {
    const installed = join(root, 'ffmpeg');
    await writeFile(installed, 'bundled');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const manager = new ToolManager(root, () => installed, { platform: 'darwin', arch: 'arm64' });
    expect(await manager.check('ffmpeg')).toMatchObject({ available: true, updateSupported: false });
    expect(await manager.install('ffmpeg')).toMatchObject({ ok: false, message: expect.stringContaining('desktop preview') });
    expect(manager.resolve('ffmpeg')).toBe(installed);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('preserves local availability when release checks fail', async () => {
    const installed = join(root, 'bundled.exe');
    await writeFile(installed, 'existing');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Offline')));
    const manager = new ToolManager(root, () => installed);
    expect(await manager.check('yt-dlp')).toMatchObject({ available: true, checkError: 'Offline' });
  });
  it('installs a missing tool and resolves the verified managed executable', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => url.includes('api.github.com') ? Response.json(release()) : new Response(payload)));
    const manager = new ToolManager(root, () => undefined, { platform: 'win32', arch: 'x64' });
    expect(await manager.install('yt-dlp')).toMatchObject({ ok: true, status: { available: true, updateAvailable: false } });
    expect(await readFile(manager.resolve('yt-dlp')!)).toEqual(payload);
    expect(new ToolManager(root, () => undefined, { platform: 'win32', arch: 'x64' }).resolve('yt-dlp')).toBe(manager.resolve('yt-dlp'));
  });
  it('keeps the previous executable on checksum failure', async () => {
    const installed = join(root, 'bundled.exe');
    await writeFile(installed, 'original');
    vi.stubGlobal('fetch', vi.fn(async (url: string) => url.includes('api.github.com') ? Response.json(release('0'.repeat(64))) : new Response(payload)));
    const manager = new ToolManager(root, () => installed, { platform: 'win32', arch: 'x64' });
    expect(await manager.install('yt-dlp')).toMatchObject({ ok: false, message: expect.stringContaining('checksum') });
    expect(manager.resolve('yt-dlp')).toBe(installed);
    expect(await readFile(installed, 'utf8')).toBe('original');
  });
  it('rejects untrusted assets and unknown tool names before downloading', async () => {
    const fetchMock = vi.fn(async () => Response.json(release(digest, 'https://example.com/yt-dlp.exe')));
    vi.stubGlobal('fetch', fetchMock);
    const manager = new ToolManager(root, () => undefined, { platform: 'win32', arch: 'x64' });
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
