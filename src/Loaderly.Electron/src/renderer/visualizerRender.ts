import {drawVisualizerScene,type VisualizerVideoScene} from '../shared/editor-project/visualizerVideo';
const canvas=document.querySelector('canvas')!,ctx=canvas.getContext('2d')!;
let scene:VisualizerVideoScene,image:HTMLImageElement|undefined;
const api={
  async setup(value:VisualizerVideoScene,width:number,height:number){scene=value;canvas.width=width;canvas.height=height;await document.fonts.load('16px "Noto Sans Arabic"');if(value.image){image=new Image();image.src=value.image;await image.decode();}else image=undefined;},
  frame(spectrum:number[],waveform:number[]){drawVisualizerScene(ctx,canvas.width,canvas.height,scene,Uint8Array.from(spectrum),Uint8Array.from(waveform),image);return canvas.toDataURL('image/png').split(',')[1];}
};
(window as unknown as {visualizerRenderer:typeof api}).visualizerRenderer=api;
