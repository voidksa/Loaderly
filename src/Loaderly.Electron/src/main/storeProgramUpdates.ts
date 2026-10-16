import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { atomicJson } from './studioFiles';
import type { UpdateState } from '../shared/releases';
import type { StoreUpdateBackend } from './windowsStoreUpdates';

const hour = 60 * 60_000;
export class StoreProgramUpdates {
  state: UpdateState;
  private attempts: number[] = [];
  private operation = false;
  private writes: Promise<void> = Promise.resolve();
  constructor(private directory: string, version: string, private backend: StoreUpdateBackend, private notify: (state: UpdateState) => void, private busy: () => boolean) {
    this.state = {phase:'idle',current:version,automatic:true,distribution:'store'};
  }
  private emit(patch: Partial<UpdateState>) { this.state = {...this.state,...patch}; this.notify(this.state); return this.state; }
  async initialize() {
    try {
      const p = JSON.parse(await readFile(join(this.directory,'store-preferences.json'),'utf8'));
      this.state.automatic = p.automatic !== false;
      this.state.snoozedUntil = Number.isFinite(p.snoozedUntil) ? p.snoozedUntil : undefined;
      this.attempts = Array.isArray(p.attempts) ? p.attempts.filter((n:unknown) => typeof n === 'number' && n <= Date.now() && n > Date.now()-24*hour).slice(-10) : [];
      if (p.current === this.state.current && ['current','available'].includes(p.checkedPhase) && Number.isFinite(Date.parse(p.checkedAt))) {
        this.state.checkedAt = p.checkedAt;
        // Availability is revalidated at startup; cached current must never mask a failed check.
        this.state.phase = p.checkedPhase;
      }
    } catch { /* First run or unreadable preferences: ask the Store again. */ }
    return this.state;
  }
  private save() {
    const p = {automatic:this.state.automatic,snoozedUntil:this.state.snoozedUntil,attempts:this.attempts,current:this.state.current,
      checkedAt:this.state.checkedAt,checkedPhase:['current','available'].includes(this.state.phase)?this.state.phase:undefined};
    const write = this.writes.then(() => atomicJson(join(this.directory,'store-preferences.json'),p));
    this.writes = write.catch(() => {}); return write;
  }
  async preferences(automatic: boolean) { this.emit({automatic}); await this.save(); return this.state; }
  async snooze() { this.emit({snoozedUntil:Date.now()+24*hour}); await this.save(); return this.state; }
  async acknowledgeStartup() { /* Store owns installation and package verification. */ }
  cancel() { /* Do not pretend killing a helper cancels a Store-managed download. */ }
  async check() {
    if (this.operation || ['downloading','ready','installing','installed'].includes(this.state.phase)) return this.state;
    const now = Date.now(); this.attempts = this.attempts.filter(n => n > now-24*hour);
    // Store checks are cached by Windows: at most once per 30 minutes / ten per day.
    // Persist this limit so reopening or clicking Check repeatedly cannot flood it.
    if (this.attempts.length >= 10 || now-(this.attempts.at(-1)??-Infinity) < 30*60_000) return this.state;
    this.operation = true; this.attempts.push(now);
    this.emit({phase:'checking',storeIssue:undefined});
    try {
      await this.save();
      const result = await this.backend.run('check');
      if (!['current','available'].includes(result)) throw Error('INVALID_CHECK_RESULT');
      this.emit({phase:result as 'current'|'available',checkedAt:new Date().toISOString(),storeIssue:undefined});
      await this.save();
    } catch { this.emit({phase:'error',storeIssue:'check'}); }
    finally { this.operation = false; }
    return this.state;
  }
  async download() {
    if(this.operation || this.state.phase !== 'available') return this.state;
    this.operation = true; this.emit({phase:'downloading',progress:0,storeIssue:undefined,snoozedUntil:undefined});
    try {
      const result = await this.backend.run('download', progress => this.emit({progress}));
      if(result === 'completed') this.emit({phase:'ready',progress:100});
      else if(result === 'current') this.emit({phase:'current',checkedAt:new Date().toISOString()});
      else this.emit({phase:'available',storeIssue:result === 'canceled'?'canceled':'download'});
      await this.save();
    } catch { this.emit({phase:'available',storeIssue:'download'}); }
    finally { this.operation = false; }
    return this.state;
  }
  async install() {
    if(this.operation || this.state.phase !== 'ready') return this.state;
    if(this.busy()) return this.emit({storeIssue:'busy'});
    this.operation = true; this.emit({phase:'installing',storeIssue:undefined});
    try {
      const result = await this.backend.run('install');
      // Windows normally terminates the old package during installation. Never quit
      // preemptively: cancellation or a Store failure must leave the editor open.
      if(result === 'completed') this.emit({phase:'installed'});
      else if(result === 'current') this.emit({phase:'current',checkedAt:new Date().toISOString()});
      else this.emit({phase:'ready',storeIssue:result === 'canceled'?'canceled':'install'});
    } catch { this.emit({phase:'ready',storeIssue:'install'}); }
    finally { this.operation = false; }
    return this.state;
  }
}
