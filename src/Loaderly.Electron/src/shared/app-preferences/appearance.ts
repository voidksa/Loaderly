export const colorKeys = ['background', 'surface', 'raised', 'border', 'text', 'muted', 'accent', 'sidebar', 'titlebar', 'editor', 'popover', 'selection', 'buttonText'] as const;
export const opacityKeys = ['background', 'sidebar', 'titlebar', 'surface', 'editor', 'popover'] as const;
export type ThemeOpacity = Partial<Record<typeof opacityKeys[number], number>>;
export type ThemeColors = Partial<Record<typeof colorKeys[number], string>>;
export type Appearance = { preset: string; accent: string; density: 'comfortable' | 'compact' | 'spacious'; corners: 'rounded' | 'square'; colors?: { dark?: ThemeColors; light?: ThemeColors }; radius?: number; opacity?: ThemeOpacity; textScale?: number; sidebarWidth?: number; panelRadius?: number; borderWidth?: number; glass?: boolean };
export const appearanceLimits = {radius:[0,20],textScale:[90,120],sidebarWidth:[188,280],panelRadius:[0,24],borderWidth:[0,2]} as const;
export const defaultAppearance: Appearance = { preset: 'graphite', accent: '', density: 'comfortable', corners: 'rounded' };
export const themePresets = [
  { id: 'lagoon', en: 'Lagoon', ar: 'بحري', dark: ['#10191e','#17242a','#203138','#2b444c','#2ad3aa'], light: ['#f1f7f5','#ffffff','#e4efeb','#c3d7d0','#007c63'] },
  { id: 'graphite', en: 'Graphite', ar: 'جرافيت', dark: ['#151515','#202020','#2b2b2b','#424242','#c4cbd3'], light: ['#f4f4f4','#ffffff','#eaeaea','#cccccc','#495563'] },
  { id: 'ocean', en: 'Ocean', ar: 'محيط', dark: ['#101b28','#17283a','#21364a','#314e66','#62bef0'], light: ['#f0f6fb','#ffffff','#e2edf7','#bfd3e4','#126ea1'] },
  { id: 'forest', en: 'Forest', ar: 'غابة', dark: ['#161d17','#202d22','#2b3c2d','#405943','#a2d178'], light: ['#f4f7ee','#fefff9','#e9efdf','#cedabf','#4f7028'] },
  { id: 'ember', en: 'Ember', ar: 'عنبر', dark: ['#201a16','#2d241e','#3a3028','#594637','#f2b777'], light: ['#faf5ee','#fffdfa','#f1e8da','#e1cdb6','#9c571c'] },
  { id: 'rose', en: 'Rose', ar: 'وردي', dark: ['#21181e','#30222b','#3c2e36','#5a4050','#edb0c9'], light: ['#faf3f6','#ffffff','#f1e4eb','#dfc5d2','#a3426c'] },
] as const;
export function normalizeAppearance(value: unknown): Appearance {
  const v = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const result: Appearance = { preset: themePresets.some(p=>p.id===v.preset)?String(v.preset):'graphite', accent: validColor(v.accent)?String(v.accent):'', density:v.density==='compact'?'compact':'comfortable', corners:v.corners==='square'?'square':'rounded' };
  if (v.colors && typeof v.colors === 'object') {
    const colors: NonNullable<Appearance['colors']> = {};
    for (const mode of ['dark', 'light'] as const) {
      const input = (v.colors as Record<string, unknown>)[mode];
      if (!input || typeof input !== 'object') continue;
      const palette: ThemeColors = {};
      for (const key of colorKeys) { const color = (input as Record<string, unknown>)[key]; if (validColor(color)) palette[key] = String(color); }
      if (Object.keys(palette).length) colors[mode] = palette;
    }
    if (Object.keys(colors).length) result.colors = colors;
  }
  if (typeof v.radius === 'number' && Number.isFinite(v.radius)) result.radius = Math.min(20, Math.max(0, v.radius));
  if (v.density === 'spacious') result.density = 'spacious';
  for (const key of ['textScale','sidebarWidth','panelRadius','borderWidth'] as const) {
    const n = v[key], [min,max] = appearanceLimits[key];
    if (typeof n === 'number' && Number.isFinite(n)) result[key] = Math.min(max,Math.max(min,n));
  }
  if (typeof v.glass === 'boolean') result.glass = v.glass;
  if (v.opacity && typeof v.opacity === 'object' && !Array.isArray(v.opacity)) {
    const opacity: ThemeOpacity = {};
    for (const key of opacityKeys) { const n = (v.opacity as Record<string,unknown>)[key]; if (typeof n === 'number' && Number.isFinite(n)) opacity[key] = Math.min(100,Math.max(0,n)); }
    if (Object.keys(opacity).length) result.opacity = opacity;
  }
  return result;
}
function validColor(value: unknown): boolean { return typeof value === 'string' && /^#[a-f\d]{6}$/i.test(value); }
export function appearanceVariables(value: Appearance, dark: boolean): Record<string,string> {
  const p=themePresets.find(p=>p.id===value.preset)??themePresets[1];
  const base=dark?p.dark:p.light, custom=value.colors?.[dark?'dark':'light'];
  const bg=custom?.background??base[0],surface=custom?.surface??base[1],raised=custom?.raised??base[2],border=custom?.border??base[3];
  const a=custom?.accent||value.accent||base[4];
  const rgb=[1,3,5].map(i=>parseInt(a.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  const luminance=rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
  const radius=value.radius??(value.corners==='square'?3:8);
  const mix=dark?.16:.1;
  const selection=custom?.selection??'#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*mix+parseInt(surface.slice(i,i+2),16)*(1-mix)).toString(16).padStart(2,'0')).join('');
  const variables:Record<string,string> = {'--background':bg,'--foreground':custom?.text??(dark?'#eef1f5':'#25272c'),'--titlebar-ink':custom?.text??(dark?'#eef1f5':'#25272c'),'--muted':custom?.muted??(dark?'#aab1bc':'#646b76'),'--surface':surface,'--surface-muted':bg,'--surface-raised':raised,'--popover':custom?.popover??surface,'--sidebar':custom?.sidebar??surface,'--editor':custom?.editor??bg,'--border':border,'--border-soft':`color-mix(in srgb, ${border} 62%, ${surface})`,'--accent':a,'--accent-strong':a,'--accent-soft':selection,'--accent-ink':custom?.buttonText??(luminance>.179?'#10191e':'#ffffff'),'--titlebar-bg':custom?.titlebar??surface,'--window-border':border,'--radius':`${radius}px`,'--radius-large':`${value.panelRadius??(radius===0?0:radius+4)}px`,'--ui-font-scale':String((value.textScale??100)/100),'--sidebar-width':`${value.sidebarWidth??212}px`,'--theme-border-width':`${value.borderWidth??1}px`};
  for (const key of opacityKeys) {
    const color=key==='titlebar'?variables['--titlebar-bg']:variables['--'+key];
    variables[`--${key}-fill`]=`color-mix(in srgb, ${color} ${value.opacity?.[key]??100}%, transparent)`;
  }
  return variables;
}
export function encodeTheme(value: Appearance): string { return JSON.stringify({format:'loaderly-theme',version:3,...normalizeAppearance(value)},null,2); }
export function decodeTheme(text: string): Appearance {
  if(text.length>4096) throw new Error('Theme is too large.');
  const v=JSON.parse(text);
  if(v?.format!=='loaderly-theme'||![1,2,3].includes(v.version)||!themePresets.some(p=>p.id===v.preset)||!['comfortable','compact','spacious'].includes(v.density)||!['rounded','square'].includes(v.corners)||(v.accent!==''&&!validColor(v.accent))) throw new Error('Invalid Loaderly theme.');
  if (v.radius !== undefined && (typeof v.radius !== 'number' || !Number.isFinite(v.radius) || v.radius < 0 || v.radius > 20)) throw new Error('Invalid corner radius.');
  if (v.colors !== undefined) {
    if (!v.colors || typeof v.colors !== 'object' || Array.isArray(v.colors)) throw new Error('Invalid colors.');
    for (const [mode, palette] of Object.entries(v.colors)) {
      if (!['dark','light'].includes(mode) || !palette || typeof palette !== 'object' || Array.isArray(palette)) throw new Error('Invalid color mode.');
      for (const [key, color] of Object.entries(palette)) if (!colorKeys.includes(key as typeof colorKeys[number]) || !validColor(color)) throw new Error('Invalid color.');
    }
  }
  for (const key of ['textScale','sidebarWidth','panelRadius','borderWidth'] as const) {
    const n=v[key], [min,max]=appearanceLimits[key];
    if(n!==undefined&&(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)) throw new Error('Invalid layout.');
  }
  if(v.glass!==undefined&&typeof v.glass!=='boolean') throw new Error('Invalid glass setting.');
  if(v.opacity!==undefined) {
    if(!v.opacity||typeof v.opacity!=='object'||Array.isArray(v.opacity)) throw new Error('Invalid opacity.');
    for(const [key,n] of Object.entries(v.opacity)) if(!opacityKeys.includes(key as typeof opacityKeys[number])||typeof n!=='number'||!Number.isFinite(n)||n<0||n>100) throw new Error('Invalid opacity.');
  }
  return normalizeAppearance(v);
}
