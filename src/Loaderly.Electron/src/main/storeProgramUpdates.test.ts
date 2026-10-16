import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StoreProgramUpdates } from './storeProgramUpdates';
import { storeHelperEvent, type StoreAction, type StoreResult } from './windowsStoreUpdates';
let directory:string;
beforeEach(async()=>{directory=await mkdtemp(join(tmpdir(),'loaderly-store-'));});
afterEach(async()=>{vi.useRealTimers();await rm(directory,{recursive:true,force:true});});
function fixture() {
  const backend={run:vi.fn(async(action:StoreAction):Promise<StoreResult>=>action==='check'?'available':'completed')};
  const busy=vi.fn(()=>false),notify=vi.fn();
  return {backend,busy,notify,updater:new StoreProgramUpdates(directory,'2.3.2',backend,notify,busy)};
}
it('uses Store availability without guessing a target version from GitHub or installed package metadata',async()=>{
  const {updater,backend}=fixture();await updater.initialize();
  expect(updater.state).toMatchObject({distribution:'store',automatic:true});
  await updater.check();expect(updater.state.phase).toBe('available');expect(updater.state.version).toBeUndefined();
  await updater.check();expect(backend.run).toHaveBeenCalledTimes(1);
  const restarted=new StoreProgramUpdates(directory,'2.3.2',backend,()=>{},()=>false);await restarted.initialize();await restarted.check();
  expect(backend.run).toHaveBeenCalledTimes(1);
});
it('downloads while work is active, but never installs until the work is finished',async()=>{
  const {updater,backend,busy}=fixture();await updater.check();busy.mockReturnValue(true);
  await updater.download();expect(updater.state.phase).toBe('ready');
  await updater.install();expect(updater.state).toMatchObject({phase:'ready',storeIssue:'busy'});
  expect(backend.run.mock.calls.map(c=>c[0])).toEqual(['check','download']);
  busy.mockReturnValue(false);await updater.install();expect(updater.state.phase).toBe('installed');
});
it('Store cancellation and install failures keep the application available for retry',async()=>{
  const {updater,backend}=fixture();await updater.check();
  backend.run.mockResolvedValueOnce('canceled');await updater.download();expect(updater.state).toMatchObject({phase:'available',storeIssue:'canceled'});
  await updater.download();backend.run.mockRejectedValueOnce(Error('offline'));await updater.install();
  expect(updater.state).toMatchObject({phase:'ready',storeIssue:'install'});
  backend.run.mockResolvedValueOnce('canceled');await updater.install();expect(updater.state.phase).toBe('ready');
});
it('failed checks never claim that the current app is up to date and do not spam Store retries',async()=>{
  const {updater,backend}=fixture();backend.run.mockRejectedValueOnce(Error('offline'));await updater.check();await updater.check();
  expect(updater.state).toMatchObject({phase:'error',storeIssue:'check'});expect(updater.state.checkedAt).toBeUndefined();expect(backend.run).toHaveBeenCalledTimes(1);
});
it('persists a 24 hour Later choice and the automatic-check preference across restarts',async()=>{
  const {updater,backend}=fixture();await updater.check();await updater.snooze();await updater.preferences(false);
  const restarted=new StoreProgramUpdates(directory,'2.3.2',backend,()=>{},()=>false);await restarted.initialize();
  expect(restarted.state.automatic).toBe(false);expect(restarted.state.snoozedUntil).toBeGreaterThan(Date.now()+23*60*60_000);
});
it('serializes checks and never double starts a download or installation',async()=>{
  const {updater,backend}=fixture();let finish!:(result:StoreResult)=>void;
  backend.run.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
  const first=updater.check();await vi.waitFor(()=>expect(finish).toBeTypeOf('function'));await updater.check();expect(backend.run).toHaveBeenCalledTimes(1);finish('available');await first;
  backend.run.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));const download=updater.download();await updater.download();expect(backend.run).toHaveBeenCalledTimes(2);finish('completed');await download;
});
it('caps Store checks to ten per rolling day even when manually requested',async()=>{
  const {updater,backend}=fixture();let now=Date.now();vi.spyOn(Date,'now').mockImplementation(()=>now);
  try {for(let i=0;i<12;i++){await updater.check();now+=31*60_000;}expect(backend.run).toHaveBeenCalledTimes(10);}finally{vi.restoreAllMocks();}
});
it('accepts only bounded progress and known native helper results',()=>{
  expect(storeHelperEvent('{"kind":"progress","progress":25}')).toEqual({kind:'progress',progress:25});
  expect(()=>storeHelperEvent('{"kind":"progress","progress":101}')).toThrow();
  expect(()=>storeHelperEvent('{"kind":"result","status":"random"}')).toThrow();
});
