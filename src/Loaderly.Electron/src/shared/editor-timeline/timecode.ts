export function formatTimecode(seconds:number,precise=true):string {
  const ticks=Math.max(0,Math.round((Number.isFinite(seconds)?seconds:0)*100));
  const hours=Math.floor(ticks/360000),minutes=Math.floor(ticks/6000)%60;
  const tail=`${String(minutes).padStart(2,'0')}:${String(Math.floor(ticks/100)%60).padStart(2,'0')}.${String(ticks%100).padStart(2,'0')}`;
  const result=hours?`${String(hours).padStart(2,'0')}:${tail}`:tail;
  return precise?result:result.slice(0,-3);
}
export function parseTimecode(text:string):number|undefined {
  const value=text.trim().replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-0x660)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-0x6f0)).replace('٫','.');
  if(!/^\d+(?::\d{1,2}){0,2}(?:\.\d{1,3})?$/.test(value))return;
  const parts=value.split(':').map(Number);
  if(parts.slice(1).some(n=>n>=60))return;
  const seconds=parts.reduce((total,n)=>total*60+n,0);
  return Number.isFinite(seconds)?seconds:undefined;
}
