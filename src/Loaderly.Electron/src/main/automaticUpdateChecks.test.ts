import { afterEach, expect, it, vi } from 'vitest';
import { AutomaticUpdateChecks } from './automaticUpdateChecks';
import type { UpdateState } from '../shared/releases';

afterEach(() => { vi.useRealTimers(); });
function fixture() {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-10T10:00:00Z'));
  const updater = {
    state: { phase: 'idle', current: '2.1.1', automatic: true } as UpdateState,
    check: vi.fn(async () => {
      updater.state = { ...updater.state, phase: 'current', checkedAt: new Date().toISOString() };
      return updater.state;
    })
  };
  return { updater, scheduler: new AutomaticUpdateChecks(updater) };
}

it('finds a release published while the app stays open, within fifteen minutes', async () => {
  const { updater, scheduler } = fixture();
  scheduler.start();
  await vi.advanceTimersByTimeAsync(30_000);
  expect(updater.check).toHaveBeenCalledTimes(1);
  updater.check.mockImplementation(async () => updater.state = { ...updater.state, phase: 'available', version: '2.1.2', checkedAt: new Date().toISOString() });
  await vi.advanceTimersByTimeAsync(15 * 60_000 - 1);
  expect(updater.state.phase).toBe('current');
  await vi.advanceTimersByTimeAsync(1);
  expect(updater.state).toMatchObject({ phase: 'available', version: '2.1.2' });
  scheduler.stop();
});

it('checks after returning or waking, while rapid focus events and recent manual checks are throttled', async () => {
  const { updater, scheduler } = fixture();
  await scheduler.check();
  await vi.advanceTimersByTimeAsync(4 * 60_000);
  await scheduler.check();
  expect(updater.check).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(60_000);
  await Promise.all([scheduler.check(), scheduler.check(), scheduler.check()]);
  expect(updater.check).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(20 * 60_000);
  updater.state.checkedAt = new Date().toISOString(); // user just checked manually
  await scheduler.check();
  expect(updater.check).toHaveBeenCalledTimes(2);
});

it('retries a failed check after one minute and checks when automatic updates are re-enabled', async () => {
  const { updater, scheduler } = fixture();
  updater.check.mockImplementationOnce(async () => updater.state = { ...updater.state, phase: 'error' });
  await scheduler.check();
  await vi.advanceTimersByTimeAsync(59_999);
  await scheduler.check();
  expect(updater.check).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1);
  await scheduler.check();
  expect(updater.check).toHaveBeenCalledTimes(2);
  updater.state.automatic = false;
  await scheduler.check('enabled');
  expect(updater.check).toHaveBeenCalledTimes(2);
  updater.state.automatic = true;
  await scheduler.check('enabled');
  expect(updater.check).toHaveBeenCalledTimes(3);
});

it('respects disabled checking, Store distribution and active or downloaded updates', async () => {
  const { updater, scheduler } = fixture();
  updater.state.automatic = false;
  scheduler.start();
  await vi.advanceTimersByTimeAsync(16 * 60_000);
  updater.state.automatic = true;
  for (const phase of ['checking', 'downloading', 'ready'] as const) {
    updater.state.phase = phase;
    await scheduler.check('enabled');
  }
  updater.state.phase = 'idle';
  updater.state.distribution = 'store';
  await scheduler.check('enabled');
  expect(updater.check).not.toHaveBeenCalled();
  scheduler.stop();
  scheduler.start();
  expect(vi.getTimerCount()).toBe(0);
});
