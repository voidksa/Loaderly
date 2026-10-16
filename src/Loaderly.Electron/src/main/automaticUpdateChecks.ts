import type { UpdateState } from '../shared/releases';

type Updater = { state: UpdateState; check: () => Promise<UpdateState> };
type CheckReason = 'startup' | 'interval' | 'activity' | 'enabled';

export class AutomaticUpdateChecks {
  private startup?: ReturnType<typeof setTimeout>;
  private heartbeat?: ReturnType<typeof setInterval>;
  private lastAttempt?: number;
  private checking = false;

  constructor(private updater: Updater) {}

  start() {
    if (this.heartbeat) return;
    this.startup = setTimeout(() => void this.check('startup'), this.updater.state.distribution === 'store' ? 5_000 : 30_000);
    this.heartbeat = setInterval(() => void this.check('interval'), 30_000);
    this.startup.unref();
    this.heartbeat.unref();
  }

  stop() {
    clearTimeout(this.startup);
    clearInterval(this.heartbeat);
    this.startup = undefined;
    this.heartbeat = undefined;
  }

  async check(reason: CheckReason = 'activity') {
    const state = this.updater.state;
    if (!state.automatic || this.checking ||
        ['checking', 'downloading', 'ready', 'installing', 'installed'].includes(state.phase)) return;
    // Manual checks also count, so switching windows never floods the service.
    const checkedAt = state.checkedAt ? Date.parse(state.checkedAt) : NaN;
    const last = Math.max(this.lastAttempt ?? -Infinity, Number.isFinite(checkedAt) ? checkedAt : -Infinity);
    const interval = state.distribution === 'store' ? (reason==='startup'?30:180)*60_000 : state.phase === 'error' ? 60_000 : reason === 'activity' ? 5 * 60_000 : 15 * 60_000;
    if (reason !== 'enabled' && Date.now() - last < interval) return;
    this.lastAttempt = Date.now();
    this.checking = true;
    try { await this.updater.check(); }
    finally { this.checking = false; }
  }
}
