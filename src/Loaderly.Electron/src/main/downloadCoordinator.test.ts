import { describe, expect, it, vi } from 'vitest';
import { DownloadCoordinator } from './downloadCoordinator';
describe('one download coordinator across batches',()=>{
 it('drains the prior bandwidth allocation before applying a new total limit',async()=>{
  let finish!:()=>void;const rates:number[]=[],pool=new DownloadCoordinator(()=>false);pool.configure({concurrency:1,rateKib:10});
  const first=pool.enqueue(1,async(_s,rate)=>{rates.push(rate);await new Promise<void>(r=>finish=r);return true;});await vi.waitFor(()=>expect(finish).toBeTypeOf('function'));
  pool.configure({concurrency:2,rateKib:6});const second=pool.enqueue(2,async(_s,rate)=>{rates.push(rate);return true;});expect(rates).toEqual([10]);finish();await Promise.all([first,second]);expect(rates).toEqual([10,3]);pool.stop();
 });
 it('enforces a shared limit and uses the updated limit for later starts',async()=>{
  let running=0,max=0;const releases:(()=>void)[]=[];
  const pool=new DownloadCoordinator(()=>false);pool.configure({concurrency:2,rateKib:64});
  const jobs=[1,2,3,4].map(id=>pool.enqueue(id,async(_signal,rate)=>{expect(rate).toBe(32);running++;max=Math.max(max,running);await new Promise<void>(resolve=>releases.push(resolve));running--;return true;}));
  await vi.waitFor(()=>expect(releases).toHaveLength(2));expect(pool.state().entries.filter(e=>e.phase==='queued')).toHaveLength(2);
  releases.shift()!();await vi.waitFor(()=>expect(pool.state().entries.find(e=>e.id===3)?.phase).toBe('preparing'));
  releases.shift()!();await vi.waitFor(()=>expect(pool.state().entries.find(e=>e.id===4)?.phase).toBe('preparing'));
  for(const release of releases)release();expect(await Promise.all(jobs)).toEqual([true,true,true,true]);expect(max).toBe(2);pool.stop();
 });
 it('pauses a scheduled task without running it and does not pause postprocessing',async()=>{
  const run=vi.fn(async()=>true),pool=new DownloadCoordinator(()=>false);const scheduled=pool.enqueue(1,run,Date.now()+60000);
  expect(pool.pause(1)).toBe(true);expect(await scheduled).toBe(false);expect(run).not.toHaveBeenCalled();
  let finish!:()=>void;const active=pool.enqueue(2,async(_signal,_rate,phase)=>{phase('processing');await new Promise<void>(r=>finish=r);return true;});
  await vi.waitFor(()=>expect(pool.state().entries[0].phase).toBe('processing'));expect(pool.pause(2)).toBe(false);finish();expect(await active).toBe(true);pool.stop();
 });
 it('starts queued tasks in the user requested order and stops without starting another',async()=>{
  const order:number[]=[];let release!:()=>void;const pool=new DownloadCoordinator(()=>false);pool.configure({concurrency:1,rateKib:0});
  const one=pool.enqueue(1,async()=>{await new Promise<void>(r=>release=r);return true;});
  const two=pool.enqueue(2,async()=>{order.push(2);return true;});const three=pool.enqueue(3,async()=>{order.push(3);return true;});pool.move(3,-1);
  await vi.waitFor(()=>expect(release).toBeTypeOf('function'));release();await Promise.all([one,two,three]);expect(order).toEqual([3,2]);
  const pending=pool.enqueue(4,async()=>{order.push(4);return true;},Date.now()+60000);pool.stop();expect(await pending).toBe(false);expect(order).toEqual([3,2]);
 });
});
