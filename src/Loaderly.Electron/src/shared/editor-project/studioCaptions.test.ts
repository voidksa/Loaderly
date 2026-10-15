import { expect, it } from 'vitest';
import { serializeStudioSubtitles, subtitleWarnings, wordCaptionAss } from './studioCaptions';
import { studioMotionAt, normalizeStudioMotion } from './studioMotion';
import { normalizeStudioEdits } from './studio';
it('preserves Arabic and mixed caption text and millisecond timings in portable formats',()=>{
 const cues=[{startSeconds:59.9996,endSeconds:62.234,text:'مرحبا Hello\nسطر ثانٍ'}];
 expect(serializeStudioSubtitles(cues,'srt')).toContain('00:01:00,000 --> 00:01:02,234');
 expect(serializeStudioSubtitles(cues,'vtt')).toContain('WEBVTT\n\n00:01:00.000');
 expect(serializeStudioSubtitles(cues,'srt')).toContain('مرحبا Hello');
 expect(subtitleWarnings([...cues,{startSeconds:61,endSeconds:60,text:'bad'}],100)).toEqual([1]);
});
it('preserves word timing beyond ten thousand words without expanding a filter per word',()=>{
 const words=Array.from({length:10001},(_,i)=>({start:i*.2,end:i*.2+.1,text:i===10000?'آخر كلمة':'word'}));
 const ass=wordCaptionAss(words,1080,1920,'#123456','pop');
 expect(ass.match(/Dialogue:/g)).toHaveLength(10001);expect(ass).toContain('آخر كلمة');expect(ass).toContain('&H00563412');
});
it('interpolates motion and validates untrusted layer and output settings',()=>{
 const points=normalizeStudioMotion([{time:0,x:10,y:20,width:30,opacity:1},{time:4,x:50,y:60,width:70,opacity:0}],10);
 expect(studioMotionAt(points,2)).toEqual({time:2,x:30,y:40,width:50,opacity:.5});
 const edits=normalizeStudioEdits({ranges:[{start:0,end:5,preset:{width:999999,height:1081,crf:-2}}]},10);
 expect(edits.ranges[0].preset).toMatchObject({width:3840,height:1080,crf:12});
});
