export const visualizerStyles = ['mirror', 'bars', 'wave', 'ring', 'dots', 'path'] as const;
export type VisualizerContour = { points: [number, number][]; closed: boolean; smooth: boolean };
export type VisualizerTypography = { text:string; font:'modern'|'classic'|'mono'|'custom'; weight:number; spacing:number; slant:number; stretch:number };
export type VisualizerShape = VisualizerContour & { mirror: boolean; aspect?:number; amplitude?:number; paths?:VisualizerContour[]; stroke?:'bars'|'dots'|'line'; thickness?:number; typography?:VisualizerTypography };
export const visualizerCodeLimit = 320000;
export function shapeContours(shape:VisualizerShape):VisualizerContour[] { return shape.paths?.length ? shape.paths : [shape]; }
export const defaultVisualizerShape: VisualizerShape = {points:[[.5,.12],[.88,.5],[.5,.88],[.12,.5]],closed:true,smooth:false,mirror:false,aspect:1,amplitude:.5};
export function normalizeVisualizerShape(value: unknown): VisualizerShape {
  const v = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const points: [number,number][] = [];
  if (Array.isArray(v.points)) for (const point of v.points.slice(0,64)) {
    if (Array.isArray(point) && point.length === 2 && point.every(n=>typeof n==='number' && Number.isFinite(n))) {
      const next: [number,number] = point.map(n=>Math.round(Math.max(0,Math.min(1,n))*10000)/10000) as [number,number];
      points.push(next);
    }
  }
  const paths:VisualizerContour[]=[];let remaining=4096;
  if(Array.isArray(v.paths))for(const item of v.paths.slice(0,96)){
    if(!item||typeof item!=='object'||!Array.isArray(item.points)||remaining<2)continue;
    const valid=item.points.slice(0,Math.min(256,remaining)).filter((p:unknown)=>Array.isArray(p)&&p.length===2&&p.every(n=>typeof n==='number'&&Number.isFinite(n))).map((p:number[])=>p.map(n=>Math.round(Math.max(0,Math.min(1,n))*10000)/10000) as [number,number]);
    if(valid.length>=2){paths.push({points:valid,closed:item.closed===true,smooth:item.smooth===true});remaining-=valid.length;}
  }
  const bounded=(x:unknown,min:number,max:number,fallback:number)=>typeof x==='number'&&Number.isFinite(x)?Math.max(min,Math.min(max,x)):fallback;
  const shape:VisualizerShape = { points:points.length>=2?points:defaultVisualizerShape.points.map(p=>[...p]), closed:typeof v.closed==='boolean'?v.closed:true, smooth:typeof v.smooth==='boolean'?v.smooth:false, mirror:typeof v.mirror==='boolean'?v.mirror:false,
    aspect:bounded(v.aspect,paths.length ? .05 : .25,paths.length ? 24 : 4,1),
    amplitude:typeof v.amplitude==='number'&&Number.isFinite(v.amplitude)?Math.max(0,Math.min(1,v.amplitude)):.5 };
  if(paths.length)shape.paths=paths;
  if(['bars','dots','line'].includes(v.stroke as string))shape.stroke=v.stroke as VisualizerShape['stroke'];
  if(typeof v.thickness==='number')shape.thickness=bounded(v.thickness,.5,8,2);
  const type=v.typography as Record<string,unknown>|undefined;
  if(type&&typeof type==='object'&&typeof type.text==='string')shape.typography={text:type.text.slice(0,40).replace(/[\u0000-\u001f]/g,''),font:['modern','classic','mono','custom'].includes(type.font as string)?type.font as VisualizerTypography['font']:'modern',weight:bounded(type.weight,300,900,700),spacing:bounded(type.spacing,-2,20,0),slant:bounded(type.slant,-20,20,0),stretch:bounded(type.stretch,60,150,100)};
  return shape;
}
export type AudioVisualizerSettings = {
  style: typeof visualizerStyles[number]; color: string; secondColor: string; gradient: boolean;
  background: string; backgroundEnd: string; backgroundGradient: boolean;
  width: number; height: number; positionX: number; positionY: number; count: number; gap: number; roundness: number;
  sensitivity: number; smoothing: number; glow: number; opacity: number;
  showTitle: boolean; showSubtitle: boolean; showBadges: boolean; title: string; subtitle: string;
  textColor: string; textSize: number;
  shape: VisualizerShape;
};
export const defaultVisualizer: AudioVisualizerSettings = {
  style:'mirror', color:'#c4cbd3', secondColor:'#ffffff', gradient:false,
  background:'#151515', backgroundEnd:'#242424', backgroundGradient:false,
  width:78, height:44, positionX:50, positionY:50, count:64, gap:6, roundness:5,
  sensitivity:1.25, smoothing:.72, glow:0, opacity:1,
  showTitle:true, showSubtitle:false, showBadges:false, title:'', subtitle:'', textColor:'#eef1f5', textSize:16,
  shape:defaultVisualizerShape
};
const color = (value:unknown, fallback:string) => typeof value === 'string' && /^#[\da-f]{6}$/i.test(value) ? value.toLowerCase() : fallback;
export function normalizeVisualizer(value:unknown):AudioVisualizerSettings {
  const v = value && typeof value === 'object' ? value as Record<string,unknown> : {};
  const n = (key:keyof AudioVisualizerSettings,min:number,max:number) => typeof v[key] === 'number' && Number.isFinite(v[key]) ? Math.max(min,Math.min(max,v[key] as number)) : defaultVisualizer[key] as number;
  const flag = (key:keyof AudioVisualizerSettings) => typeof v[key] === 'boolean' ? v[key] as boolean : defaultVisualizer[key] as boolean;
  const text = (key:string) => typeof v[key] === 'string' ? (v[key] as string).slice(0,160).replace(/[\u0000-\u001f]/g,'') : '';
  return {
    style:visualizerStyles.includes(v.style as AudioVisualizerSettings['style']) ? v.style as AudioVisualizerSettings['style'] : 'mirror',
    color:color(v.color,defaultVisualizer.color),secondColor:color(v.secondColor,defaultVisualizer.secondColor),gradient:flag('gradient'),
    background:color(v.background,defaultVisualizer.background),backgroundEnd:color(v.backgroundEnd,defaultVisualizer.backgroundEnd),backgroundGradient:flag('backgroundGradient'),
    width:n('width',20,100),height:n('height',15,80),positionX:n('positionX',10,90),positionY:n('positionY',10,90),count:Math.round(n('count',16,Array.isArray((v.shape as VisualizerShape)?.paths)?1200:160)),gap:n('gap',0,12),roundness:n('roundness',0,12),
    sensitivity:n('sensitivity',.25,3),smoothing:n('smoothing',0,.95),glow:n('glow',0,30),opacity:n('opacity',.15,1),
    showTitle:flag('showTitle'),showSubtitle:flag('showSubtitle'),showBadges:flag('showBadges'),title:text('title'),subtitle:text('subtitle'),
    textColor:color(v.textColor,defaultVisualizer.textColor),textSize:n('textSize',10,48),shape:normalizeVisualizerShape(v.shape)
  };
}
export function encodeVisualizer(value:AudioVisualizerSettings) {
  const settings=normalizeVisualizer(value),shape=settings.shape;
  return JSON.stringify({format:'loaderly-visualizer',version:shape.paths||shape.stroke||shape.thickness||shape.typography||settings.positionX!==50?3:2,settings},null,2);
}
export function decodeVisualizer(code:string):AudioVisualizerSettings | undefined {
  if (code.length > visualizerCodeLimit) return;
  try {
    const value=JSON.parse(code);
    if(value?.format !== 'loaderly-visualizer' || ![1,2,3].includes(value.version) || !value.settings || typeof value.settings !== 'object' || Array.isArray(value.settings)) return;
    return normalizeVisualizer(value.settings);
  } catch { return; }
}
export const visualizerPresets = [
  {id:'graphite',en:'Graphite',ar:'جرافيت',settings:defaultVisualizer},
  {id:'aurora',en:'Aurora',ar:'شفق',settings:{...defaultVisualizer,style:'wave',color:'#77e6cb',secondColor:'#ad9bf7',gradient:true,background:'#111820',glow:8,showTitle:false}},
  {id:'halo',en:'Halo',ar:'هالة',settings:{...defaultVisualizer,style:'ring',color:'#e7c895',secondColor:'#ee9bba',gradient:true,background:'#191619',height:65,showTitle:false}},
  {id:'studio',en:'Studio',ar:'استوديو',settings:{...defaultVisualizer,style:'bars',color:'#26323e',background:'#f3f2ef',textColor:'#26323e',count:48,gap:6}},
  {id:'silk',en:'Silk',ar:'حرير',settings:{...defaultVisualizer,style:'path',color:'#93dccf',secondColor:'#aab8ff',gradient:true,background:'#101c24',showTitle:false,count:120,glow:3,shape:{points:[[.08,.58],[.28,.36],[.5,.58],[.72,.36],[.92,.58]],closed:false,smooth:true,mirror:false,stroke:'line',thickness:3,amplitude:.7,aspect:2}}},
  {id:'ember-ring',en:'Ember ring',ar:'حلقة متوهجة',settings:{...defaultVisualizer,style:'ring',color:'#ffc98c',secondColor:'#f18fae',gradient:true,background:'#1c141c',height:65,count:64,gap:7,glow:4,showTitle:false}},
  {id:'starlight',en:'Starlight',ar:'نجوم',settings:{...defaultVisualizer,style:'dots',color:'#b9b0ef',secondColor:'#83d9ed',gradient:true,background:'#161523',count:48,gap:7,glow:2,showTitle:false}},
] as const;

export const visualizerShapePresets: {id:string;en:string;ar:string;shape:VisualizerShape}[] = [
  {id:'diamond',en:'Diamond',ar:'ماسة',shape:defaultVisualizerShape},
  {id:'heart',en:'Heart',ar:'قلب',shape:{points:[[.5,.27],[.27,.13],[.12,.32],[.2,.53],[.5,.87],[.8,.53],[.88,.32],[.73,.13]],closed:true,smooth:true,mirror:false}},
  {id:'orbit',en:'Orbit',ar:'مدار',shape:{points:[[.15,.5],[.28,.23],[.5,.12],[.72,.23],[.85,.5],[.72,.77],[.5,.88],[.28,.77]],closed:true,smooth:true,mirror:true}},
  {id:'ribbon',en:'Ribbon',ar:'شريط',shape:{points:[[.08,.65],[.27,.28],[.5,.65],[.73,.28],[.92,.65]],closed:false,smooth:true,mirror:true}},
  {id:'infinity',en:'Infinity',ar:'لانهاية',shape:{points:[[.5,.5],[.28,.2],[.08,.28],[.08,.72],[.28,.8],[.5,.5],[.72,.2],[.92,.28],[.92,.72],[.72,.8]],closed:true,smooth:true,mirror:false,stroke:'line',thickness:3,amplitude:.28,aspect:1.7}},
  {id:'arch',en:'Arch',ar:'قوس',shape:{points:[[.08,.8],[.13,.48],[.28,.21],[.5,.1],[.72,.21],[.87,.48],[.92,.8]],closed:false,smooth:true,mirror:false,amplitude:.35,aspect:1.4}},
  {id:'hexagon',en:'Hexagon',ar:'سداسي',shape:{points:[[.5,.1],[.85,.3],[.85,.7],[.5,.9],[.15,.7],[.15,.3]],closed:true,smooth:false,mirror:false,stroke:'line',thickness:3,amplitude:.3}},
  {id:'oval',en:'Oval',ar:'بيضاوي',shape:{points:[[.5,.15],[.78,.25],[.9,.5],[.78,.75],[.5,.85],[.22,.75],[.1,.5],[.22,.25]],closed:true,smooth:true,mirror:false,stroke:'dots',thickness:4,amplitude:.35,aspect:1.8}},
];
