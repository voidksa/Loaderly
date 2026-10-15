import { describe, expect, it, vi } from 'vitest';
import { runToolSequence, toolBatchCandidates, toolPackageState } from './toolBatch';
import type { ToolBatchItem, ToolPackageName } from './toolBatch';
import type { ToolStatus } from './toolStatus';

const installed = (name: string, changes: Partial<ToolStatus> = {}): ToolStatus => ({ name, available: true, updateSupported: true, updateAvailable: false, ...changes });
describe('tool batch selection', () => {
  it('counts the FFmpeg pair once and sends a missing probe to Install missing, not Update all', () => {
    const statuses = [installed('yt-dlp'), installed('ffmpeg', { updateAvailable: true }), installed('ffprobe', { available: false }), installed('deno', { updateAvailable: true })];
    expect(toolBatchCandidates(statuses, 'updates')).toEqual(['deno']);
    expect(toolBatchCandidates(statuses, 'missing')).toEqual(['ffmpeg']);
    const pair = [installed('ffmpeg', { updateAvailable: true }), installed('ffprobe', { updateAvailable: true })];
    expect(toolBatchCandidates(pair, 'updates')).toEqual(['ffmpeg']);
    expect(toolPackageState(pair, 'ffmpeg').supported).toBe(true);
  });
  it.each(['win32', 'darwin', 'linux'])('only queues tools supported by %s', platform => {
    const supported = platform === 'win32';
    const statuses = [installed('yt-dlp', { updateAvailable: true }), installed('ffmpeg', { updateAvailable: true, updateSupported: supported }), installed('ffprobe', { available: false, updateSupported: supported }), installed('deno', { available: false })];
    expect(toolBatchCandidates(statuses, 'updates')).toEqual(['yt-dlp']);
    expect(toolBatchCandidates(statuses, 'missing')).toEqual(supported ? ['ffmpeg', 'deno'] : ['deno']);
  });
  it('does not interpret unchecked or failed remote checks as updates', () => {
    expect(toolBatchCandidates([], 'missing')).toEqual([]);
    expect(toolBatchCandidates([installed('yt-dlp', { checkError: 'Offline', updateAvailable: undefined })], 'updates')).toEqual([]);
    expect(toolBatchCandidates([installed('deno', { available: false, checkError: 'Offline' })], 'missing')).toEqual(['deno']);
    expect(toolBatchCandidates([installed('ffmpeg', { updateAvailable: true })], 'updates')).toEqual([]);
  });
});

describe('sequential tool installation', () => {
  it('waits for each tool, deduplicates and continues after both returned and thrown failures', async () => {
    const calls: ToolPackageName[] = [], events: ToolBatchItem[] = [];
    let finish!: () => void;
    const first = new Promise<void>(resolve => { finish = resolve; });
    const install = vi.fn(async (name: ToolPackageName) => {
      calls.push(name);
      if (name === 'yt-dlp') { await first; return { ok: false, name, message: 'Offline' }; }
      if (name === 'ffmpeg') throw Error('Verification failed');
      return { ok: true, name };
    });
    const work = runToolSequence(['yt-dlp', 'ffmpeg', 'yt-dlp', 'deno'], install, { shouldStop: () => false, onItem: item => events.push(item) });
    await Promise.resolve(); expect(calls).toEqual(['yt-dlp']);
    finish();
    expect((await work).map(item => item.phase)).toEqual(['failed', 'failed', 'ready']);
    expect(calls).toEqual(['yt-dlp', 'ffmpeg', 'deno']);
    expect(events.map(item => item.phase)).toEqual(['running', 'failed', 'running', 'failed', 'running', 'ready']);
  });
  it('cancels the active failure and never starts the remaining tools', async () => {
    let stopped = false;
    const install = vi.fn(async (name: ToolPackageName) => { stopped = true; return { ok: false, name, message: 'Installation canceled.' }; });
    expect((await runToolSequence(['yt-dlp', 'deno'], install, { shouldStop: () => stopped, onItem: () => {} })).map(item => item.phase)).toEqual(['canceled', 'canceled']);
    expect(install).toHaveBeenCalledTimes(1);
  });
  it('keeps a completed activation successful when cancellation arrives between tools', async () => {
    let stopped = false;
    const install = vi.fn(async (name: ToolPackageName) => ({ ok: true, name }));
    const result = await runToolSequence(['ffmpeg', 'deno'], install, { shouldStop: () => stopped, onItem: item => { if (item.phase === 'ready') stopped = true; } });
    expect(result.map(item => item.phase)).toEqual(['ready', 'canceled']);
    expect(install).toHaveBeenCalledTimes(1);
  });
  it('can retry only failed items without reinstalling completed tools', async () => {
    const first = await runToolSequence(['yt-dlp', 'deno'], async name => ({ ok: name === 'deno', name }), { shouldStop: () => false, onItem: () => {} });
    const install = vi.fn(async (name: ToolPackageName) => ({ ok: true, name }));
    await runToolSequence(first.filter(item => item.phase === 'failed').map(item => item.name), install, { shouldStop: () => false, onItem: () => {} });
    expect(install.mock.calls).toEqual([['yt-dlp']]);
  });
});
