export type DownloadControls = { concurrency: number; rateKib: number };
export type DownloadQueueEntry = { id: number; phase: 'queued' | import('./downloadProgress').DownloadProgress['phase']; scheduledAt?: number };
export type DownloadControlRequest = { action: 'state'|'configure'|'pause'|'move'; id?: number; direction?: -1|1; settings?: DownloadControls };
export type DownloadControlState = { settings: DownloadControls; entries: DownloadQueueEntry[] };
export function normalizeDownloadControls(value?: Partial<DownloadControls>): DownloadControls {
  return { concurrency: Math.round(Math.max(1, Math.min(6, Number(value?.concurrency) || 2))), rateKib: Math.round(Math.max(0, Math.min(1048576, Number(value?.rateKib) || 0))) };
}
