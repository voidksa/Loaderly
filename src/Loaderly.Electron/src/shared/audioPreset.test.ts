import {it,expect} from 'vitest';
import {encodeSoundPreset,decodeSoundPreset} from './audioPreset';
import {defaultAudioSettings} from './editor-project/audioProcessing';
import {spacePreset} from './editor-project/audioSpace';
it('roundtrips sound and speed without paths, project timings or private fields',()=>{
 const input={audio:{...defaultAudioSettings,space:spacePreset('tape'),sourcePath:'private.wav'},speed:{rate:.75,mode:'preserve-pitch' as const,startTime:123},apiKey:'secret'};
 const code=encodeSoundPreset(input),result=decodeSoundPreset(code);expect(result?.audio.space).toEqual(input.audio.space);expect(result?.speed).toEqual({rate:.75,mode:'preserve-pitch'});expect(code).not.toMatch(/private|secret|startTime/);
});
it('rejects unknown versions, malformed speed and huge data; clamps audio filter values',()=>{
 expect(decodeSoundPreset('{"format":"loaderly-sound","version":2,"audio":{}}')).toBeUndefined();expect(decodeSoundPreset('x'.repeat(8193))).toBeUndefined();
 expect(decodeSoundPreset(JSON.stringify({format:'loaderly-sound',version:1,audio:{},speed:{rate:99,mode:'normal'}}))).toBeUndefined();
 expect(decodeSoundPreset(JSON.stringify({format:'loaderly-sound',version:1,audio:{bass:'12;exec',gainDb:100}}))?.audio).toMatchObject({bass:0,gainDb:12});
});
