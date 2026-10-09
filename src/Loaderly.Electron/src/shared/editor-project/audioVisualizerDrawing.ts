import type { AudioVisualizerSettings, VisualizerShape } from './audioVisualizer';
type Point = [number,number];
const cache = new WeakMap<VisualizerShape,Point[]>();
export function shapeCurve(shape:VisualizerShape):Point[] {
  const previous=cache.get(shape);if(previous)return previous;
  const points=shape.points, result:Point[]=[];
  const at=(i:number)=>points[shape.closed?(i+points.length)%points.length:Math.max(0,Math.min(points.length-1,i))];
  for(let i=0;i<(shape.closed?points.length:points.length-1);i++){
    const a=at(i-1),b=at(i),c=at(i+1),d=at(i+2);
    for(let n=0;n<(shape.smooth?12:1);n++){
      const t=n/12;
      result.push(shape.smooth?[0,1].map(k=>Math.max(0,Math.min(1,.5*((2*b[k])+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t*t+(-a[k]+3*b[k]-3*c[k]+d[k])*t*t*t)))) as Point:[...b]);
    }
  }
  result.push([...at(shape.closed?0:points.length-1)]);cache.set(shape,result);return result;
}
export function sampleShape(shape:VisualizerShape,count:number):{point:Point;normal:Point}[] {
  const curve=shapeCurve(shape).map(([x,y])=>[x*(shape.aspect??1),y] as Point),lengths=[0];
  for(let i=1;i<curve.length;i++)lengths.push(lengths[i-1]+Math.hypot(curve[i][0]-curve[i-1][0],curve[i][1]-curve[i-1][1]));
  const total=lengths[lengths.length-1];if(total<.001)return [];
  const result:{point:Point;normal:Point}[]=[];let index=1;
  for(let i=0;i<count;i++){
    const distance=i/(shape.closed?count:Math.max(1,count-1))*total;
    while(index<curve.length-1&&lengths[index]<distance)index++;
    const a=curve[index-1],b=curve[index],span=lengths[index]-lengths[index-1],t=span?Math.min(1,(distance-lengths[index-1])/span):0;
    result.push({point:[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],normal:span?[(b[1]-a[1])/span,-(b[0]-a[0])/span]:[0,-1]});
  }return result;
}
const samples=new WeakMap<VisualizerShape,Map<number,ReturnType<typeof sampleShape>>>();
export function fitShape(shape:VisualizerShape,width:number,height:number) {
  const curve=shapeCurve(shape),aspect=shape.aspect??1;
  const xs=curve.map(p=>p[0]*aspect),ys=curve.map(p=>p[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const reach=Math.min(width,height)*.22*(shape.amplitude??.5),padding=reach+4;
  const scale=Math.max(.01,Math.min(Math.max(1,width-2*padding)/Math.max(.001,maxX-minX),Math.max(1,height-2*padding)/Math.max(.001,maxY-minY)));
  return {scale,x:(width-(maxX-minX)*scale)/2-minX*scale,y:(height-(maxY-minY)*scale)/2-minY*scale,reach};
}
export function drawVisualizer(ctx:CanvasRenderingContext2D,width:number,height:number,s:AudioVisualizerSettings,spectrum:Uint8Array,waveform:Uint8Array) {
  const gradient=ctx.createLinearGradient(0,0,width,height);gradient.addColorStop(0,s.color);gradient.addColorStop(1,s.secondColor);
  ctx.fillStyle=ctx.strokeStyle=s.gradient?gradient:s.color;ctx.globalAlpha=s.opacity;ctx.shadowBlur=s.glow;ctx.shadowColor=s.color;
  const magnitude=(i:number)=>Math.min(1,(spectrum[Math.min(spectrum.length-1,Math.floor((i/s.count)**2*768))]||0)/255*s.sensitivity);
  if(s.style==='path'){
    let entries=samples.get(s.shape);if(!entries){entries=new Map();samples.set(s.shape,entries);}
    let points=entries.get(s.count);if(!points){points=sampleShape(s.shape,s.count);entries.set(s.count,points);}
    const fit=fitShape(s.shape,width,height);
    let length=0;for(let i=1;i<points.length;i++)length+=Math.hypot(points[i].point[0]-points[i-1].point[0],points[i].point[1]-points[i-1].point[1])*fit.scale;
    const spacing=length/Math.max(1,points.length-1);
    ctx.lineWidth=Math.max(.6,Math.min(10,spacing-Math.min(s.gap,spacing*.85)));ctx.lineCap=s.roundness>0?'round':'butt';
    for(let i=0;i<points.length;i++){
      const {point:p,normal:n}=points[i],x=fit.x+p[0]*fit.scale,y=fit.y+p[1]*fit.scale,h=Math.max(1.5,magnitude(i)*fit.reach),back=s.shape.mirror?h:0;
      ctx.beginPath();ctx.moveTo(x-n[0]*back,y-n[1]*back);ctx.lineTo(x+n[0]*h,y+n[1]*h);ctx.stroke();
    }
  }else if(s.style==='wave'){
    ctx.beginPath();ctx.lineWidth=Math.max(1.5,s.roundness/2);ctx.lineCap='round';ctx.lineJoin='round';
    const points=s.count*4;
    for(let i=0;i<=points;i++){const v=((waveform[Math.min(waveform.length-1,Math.floor(i/points*(waveform.length-1)))]??128)-128)/128;const x=i/points*width,y=height/2+Math.max(-1,Math.min(1,v*s.sensitivity))*height*.43;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();
  }else if(s.style==='ring'){
    const radius=Math.min(width,height)*.26,reach=Math.min(width,height)*.2;
    ctx.lineWidth=Math.max(1,(2*Math.PI*radius/s.count)*Math.max(.15,1-s.gap/14));ctx.lineCap=s.roundness>0?'round':'butt';
    for(let i=0;i<s.count;i++){const angle=i/s.count*Math.PI*2-Math.PI/2,outer=radius+Math.max(2,magnitude(i)*reach);ctx.beginPath();ctx.moveTo(width/2+Math.cos(angle)*radius,height/2+Math.sin(angle)*radius);ctx.lineTo(width/2+Math.cos(angle)*outer,height/2+Math.sin(angle)*outer);ctx.stroke();}
  }else{
    const slot=width/s.count,barWidth=Math.max(1,slot-Math.min(s.gap,slot*.85));
    for(let i=0;i<s.count;i++){
      const h=Math.max(2,magnitude(i)*height*.88),x=i*slot+(slot-barWidth)/2,y=s.style==='bars'?height-h:(height-h)/2;
      if(s.style==='dots'){
        const radius=Math.max(.8,Math.min(barWidth/2,5)),step=radius*2+3;
        for(let d=0;d<=h;d+=step){ctx.beginPath();ctx.arc(x+barWidth/2,y+d,radius,0,Math.PI*2);ctx.fill();}
      }else{ctx.beginPath();ctx.roundRect(x,y,barWidth,h,Math.min(s.roundness,barWidth/2,h/2));ctx.fill();}
    }
  }ctx.globalAlpha=1;ctx.shadowBlur=0;
}
