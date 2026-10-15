import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StudioQueue } from './studioQueue';
const directories: string[] = []; const queues: StudioQueue<unknown>[] = [];
afterEach(async () => { for (const q of queues.splice(0)) await q.stop(); for (const d of directories.splice(0)) await rm(d, { recursive: true, force: true }); });
async function setup(run: ConstructorParameters<typeof StudioQueue>[1]) { const dir = await mkdtemp(join(tmpdir(), 'loaderly-queue-')); directories.push(dir); const file = join(dir, 'jobs.json'); const q = new StudioQueue(file, run); queues.push(q); return { q, file }; }
describe('persistent studio queue', () => {
  it('removes only selected finished history, preserves files and can undo after reload',async()=>{
    const {q,file}=await setup(async()=>({}));
    const output=join(file,'..','result.txt');await writeFile(output,'keep this output');
    await writeFile(file,JSON.stringify([
      {id:'done',name:'Done',kind:'render',state:'completed',createdAt:'2026-10-13',payload:{},paths:[output]},
      {id:'other',name:'Other',kind:'render',state:'failed',createdAt:'2026-10-12',payload:{}},
      {id:'queued',name:'Queued',kind:'render',state:'queued',scheduledAt:Date.now()+60000,createdAt:'2026-10-13',payload:{}}
    ]));
    await q.load();await q.dismiss(['done','queued']);
    expect(q.list().map(job=>job.id)).toEqual(['other','queued']);
    expect(await readFile(output,'utf8')).toBe('keep this output');
    await q.stop();const restored=new StudioQueue(file,async()=>({}));queues.push(restored);await restored.load();
    expect(restored.list().map(job=>job.id)).toEqual(['other','queued']);
    await restored.dismiss(['done'],true);expect(restored.list()[0].paths).toEqual([output]);
  });
  it('does not dismiss a running job',async()=>{
    let finish!:()=>void;const held=new Promise<void>(resolve=>{finish=resolve;});
    const {q}=await setup(async()=>{await held;return {};});await q.load();const id=await q.add('Running','render',{});
    await vi.waitFor(()=>expect(q.list()[0].state).toBe('running'));
    try{await q.dismiss([id]);expect(q.list()).toHaveLength(1);}finally{finish();}
  });
  it('persists a completed empty-recognition outcome across reloads',async()=>{
    const {q,file}=await setup(async()=>({paths:['transcript.json'],message:'NO_SPEECH_DETECTED'}));await q.load();
    await q.add('Speech','transcribe',{});
    await vi.waitFor(()=>expect(q.list()[0]).toMatchObject({state:'completed',message:'NO_SPEECH_DETECTED'}));
    await q.stop();const restored=new StudioQueue(file,async()=>({}));queues.push(restored);await restored.load();
    expect(restored.list()[0]).toMatchObject({state:'completed',message:'NO_SPEECH_DETECTED',paths:['transcript.json']});
  });
  it('executes serially and snapshots edits before the caller changes them', async () => {
    const executed: unknown[] = []; let active = 0, maximum = 0;
    const { q, file } = await setup(async job => { maximum = Math.max(maximum, ++active); await new Promise(resolve => setTimeout(resolve, 30)); executed.push(job.payload); active--; return { paths: ['result.mp4'] }; });
    await q.load(); const edits = { value: 1 }; await q.add('First', 'render', edits); edits.value = 2; await q.add('Second', 'render', edits);
    await vi.waitFor(() => expect(q.list().every(j => j.state === 'completed')).toBe(true)); expect(maximum).toBe(1); expect(executed).toEqual([{ value: 1 }, { value: 2 }]);
    await q.stop(); expect(JSON.parse(await readFile(file, 'utf8')).every((j: {state:string}) => j.state === 'completed')).toBe(true);
  });
  it('does not automatically rerun interrupted renders after restart', async () => {
    const run = vi.fn(async () => ({})), { q, file } = await setup(run);
    await writeFile(file, JSON.stringify([{ id:'a', name:'A', kind:'render', state:'running', payload:{} }])); await q.load();
    expect(q.list()[0]).toMatchObject({ state:'failed', message:'INTERRUPTED_TASK' }); expect(run).not.toHaveBeenCalled();
    await q.retry('a'); await vi.waitFor(() => expect(q.list()[0].state).toBe('completed'));
  });
  it('cancels queued tasks before their scheduled time', async () => {
    const run = vi.fn(async () => ({})), { q } = await setup(run); await q.load(); const id = await q.add('Later','render',{},Date.now()+60000); await q.cancel(id);
    expect(q.list()[0].state).toBe('canceled'); expect(run).not.toHaveBeenCalled();
  });
  it('does not execute a task whose persistence failed and can recover after storage is repaired', async () => {
    const run=vi.fn(async()=>({})),{q,file}=await setup(run);await q.load();
    await rm(file);await mkdir(file);
    try{await expect(q.add('Unsaved','render',{})).rejects.toThrow();await new Promise(resolve=>setTimeout(resolve,80));expect(run).not.toHaveBeenCalled();}
    finally{await rm(file,{recursive:true,force:true});}
    await q.cancel(q.list()[0].id);await q.add('Saved','render',{});
    await vi.waitFor(()=>expect(q.list()[1].state).toBe('completed'));
    expect(run).toHaveBeenCalledTimes(1);
  });
});
