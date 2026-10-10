import {it,expect} from 'vitest';
import {audioFilterChain,normalizeAudioSettings,audioOutputTime,resetAudioControls} from './audioProcessing';
it('resets only the selected sound controls and retains other edits',()=>{
 const audio=normalizeAudioSettings({gainDb:-8,bass:6,treble:3,mono:true,muted:true,fadeIn:2,fadeOut:3,space:{enabled:true,type:'room',mix:42}});
 const level=resetAudioControls(audio,'level');expect(level).toMatchObject({gainDb:0,bass:0,treble:0,mono:false,muted:false,fadeIn:2,fadeOut:3});expect(level.space).toEqual(audio.space);
 const fades=resetAudioControls(audio,'fades');expect(fades).toEqual({...audio,fadeIn:0,fadeOut:0});
 const space=resetAudioControls(audio,'space');expect(space.space?.enabled).toBe(false);expect({...space,space:audio.space}).toEqual(audio);
 expect(audio.gainDb).toBe(-8);
});
it('clamps persisted audio values and prevents FFmpeg filter injection',()=>{const value=normalizeAudioSettings({gainDb:'0;evil',fadeOut:Infinity,bass:100});expect(value.gainDb).toBe(0);expect(value.fadeOut).toBe(0);expect(value.bass).toBe(12)});
it('keeps default audio untouched and bounds fades on short outputs',()=>{expect(audioFilterChain({},3)).toBe('');expect(audioFilterChain({fadeIn:5,fadeOut:5},2)).toBe('afade=t=in:d=2.0000,afade=t=out:st=0.0000:d=2.0000')});

it("maps fade positions after cuts and speed changes",()=>{const t={ranges:[{startSeconds:2,endSeconds:4},{startSeconds:6,endSeconds:10}],speed:{startTime:3,endTime:8,rate:2}};expect(audioOutputTime(3,t)).toBe(1);expect(audioOutputTime(5,t)).toBe(1.5);expect(audioOutputTime(9,t)).toBe(3.5);expect(audioOutputTime(Infinity,t)).toBe(4.5)});

it("maps multiple speed intervals independently",()=>{expect(audioOutputTime(Infinity,{ranges:[{startSeconds:0,endSeconds:3}],speeds:[{startTime:0,endTime:1,rate:2},{startTime:2,endTime:3,rate:.5}]})).toBe(3.5)});
