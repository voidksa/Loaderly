import type { ToolInstallResult, ToolStatus } from './toolStatus';

export const toolPackageNames = ['yt-dlp', 'ffmpeg', 'deno', 'pytubefix'] as const;
export type ToolPackageName = typeof toolPackageNames[number];
export type ToolBatchKind = 'updates' | 'missing';
export type ToolBatchItem = { name: ToolPackageName; phase: 'queued' | 'running' | 'ready' | 'failed' | 'canceled'; message?: string };

export function toolPackageState(statuses: readonly ToolStatus[], name: ToolPackageName) {
  const status = statuses.find(item => item.name === name);
  const probe = name === 'ffmpeg' ? statuses.find(item => item.name === 'ffprobe') : undefined;
  const missing = Boolean(status && (!status.available || probe?.available === false));
  return {
    status, probe, missing,
    supported: status?.updateSupported === true && (name !== 'ffmpeg' || probe?.updateSupported === true),
    update: !missing && Boolean(status?.updateAvailable || probe?.updateAvailable)
  };
}

export function toolBatchCandidates(statuses: readonly ToolStatus[], kind: ToolBatchKind): ToolPackageName[] {
  return toolPackageNames.filter(name => {
    const state = toolPackageState(statuses, name);
    return state.supported && (kind === 'missing' ? state.missing : state.update);
  });
}

// Await each verified installation before starting the next. Failure belongs to
// that tool; cancellation stops the rest of this batch, including between tools.
export async function runToolSequence(names: readonly ToolPackageName[], install: (name: ToolPackageName) => Promise<ToolInstallResult>, options: {
  shouldStop: () => boolean;
  onItem: (item: ToolBatchItem, result?: ToolInstallResult) => void;
}): Promise<readonly ToolBatchItem[]> {
  const items: ToolBatchItem[] = [];
  for (const name of new Set(names)) {
    if (options.shouldStop()) {
      const item: ToolBatchItem = { name, phase: 'canceled' };
      items.push(item); options.onItem(item); continue;
    }
    options.onItem({ name, phase: 'running' });
    let result: ToolInstallResult;
    try { result = await install(name); }
    catch (error) { result = { ok: false, name, message: error instanceof Error ? error.message : undefined }; }
    const item: ToolBatchItem = { name, phase: result.ok ? 'ready' : options.shouldStop() ? 'canceled' : 'failed', message: result.message };
    items.push(item); options.onItem(item, result);
  }
  return items;
}
