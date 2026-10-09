export const colorKeys = ['background', 'surface', 'raised', 'border', 'text', 'muted', 'accent'] as const;
export type ThemeColors = Partial<Record<typeof colorKeys[number], string>>;
export type Appearance = { preset: string; accent: string; density: 'comfortable' | 'compact'; corners: 'rounded' | 'square'; colors?: { dark?: ThemeColors; light?: ThemeColors }; radius?: number };
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
  return {'--background':bg,'--foreground':custom?.text??(dark?'#eef1f5':'#25272c'),'--titlebar-ink':custom?.text??(dark?'#eef1f5':'#25272c'),'--muted':custom?.muted??(dark?'#aab1bc':'#646b76'),'--surface':surface,'--surface-muted':bg,'--surface-raised':raised,'--popover':surface,'--border':border,'--border-soft':`color-mix(in srgb, ${border} 62%, ${surface})`,'--accent':a,'--accent-strong':a,'--accent-soft':`color-mix(in srgb, ${a} ${dark?'16':'10'}%, ${surface})`,'--accent-ink':luminance>.179?'#10191e':'#ffffff','--titlebar-bg':surface,'--window-border':border,'--radius':`${radius}px`,'--radius-large':`${radius===0?0:radius+4}px`};
}
export function encodeTheme(value: Appearance): string { return JSON.stringify({format:'loaderly-theme',version:2,...normalizeAppearance(value)},null,2); }
export function decodeTheme(text: string): Appearance {
  if(text.length>4096) throw new Error('Theme is too large.');
  const v=JSON.parse(text);
  if(v?.format!=='loaderly-theme'||![1,2].includes(v.version)||!themePresets.some(p=>p.id===v.preset)||!['comfortable','compact'].includes(v.density)||!['rounded','square'].includes(v.corners)||(v.accent!==''&&!validColor(v.accent))) throw new Error('Invalid Loaderly theme.');
  if (v.radius !== undefined && (typeof v.radius !== 'number' || !Number.isFinite(v.radius) || v.radius < 0 || v.radius > 20)) throw new Error('Invalid corner radius.');
  if (v.colors !== undefined) {
    if (!v.colors || typeof v.colors !== 'object' || Array.isArray(v.colors)) throw new Error('Invalid colors.');
    for (const [mode, palette] of Object.entries(v.colors)) {
      if (!['dark','light'].includes(mode) || !palette || typeof palette !== 'object' || Array.isArray(palette)) throw new Error('Invalid color mode.');
      for (const [key, color] of Object.entries(palette)) if (!colorKeys.includes(key as typeof colorKeys[number]) || !validColor(color)) throw new Error('Invalid color.');
    }
  }
  return normalizeAppearance(v);
}
