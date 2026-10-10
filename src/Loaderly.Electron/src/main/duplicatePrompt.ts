import {randomUUID} from 'node:crypto';
import type {DuplicateChoice,DuplicateDownloadPrompt} from '../shared/download-url/mediaIdentity';

export class DuplicatePrompts {
  private pending=new Map<string,{owner:number;finish:(choice:DuplicateChoice)=>void}>();
  request(owner:number,details:Omit<DuplicateDownloadPrompt,'id'>,send:(prompt:DuplicateDownloadPrompt)=>void):Promise<DuplicateChoice>{
    return new Promise(resolve=>{
      const id=randomUUID();
      const timer=setTimeout(()=>this.reply(owner,id,'skip'),5*60*1000);
      this.pending.set(id,{owner,finish:choice=>{clearTimeout(timer);this.pending.delete(id);resolve(choice);}});
      try{send({...details,id});}catch{this.reply(owner,id,'skip');}
    });
  }
  reply(owner:number,id:unknown,choice:unknown):boolean {
    if(typeof id!=='string'||!['skip','keep','replace'].includes(choice as string))return false;
    const pending=this.pending.get(id);
    if(!pending||pending.owner!==owner)return false;
    pending.finish(choice as DuplicateChoice);return true;
  }
  cancel(owner:number){for(const item of this.pending.values())if(item.owner===owner)item.finish('skip');}
}
