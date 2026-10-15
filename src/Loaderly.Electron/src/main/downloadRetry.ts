import { setTimeout as delay } from 'node:timers/promises';
import { mediaTransferFailure } from '../shared/downloadTransferFailure';

/** Refresh URLs once, using direct HTTP if YouTube refused synthetic DASH fragments. */
export async function retryMediaTransfer<T>(attempt: (recovery?: 'direct') => Promise<T>, wait: () => Promise<unknown> = () => delay(1500)): Promise<T> {
  try { return await attempt(); }
  catch (error) {
    const failure = mediaTransferFailure(error);
    if (!failure) throw error;
    await wait();
    return failure === 'fragment' ? attempt('direct') : attempt();
  }
}
