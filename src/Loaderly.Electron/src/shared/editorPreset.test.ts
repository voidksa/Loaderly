import {expect,it} from 'vitest';
import {encodeEditorPreset,decodeEditorPreset,applyEditorPreset} from './editorPreset';
import {emptyStudioEdits} from './editor-project/studio';
it('shares portable settings, excludes private files and adapts text timing to the destination',()=>{
 const edits=emptyStudioEdits();edits.outputPreset={name:'Portrait',kind:'video',width:1080,height:1920,crf:20,directory:'/private/exports'};edits.audio.extraPath='/private/audio.wav';edits.overlays=[{id:'a',kind:'text',text:'مرحبا Hello',start:2,end:4,x:5,y:6,width:40,opacity:1,animation:'fade',color:'#ffffff',fontSize:30,path:'/private/no.png'},{id:'b',kind:'image',path:'/private/logo.png',start:0,end:3,x:0,y:0,width:10,opacity:1,animation:'none',color:'#ffffff',fontSize:30}];
 const code=encodeEditorPreset({duration:10,edits});expect(code).not.toContain('/private');expect(decodeEditorPreset(code)?.edits.overlays).toHaveLength(1);
 expect(applyEditorPreset(decodeEditorPreset(code)!,20).overlays[0]).toMatchObject({start:4,end:8,text:'مرحبا Hello'});
 expect(decodeEditorPreset(code.replace('"version": 1','"version": 99'))).toBeUndefined();
});
