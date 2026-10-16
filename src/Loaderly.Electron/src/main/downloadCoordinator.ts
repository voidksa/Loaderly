import { normalizeDownloadControls, type DownloadControls, type DownloadControlState, type DownloadQueueEntry } from '../shared/downloadControl';
type Entry<T> = DownloadQueueEntry & { controller: AbortController; run: (signal:AbortSignal, rateKib:number, phase:(value:DownloadQueueEntry['phase'])=>void)=>Promise<T>; resolve:(value:T)=>void; reject:(reason:unknown)=>void; active:boolean };
export class DownloadCoordinator<T> {
  private entries: Entry<T>[] = [];
  private timer?: ReturnType<typeof setTimeout>;
  private settings: DownloadControls = normalizeDownloadControls();
  private stopped=false;
  private pendingSettings?: DownloadControls;
  constructor(private paused:()=>T, private notify:(state:DownloadControlState)=>void = ()=>{}, private canceled:()=>T=paused, private completed:(value:T)=>boolean=()=>false) {}
  state():DownloadControlState { return {settings:{...(this.pendingSettings??this.settings)}, entries:this.entries.map(({id,phase,scheduledAt,stopping})=>({id,phase,scheduledAt,stopping}))}; }
  configure(settings:DownloadControls) {
    const next=normalizeDownloadControls(settings);
    // Drain workers using the old allocation before starting a different allocation.
    if(this.entries.some(e=>e.active)){this.pendingSettings=next;this.notify(this.state());return;}
    this.settings=next;this.pendingSettings=undefined;this.pump();
  }
  enqueue(id:number, run:Entry<T>['run'], scheduledAt?:number):Promise<T> {
    if(this.stopped)return Promise.reject(new Error('QUEUE_STOPPED'));
    if(!Number.isSafeInteger(id)||this.entries.some(e=>e.id===id))return Promise.reject(new Error('DUPLICATE_DOWNLOAD_TASK'));
    if(this.entries.length>=1000)return Promise.reject(new Error('DOWNLOAD_QUEUE_FULL'));
    return new Promise((resolve,reject)=>{this.entries.push({id,phase:'queued',scheduledAt:Number.isFinite(scheduledAt)?scheduledAt:undefined,controller:new AbortController(),run,resolve,reject,active:false});this.pump();});
  }
  pause(id:number) {
    const entry=this.entries.find(e=>e.id===id);if(!entry||!['queued','preparing','downloading','waiting-audio','removing-music','saving-audio'].includes(entry.phase))return false;
    return this.interrupt(entry,'pause');
  }
  cancel(id:number) {
    const entry=this.entries.find(e=>e.id===id);return entry?this.interrupt(entry,'cancel'):false;
  }
  private interrupt(entry:Entry<T>,action:'pause'|'cancel') {
    if(entry.stopping)return false;
    entry.stopping=action;
    entry.controller.abort();
    if(!entry.active){this.entries=this.entries.filter(e=>e!==entry);this.pump();entry.resolve(action==='cancel'?this.canceled():this.paused());}
    else this.notify(this.state());
    return true;
  }
  move(id:number,direction:-1|1) {
    const candidates=this.entries.filter(e=>!e.active),index=candidates.findIndex(e=>e.id===id),other=candidates[index+direction];
    if(index<0||!other)return;const from=this.entries.indexOf(candidates[index]),to=this.entries.indexOf(other);
    [this.entries[from],this.entries[to]]=[this.entries[to],this.entries[from]];this.notify(this.state());
  }
  private pump() {
    clearTimeout(this.timer);
    if(this.stopped)return;
    if(this.pendingSettings){if(this.entries.some(e=>e.active)){this.notify(this.state());return;}this.settings=this.pendingSettings;this.pendingSettings=undefined;}
    let available=this.settings.concurrency-this.entries.filter(e=>e.active).length;
    for(const entry of this.entries){
      if(available<=0)break;if(entry.active||(entry.scheduledAt??0)>Date.now())continue;
      available--;entry.active=true;entry.phase='preparing';
      const rate=this.settings.rateKib ? this.settings.rateKib/this.settings.concurrency : 0;
      const finish=()=>{this.entries=this.entries.filter(e=>e!==entry);this.pump();};
      const interrupted=()=>entry.stopping==='cancel'?this.canceled():this.paused();
      Promise.resolve().then(()=>{
        if(entry.controller.signal.aborted)return interrupted();
        return entry.run(entry.controller.signal,rate,phase=>{if(!entry.stopping){entry.phase=phase;this.notify(this.state());}});
      }).then(value=>{
        // Remove the worker before delivering the terminal result. Otherwise a
        // queued notification can turn a finished/failed row into Preparing.
        finish();entry.resolve(entry.controller.signal.aborted&&!this.completed(value)?interrupted():value);
      },error=>{finish();if(entry.controller.signal.aborted)entry.resolve(interrupted());else entry.reject(error);});
    }
    const scheduled=this.entries.filter(e=>!e.active&&(e.scheduledAt??0)>Date.now()).map(e=>e.scheduledAt!);
    if(scheduled.length)this.timer=setTimeout(()=>this.pump(),Math.min(60000,Math.max(20,Math.min(...scheduled)-Date.now())));
    this.notify(this.state());
  }
  stop(){this.stopped=true;clearTimeout(this.timer);for(const e of this.entries){e.controller.abort();if(!e.active)e.resolve(this.paused());}}
}
