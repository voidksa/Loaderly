import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdir, open, stat, unlink } from 'node:fs/promises';
import { prepareDownloadDirectory } from './downloadDirectory';
import { downloadFolderMessage, downloadFolderProblem } from '../shared/download-destination/downloadFolderError';

vi.mock('node:fs/promises', () => ({ mkdir: vi.fn(), stat: vi.fn(), open: vi.fn(), unlink: vi.fn() }));
const handle = { writeFile: vi.fn(), close: vi.fn() };
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(mkdir).mockResolvedValue(undefined);
  vi.mocked(stat).mockResolvedValue({ isDirectory: () => true } as Awaited<ReturnType<typeof stat>>);
  vi.mocked(open).mockResolvedValue(handle as unknown as Awaited<ReturnType<typeof open>>);
});
describe('download destination recovery', () => {
  it('does not create a replacement directory for a disconnected Mac drive', async () => {
    vi.mocked(stat).mockRejectedValue(Object.assign(new Error('private volume path'), { code: 'ENOENT' }));
    expect(await prepareDownloadDirectory('/Volumes/Travel drive/Clips/YouTube', 'darwin')).toBe('DOWNLOAD_FOLDER_UNAVAILABLE');
    expect(stat).toHaveBeenCalledWith('/Volumes/Travel drive');
    expect(mkdir).not.toHaveBeenCalled();
  });
  it('creates the chosen destination on a connected drive', async () => {
    vi.mocked(stat).mockResolvedValue({ isDirectory: () => true } as Awaited<ReturnType<typeof stat>>);
    expect(await prepareDownloadDirectory('/Volumes/Travel drive/Clips/YouTube', 'darwin')).toBeUndefined();
    expect(mkdir).toHaveBeenCalledWith('/Volumes/Travel drive/Clips/YouTube', { recursive: true });
  });
  it.each([['EACCES','permission'],['EPERM','permission'],['EROFS','readonly'],['ENOSPC','full'],['EDQUOT','full'],['ENODEV','unavailable']])('explains %s without exposing system details', async (code, problem) => {
    vi.mocked(mkdir).mockRejectedValue(Object.assign(new Error('private disk path'), { code }));
    const result = await prepareDownloadDirectory('/home/person/Downloads', 'linux');
    expect(downloadFolderProblem(result!)).toBe(problem);
    expect(result).not.toContain('private');
  });
  it('translates saved errors from old releases and keeps unrelated errors separate', () => {
    const legacy = "Error invoking remote method 'loaderly:download-url': Error: EACCES: permission denied, mkdir '/Volumes/Private drive'";
    expect(downloadFolderProblem(legacy)).toBe('permission');
    for (const ar of [false, true]) expect(downloadFolderMessage('permission', ar)).not.toMatch(/EACCES|Volumes|loaderly:|Private/);
    expect(downloadFolderProblem('HTTP 429: Too Many Requests')).toBeUndefined();
    expect(downloadFolderProblem('spawn /private/tools/yt-dlp EACCES')).toBeUndefined();
  });
  it('does not confuse an existing but unwritable folder with a disconnected disk', async () => {
    vi.mocked(open).mockRejectedValue(Object.assign(new Error('private folder'), { code: 'EACCES' }));
    expect(await prepareDownloadDirectory('/Volumes/Travel/Clips', 'darwin', false)).toBe('DOWNLOAD_FOLDER_PERMISSION');
    expect(mkdir).not.toHaveBeenCalled();
    expect(unlink).not.toHaveBeenCalled();
  });
  it('checks actual writing and cleans up its own probe even if the drive becomes full', async () => {
    handle.writeFile.mockRejectedValue(Object.assign(new Error('full'), { code: 'ENOSPC' }));
    expect(await prepareDownloadDirectory('/tmp/chosen', 'linux', false)).toBe('DOWNLOAD_FOLDER_FULL');
    expect(open).toHaveBeenCalledWith(expect.stringContaining('.loaderly-access-'), 'wx');
    expect(handle.close).toHaveBeenCalled();
    expect(unlink).toHaveBeenCalledWith(vi.mocked(open).mock.calls[0][0]);
  });
  it('does not recreate a missing saved folder when checking it', async () => {
    vi.mocked(stat).mockRejectedValue(Object.assign(new Error('gone'), { code: 'ENOENT' }));
    expect(await prepareDownloadDirectory('/tmp/gone', 'linux', false)).toBe('DOWNLOAD_FOLDER_UNAVAILABLE');
    expect(mkdir).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });
});
