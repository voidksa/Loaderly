import {validDraft,type DraftRequest,type DraftResult} from '../shared/communityDrafts';
import {safeStorage} from 'electron';
import {readFile,writeFile,mkdir,rm,stat,rename} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {releaseOrigin} from '../shared/releases';
import {boundedResponse} from './communityCatalog';
import {validRating,type CommunityAccount,type CommunityRatingsResult} from '../shared/communityRatings';

export class CommunityRatings {
  private token='';
  private login='';
  private sessionOnly=false;
  private loaded=false;
  private loading?:Promise<void>;
  private retryLoadAt=0;
  private generation=0;
  private persistence:Promise<void>=Promise.resolve();
  private pending?:{clientId:string;deviceCode:string;userCode:string;interval:number;next:number;expires:number};
  constructor(private directory:string,private platform:NodeJS.Platform=process.platform){}
  private get file(){return join(this.directory,'community-github.bin');}
  private get interactiveStorage(){return this.platform==='darwin'||this.platform==='linux';}
  private secure(){return safeStorage.isEncryptionAvailable()&&(this.platform!=='linux'||safeStorage.getSelectedStorageBackend()!=='basic_text');}
  private async savedAccount():Promise<CommunityAccount>{
    if(this.token)return {...(this.login?{login:this.login}:{savedSession:true}),...(this.sessionOnly?{sessionOnly:true}:{})};
    try{const file=await stat(this.file);return file.isFile()&&file.size>0&&file.size<=4096?{savedSession:true}:{};}catch{return {};}
  }
  private async load(){if(this.loaded||Date.now()<this.retryLoadAt)return;const generation=this.generation;this.loading??=(async()=>{let missing=false;try{
    // Check for an actual saved session before asking the OS for its key.
    const encrypted=await readFile(this.file);
    if(encrypted.length>0&&encrypted.length<=4096&&this.secure()){
      const decoded=safeStorage.decryptString(encrypted);
      const saved=decoded.startsWith('{')?JSON.parse(decoded):{token:decoded};
      if(generation===this.generation&&/^[A-Za-z0-9_]{20,255}$/.test(saved.token)){
        this.token=saved.token;
        this.login=typeof saved.login==='string'&&/^[a-zA-Z0-9-]{1,39}$/.test(saved.login)?saved.login:'';
      }
    }
  }catch(error){missing=(error as NodeJS.ErrnoException).code==='ENOENT';}
  finally{if(generation===this.generation){this.loaded=!!this.token||missing;this.retryLoadAt=this.loaded?0:Date.now()+30_000;}this.loading=undefined;}})();await this.loading;}
  private async json(url:string,init:RequestInit={},limit=100000){const response=await fetch(url,{...init,redirect:'error',signal:AbortSignal.timeout(12000)});if(!response.ok)throw Object.assign(Error('Request unavailable'),{status:response.status});return JSON.parse(await boundedResponse(response,limit));}
  private async saveSession(){
    const generation=this.generation,token=this.token,login=this.login;
    if(!token)return;
    try{
      if(!this.secure()){this.sessionOnly=true;return;}
      const encrypted=safeStorage.encryptString(JSON.stringify({token,login}));
      this.persistence=this.persistence.catch(()=>{}).then(async()=>{
        if(generation!==this.generation)return;
        await mkdir(this.directory,{recursive:true});const temporary=this.file+'.'+randomUUID()+'.tmp';
        try{await writeFile(temporary,encrypted,{mode:0o600,flag:'wx'});
          for(let attempt=0;;attempt++){try{await rename(temporary,this.file);break;}catch(error){if(attempt>=5||!['EPERM','EACCES','EBUSY'].includes((error as NodeJS.ErrnoException).code??''))throw error;await new Promise(r=>setTimeout(r,25*(attempt+1)));}}
        }finally{await rm(temporary,{force:true});}
      });
      await this.persistence;if(generation===this.generation)this.sessionOnly=false;
    }catch{if(generation===this.generation)this.sessionOnly=true;}
  }
  async logout():Promise<CommunityAccount>{this.generation++;this.token='';this.login='';this.sessionOnly=false;this.pending=undefined;this.loaded=true;this.persistence=this.persistence.catch(()=>{}).then(()=>rm(this.file,{force:true}));await this.persistence;return {};}
  cancel():Promise<CommunityAccount>{this.generation++;this.pending=undefined;return this.savedAccount();}
  async ratings(lookId?:unknown,stars?:unknown):Promise<CommunityRatingsResult>{
    if(lookId!==undefined&&(typeof lookId!=='string'||lookId.length>80||!Number.isInteger(stars)||Number(stars)<1||Number(stars)>5))throw Error('Invalid rating');
    // Public browsing must never open a Keychain or secret-store prompt.
    if(!this.interactiveStorage)await this.load();
    const saved=await this.savedAccount();
    const generation=this.generation,token=this.token;
    if(lookId!==undefined&&!this.token)return {available:true,ratings:[],account:{error:'sign-in-required'}};
    try {const result=await this.json(releaseOrigin+'/api/community/ratings',{method:lookId===undefined?'GET':'POST',headers:{...(this.token?{Authorization:`Bearer ${this.token}`} : {}),...(lookId===undefined?{}:{'Content-Type':'application/json'})},...(lookId===undefined?{}:{body:JSON.stringify({lookId,stars})})});
      if(!Array.isArray(result.ratings)||result.ratings.length>200)throw Error('Invalid ratings');
      if(generation!==this.generation)return {available:false,ratings:[],account:await this.savedAccount()};
      if(token){
        if(typeof result.user?.login!=='string'||!/^[a-zA-Z0-9-]{1,39}$/.test(result.user.login))throw Error('Identity unavailable');
        const changed=this.login!==result.user.login;this.login=result.user.login;if(changed||this.sessionOnly)await this.saveSession();
      }
      return {available:true,ratings:result.ratings.filter(validRating),account:token?await this.savedAccount():saved};
    }catch(error){
      if(generation!==this.generation)return {available:false,ratings:[],account:await this.savedAccount()};
      if(token&&(error as {status?:number}).status===401){await this.logout();return {available:false,ratings:[],account:{error:'sign-in-required'}};}
      return {available:false,ratings:[],account:{...await this.savedAccount(),error:'unavailable'}};
    }
  }
  async drafts(input:DraftRequest):Promise<DraftResult>{
    if(!this.interactiveStorage)await this.load();if(!this.token)return {ok:false,error:'sign-in-required'};
    if(!input||!['list','save','publish','unpublish','delete'].includes(input.action))return {ok:false,error:'invalid-action'};
    let body:unknown=input;
    if(input.action==='save'){const draft=validDraft(input.draft);if(!draft)return {ok:false,error:'invalid-design'};body={action:'save',draft};}
    if(input.action==='publish'||input.action==='unpublish'||input.action==='delete')if(!/^design-[a-f0-9-]{36}$/.test(input.id)||!Number.isSafeInteger(input.revision)||input.revision<1)return {ok:false,error:'invalid-design'};
    const generation=this.generation;
    try{
      const response=await fetch(releaseOrigin+'/api/community/drafts',{method:input.action==='list'?'GET':'POST',headers:{Authorization:`Bearer ${this.token}`,'Content-Type':'application/json'},...(input.action==='list'?{}:{body:JSON.stringify(body)}),redirect:'error',signal:AbortSignal.timeout(12000)});
      if(generation!==this.generation)return {ok:false,error:'session-ended'};
      if(response.status===401){await this.logout();return {ok:false,error:'sign-in-required'};}
      const result=JSON.parse(await boundedResponse(response,4_000_000));
      if(!response.ok||result.ok!==true)return {ok:false,error:response.status===409?'conflict-or-limit':'unavailable'};
      if(input.action==='list'){if(!Array.isArray(result.drafts)||result.drafts.length>10)throw Error();return {ok:true,drafts:result.drafts.map(validDraft).filter(Boolean)};}
      if(input.action==='delete')return {ok:true};
      const draft=validDraft(result.draft);return draft?{ok:true,draft}:{ok:false,error:'invalid-design'};
    }catch{return {ok:false,error:'unavailable'};}
  }
  async begin():Promise<CommunityAccount>{
    const generation=++this.generation;this.pending=undefined;
    // Restoring a protected session is an explicit sign-in action on systems
    // whose key provider can ask the user to unlock their password store.
    if(!this.token){this.loaded=false;this.loading=undefined;this.retryLoadAt=0;await this.load();}
    if(generation!==this.generation)return {};
    if(this.token){const restored=await this.ratings();if(restored.account?.login||!restored.available)return restored.account??{error:'unavailable'};}
    if(generation!==this.generation)return {};
    try{
      const response=await fetch(releaseOrigin+'/api/community/auth-config',{redirect:'error',signal:AbortSignal.timeout(12000)});
      if(generation!==this.generation)return {};
      if(response.status===404)return {error:'not-configured'};
      if(!response.ok)throw Error('Configuration unavailable');
      const config=JSON.parse(await boundedResponse(response,10000));
      if(!config.enabled||typeof config.clientId!=='string'||!/^[a-zA-Z0-9.]{10,100}$/.test(config.clientId))return {error:'not-configured'};
      const result=await this.json('https://github.com/login/device/code',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:config.clientId,scope:''}).toString()});
      if(generation!==this.generation)return {};
      if(typeof result.device_code!=='string'||typeof result.user_code!=='string'||!Number.isFinite(result.expires_in)||!Number.isFinite(result.interval))throw Error('Invalid device code');
      const interval=Math.max(5,Math.min(60,result.interval));
      this.pending={clientId:config.clientId,deviceCode:result.device_code,userCode:result.user_code.slice(0,30),interval,next:Date.now()+interval*1000,expires:Date.now()+Math.min(900,result.expires_in)*1000};
      return {pending:true,userCode:this.pending.userCode,interval};
    }catch{return {error:'unavailable'};}
  }
  async poll():Promise<CommunityAccount>{
    const pending=this.pending;if(!pending)return {};
    if(Date.now()>pending.expires){this.pending=undefined;return {error:'expired'};}
    const waiting=()=>({pending:true,userCode:pending.userCode,interval:pending.interval});
    if(Date.now()<pending.next)return waiting();
    pending.next=Date.now()+pending.interval*1000;
    try {
      const result=await this.json('https://github.com/login/oauth/access_token',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:pending.clientId,device_code:pending.deviceCode,grant_type:'urn:ietf:params:oauth:grant-type:device_code'}).toString()});
      if(this.pending!==pending)return {};
      if(result.error==='authorization_pending')return waiting();
      if(result.error==='slow_down'){pending.interval+=5;pending.next=Date.now()+pending.interval*1000;return waiting();}
      if(typeof result.access_token!=='string'||!/^[A-Za-z0-9_]{20,255}$/.test(result.access_token)){this.pending=undefined;return {error:'denied'};}
      // Public identity is sufficient. Reject unexpectedly broader grants.
      if(typeof result.scope==='string'&&result.scope.trim()){this.pending=undefined;return {error:'unexpected-permissions'};}
      this.token=result.access_token;this.loaded=true;this.pending=undefined;
      const generation=this.generation;
      await this.saveSession();
      if(generation!==this.generation)return {};
      const verified=await this.ratings();return verified.account??{};
    }catch{return this.pending===pending?{...waiting(),error:'unavailable'}:{};}
  }
}
