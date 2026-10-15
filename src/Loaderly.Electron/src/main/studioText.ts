import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { studioProcess } from './studioProcess';

const filterPath=(path:string)=>path.replaceAll('\\','/').replaceAll(':','\\:').replaceAll("'","'\\''");
// Shape text once at a fixed font size. Animating drawtext's font size can crash
// native font/shaping libraries; an RGBA texture also preserves Arabic shaping.
export async function studioTextTexture(ffmpeg:string,directory:string,id:number,text:string,font:string,size:number,color:string,width:number,height:number,signal?:AbortSignal){
  width=Math.max(2,Math.min(4096,Math.round(width)));height=Math.max(2,Math.min(4096,Math.round(height)));
  const textFile=join(directory,`motion-text-${id}.txt`),raw=join(directory,`motion-text-${id}.rgba`),path=join(directory,`motion-text-${id}.png`);
  await writeFile(textFile,text,'utf8');
  const {stdout}=await studioProcess(ffmpeg,['-v','error','-f','lavfi','-i',`color=black@0:s=${width}x${height},format=rgba`,'-vf',`drawtext=fontfile='${filterPath(font)}':textfile='${filterPath(textFile)}':expansion=none:fontsize=${size}:fontcolor=${color}:x=0:y=0`,'-frames:v','1','-pix_fmt','rgba','-f','rawvideo','-'],{signal,maxOutput:width*height*4});
  let left=width,right=-1,top=height,bottom=-1;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(stdout[(y*width+x)*4+3]){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  // Keep the original top-left so position remains identical to drawtext.
  const w=Math.max(2,right+1),h=Math.max(2,bottom+1),pixels=Buffer.alloc(w*h*4);
  for(let y=0;y<h;y++)stdout.copy(pixels,y*w*4,y*width*4,y*width*4+w*4);
  await writeFile(raw,pixels);
  await studioProcess(ffmpeg,['-v','error','-y','-f','rawvideo','-pixel_format','rgba','-video_size',`${w}x${h}`,'-i',raw,'-frames:v','1',path],{signal});
  return {path,width:w};
}
