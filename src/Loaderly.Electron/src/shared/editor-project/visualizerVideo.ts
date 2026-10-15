import type {AudioVisualizerSettings} from './audioVisualizer';
export type VisualizerVideoScene={settings:AudioVisualizerSettings;title:string;image?:string;imageMode:'cover'|'logo';logoSize:number;logoX:number;logoY:number};
export type VisualizerVideoOptions={captions?:readonly import('./editorSubtitles').EditorSubtitleCue[];scene:VisualizerVideoScene;size:'landscape'|'portrait'|'square';resolution:720|1080};
export type VisualizerExportProgress={phase:'preparing'|'rendering'|'finishing'|'complete'|'canceled'|'error';percent:number;path?:string;message?:string};
export function videoDimensions(options:Pick<VisualizerVideoOptions,'size'|'resolution'>) {
  const short=options.resolution===720?720:1080,long=short===720?1280:1920;
  return options.size==='portrait'?[short,long]:options.size==='square'?[short,short]:[long,short];
}
/** Keep the spectrum and its captions together, including at the canvas edges. */
export function layoutVisualizerScene(width:number,height:number,s:AudioVisualizerSettings) {
  const scale=Math.min(width,height)/540,padding=12*scale,font=s.textSize*scale;
  const titleHeight=s.showTitle?font*1.25:0,subtitleHeight=s.showSubtitle&&s.subtitle?font:0;
  const textHeight=titleHeight+subtitleHeight+(titleHeight&&subtitleHeight?font*.45:0);
  const gap=textHeight?font*.8:0;
  const w=Math.min(width-2*padding,width*s.width/100);
  const h=Math.min(height-2*padding-gap-textHeight,height*s.height/100);
  const cx=Math.max(padding+w/2,Math.min(width-padding-w/2,width*s.positionX/100));
  const cy=Math.max(padding+h/2,Math.min(height-padding-h/2-gap-textHeight,height*s.positionY/100));
  return {w,h,cx,cy,font,titleY:cy+h/2+gap,subtitleY:cy+h/2+gap+(titleHeight?font*1.7:0),textHeight,padding};
}
export function drawVisualizerScene(ctx:CanvasRenderingContext2D,width:number,height:number,scene:VisualizerVideoScene,spectrum:Uint8Array,waveform:Uint8Array,image?:CanvasImageSource) {
  const s=scene.settings;
  ctx.save();ctx.clearRect(0,0,width,height);
  const bg=ctx.createLinearGradient(0,0,width,height);bg.addColorStop(0,s.background);bg.addColorStop(1,s.backgroundGradient?s.backgroundEnd:s.background);ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);
  if(image){const source=image as HTMLImageElement;const iw=source.naturalWidth||source.width,ih=source.naturalHeight||source.height;
    if(iw&&ih){if(scene.imageMode==='cover'){const f=Math.max(width/iw,height/ih);ctx.drawImage(image,(width-iw*f)/2,(height-ih*f)/2,iw*f,ih*f);}else{const edge=Math.min(width,height)*scene.logoSize/100,f=Math.min(edge/iw,edge/ih);ctx.drawImage(image,width*scene.logoX/100-iw*f/2,height*scene.logoY/100-ih*f/2,iw*f,ih*f);}}}
  const {w,h,cx,cy,font,titleY,subtitleY}=layoutVisualizerScene(width,height,s);
  ctx.save();ctx.translate(cx-w/2,cy-h/2);drawVisualizer(ctx,w,h,s,spectrum,waveform);ctx.restore();
  ctx.fillStyle=s.textColor;ctx.textAlign='center';ctx.textBaseline='top';
  ctx.font=`600 ${font}px "Noto Sans Arabic", "Segoe UI", sans-serif`;
  if(s.showTitle)ctx.fillText(s.title||scene.title,cx,titleY,Math.min(width*.9,w));
  ctx.font=`400 ${font*.8}px "Noto Sans Arabic", "Segoe UI", sans-serif`;
  if(s.showSubtitle&&s.subtitle)ctx.fillText(s.subtitle,cx,subtitleY,Math.min(width*.9,w));
  ctx.restore();
}
import {drawVisualizer} from './audioVisualizerDrawing';
