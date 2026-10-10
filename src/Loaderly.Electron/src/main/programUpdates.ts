import { boundedResponse } from './communityCatalog';
import { Readable } from 'node:stream';
import { createHash, verify } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { releaseOrigin, validateRelease, newerVersion, type ReleaseAsset, type UpdateState } from '../shared/releases';
import { updatePublicKey } from '../shared/updatePublicKey';

export function verifiedManifest(envelope: unknown, key=updatePublicKey) {
  const e=envelope as {payload:string;signature:string};
  if(!e || typeof e.payload!=='string' || e.payload.length>32000 || typeof e.signature!=='string' || e.signature.length>128 || !verify(null,Buffer.from(e.payload),key,Buffer.from(e.signature,'base64'))) throw Error('Update signature could not be verified');
  return validateRelease(JSON.parse(e.payload));
}
export class ProgramUpdates {
  state: UpdateState;
  private asset?: ReleaseAsset;
  private file?: string;
  private controller?: AbortController;
  constructor(private directory:string, version:string, private notify:(state:UpdateState)=>void,private publicKey=updatePublicKey) {this.state={phase:'idle',current:version,automatic:true};}
  private emit(patch:Partial<UpdateState>) {this.state={...this.state,...patch};this.notify(this.state);return this.state;}
  async initialize() {try{const p=JSON.parse(await readFile(join(this.directory,'preferences.json'),'utf8'));this.state.automatic=p.automatic!==false;}catch{/* first run */}return this.state;}
  async preferences(automatic:boolean) {await mkdir(this.directory,{recursive:true});await writeFile(join(this.directory,'preferences.json'),JSON.stringify({automatic:automatic===true}));return this.emit({automatic:automatic===true});}
  async check() {
    if(['checking','downloading','ready'].includes(this.state.phase)) return this.state;
    this.emit({phase:'checking',message:undefined});
    try {
      const response=await fetch(releaseOrigin+'/api/updates/stable',{signal:AbortSignal.timeout(15000),redirect:'error'});
      if(response.status===204) return this.emit({phase:'current',checkedAt:new Date().toISOString()});
      if(!response.ok) throw Error('Update service is unavailable');
      const body=await boundedResponse(response,48000);if(body.length>48000)throw Error('Invalid update response');
      const release=verifiedManifest(JSON.parse(body),this.publicKey);
      const format=process.platform==='win32'?'exe':process.platform==='darwin'?'zip':process.env.APPIMAGE?'AppImage':'deb';
      this.asset=release.assets.find(a=>a.platform===process.platform&&a.arch===process.arch&&a.format===format);
      return this.emit({phase:newerVersion(release.version,this.state.current)&&this.asset?'available':'current',version:release.version,notes:release.notes,checkedAt:new Date().toISOString()});
    } catch {return this.emit({phase:'error',message:'Could not securely check for updates. Please try again.'});}
  }
  cancel() {this.controller?.abort();}
  async download() {
    if(!this.asset || !['available','error'].includes(this.state.phase)) return this.state;
    const a=this.asset, controller=new AbortController();this.controller=controller;
    const timeout=setTimeout(()=>controller.abort(),30*60*1000);
    const path=join(this.directory,`Loaderly-${this.state.version}-${a.platform}-${a.arch}.${a.format}`),part=path+'.partial';
    this.emit({phase:'downloading',progress:0,message:undefined});
    try {
      await mkdir(this.directory,{recursive:true});
      const response=await fetch(a.url,{signal:controller.signal});
      if(!response.ok || !response.body)throw Error('Download failed');
      const {open}=await import('node:fs/promises'),file=await open(part,'w'),hash=createHash('sha256');let received=0;
      try {for await(const data of Readable.fromWeb(response.body as import('node:stream/web').ReadableStream)){const chunk=Buffer.from(data);received+=chunk.length;if(received>a.size)throw Error('Unexpected update size');hash.update(chunk);await file.writeFile(chunk);this.emit({progress:Math.floor(received/a.size*100)});}}finally{await file.close();}
      if(received!==a.size || hash.digest('hex')!==a.sha256)throw Error('Update verification failed');
      if(a.format==='AppImage'){const {chmod}=await import('node:fs/promises');await chmod(part,0o755);}
      await rename(part,path);this.file=path;return this.emit({phase:'ready',progress:100});
    }catch{return this.emit({phase:'available',message:controller.signal.aborted?'Download canceled.':'Download failed verification or was interrupted. Please retry.'});}
    finally{clearTimeout(timeout);this.controller=undefined;await unlink(part).catch(()=>{});}
  }
  async verifiedFile() {
    if(!this.file||!this.asset||this.state.phase!=='ready')throw Error('No verified update');
    const hash=createHash('sha256');for await(const data of createReadStream(this.file))hash.update(data);
    if(hash.digest('hex')!==this.asset.sha256) {this.emit({phase:'error',message:'The downloaded update changed. Download it again.'});throw Error('Update file changed');}
    return this.file;
  }
  async launchWindowsInstaller() {
    const path=await this.verifiedFile();
    if(process.platform!=='win32')throw Error('Use the platform installer');
    const child=spawn(path,['--update','--launch'],{detached:true,stdio:'ignore',windowsHide:false});
    await new Promise<void>((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});child.unref();
  }
}
