import {expect,it} from 'vitest';
import {audioSectionAt,audioSectionPieces,audioSectionsForOutput,normalizeAudioSections,adjustAudioSectionWindow} from './audioSections';
import {defaultAudioSettings} from './audioProcessing';
it('moves and resizes sections while keeping their sound, duration and adjacent sections intact',()=>{
  const parts=normalizeAudioSections([{id:'left',startSeconds:1,endSeconds:3},{id:'selected',startSeconds:5,endSeconds:7,settings:{bass:6}},{id:'right',startSeconds:10,endSeconds:12}],20),section=parts[1];
  const move=adjustAudioSectionWindow(section,parts,20,'move',9);
  expect([move.startSeconds,move.endSeconds,move.settings.bass]).toEqual([8,10,6]);
  expect(adjustAudioSectionWindow(section,parts,20,'start',0).startSeconds).toBe(3);
  expect(adjustAudioSectionWindow(section,parts,20,'end',18).endSeconds).toBe(10);
  expect(adjustAudioSectionWindow(section,parts,20,'move',-1).startSeconds).toBe(3);
  expect(adjustAudioSectionWindow(section,parts,20,'end',4).endSeconds).toBeCloseTo(5.01);
  expect(parts[1]).toBe(section);
});
it('returns the original sound outside a section and bounds unsafe persisted input',()=>{
  const parts=normalizeAudioSections([{id:'a',startSeconds:2,endSeconds:4,settings:{bass:100}},{id:'overlap',startSeconds:3,endSeconds:5},{startSeconds:NaN,endSeconds:8}],10);
  expect(parts).toHaveLength(1);expect(parts[0].settings.bass).toBe(12);
  expect(audioSectionAt(parts,2)?.id).toBe('a');expect(audioSectionAt(parts,4)).toBeUndefined();
  expect(audioSectionPieces(defaultAudioSettings,parts,6).map(p=>[p.start,p.end,p.settings.bass])).toEqual([[0,2,0],[2,4,12],[4,6,0]]);
});
it('retimes sound sections after cuts, trim and multiple speed effects',()=>{
  const parts=normalizeAudioSections([{id:'a',startSeconds:2,endSeconds:8,settings:{bass:6}},{id:'cut',startSeconds:8,endSeconds:9}]);
  const mapped=audioSectionsForOutput(parts,{ranges:[{startSeconds:1,endSeconds:4},{startSeconds:6,endSeconds:8}],speeds:[{startTime:2,endTime:7,rate:2}]});
  expect(mapped).toHaveLength(1);expect(mapped[0].startSeconds).toBe(1);expect(mapped[0].endSeconds).toBe(3.5);
});
