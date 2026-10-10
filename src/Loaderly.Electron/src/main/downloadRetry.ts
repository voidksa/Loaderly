import { setTimeout as delay } from 'node:timers/promises';

/** Refresh media URLs once after a media-transfer 403, without retrying access restrictions. */
export async function retryMediaTransfer<T>(attempt: () => Promise<T>, wait: () => Promise<unknown> = () => delay(1500)): Promise<T> {
  try { return await attempt(); }
  catch (error) {
    const record = error as { stderr?: unknown; message?: unknown } | undefined;
    const message = String(record?.stderr || record?.message || '');
    if (!/unable to download (?:video|audio) data:[^\r\n]*HTTP Error 403\b/i.test(message)) throw error;
    await wait();
    return attempt();
  }
}
