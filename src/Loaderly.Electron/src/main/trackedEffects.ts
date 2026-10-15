import type { EffectRegionKeyframe } from '../shared/editor-project/editorProject';

const num=(v:number)=>String(Number(v.toFixed(6)));
export function trackedRegionExpression(points:readonly EffectRegionKeyframe[],key:'x'|'y'|'width'|'height',clock:string){
  const sorted=[...new Map(points.filter(p=>Number.isFinite(p.timeSeconds)&&['x','y','width','height'].every(k=>Number.isFinite(p.region[k as keyof typeof p.region]))).map(p=>[p.timeSeconds,p])).values()].sort((a,b)=>a.timeSeconds-b.timeSeconds);
  // Remove exactly collinear points so a long steady motion is one expression.
  const compact:typeof sorted=[];
  for(const point of sorted){compact.push(point);while(compact.length>=3){const [a,b,c]=compact.slice(-3),f=(b.timeSeconds-a.timeSeconds)/(c.timeSeconds-a.timeSeconds);if(['x','y','width','height'].some(k=>Math.abs(a.region[k as 'x']+(c.region[k as 'x']-a.region[k as 'x'])*f-b.region[k as 'x'])>.00001))break;compact.splice(compact.length-2,1);}}
  if(!compact.length)return '0';
  // Sum finite ramps instead of nesting thousands of if expressions.
  return [num(compact[0].region[key]),...compact.slice(1).flatMap((b,i)=>{const a=compact[i],delta=b.region[key]-a.region[key];return Math.abs(delta)<.000001?[]:[`(${num(delta)})*clip((${clock}-${num(a.timeSeconds)})/${num(b.timeSeconds-a.timeSeconds)},0,1)`];})].join('+');
}

export type TrackedOptions={index:number;start:number;end:number;offset:number;duration:number;frame?:number;width:number;height:number};
export function appendTrackedBlur(graph:string[],input:string,output:string,points:readonly EffectRegionKeyframe[],options:TrackedOptions&{strength:number;shape?:string;pixelated:boolean}){
  const clock=options.frame===undefined?`(t+${num(options.offset)})`:num(options.frame);
  const e=(key:'x'|'y'|'width'|'height')=>`(${trackedRegionExpression(points,key,clock)})`;
  const width=`max(2,round(${options.width}*clip(${e('width')},4,100)/100))`,height=`max(2,round(${options.height}*clip(${e('height')},4,100)/100))`;
  const left=`clip(${options.width}*${e('x')}/100-w/2,0,${options.width}-w)`,top=`clip(${options.height}*${e('y')}/100-h/2,0,${options.height}-h)`;
  const ellipse='if(lte(pow((X-W/2)/(W/2),2)+pow((Y-H/2)/(H/2),2),1),255,0)';
  const radius='min(W,H)*0.18',rounded=`if(lte(pow(max(abs(X-W/2)-(W/2-${radius}),0),2)+pow(max(abs(Y-H/2)-(H/2-${radius}),0),2),pow(${radius},2)),255,0)`;
  const alpha=options.shape==='ellipse'||options.shape==='face'?ellipse:options.shape==='rounded'?rounded:undefined;
  const active=`gte(${clock},${num(options.start)})*lt(${clock},${num(options.end)})`;
  const id=`track${options.index}`,base=id+'base',effect=id+'effect',background=id+'background',shape=id+'shape',mask=id+'mask',filtered=id+'filtered';
  graph.push(`[${input}]format=gbrp,split=3[${base}][${effect}][${background}]`);
  const block=Math.max(2,Math.round(options.strength*2));
  graph.push(`[${effect}]${options.pixelated?`scale=${Math.max(1,Math.round(options.width/block))}:${Math.max(1,Math.round(options.height/block))}:flags=area,scale=${options.width}:${options.height}:flags=neighbor`:`gblur=sigma=${num(options.strength)}:steps=2`}[${filtered}]`);
  // Shape pixels are calculated on one small fixed canvas. Position and size
  // expressions are evaluated once per mask frame, not once per output pixel.
  graph.push(`color=white:s=64x64:r=60:d=${num(Math.max(.1,options.duration))},format=rgba${alpha?`,geq=r=255:g=255:b=255:a='${alpha}'`:''},scale=w='${width}':h='${height}':eval=frame[${shape}]`);
  graph.push(`[${background}]lutrgb=r=0:g=0:b=0[${id}black]`);
  graph.push(`[${id}black][${shape}]overlay=x='${left}':y='${top}':format=rgb:eof_action=pass:enable='${active}',format=gbrp[${mask}]`);
  graph.push(`[${base}][${filtered}][${mask}]maskedmerge[${output}]`);
}
export function appendTrackedZoom(graph:string[],input:string,output:string,points:readonly EffectRegionKeyframe[],options:TrackedOptions){
  const clock=options.frame===undefined?`(t+${num(options.offset)})`:num(options.frame);
  const e=(key:'x'|'y'|'width')=>`(${trackedRegionExpression(points,key,clock)})`;
  const scale=`clip(100/max(1,${e('width')}),1,8)`,scaledWidth=`trunc(${options.width}*(${scale})/2)*2`,scaledHeight=`trunc(${options.height}*(${scale})/2)*2`;
  // crop's iw/ih can retain the initial size after scale changes per frame.
  // Derive each position from the same current dimensions as the scaler.
  const x=`clip(((${scaledWidth})*${e('x')}/100)-ow/2,0,(${scaledWidth})-ow)`,y=`clip(((${scaledHeight})*${e('y')}/100)-oh/2,0,(${scaledHeight})-oh)`;
  const base=`zoom${options.index}base`,source=`zoom${options.index}src`,effect=`zoom${options.index}effect`;
  graph.push(`[${input}]split[${base}][${source}]`);
  graph.push(`[${source}]scale=w='trunc(${options.width}*(${scale})/2)*2':h='trunc(${options.height}*(${scale})/2)*2':eval=frame,crop=w=${options.width}:h=${options.height}:x='${x}':y='${y}',setsar=1[${effect}]`);
  graph.push(`[${base}][${effect}]overlay=0:0:enable='gte(${clock},${num(options.start)})*lt(${clock},${num(options.end)})'[${output}]`);
}
