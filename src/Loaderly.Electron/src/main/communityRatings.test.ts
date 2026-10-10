import {it,expect,vi,afterEach} from 'vitest';
import {mkdtemp,rm,readdir} from 'node:fs/promises';
import {join} from 'node:path';import {tmpdir} from 'node:os';
vi.mock('electron',()=>({safeStorage:{isEncryptionAvailable:()=>false,getSelectedStorageBackend:()=> 'basic_text'}}));
import {CommunityRatings} from './communityRatings';
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
it('uses public-only device login, enforces polling interval, never exposes or stores an unencrypted token, and logs out',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'loaderly-auth-'));const token='gho_'+'x'.repeat(36);let polls=0;
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-10T10:00:00Z'));
 vi.stubGlobal('fetch',vi.fn(async(url:string,init:RequestInit)=>{
  if(url.endsWith('auth-config'))return Response.json({enabled:true,clientId:'client123456789'});
  if(url.endsWith('/device/code')){expect(new URLSearchParams(String(init.body)).get('scope')).toBe('');return Response.json({device_code:'private-device-code',user_code:'ABCD-EFGH',expires_in:900,interval:5});}
  if(url.endsWith('/access_token')){polls++;return Response.json({access_token:token,scope:''});}
  expect((init.headers as Record<string,string>).Authorization).toBe('Bearer '+token);return Response.json({ratings:[],user:{login:'tester'}});
 }));
 try{const service=new CommunityRatings(dir);const start=await service.begin();expect(JSON.stringify(start)).not.toContain('private-device-code');expect(start.userCode).toBe('ABCD-EFGH');expect((await service.poll()).pending).toBe(true);expect(polls).toBe(0);vi.setSystemTime(Date.now()+6000);expect(await service.poll()).toEqual({login:'tester'});expect(await readdir(dir)).toEqual([]);await service.logout();expect((await service.ratings('example',5)).account?.error).toBe('sign-in-required');}finally{await rm(dir,{recursive:true,force:true});}
});
it('cancel discards a late device authorization and rejects invalid ratings before network access',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'loaderly-auth-'));let finish:(value:Response)=>void=()=>{};
 vi.stubGlobal('fetch',vi.fn(async(url:string)=>url.endsWith('auth-config')?Response.json({enabled:true,clientId:'client123456789'}):new Promise<Response>(resolve=>{finish=resolve;})));
 try{const service=new CommunityRatings(dir);await expect(service.ratings('x',6)).rejects.toThrow('Invalid rating');const begin=service.begin();await vi.waitFor(()=>expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2));await service.logout();finish(Response.json({device_code:'secret',user_code:'CODE',interval:5,expires_in:900}));expect(await begin).toEqual({});expect(await service.poll()).toEqual({});}finally{await rm(dir,{recursive:true,force:true});}
});
it('honors slow_down, expires pending codes, and rejects repository permissions',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'loaderly-auth-'));let response:Record<string,unknown>={error:'slow_down'};
 vi.useFakeTimers();vi.setSystemTime(100000);
 const fetcher=vi.fn(async(url:string)=>url.endsWith('auth-config')?Response.json({enabled:true,clientId:'client123456789'}):url.endsWith('/device/code')?Response.json({device_code:'private',user_code:'TEST',interval:5,expires_in:30}):Response.json(response));vi.stubGlobal('fetch',fetcher);
 try{const service=new CommunityRatings(dir);await service.begin();vi.setSystemTime(106000);expect((await service.poll()).interval).toBe(10);const calls=fetcher.mock.calls.length;vi.setSystemTime(110000);await service.poll();expect(fetcher).toHaveBeenCalledTimes(calls);
  response={access_token:'gho_'+'x'.repeat(36),scope:'repo'};vi.setSystemTime(117000);expect((await service.poll()).error).toBe('unexpected-permissions');expect(await readdir(dir)).toEqual([]);
  await service.begin();vi.setSystemTime(148000);expect((await service.poll()).error).toBe('expired');expect((await service.drafts({action:'list'})).error).toBe('sign-in-required');
 }finally{await rm(dir,{recursive:true,force:true});}
});
it.each([[404,'not-configured'],[503,'unavailable'],[200,'unavailable']])('reports auth configuration HTTP %s without requesting GitHub authorization',async(status,error)=>{
 const fetcher=vi.fn(async()=>new Response('<html>Unavailable</html>',{status}));vi.stubGlobal('fetch',fetcher);
 expect(await new CommunityRatings('unused').begin()).toEqual({error});expect(fetcher).toHaveBeenCalledTimes(1);
});
it('reports a disabled community service without starting device login',async()=>{
 const fetcher=vi.fn(async()=>Response.json({enabled:false}));vi.stubGlobal('fetch',fetcher);
 expect(await new CommunityRatings('unused').begin()).toEqual({error:'not-configured'});expect(fetcher).toHaveBeenCalledTimes(1);
});
