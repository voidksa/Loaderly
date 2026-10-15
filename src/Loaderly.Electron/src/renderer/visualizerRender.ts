import {drawVisualizerScene,type VisualizerVideoScene} from '../shared/editor-project/visualizerVideo';
import {drawAudioCaption} from '../shared/editor-project/audioCaptions';
import type {EditorSubtitleCue} from '../shared/editor-project/editorSubtitles';
let captions:readonly EditorSubtitleCue[]=[];
const canvas=document.querySelector('canvas')!,ctx=canvas.getContext('2d')!;
let scene:VisualizerVideoScene,image:HTMLImageElement|undefined;
const api={
  async setup(value:VisualizerVideoScene,width:number,height:number,cues:readonly EditorSubtitleCue[]=[]){scene=value;captions=cues;canvas.width=width;canvas.height=height;await document.fonts.load('16px "Noto Sans Arabic"');if(value.image){image=new Image();image.src=value.image;await image.decode();}else image=undefined;},
  frame(spectrum:number[],waveform:number[],time=0){drawVisualizerScene(ctx,canvas.width,canvas.height,scene,Uint8Array.from(spectrum),Uint8Array.from(waveform),image);drawAudioCaption(ctx,canvas.width,canvas.height,captions.filter(cue=>time>=cue.startSeconds&&time<cue.endSeconds).map(cue=>cue.text).join('\n'));return canvas.toDataURL('image/png').split(',')[1];}
};
(window as unknown as {visualizerRenderer:typeof api}).visualizerRenderer=api;
