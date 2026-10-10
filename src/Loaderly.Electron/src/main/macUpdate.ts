import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {access,copyFile,lstat,mkdir,mkdtemp,readFile,realpath,rename,rm,writeFile} from 'node:fs/promises';
import {constants,createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {basename,dirname,join,posix} from 'node:path';

const run=promisify(execFile);
const pendingName='mac-install.json';
export type MacInstallIssue='location'|'verification'|'installation';
export class MacInstallError extends Error {
  constructor(readonly issue:MacInstallIssue){super(issue);}
}

export function macBundlePath(executable:string):string {
  const bundle=posix.resolve(executable,'../../..');
  if(!bundle.endsWith('.app')||posix.resolve(bundle,'Contents/MacOS',posix.basename(executable))!==posix.resolve(executable)||bundle.includes('/AppTranslocation/')||bundle.startsWith('/Volumes/'))throw new MacInstallError('location');
  return bundle;
}

// The helper starts before quitting, waits for the old process, and keeps a
// rollback copy until the new app acknowledges a successful startup.
export const macInstallScript=`#!/bin/sh
set -u
work="$1"
target="$2"
old_pid="$3"
status="$work/status"
incoming="$work/incoming.app"
backup="$work/previous.app"
printf ready > "$status"
attempt=0
while /bin/kill -0 "$old_pid" 2>/dev/null; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 90 ]; then printf quit-timeout > "$status"; exit 1; fi
  /bin/sleep 1
done
if ! /bin/mv "$target" "$backup"; then printf replace-failed > "$status"; exit 1; fi
if ! /bin/mv "$incoming" "$target"; then
  /bin/mv "$backup" "$target"
  printf rolled-back > "$status"
  /usr/bin/open -n "$target"
  exit 1
fi
if /usr/bin/open -n "$target"; then
  attempt=0
  while [ "$attempt" -lt 60 ]; do
    if [ "$(/bin/cat "$status")" = complete ]; then
      /bin/rm -rf "$backup"
      exit 0
    fi
    attempt=$((attempt + 1))
    /bin/sleep 1
  done
  # A slow startup may still succeed. Keep the previous bundle for recovery;
  # never replace a new app that could already be running.
  printf startup-unconfirmed > "$status"
  exit 1
fi
/bin/mv "$target" "$work/failed.app"
/bin/mv "$backup" "$target"
printf rolled-back > "$status"
/usr/bin/open -n "$target"
exit 1
`;

export async function prepareMacUpdate(archive:string,executable:string,version:string,directory:string,sha256:string):Promise<void> {
  if(process.platform!=='darwin'||!/^\d+\.\d+\.\d+$/.test(version)||!/^[a-f0-9]{64}$/.test(sha256))throw new MacInstallError('verification');
  const target=macBundlePath(await realpath(executable));
  const parent=dirname(target);
  try {await access(parent,constants.W_OK);await access(target,constants.W_OK);}catch{throw new MacInstallError('location');}
  const work=await mkdtemp(join(parent,'.loaderly-update-'));
  let launched=false;
  try {
    const privateArchive=join(work,'package.zip');
    await copyFile(archive,privateArchive);
    const hash=createHash('sha256');for await(const chunk of createReadStream(privateArchive))hash.update(chunk);
    if(hash.digest('hex')!==sha256)throw new MacInstallError('verification');
    const unpacked=join(work,'unpacked');await mkdir(unpacked);
    await run('/usr/bin/ditto',['-x','-k',privateArchive,unpacked],{timeout:180000,maxBuffer:1024*1024});
    const next=join(unpacked,'Loaderly.app');
    if(!(await lstat(next)).isDirectory()||await realpath(next)!==next)throw new MacInstallError('verification');
    const plist=join(next,'Contents/Info.plist');
    for(const [key,expected] of [['CFBundleIdentifier','com.loaderly.app'],['CFBundleShortVersionString',version]]) {
      const {stdout}=await run('/usr/libexec/PlistBuddy',['-c',`Print :${key}`,plist],{timeout:10000});
      if(stdout.trim()!==expected)throw new MacInstallError('verification');
    }
    await run('/usr/bin/codesign',['--verify','--deep','--strict',next],{timeout:120000,maxBuffer:1024*1024});
    const {stdout:architectures}=await run('/usr/bin/lipo',['-archs',join(next,'Contents/MacOS/Loaderly')],{timeout:10000});
    if(!architectures.trim().split(/\s+/).includes(process.arch==='arm64'?'arm64':'x86_64'))throw new MacInstallError('verification');
    await rename(next,join(work,'incoming.app'));
    await rm(privateArchive);
    await writeFile(join(work,'install.sh'),macInstallScript,{mode:0o700});
    await mkdir(directory,{recursive:true});
    await writeFile(join(directory,pendingName),JSON.stringify({work,target,version}),{mode:0o600});
    const helper=spawn('/bin/sh',[join(work,'install.sh'),work,target,String(process.pid)],{detached:true,stdio:'ignore'});
    await new Promise<void>((accept,reject)=>{helper.once('spawn',accept);helper.once('error',reject);});
    launched=true;helper.unref();
    // Do not quit if the helper failed to start its replacement protocol.
    for(let attempt=0;attempt<50;attempt++) {
      if(await readFile(join(work,'status'),'utf8').catch(()=>'')==='ready')return;
      await new Promise(accept=>setTimeout(accept,100));
    }
    helper.kill();
    throw new MacInstallError('installation');
  } catch(error) {
    if(!launched)await rm(work,{recursive:true,force:true});
    throw error instanceof MacInstallError?error:new MacInstallError('verification');
  }
}

export async function acknowledgeMacUpdate(directory:string,executable:string,version:string):Promise<void> {
  if(process.platform!=='darwin')return;
  try {
    const pending=JSON.parse(await readFile(join(directory,pendingName),'utf8'));
    const target=macBundlePath(await realpath(executable));
    // A private marker may only acknowledge a sibling staging directory for
    // this app. It never supplies executable code or a deletion target.
    if(pending.version!==version||pending.target!==target||typeof pending.work!=='string'||dirname(pending.work)!==dirname(target)||!basename(pending.work).startsWith('.loaderly-update-')||await realpath(pending.work)!==pending.work)return;
    await writeFile(join(pending.work,'status'),'complete');
    await rm(join(directory,pendingName));
  }catch{/* No pending installation, or the previous version is recovering. */}
}
