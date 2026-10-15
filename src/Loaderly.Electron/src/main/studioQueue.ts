import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { atomicJson } from './studioFiles';

export type StudioJob<T = unknown> = { id: string; name: string; kind: string; payload: T; createdAt: string; scheduledAt?: number; state: 'queued' | 'running' | 'completed' | 'failed' | 'canceled'; progress?: number; message?: string; paths?: string[]; dismissed?: boolean };
export class StudioQueue<T = unknown> {
  private jobs: StudioJob<T>[] = [];
  private active?: { id: string; controller: AbortController };
  private writes: Promise<void> = Promise.resolve();
  private timer?: ReturnType<typeof setTimeout>;
  private stopped = false;
  private storageProblem = false;
  private pendingAdds=new Set<string>();
  private activeDone?: Promise<void>;
  constructor(private file: string, private execute: (job: StudioJob<T>, signal: AbortSignal, progress: (percent: number) => void) => Promise<{ paths?: string[]; message?: string }>, private notify: (jobs: StudioJob<T>[]) => void = () => {}) {}
  async load() {
    try {
      const data = JSON.parse(await readFile(this.file, 'utf8'));
      if (Array.isArray(data)) this.jobs = data.slice(-500).filter(j => j && typeof j.id === 'string' && typeof j.name === 'string' && ['queued','running','completed','failed','canceled'].includes(j.state)).map(j => j.state === 'running' ? { ...j, state: 'failed', message: 'INTERRUPTED_TASK' } : j);
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new Error('INVALID_QUEUE_FILE'); }
    await this.persist(); this.schedule();
  }
  list() { return structuredClone(this.jobs.filter(job => !job.dismissed)); }
  async dismiss(ids: readonly string[], restore = false) {
    const requested = new Set(ids.slice(0, 500));
    const changed = this.jobs.filter(job => requested.has(job.id) && !['queued', 'running'].includes(job.state) && this.active?.id !== job.id);
    const previous = changed.map(job => job.dismissed);
    changed.forEach(job => { job.dismissed = !restore; });
    try { await this.persist(); }
    catch (error) { changed.forEach((job, index) => { job.dismissed = previous[index]; }); throw error; }
  }
  async add(name: string, kind: string, payload: T, scheduledAt?: number) {
    if (this.stopped) throw new Error('QUEUE_STOPPED');
    if (this.jobs.filter(j => j.state === 'queued' || j.state === 'running').length >= 200) throw new Error('QUEUE_FULL');
    const job: StudioJob<T> = { id: randomUUID(), name: name.slice(0, 200), kind, payload: structuredClone(payload), createdAt: new Date().toISOString(), state: 'queued', scheduledAt };
    const removable = this.jobs.filter(j=>!['queued','running'].includes(j.state)).slice(0,Math.max(0,this.jobs.length-499));
    this.jobs=this.jobs.filter(j=>!removable.includes(j));
    this.pendingAdds.add(job.id);this.jobs.push(job);
    try{await this.persist();}
    catch(error){job.state='failed';job.message='QUEUE_STATE_NOT_SAVED';this.notify(this.list());throw error;}
    finally{this.pendingAdds.delete(job.id);}
    this.schedule(); return job.id;
  }
  async cancel(id: string) {
    const job = this.jobs.find(j => j.id === id); if (!job || !['queued','running'].includes(job.state)) return;
    job.state = 'canceled'; if (this.active?.id === id) this.active.controller.abort();
    await this.persist(); this.schedule();
  }
  async retry(id: string) {
    const job = this.jobs.find(j => j.id === id); if (!job || !['failed','canceled'].includes(job.state) || this.active?.id === id) return;
    job.state = 'queued'; delete job.message; delete job.progress; delete job.paths; await this.persist(); this.schedule();
  }
  async move(id: string, direction: -1 | 1) {
    const index = this.jobs.findIndex(j => j.id === id), next = index + direction;
    if (index < 0 || next < 0 || next >= this.jobs.length || this.jobs[index].state !== 'queued' || this.jobs[next].state !== 'queued') return;
    [this.jobs[index], this.jobs[next]] = [this.jobs[next], this.jobs[index]]; await this.persist();
  }
  async stop() { this.stopped = true; clearTimeout(this.timer); this.active?.controller.abort(); await this.activeDone; await this.persist(); }
  private persist() {
    const snapshot = structuredClone(this.jobs);
    const write = this.writes.then(async()=>{try{await atomicJson(this.file,snapshot);this.storageProblem=false;this.notify(snapshot.filter(job=>!job.dismissed));}catch(error){this.storageProblem=true;throw error;}}); this.writes = write.catch(() => {}); return write;
  }
  private schedule() {
    if (this.stopped || this.active || this.storageProblem) return;
    clearTimeout(this.timer); this.timer = setTimeout(() => { void this.pump(); }, 20); this.timer.unref?.();
  }
  private async pump() {
    if (this.stopped || this.active || this.storageProblem) return;
    const job = this.jobs.find(j => j.state === 'queued' && !this.pendingAdds.has(j.id) && (!j.scheduledAt || j.scheduledAt <= Date.now()));
    if (!job) { this.timer = setTimeout(() => { void this.pump(); }, 1000); this.timer.unref?.(); return; }
    const controller = new AbortController(); this.active = { id: job.id, controller }; job.state = 'running';
    let finished!:()=>void;this.activeDone=new Promise(resolve=>{finished=resolve;});
    try {
      await this.persist();
      if(controller.signal.aborted)throw new Error('TASK_CANCELED');
      const result = await this.execute(structuredClone(job), controller.signal, percent => {
        if (Number.isFinite(percent) && job.state === 'running') { job.progress = Math.max(0, Math.min(100, percent)); this.notify(this.list()); }
      });
      if (!controller.signal.aborted) { job.state = 'completed'; job.progress = 100; job.paths = result.paths; job.message = result.message; }
      else job.state = 'canceled';
    } catch (error) { job.state = controller.signal.aborted ? 'canceled' : 'failed'; job.message = error instanceof Error ? error.message.slice(0, 4000) : 'TASK_FAILED'; }
    finally { this.active = undefined; await this.persist().catch(() => {job.state='failed';job.message='QUEUE_STATE_NOT_SAVED';this.notify(this.list());}); finished(); this.activeDone=undefined; this.schedule(); }
  }
}
