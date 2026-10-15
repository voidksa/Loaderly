import { expect, it, vi } from 'vitest';
import { retryMediaTransfer } from './downloadRetry';
import { friendlyDownloadError } from '../shared/download-recovery/downloadErrorMessage';

const forbidden = Object.assign(new Error('process failed'), { stderr: 'ERROR: unable to download video data: HTTP Error 403: Forbidden' });
const fragmentForbidden = new Error('ERROR: \r[download] Got error: HTTP Error 403: Forbidden. Giving up after 1 retries\nERROR: fragment 1 not found, unable to continue');
it('switches refused fragmented media to one direct transfer attempt', async () => {
  const run = vi.fn().mockRejectedValueOnce(fragmentForbidden).mockResolvedValue({ stdout: 'saved.mp3' });
  expect(await retryMediaTransfer(run, async () => {})).toEqual({ stdout: 'saved.mp3' });
  expect(run.mock.calls).toEqual([[], ['direct']]);
});
it('does not loop when the direct recovery also fails', async () => {
  const run = vi.fn().mockRejectedValueOnce(fragmentForbidden).mockRejectedValueOnce(forbidden);
  await expect(retryMediaTransfer(run, async () => {})).rejects.toBe(forbidden);
  expect(run.mock.calls).toEqual([[], ['direct']]);
});
it.each(['Sign in to confirm you are not a bot', 'HTTP Error 429', 'TASK_CANCELED', 'Private video', 'EACCES permission denied'])('preserves restrictions and cancellation even with a fragment refusal: %s', async reason => {
  const error = new Error(`${fragmentForbidden.message}\n${reason}`);
  const run = vi.fn().mockRejectedValue(error);
  await expect(retryMediaTransfer(run, async () => {})).rejects.toBe(error);
  expect(run).toHaveBeenCalledTimes(1);
});
it('does not reinterpret a missing fragment without a 403 as a refused transfer', async () => {
  const error = new Error('ERROR: [download] Got error: HTTP Error 404: Not Found\nERROR: fragment 1 not found, unable to continue');
  const run = vi.fn().mockRejectedValue(error);
  await expect(retryMediaTransfer(run, async () => {})).rejects.toBe(error);
  expect(run).toHaveBeenCalledTimes(1);
});
it('starts a fresh request once for a media-transfer 403', async () => {
  const run = vi.fn().mockRejectedValueOnce(forbidden).mockResolvedValue({ stdout: 'saved.mp3' });
  const wait = vi.fn().mockResolvedValue(undefined);
  expect(await retryMediaTransfer(run, wait)).toEqual({ stdout: 'saved.mp3' });
  expect(run).toHaveBeenCalledTimes(2);
  expect(wait).toHaveBeenCalledTimes(1);
});
it('stops after the second refusal', async () => {
  const run = vi.fn().mockRejectedValue(forbidden);
  await expect(retryMediaTransfer(run, async () => {})).rejects.toBe(forbidden);
  expect(run).toHaveBeenCalledTimes(2);
});
it.each(['HTTP Error 403: Forbidden', 'Private video. Sign in', 'HTTP Error 429: Too Many Requests', 'EACCES: mkdir /Volumes/Drive'])('does not repeat unrelated or restricted requests: %s', async message => {
  const run = vi.fn().mockRejectedValue(new Error(message)), wait = vi.fn();
  await expect(retryMediaTransfer(run, wait)).rejects.toThrow(message);
  expect(run).toHaveBeenCalledTimes(1);
  expect(wait).not.toHaveBeenCalled();
});
it.each(['en', 'ar'] as const)('explains a refused request and hides unexpected process details in %s', locale => {
  expect(friendlyDownloadError(forbidden.stderr, locale)).toMatch(locale === 'en' ? /site refused/ : /رفض الموقع/);
  for (const text of [forbidden.stderr, 'Error invoking remote method loaderly:download-url: spawn /private/tools/yt-dlp EACCES']) {
    expect(friendlyDownloadError(text, locale)).not.toMatch(/403|ERROR:|loaderly:|EACCES|\/private/);
  }
  expect(friendlyDownloadError('Could not extract video metadata', locale)).not.toMatch(/TikTok/);
});
