import {expect,it} from 'vitest';
import {recommendedSpeechModel,speechSampleOffsets} from './speechPlan';
it('keeps the first download small, and uses installed accurate recognition on capable devices',()=>{
 expect(recommendedSpeechModel([],16*1024**3,8)).toBe('base');
 expect(recommendedSpeechModel(['base','small'],16*1024**3,8)).toBe('small');
 expect(recommendedSpeechModel(['small'],2*1024**3,2)).toBe('base');
});
it('samples different parts of long audio without scanning the entire recording',()=>{
 expect(speechSampleOffsets(10)).toEqual([0]);const offsets=speechSampleOffsets(3600);
 expect(offsets).toHaveLength(3);expect(offsets[0]).toBeLessThanOrEqual(30);expect(offsets[2]).toBeGreaterThan(3000);
 expect(()=>speechSampleOffsets(NaN)).toThrow();
});
