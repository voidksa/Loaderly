/** Hiding download history must never remove a library item or its file. */
export type DownloadHistoryRow = { id: number; status: string; sourceType?: string; downloadHidden?: boolean };

export function isDownloadHistoryRow(row: DownloadHistoryRow): boolean {
  return row.sourceType !== 'local' && row.downloadHidden !== true;
}

export function canRemoveDownloadHistory(row: DownloadHistoryRow, busyIds: readonly number[] = []): boolean {
  return isDownloadHistoryRow(row) && ['ready', 'edited', 'failed'].includes(row.status) && !busyIds.includes(row.id);
}

export function hideDownloadHistory<T extends DownloadHistoryRow>(rows: readonly T[], ids: readonly number[], busyIds: readonly number[] = []): readonly (T & { downloadHidden?: boolean })[] {
  const selected = new Set(ids);
  return rows.map(row => selected.has(row.id) && canRemoveDownloadHistory(row, busyIds) ? { ...row, downloadHidden: true } : row);
}

export function restoreDownloadHistory<T extends DownloadHistoryRow>(rows: readonly T[], ids: readonly number[]): readonly (T & { downloadHidden?: boolean })[] {
  const selected = new Set(ids);
  return rows.map(row => selected.has(row.id) && row.downloadHidden ? { ...row, downloadHidden: false } : row);
}
