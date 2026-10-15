import {describe,it,expect,vi,afterEach} from 'vitest';
import {mkdtemp,readFile,writeFile,mkdir,rm,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {PytubefixManager,uvAsset,isolatedPythonEnvironment,managedPythonVersion} from './pytubefixManager';
afterEach(()=>vi.unstubAllGlobals());
describe('private backup runtime',()=>{
  it('pins a supported CPython patch instead of the rolling minor-version junction',()=>{
    expect(managedPythonVersion(JSON.stringify([
      {implementation:'pypy',variant:'default',version:'3.12.99'},
      {implementation:'cpython',variant:'default',version:'3.12.9'},
      {implementation:'cpython',variant:'freethreaded',version:'3.12.98'},
      {implementation:'cpython',variant:'default',version:'3.13.1'},
      {implementation:'cpython',variant:'default',version:'3.12.15'},
    ]))).toBe('3.12.15');
    expect(()=>managedPythonVersion('[]')).toThrow('unavailable');
  });
  it('chooses native packages for all six supported OS/architecture combinations',()=>{
    for(const platform of ['win32','linux','darwin'] as const)for(const arch of ['x64','arm64']){
      const asset=uvAsset({platform,arch});
      expect(asset.name).toContain(arch==='x64'?'x86_64':'aarch64');
      expect(asset.name.endsWith(platform==='win32'?'.zip':'.tar.gz')).toBe(true);
    }
    expect(()=>uvAsset({platform:'freebsd',arch:'x64'})).toThrow();
    expect(isolatedPythonEnvironment('private').UV_PYTHON_PREFERENCE).toBe('only-managed');
  });
  it('keeps the active engine when a replacement checksum fails and cleans only its stage',async()=>{
    const root=await mkdtemp(join(tmpdir(),'loaderly-backup-'));
    try{
      const directory='engine-abcd',manifest=JSON.stringify({directory,version:'1.0.0'});
      await mkdir(join(root,directory,'env','Scripts'),{recursive:true});await writeFile(join(root,directory,'env','Scripts','python.exe'),'fixture');
      await writeFile(join(root,'active.json'),manifest);
      vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({info:{version:'2.0.0'}}))).mockResolvedValueOnce(new Response(JSON.stringify({assets:[{name:uvAsset({platform:'win32',arch:'x64'}).name,browser_download_url:'https://github.com/astral-sh/uv/releases/download/test/uv.zip',digest:'sha256:'+'0'.repeat(64)}]}))).mockResolvedValueOnce(new Response('invalid archive')));
      const manager=new PytubefixManager(root,{platform:'win32',arch:'x64'});
      await expect(manager.install(new AbortController().signal,()=>{})).rejects.toThrow('checksum');
      expect(await readFile(join(root,'active.json'),'utf8')).toBe(manifest);
      expect(manager.runtime()?.version).toBe('1.0.0');expect((await readdir(root)).sort()).toEqual(['active.json',directory]);
      await writeFile(join(root,'active.json'),JSON.stringify({directory:'../escape',version:'1.0.0'}));expect(manager.runtime()).toBeUndefined();
    }finally{await rm(root,{recursive:true,force:true});}
  });
});
