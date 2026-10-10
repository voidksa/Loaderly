import {expect,it} from 'vitest';
import {mkdtemp,mkdir,readFile,writeFile,rm,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {macBundlePath,macInstallScript,prepareMacUpdate} from './macUpdate';

it('locates the running bundle rather than guessing a second Applications copy',()=>{
  for(const root of ['/Applications/Loaderly.app',"/Users/Me/Applications/Loaderly's App.app"])
    expect(macBundlePath(root+'/Contents/MacOS/Loaderly')).toBe(root);
  for(const executable of ['/Volumes/Loaderly/Loaderly.app/Contents/MacOS/Loaderly','/private/var/folders/xyz/AppTranslocation/id/d/Loaderly.app/Contents/MacOS/Loaderly','/usr/local/bin/loaderly'])expect(()=>macBundlePath(executable)).toThrow();
});

// Exercise the actual transaction shell on Unix with a harmless opener. It
// replaces fixture directories only; no installed app or user data is touched.
it.runIf(process.platform!=='win32')('waits for quit, swaps once, launches new and removes old only after acknowledgement',async()=>{
  const root=await mkdtemp(join(tmpdir(),"loaderly-mac-'qa-"));
  const target=join(root,'Loaderly app.app'),work=join(root,'.loaderly-update-qa');
  let old:ReturnType<typeof spawn>|undefined;
  try{
    await mkdir(target);await mkdir(work);await mkdir(join(work,'incoming.app'));
    await writeFile(join(target,'version'),'old');await writeFile(join(work,'incoming.app/version'),'new');
    const opener=join(root,'open-fixture.sh');
    await writeFile(opener,'#!/bin/sh\n[ "$(cat "$2/version")" = new ] || exit 2\nprintf complete > "$STATUS_FILE"\n',{mode:0o700});
    const quote=(text:string)=>"'"+text.replaceAll("'","'\\''")+"'";
    const script=join(work,'install.sh');await writeFile(script,macInstallScript.replaceAll('/usr/bin/open',quote(opener)));
    old=spawn('/bin/sleep',['30']);await new Promise<void>((resolve,reject)=>{old!.once('spawn',resolve);old!.once('error',reject);});
    const helper=spawn('/bin/sh',[script,work,target,String(old.pid)],{env:{...process.env,STATUS_FILE:join(work,'status')}});
    const done=new Promise<number|null>((resolve,reject)=>{helper.once('exit',resolve);helper.once('error',reject);});
    for(let i=0;i<50;i++){if(await readFile(join(work,'status'),'utf8').catch(()=>'')==='ready')break;await new Promise(r=>setTimeout(r,20));}
    expect(await readFile(join(target,'version'),'utf8')).toBe('old');
    old.kill();expect(await done).toBe(0);
    expect(await readFile(join(target,'version'),'utf8')).toBe('new');
    await expect(access(join(work,'previous.app'))).rejects.toThrow();
  }finally{old?.kill();await rm(root,{recursive:true,force:true});}
},10000);

it.runIf(process.platform!=='win32')('restores the old bundle when the new app cannot be launched',async()=>{
  const root=await mkdtemp(join(tmpdir(),'loaderly-rollback-')),target=join(root,'Loaderly.app'),work=join(root,'.loaderly-update-qa');
  try{
    await mkdir(target);await mkdir(work);await mkdir(join(work,'incoming.app'));
    await writeFile(join(target,'version'),'old');await writeFile(join(work,'incoming.app/version'),'new');
    const script=join(work,'install.sh');await writeFile(script,macInstallScript.replaceAll('/usr/bin/open','/usr/bin/false'));
    const helper=spawn('/bin/sh',[script,work,target,'99999999']);
    expect(await new Promise(resolve=>helper.once('exit',resolve))).toBe(1);
    expect(await readFile(join(target,'version'),'utf8')).toBe('old');
    expect(await readFile(join(work,'status'),'utf8')).toBe('rolled-back');
  }finally{await rm(root,{recursive:true,force:true});}
});

it.runIf(process.platform!=='darwin')('cannot execute a macOS install on another operating system',async()=>{
  await expect(prepareMacUpdate('unused.zip','/Applications/Loaderly.app/Contents/MacOS/Loaderly','2.1.3','unused','0'.repeat(64))).rejects.toThrow();
});
