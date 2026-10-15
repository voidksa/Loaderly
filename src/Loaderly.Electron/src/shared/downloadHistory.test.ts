import { describe, expect, it } from 'vitest';
import { canRemoveDownloadHistory, hideDownloadHistory, isDownloadHistoryRow, restoreDownloadHistory } from './downloadHistory';

describe('download history removal', () => {
  const rows = ['ready', 'edited', 'failed', 'queued', 'downloading'].map((status, id) => ({ id, status, sourceType: 'download', filePath: `clip-${id}.mp4`, originalPath: `original-${id}.mp4`, source: `https://example.com/${id}` }));
  it('keeps every file, original, source and library record while hiding only finished entries', () => {
    const hidden = hideDownloadHistory(rows, rows.map(row => row.id));
    expect(hidden).toHaveLength(rows.length);
    expect(hidden.filter(isDownloadHistoryRow).map(row => row.id)).toEqual([3, 4]);
    expect(hidden.map(({ downloadHidden, ...row }) => row)).toEqual(rows);
    expect(rows.every(row => isDownloadHistoryRow(row))).toBe(true);
  });
  it('protects local items, queued jobs and jobs that resumed after selection', () => {
    expect(canRemoveDownloadHistory({ id: 7, status: 'ready', sourceType: 'local' })).toBe(false);
    expect(hideDownloadHistory(rows, [0, 3, 4], [0])).toEqual(rows);
    expect(hideDownloadHistory([{ ...rows[0], status: 'downloading' }], [0])[0].downloadHidden).toBeUndefined();
  });
  it('limits removal to the requested IDs and restores only the last removed group', () => {
    const hidden = hideDownloadHistory(hideDownloadHistory(rows, [0]), [1, 2, 999]);
    const restored = restoreDownloadHistory(hidden, [1, 2]);
    expect(restored.filter(isDownloadHistoryRow).map(row => row.id)).toEqual([1, 2, 3, 4]);
    expect(restored[0].downloadHidden).toBe(true);
  });
  it('round trips history visibility without changing source type or library eligibility', () => {
    const hidden = JSON.parse(JSON.stringify(hideDownloadHistory(rows, [0])));
    expect(isDownloadHistoryRow(hidden[0])).toBe(false);
    expect(hidden[0].sourceType).toBe('download');
    expect(hidden[0].status).toBe('ready');
    expect(isDownloadHistoryRow({ ...rows[0], downloadHidden: false })).toBe(true);
  });
});
