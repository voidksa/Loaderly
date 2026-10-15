export type StudioMotionPoint = { time: number; x: number; y: number; width: number; opacity: number };
export function normalizeStudioMotion(value: unknown, duration: number): StudioMotionPoint[] {
  if (!Array.isArray(value)) return [];
  const n=(v:unknown,def:number,min:number,max:number)=>typeof v==='number'&&Number.isFinite(v)?Math.max(min,Math.min(max,v)):def;
  const points=value.slice(0,100).filter(p=>p&&typeof p==='object').map(p=>({time:n(p.time,0,0,duration),x:n(p.x,5,0,100),y:n(p.y,5,0,100),width:n(p.width,20,1,100),opacity:n(p.opacity,1,0,1)}));
  return [...new Map(points.map(p=>[p.time,p])).values()].sort((a,b)=>a.time-b.time);
}
export function studioMotionAt(points: readonly StudioMotionPoint[], time: number): StudioMotionPoint | undefined {
  if(!points.length)return;
  if(time<=points[0].time)return {...points[0],time};
  for(let i=1;i<points.length;i++)if(time<=points[i].time){const a=points[i-1],b=points[i],f=(time-a.time)/(b.time-a.time);return {time,x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,width:a.width+(b.width-a.width)*f,opacity:a.opacity+(b.opacity-a.opacity)*f};}
  return {...points[points.length-1],time};
}
export function motionExpression(points: readonly StudioMotionPoint[], key:'x'|'y'|'width'|'opacity', clock='t') {
  const n=(v:number)=>String(Number(v.toFixed(6)));let expression=n(points.at(-1)?.[key]??0);
  for(let i=points.length-2;i>=0;i--){const a=points[i],b=points[i+1];if(b.time<=a.time)continue;expression=`if(lt(${clock},${n(b.time)}),${n(a[key])}+(${n(b[key]-a[key])})*clip((${clock}-${n(a.time)})/${n(b.time-a.time)},0,1),${expression})`;}
  return expression;
}
