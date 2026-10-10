import {it,expect,vi,afterEach} from 'vitest';
import {startAudioPreview,type AudioPreviewState} from './audioPreviewEngine';
import {defaultAudioSettings} from '../../shared/editor-project/audioProcessing';
import {spacePreset} from '../../shared/editor-project/audioSpace';
class Media extends EventTarget {readyState=4;currentTime=0;paused=false;playbackRate=1;preservesPitch=true;}
class Node {
 gain={value:0,setTargetAtTime:vi.fn()};frequency={value:0};Q={value:0};type='';buffer:unknown;channelCount=2;channelCountMode='max';
 connect(next:Node){return next;}
}
class Context {
 static instances:Context[]=[];currentTime=0;sampleRate=8000;state='running';destination=new Node();gains:Node[]=[];convolver=new Node();
 close=vi.fn(async()=>{});resume=vi.fn(async()=>{});createBuffer=vi.fn(()=>({copyToChannel:vi.fn()}));
 constructor(){Context.instances.push(this);}
 createMediaElementSource(){return new Node();}createBiquadFilter(){return new Node();}createAnalyser(){return new Node();}createConvolver(){return this.convolver;}
 createGain(){const node=new Node();this.gains.push(node);return node;}
}
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();Context.instances=[];});
it('keeps audio edits on the media clock without rendering frames or rebuilding reverb on a frame gap',()=>{
 vi.useFakeTimers({toFake:['setInterval','clearInterval','performance']});vi.stubGlobal('AudioContext',Context);
 vi.stubGlobal('requestAnimationFrame',()=>{throw Error('Audio cannot depend on animation frames');});
 const media=new Media(),state:AudioPreviewState={settings:{...defaultAudioSettings,space:spacePreset('room')},timeline:{ranges:[{startSeconds:0,endSeconds:30}],speeds:[{startTime:2,endTime:5,rate:.75,mode:'normal'}]},sections:[{id:'quiet',startSeconds:2,endSeconds:5,settings:{...defaultAudioSettings,gainDb:-12,space:spacePreset('room')}}]};
 const publish=vi.fn(),stop=startAudioPreview(()=>media as unknown as HTMLMediaElement,()=>state,publish),context=Context.instances[0];
 expect(context.createBuffer).toHaveBeenCalledTimes(1);
 media.currentTime=3;vi.advanceTimersByTime(200);expect(media.playbackRate).toBe(.75);expect(media.preservesPitch).toBe(false);expect(context.gains[1].gain.value).toBeCloseTo(10**(-12/20));
 expect(context.createBuffer).toHaveBeenCalledTimes(1);
 media.currentTime=6;vi.advanceTimersByTime(200);expect(media.playbackRate).toBe(1);expect(context.gains[1].gain.value).toBe(1);expect(context.createBuffer).toHaveBeenCalledTimes(1);
 media.currentTime=12;media.dispatchEvent(new Event('seeking'));expect(context.createBuffer).toHaveBeenCalledTimes(2);
 media.paused=true;media.dispatchEvent(new Event('pause'));expect(context.gains[1].gain.value).toBe(0);
 stop();expect(context.close).toHaveBeenCalledTimes(1);expect(publish).toHaveBeenLastCalledWith(null);expect(vi.getTimerCount()).toBe(0);
});
it('switches media sources and releases the previous audio graph',()=>{
 vi.useFakeTimers();vi.stubGlobal('AudioContext',Context);let media:Media|null=new Media();
 const stop=startAudioPreview(()=>media as unknown as HTMLMediaElement|null,()=>({settings:defaultAudioSettings,timeline:{ranges:[]},sections:[]}),()=>{});
 media=new Media();vi.advanceTimersByTime(40);expect(Context.instances).toHaveLength(2);expect(Context.instances[0].close).toHaveBeenCalledTimes(1);
 media=null;vi.advanceTimersByTime(40);expect(Context.instances[1].close).toHaveBeenCalledTimes(1);stop();
});
