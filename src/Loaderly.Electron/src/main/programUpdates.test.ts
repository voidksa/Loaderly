import {it,expect,vi} from 'vitest';
import {generateKeyPairSync,sign,createHash} from 'node:crypto';
import {mkdtemp,rm,writeFile,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ProgramUpdates} from './programUpdates';
it('downloads a signed release, rejects corrupt bytes and rechecks the file before install',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'loaderly-update-test-')),keys=generateKeyPairSync('ed25519'),key=keys.publicKey.export({type:'spki',format:'pem'}).toString(),bytes=Buffer.from('verified test package'),format=process.platform==='win32'?'exe':process.platform==='darwin'?'zip':process.env.APPIMAGE?'AppImage':'deb';
 const payload=JSON.stringify({schema:1,version:'2.1.1',notes:'Test',publishedAt:'2026-10-10T12:00:00Z',assets:[{platform:process.platform,arch:process.arch,format,url:`https://github.com/voidksa/Loaderly/releases/download/v2.1.1/Loaderly-2.1.1.${format}`,size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}]});
 let corrupt=true;
 vi.stubGlobal('fetch',vi.fn(async(url:string)=>url.endsWith('/stable')?Response.json({payload,signature:sign(null,Buffer.from(payload),keys.privateKey).toString('base64')}):new Response(corrupt?'invalid':bytes)));
 try{const updater=new ProgramUpdates(directory,'2.1.0',()=>{},key);await updater.initialize();expect((await updater.check()).phase).toBe('available');expect((await updater.download()).phase).toBe('available');expect(await readdir(directory)).toHaveLength(0);corrupt=false;expect((await updater.download()).phase).toBe('ready');const file=await updater.verifiedFile();await writeFile(file,'changed');await expect(updater.verifiedFile()).rejects.toThrow();await updater.preferences(false);const next=new ProgramUpdates(directory,'2.1.0',()=>{},key);expect((await next.initialize()).automatic).toBe(false);}finally{vi.unstubAllGlobals();await rm(directory,{recursive:true,force:true});}
});
