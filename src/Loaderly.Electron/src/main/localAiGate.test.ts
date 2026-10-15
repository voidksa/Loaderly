import { expect, it } from 'vitest';
import { LocalAiGate } from './localAiGate';
it('serializes editor and download jobs, including cancellation of a queued waiter', async () => {
  const gate = new LocalAiGate(), events: string[] = [];
  let release!: () => void;
  const first = gate.run(async () => { events.push('first'); await new Promise<void>(resolve => release = resolve); events.push('first-end'); });
  await Promise.resolve(); await Promise.resolve();
  const controller = new AbortController();
  const canceled = gate.run(async () => { events.push('canceled'); }, controller.signal).catch(error => error.message);
  const last = gate.run(async () => { events.push('last'); });
  controller.abort(); expect(await canceled).toBe('TASK_CANCELED'); expect(events).toEqual(['first']);
  release(); await Promise.all([first, last]); expect(events).toEqual(['first', 'first-end', 'last']);
});
