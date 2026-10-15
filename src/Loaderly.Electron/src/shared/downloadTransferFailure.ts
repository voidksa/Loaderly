/** Only media-transfer refusals qualify for recovery, never access restrictions. */
export function mediaTransferFailure(error: unknown): 'direct' | 'fragment' | undefined {
  const record = error as { stderr?: unknown; message?: unknown } | undefined;
  const message = typeof error === 'string' ? error : `${record?.stderr ?? ''}\n${record?.message ?? ''}`;
  if (/cancel|abort|ENOSPC|EACCES|EPERM|permission|private video|sign in|login|log in|age.restrict|not available in your country|members.only|copyright|removed|HTTP Error (429|401)|confirm.*bot/i.test(message)) return undefined;
  if (/\[download\]\s+Got error:\s*HTTP Error 403\b/i.test(message)
    && /fragment \d+ not found, unable to continue/i.test(message)) return 'fragment';
  if (/unable to download (?:video|audio) data:[^\r\n]*HTTP Error 403\b/i.test(message)) return 'direct';
  return undefined;
}
