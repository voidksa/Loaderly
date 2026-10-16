import {it,expect,vi,afterEach,beforeEach} from 'vitest';
import {mkdtemp,rm,readdir,writeFile,readFile} from 'node:fs/promises';
import {join} from 'node:path';import {tmpdir} from 'node:os';
vi.mock('electron',()=>({safeStorage:{isEncryptionAvailable:vi.fn(()=>false),getSelectedStorageBackend:vi.fn(()=> 'basic_text'),decryptString:vi.fn(),encryptString:vi.fn()}}));
import {safeStorage} from 'electron';
import {CommunityRatings} from './communityRatings';
beforeEach(()=>vi.mocked(safeStorage.encryptString).mockReturnValue(Buffer.from('encrypted fixture')));
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();vi.resetAllMocks();});
it.each(['darwin','linux'] as const)('browses publicly on %s without touching protected storage, then restores only on sign-in',async platform=>{
 const dir=await mkdtemp(join(tmpdir(),'loaderly-auth-')),token='gho_'+'x'.repeat(36);
 vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(true);
 vi.mocked(safeStorage.getSelectedStorageBackend).mockReturnValue('gnome_libsecret');
 vi.mocked(safeStorage.decryptString).mockReturnValue(token);
 const fetcher=vi.fn(async(_url:string,init:RequestInit)=>Response.json({ratings:[],...((init.headers as Record<string,string>).Authorization?{user:{login:'tester'}}:{})}));vi.stubGlobal('fetch',fetcher);
 try{
  await writeFile(join(dir,'community-github.bin'),'encrypted fixture');
  const service=new CommunityRatings(dir,platform);
  expect((await service.ratings()).account).toEqual({savedSession:true});
  expect((await service.drafts({action:'list'})).error).toBe('sign-in-required');
  expect((await service.ratings('example',5)).account?.error).toBe('sign-in-required');
  expect(safeStorage.isEncryptionAvailable).not.toHaveBeenCalled();
  expect(safeStorage.decryptString).not.toHaveBeenCalled();
  expect((fetcher.mock.calls[0][1].headers as Record<string,string>).Authorization).toBeUndefined();
  expect(await service.begin()).toEqual({login:'tester'});
  expect(safeStorage.decryptString).toHaveBeenCalledTimes(1);
  expect((await service.ratings()).account).toEqual({login:'tester'});
  expect(safeStorage.decryptString).toHaveBeenCalledTimes(1);
  await service.logout();expect((await service.ratings()).account).toEqual({});
 }finally{await rm(dir,{recursive:true,force:true});}
});
it('keeps silent Windows session restoration and never asks the OS for a nonexistent session',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'loaderly-auth-')),token='gho_'+'x'.repeat(36);
 vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(true);vi.mocked(safeStorage.decryptString).mockReturnValue(token);
 vi.stubGlobal('fetch',vi.fn(async(_url:string,init:RequestInit)=>Response.json({ratings:[],...((init.headers as Record<string,string>).Authorization?{user:{login:'tester'}}:{})})));
 try{
  expect((await new CommunityRatings(dir,'win32').ratings()).account).toEqual({});
  expect(safeStorage.isEncryptionAvailable).not.toHaveBeenCalled();
  await writeFile(join(dir,'community-github.bin'),'encrypted fixture');
  expect((await new CommunityRatings(dir,'win32').ratings()).account).toEqual({login:'tester'});
  expect(safeStorage.decryptString).toHaveBeenCalledTimes(1);
 }finally{await rm(dir,{recursive:true,force:true});}
});
it('uses public-only device login, enforces polling interval, never exposes or stores an unencrypted token, and logs out',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'loaderly-auth-'));const token='gho_'+'x'.repeat(36);let polls=0;
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-10T10:00:00Z'));
 vi.stubGlobal('fetch',vi.fn(async(url:string,init:RequestInit)=>{
  if(url.endsWith('auth-config'))return Response.json({enabled:true,clientId:'client123456789'});
  if(url.endsWith('/device/code')){expect(new URLSearchParams(String(init.body)).get('scope')).toBe('');return Response.json({device_code:'private-device-code',user_code:'ABCD-EFGH',expires_in:900,interval:5});}
  if(url.endsWith('/access_token')){polls++;return Response.json({access_token:token,scope:''});}
  expect((init.headers as Record<string,string>).Authorization).toBe('Bearer '+token);return Response.json({ratings:[],user:{login:'tester'}});
 }));
 try{const service=new CommunityRatings(dir);const start=await service.begin();expect(JSON.stringify(start)).not.toContain('private-device-code');expect(start.userCode).toBe('ABCD-EFGH');expect((await service.poll()).pending).toBe(true);expect(polls).toBe(0);vi.setSystemTime(Date.now()+6000);expect(await service.poll()).toEqual({login:'tester',sessionOnly:true});expect(await readdir(dir)).toEqual([]);await service.logout();expect((await service.ratings('example',5)).account?.error).toBe('sign-in-required');}finally{await rm(dir,{recursive:true,force:true});}
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
it('retains the verified account through connection failures and an app restart, but clears revoked credentials',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'loaderly-auth-')),file=join(dir,'community-github.bin'),token='gho_'+'x'.repeat(36);
 let saved=token,status=200;
 vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(true);
 vi.mocked(safeStorage.decryptString).mockImplementation(()=>saved);
 vi.mocked(safeStorage.encryptString).mockImplementation(value=>{saved=value;return Buffer.from('protected session');});
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json(status===200?{ratings:[],user:{login:'tester'}}:{error:'unavailable'},{status})));
 try{
  await writeFile(file,'legacy encrypted token');const old=new CommunityRatings(dir,'win32');expect((await old.ratings()).account).toEqual({login:'tester'});
  expect(JSON.parse(saved)).toEqual({token,login:'tester'});expect((await readFile(file)).toString()).not.toContain(token);
  status=503;expect((await old.ratings()).account).toEqual({login:'tester',error:'unavailable'});
  const reopened=new CommunityRatings(dir,'win32');expect((await reopened.ratings()).account).toEqual({login:'tester',error:'unavailable'});
  expect(await readdir(dir)).toEqual(['community-github.bin']);status=200;expect((await reopened.ratings()).account).toEqual({login:'tester'});
  status=401;expect((await reopened.ratings()).account).toEqual({error:'sign-in-required'});expect(await readdir(dir)).toEqual([]);
 }finally{await rm(dir,{recursive:true,force:true});}
});
it('does not discard a newer restored session when an older request returns 401',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'loaderly-auth-')),file=join(dir,'community-github.bin');let finish!:(value:Response)=>void;
 vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(true);vi.mocked(safeStorage.decryptString).mockReturnValue('gho_'+'x'.repeat(36));
 const fetcher=vi.fn(async()=>Response.json({ratings:[],user:{login:'tester'}}));fetcher.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));vi.stubGlobal('fetch',fetcher);
 try{
  await writeFile(file,'encrypted fixture');const service=new CommunityRatings(dir,'win32');const stale=service.ratings();await vi.waitFor(()=>expect(finish).toBeTypeOf('function'));
  expect(await service.begin()).toEqual({login:'tester'});finish(Response.json({error:'unauthorized'},{status:401}));await stale;
  expect((await service.ratings()).account).toEqual({login:'tester'});expect(await readdir(dir)).toEqual(['community-github.bin']);
 }finally{await rm(dir,{recursive:true,force:true});}
});
it('retries temporarily unavailable protected storage and does not turn cancellation into sign-out',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'loaderly-auth-')),file=join(dir,'community-github.bin');
 vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(true);vi.mocked(safeStorage.decryptString).mockImplementationOnce(()=>{throw Error('OS key locked');}).mockReturnValue('gho_'+'x'.repeat(36));
 const fetcher=vi.fn(async(_url:string,init:RequestInit)=>Response.json({ratings:[],...((init.headers as Record<string,string>).Authorization?{user:{login:'tester'}}:{})}));vi.stubGlobal('fetch',fetcher);
 try{
  await writeFile(file,'encrypted fixture');const service=new CommunityRatings(dir,'win32');expect((await service.ratings()).account).toEqual({savedSession:true});
  expect(await service.begin()).toEqual({login:'tester'});expect(await service.cancel()).toEqual({login:'tester'});expect(await readdir(dir)).toEqual(['community-github.bin']);
  expect(fetcher.mock.calls.every(([url])=>url.endsWith('/ratings'))).toBe(true);
 }finally{await rm(dir,{recursive:true,force:true});}
});
it('keeps a pending device sign-in alive through a temporary polling failure',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'loaderly-auth-'));let offline=true;
 vi.useFakeTimers();vi.setSystemTime(100000);
 vi.stubGlobal('fetch',vi.fn(async(url:string)=>{
  if(url.endsWith('auth-config'))return Response.json({enabled:true,clientId:'client123456789'});
  if(url.endsWith('/device/code'))return Response.json({device_code:'private',user_code:'TEST',interval:5,expires_in:60});
  if(url.endsWith('/access_token')){if(offline)throw Error('Network unavailable');return Response.json({access_token:'gho_'+'x'.repeat(36),scope:''});}
  return Response.json({ratings:[],user:{login:'tester'}});
 }));
 try{
  const service=new CommunityRatings(dir);await service.begin();vi.setSystemTime(106000);
  expect(await service.poll()).toEqual({pending:true,userCode:'TEST',interval:5,error:'unavailable'});
  offline=false;vi.setSystemTime(112000);expect((await service.poll()).login).toBe('tester');
 }finally{await rm(dir,{recursive:true,force:true});}
});
