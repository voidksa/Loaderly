export const visualizerStyles = ['mirror', 'bars', 'wave', 'ring', 'dots', 'path'] as const;
export type VisualizerShape = { points: [number, number][]; closed: boolean; smooth: boolean; mirror: boolean; aspect?:number; amplitude?:number };
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
  return { points:points.length>=2?points:defaultVisualizerShape.points.map(p=>[...p]), closed:typeof v.closed==='boolean'?v.closed:true, smooth:typeof v.smooth==='boolean'?v.smooth:false, mirror:typeof v.mirror==='boolean'?v.mirror:false,
    aspect:typeof v.aspect==='number'&&Number.isFinite(v.aspect)?Math.max(.25,Math.min(4,v.aspect)):1,
    amplitude:typeof v.amplitude==='number'&&Number.isFinite(v.amplitude)?Math.max(0,Math.min(1,v.amplitude)):.5 };
}
export type AudioVisualizerSettings = {
  style: typeof visualizerStyles[number]; color: string; secondColor: string; gradient: boolean;
  background: string; backgroundEnd: string; backgroundGradient: boolean;
  width: number; height: number; positionY: number; count: number; gap: number; roundness: number;
  sensitivity: number; smoothing: number; glow: number; opacity: number;
  showTitle: boolean; showSubtitle: boolean; showBadges: boolean; title: string; subtitle: string;
  textColor: string; textSize: number;
  shape: VisualizerShape;
};
export const defaultVisualizer: AudioVisualizerSettings = {
  style:'mirror', color:'#c4cbd3', secondColor:'#ffffff', gradient:false,
  background:'#151515', backgroundEnd:'#242424', backgroundGradient:false,
  width:78, height:44, positionY:50, count:80, gap:4, roundness:3,
  sensitivity:1, smoothing:.8, glow:0, opacity:1,
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
    width:n('width',20,100),height:n('height',15,80),positionY:n('positionY',10,90),count:Math.round(n('count',16,160)),gap:n('gap',0,12),roundness:n('roundness',0,12),
    sensitivity:n('sensitivity',.25,3),smoothing:n('smoothing',0,.95),glow:n('glow',0,30),opacity:n('opacity',.15,1),
    showTitle:flag('showTitle'),showSubtitle:flag('showSubtitle'),showBadges:flag('showBadges'),title:text('title'),subtitle:text('subtitle'),
    textColor:color(v.textColor,defaultVisualizer.textColor),textSize:n('textSize',10,48),shape:normalizeVisualizerShape(v.shape)
  };
}
export function encodeVisualizer(value:AudioVisualizerSettings) {
  return JSON.stringify({format:'loaderly-visualizer',version:2,settings:normalizeVisualizer(value)},null,2);
}
export function decodeVisualizer(code:string):AudioVisualizerSettings | undefined {
  if (code.length > 16000) return;
  try {
    const value=JSON.parse(code);
    if(value?.format !== 'loaderly-visualizer' || ![1,2].includes(value.version) || !value.settings || typeof value.settings !== 'object' || Array.isArray(value.settings)) return;
    return normalizeVisualizer(value.settings);
  } catch { return; }
}
export const visualizerPresets = [
  {id:'graphite',en:'Graphite',ar:'جرافيت',settings:defaultVisualizer},
  {id:'aurora',en:'Aurora',ar:'شفق',settings:{...defaultVisualizer,style:'wave',color:'#77e6cb',secondColor:'#ad9bf7',gradient:true,background:'#111820',glow:8,showTitle:false}},
  {id:'halo',en:'Halo',ar:'هالة',settings:{...defaultVisualizer,style:'ring',color:'#e7c895',secondColor:'#ee9bba',gradient:true,background:'#191619',height:65,showTitle:false}},
  {id:'studio',en:'Studio',ar:'استوديو',settings:{...defaultVisualizer,style:'bars',color:'#26323e',background:'#f3f2ef',textColor:'#26323e',count:48,gap:6}},
] as const;

export const visualizerShapePresets: {id:string;en:string;ar:string;shape:VisualizerShape}[] = [
  {id:'diamond',en:'Diamond',ar:'ماسة',shape:defaultVisualizerShape},
  {id:'heart',en:'Heart',ar:'قلب',shape:{points:[[.5,.27],[.27,.13],[.12,.32],[.2,.53],[.5,.87],[.8,.53],[.88,.32],[.73,.13]],closed:true,smooth:true,mirror:false}},
  {id:'orbit',en:'Orbit',ar:'مدار',shape:{points:[[.15,.5],[.28,.23],[.5,.12],[.72,.23],[.85,.5],[.72,.77],[.5,.88],[.28,.77]],closed:true,smooth:true,mirror:true}},
  {id:'ribbon',en:'Ribbon',ar:'شريط',shape:{points:[[.08,.65],[.27,.28],[.5,.65],[.73,.28],[.92,.65]],closed:false,smooth:true,mirror:true}},
];
