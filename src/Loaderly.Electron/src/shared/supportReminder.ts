export const supportReminderStorageKey = 'loaderly:support-reminder:v1';
export const supportUseBeforeReminderMs = 20 * 60 * 1000;
export const supportReminderIntervalMs = 30 * 24 * 60 * 60 * 1000;
export const supportIdleAfterMs = 60 * 1000;

export type SupportReminderState = {
  readonly activeMs: number;
  readonly lastShownAt?: number;
  readonly neverAgain: boolean;
};

export function normalizeSupportReminder(value: unknown): SupportReminderState {
  const stored = value && typeof value === 'object' ? value as Partial<SupportReminderState> : {};
  return {
    activeMs: typeof stored.activeMs === 'number' && Number.isFinite(stored.activeMs) ? Math.min(supportUseBeforeReminderMs, Math.max(0, stored.activeMs)) : 0,
    lastShownAt: typeof stored.lastShownAt === 'number' && Number.isFinite(stored.lastShownAt) && stored.lastShownAt > 0 ? stored.lastShownAt : undefined,
    neverAgain: stored.neverAgain === true
  };
}

export function accumulateSupportUse(state: SupportReminderState, elapsedMs: number, active: boolean): SupportReminderState {
  // Sampling gaps caused by sleep or a suspended renderer are not time spent using Loaderly.
  if (!active || state.neverAgain || !Number.isFinite(elapsedMs) || elapsedMs <= 0 || elapsedMs > 10_000 || state.activeMs >= supportUseBeforeReminderMs) return state;
  return { ...state, activeMs: Math.min(supportUseBeforeReminderMs, state.activeMs + elapsedMs) };
}

export function canShowSupportReminder(state: SupportReminderState, now: number, active: boolean, blocked: boolean): boolean {
  return active && !blocked && !state.neverAgain && state.activeMs >= supportUseBeforeReminderMs && Number.isFinite(now)
    && (state.lastShownAt === undefined || now - state.lastShownAt >= supportReminderIntervalMs);
}

export function recordSupportReminder(state: SupportReminderState, now: number): SupportReminderState {
  return { ...state, lastShownAt: now };
}

export function supportUrl(ar: boolean): string {
  return ar ? 'https://creators.sa/ar/voidksa' : 'https://creators.sa/en/voidksa';
}
