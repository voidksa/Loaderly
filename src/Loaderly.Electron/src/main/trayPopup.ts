import { appearanceOpacity, appearanceVariables, defaultAppearance, type Appearance } from '../shared/app-preferences/appearance';

type TrayPopupOptions = {
  appearance: Appearance;
  dark: boolean;
  locale: 'en' | 'ar';
  version: string;
  logo: string;
  fontCss: string;
  desktopGlass: boolean;
  reduceTransparency: boolean;
  platform?: string;
  osRelease?: string;
  floating?: boolean;
};

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]!));

export function supportsNativeTrayCorners(platform: string, osRelease: string): boolean {
  return platform === 'win32' && Number(osRelease.split('.')[2]) >= 22000;
}

export function trayPopupRadius(appearance: Appearance, platform?: string, osRelease = ''): number {
  const radius = Number.parseFloat(appearanceVariables(appearance, true)['--radius-large']);
  // Windows rounds the Acrylic surface itself. A CSS/custom-window curve cannot
  // clip that backdrop, so the flyout must match DWM's native 8px curve.
  return supportsNativeTrayCorners(platform ?? '',osRelease) && radius > 0 ? 8 : radius;
}

type PopupSizingWindow = {
  setContentSize(width: number, height: number): void;
  getContentSize(): number[];
};

export function fitTrayPopupContentSize(window: PopupSizingWindow, width: number, height: number): void {
  window.setContentSize(width, height);
  const [actualWidth, actualHeight] = window.getContentSize();
  // A fixed frameless Windows window retains DWM's frame for native rounding.
  // Electron 42 may subtract that frame from the requested client size. Measure
  // the actual difference instead of hard-coding system/DPI-dependent insets.
  if (actualWidth !== width || actualHeight !== height) {
    window.setContentSize(width + width - actualWidth, height + height - actualHeight);
  }
}

// Linux and older Windows use a custom drawing/input region. Do not apply this
// to Windows Acrylic: the compositor paints its backdrop outside that region.
export function trayPopupShape(appearance: Appearance, width: number, height: number) {
  const radius = Math.min(trayPopupRadius(appearance), width / 2, height / 2);
  // Electron 42's X11 path interprets an empty shape as an empty region.
  // A full rectangle restores square corners on both native backends.
  if (radius <= 0) return [{x:0,y:0,width,height}];
  const rows: {x:number;y:number;width:number;height:number}[] = [];
  for (let y = 0; y < height; y++) {
    const distance = Math.max(0, radius - Math.min(y + .5, height - y - .5));
    const inset = distance ? Math.ceil(radius - Math.sqrt(radius * radius - distance * distance)) : 0;
    const previous = rows.at(-1);
    if (previous?.x === inset) previous.height++;
    else rows.push({x:inset,y,width:width-2*inset,height:1});
  }
  return rows;
}

export function trayPopupColors(options: Pick<TrayPopupOptions, 'appearance' | 'dark' | 'desktopGlass' | 'reduceTransparency' | 'platform'>) {
  const theme = appearanceVariables(options.appearance, options.dark);
  const glass = options.desktopGlass && !options.reduceTransparency;
  const nativeInks = appearanceVariables({...defaultAppearance,glass:true}, options.dark);
  const customInks = ['--foreground','--muted'].some(key => theme[key].toLowerCase() !== nativeInks[key].toLowerCase());
  return {
    glass,
    // Acrylic/vibrancy already supplies the native tint. The stronger in-app
    // popover fill would paint over it a second time and hide the desktop.
    // Linux compositors supply blur without the native material's color tint.
    // Custom text colors can invert the native material's light/dark polarity.
    // Keep their contrast-protecting themed surface instead of changing inks.
    surface: !glass ? theme['--popover'] : options.platform === 'linux' || customInks ? theme['--popover-fill'] : `color-mix(in srgb, ${theme['--popover']} ${appearanceOpacity(options.appearance,'popover')}%, transparent)`,
    foreground: theme['--foreground'],
    muted: theme['--muted'],
    border: theme['--border-soft'],
    accent: theme['--accent'],
    selection: glass ? theme['--control-hover'] : theme['--accent-soft'],
    pressed: glass ? theme['--control-pressed'] : theme['--accent-soft']
  };
}

export function buildTrayPopupHtml(options: TrayPopupOptions): string {
  const colors = trayPopupColors(options);
  const theme = appearanceVariables(options.appearance, options.dark);
  const ar = options.locale === 'ar';
  const copy = ar
    ? { 'toggle-floating': options.floating ? 'إخفاء الزر العائم' : 'إظهار الزر العائم', 'capture-video':'تنزيل الرابط كفيديو', 'capture-audio':'تنزيل الرابط كصوت', 'stop-capture':'إيقاف التقاط الروابط', panel:'الإجراءات السريعة', open:'فتح Loaderly', downloads:'التنزيلات', settings:'الإعدادات', exit:'إغلاق Loaderly نهائيًا' }
    : { 'toggle-floating': options.floating ? 'Hide floating button' : 'Show floating button', 'capture-video':'Download copied video', 'capture-audio':'Download copied audio', 'stop-capture':'Stop clipboard capture', panel:'Quick actions', open:'Open Loaderly', downloads:'Show Downloads', settings:'Settings', exit:'Exit Loaderly' };
  const icon = {
    'toggle-floating':'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 7v10m-4-4 4 4 4-4"/></svg>',
    'capture-video':'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3z"/></svg>',
    'capture-audio':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l12-2v13M9 8l12-2"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
    'stop-capture':'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>',

    open:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>',
    downloads:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M5 21h14"/></svg>',
    settings:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 17h16M8 4v6M16 14v6"/></svg>',
    exit:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 17 5-5-5-5M15 12H3M21 3v18"/></svg>'
  };
  const action = (name: keyof typeof icon) => `<a href="loaderly-tray://${name}"><span class="icon">${icon[name]}</span><span>${copy[name]}</span></a>`;
  return `<!doctype html>
<html lang="${options.locale}" dir="${ar ? 'rtl' : 'ltr'}" data-desktop-glass="${colors.glass}">
<head><meta charset="utf-8"/><style>
${options.fontCss}
* { box-sizing:border-box; }
html, body { width:100%;height:100%;margin:0;overflow:hidden;background:transparent;color:${colors.foreground};font-family:"Segoe UI",system-ui,sans-serif;font-size:13px;line-height:20px;user-select:none;color-scheme:${options.dark ? 'dark' : 'light'}; }
.tray-panel { height:100%;display:grid;grid-template-rows:52px minmax(0,1fr) 44px;border:1px solid ${colors.border};border-radius:${trayPopupRadius(options.appearance,options.platform,options.osRelease)}px;overflow:hidden;background:${colors.surface}; }
.tray-head { display:flex;align-items:center;gap:9px;padding:8px 12px;min-width:0;background:transparent; }
.mark { width:26px;height:26px;flex:0 0 26px;display:grid;place-items:center;border-radius:6px;object-fit:contain; }
.tray-title { min-width:0; }
strong { display:flex;gap:6px;align-items:baseline;font-size:13px;line-height:18px;white-space:nowrap; }
.version { min-width:0;overflow:hidden;text-overflow:ellipsis;font-size:10px;font-weight:400;color:${colors.muted};direction:ltr;unicode-bidi:isolate; }
small { display:block;color:${colors.muted};font-size:11px;line-height:16px;margin-top:1px; }
.tray-actions { min-height:0;display:grid;gap:2px;padding:4px 5px;align-content:start;background:transparent; }
a { min-height:34px;display:flex;align-items:center;gap:9px;border:0;border-radius:${theme['--radius']};background:transparent;color:${colors.foreground};font:inherit;text-decoration:none;text-align:start;padding:7px 10px;cursor:pointer; }
a>span:last-child { min-width:0;overflow-wrap:anywhere; }
a:hover { background:${colors.selection}; }
a:active { background:${colors.pressed}; }
a:focus-visible { background:${colors.selection};outline:2px solid ${colors.accent};outline-offset:-2px; }
.exit { padding:4px 5px;background:transparent; }
.exit a { width:100%; }
.icon { width:18px;height:18px;display:grid;place-items:center;color:${colors.muted};flex:0 0 18px; }
.icon svg { width:15px;height:15px;display:block;fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:2; }
</style></head>
<body><div class="tray-panel">
<header class="tray-head">${options.logo ? `<img class="mark" src="${escapeHtml(options.logo)}" alt=""/>` : '<span class="mark" aria-hidden="true">L</span>'}<span class="tray-title"><strong><bdi>Loaderly</bdi> <bdi class="version" dir="ltr" title="${escapeHtml(options.version)}">${escapeHtml(options.version)}</bdi></strong><small>${copy.panel}</small></span></header>
<nav class="tray-actions" aria-label="${copy.panel}">${action('open')}${action('downloads')}${action('toggle-floating')}${action('capture-video')}${action('capture-audio')}${action('stop-capture')}${action('settings')}</nav>
<footer class="exit">${action('exit')}</footer>
</div><script>
document.addEventListener('keydown', event => {
 const keys=['ArrowDown','ArrowUp','Home','End'];if(!keys.includes(event.key))return;event.preventDefault();
 const items=[...document.querySelectorAll('a')],index=items.indexOf(document.activeElement);
 const next=event.key==='Home'?0:event.key==='End'?items.length-1:event.key==='ArrowDown'?(index+1)%items.length:(index<0?items.length-1:(index+items.length-1)%items.length);
 items[next].focus();
});
</script></body></html>`;
}
