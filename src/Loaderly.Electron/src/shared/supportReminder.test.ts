import { describe, expect, it } from 'vitest';
import { accumulateSupportUse, canShowSupportReminder, normalizeSupportReminder, recordSupportReminder, supportReminderIntervalMs, supportUseBeforeReminderMs, type SupportReminderState } from './supportReminder';

describe('support reminder schedule', () => {
  const now = Date.UTC(2026, 9, 11);
  const ready: SupportReminderState = { activeMs: supportUseBeforeReminderMs, neverAgain: false };

  it('waits for twenty accumulated active minutes across launches', () => {
    let state = normalizeSupportReminder(undefined);
    for (let tick = 0; tick < 120; tick++) state = accumulateSupportUse(state, 5_000, true);
    state = normalizeSupportReminder(JSON.parse(JSON.stringify(state)));
    for (let tick = 0; tick < 119; tick++) state = accumulateSupportUse(state, 5_000, true);
    expect(canShowSupportReminder(state, now, true, false)).toBe(false);
    state = accumulateSupportUse(state, 5_000, true);
    expect(canShowSupportReminder(state, now, true, false)).toBe(true);
  });

  it('does not count background, idle, clock anomalies, or suspended time', () => {
    const state = normalizeSupportReminder(undefined);
    for (const elapsed of [-1, 0, NaN, Infinity, 60_000, 86_400_000]) expect(accumulateSupportUse(state, elapsed, true)).toBe(state);
    expect(accumulateSupportUse(state, 5_000, false)).toBe(state);
    expect(canShowSupportReminder(ready, now, false, false)).toBe(false);
  });

  it('defers while a download, export, dialog, or higher priority notice is active without spending the reminder', () => {
    expect(canShowSupportReminder(ready, now, true, true)).toBe(false);
    expect(ready.lastShownAt).toBeUndefined();
    expect(canShowSupportReminder(ready, now, true, false)).toBe(true);
  });

  it('does not repeat after dismissal or relaunch until the thirty-day boundary', () => {
    const state = normalizeSupportReminder(JSON.parse(JSON.stringify(recordSupportReminder(ready, now))));
    expect(canShowSupportReminder(state, now + 1, true, false)).toBe(false);
    expect(canShowSupportReminder(state, now + supportReminderIntervalMs - 1, true, false)).toBe(false);
    expect(canShowSupportReminder(state, now + supportReminderIntervalMs, true, false)).toBe(true);
  });

  it('never repeats after opting out, even after a later launch or build', () => {
    const state = normalizeSupportReminder(JSON.parse(JSON.stringify({ ...ready, neverAgain: true })));
    expect(canShowSupportReminder(state, now + 10 * supportReminderIntervalMs, true, false)).toBe(false);
    expect(accumulateSupportUse(state, 5_000, true)).toBe(state);
  });

  it('does not speed up reminders when the system clock moves backwards', () => {
    expect(canShowSupportReminder(recordSupportReminder(ready, now), now - supportReminderIntervalMs, true, false)).toBe(false);
  });

  it('normalizes invalid storage conservatively and bounds accumulated use', () => {
    expect(normalizeSupportReminder({ activeMs: Infinity, lastShownAt: -1, neverAgain: 'yes' })).toEqual({ activeMs: 0, lastShownAt: undefined, neverAgain: false });
    expect(normalizeSupportReminder({ activeMs: -12 }).activeMs).toBe(0);
    expect(normalizeSupportReminder({ activeMs: Number.MAX_SAFE_INTEGER }).activeMs).toBe(supportUseBeforeReminderMs);
  });
});
