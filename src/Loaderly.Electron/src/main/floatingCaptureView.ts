import { downloadAudioModes, downloadAudioLabel, downloadAudioDescription } from '../shared/downloadAudio';
import { appearanceVariables, type Appearance } from '../shared/app-preferences/appearance';
import { captureBindings, type QuickCaptureSettings } from '../shared/quickCapture';
import type { DownloadControlState } from '../shared/downloadControl';
import { trayPopupColors } from './trayPopup';
import { shortcutLabel } from '../shared/ui/shortcutLabel';

export const floatingActions = ['expand', 'collapse', 'hide', 'refresh', 'sound-original', 'sound-vocals', 'sound-instrumental', 'video', 'audio', 'downloads', 'options', 'compact', 'label'] as const;
export type FloatingAction = typeof floatingActions[number];
export function floatingAction(url: string): FloatingAction | undefined {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'loaderly-capture:' || parsed.username || parsed.password || parsed.port || parsed.search || parsed.hash || (parsed.pathname && parsed.pathname !== '/')) return;
    return floatingActions.find(action => action === parsed.hostname);
  } catch { return; }
}
export type CapturePoint = { x: number; y: number };
type Rect = CapturePoint & { width: number; height: number };
export function savedCapturePoint(value: unknown): CapturePoint | undefined {
  const point = value as CapturePoint | undefined;
  if (point && Number.isFinite(point.x) && Number.isFinite(point.y)) return { x: Math.round(point.x), y: Math.round(point.y) };
}
export function floatingBounds(point: CapturePoint, work: Rect, expanded: boolean, size: 'compact' | 'label' = 'compact'): Rect {
  const width = Math.min(expanded ? 380 : size === 'compact' ? 88 : 154, work.width), height = Math.min(expanded ? 510 : 44, work.height);
  return { x: Math.round(Math.max(work.x, Math.min(point.x, work.x + work.width - width))), y: Math.round(Math.max(work.y, Math.min(point.y, work.y + work.height - height))), width, height };
}
export function floatingQueueText(state: DownloadControlState, ar: boolean): string {
  const waiting = state.entries.filter(entry => entry.phase === 'queued').length;
  const active = state.entries.length - waiting;
  return state.entries.length ? ar ? `${active} نشط · ${waiting} منتظر` : `${active} active · ${waiting} waiting` : ar ? 'عرض التنزيلات' : 'View downloads';
}
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const icons = {
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  video: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3z"/>',
  audio: '<path d="M9 18V5l12-2v13M9 8l12-2"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  collapse: '<path d="M5 12h14"/>',
  refresh: '<path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5"/>',
  grip: '<path d="M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
};
const icon = (name: keyof typeof icons) => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]}</svg>`;
export type FloatingView = {
  expanded: boolean; menu?: boolean; settings: QuickCaptureSettings; ar: boolean; appearance: Appearance; dark: boolean;
  desktopGlass: boolean; reduceTransparency: boolean; platform: string; fontCss: string;
  copiedUrl?: string; shortcutAvailable?: boolean; status?: 'sent' | 'invalid' | 'unavailable' | 'full'; queueText: string;
};
export function buildFloatingCaptureHtml(options: FloatingView): string {
  const { ar, settings, expanded, menu } = options;
  const t = (en: string, arabic: string) => ar ? arabic : en;
  const colors = trayPopupColors(options);
  const accentInk = appearanceVariables(options.appearance, options.dark)['--accent-ink'];
  const action = (name: FloatingAction, label: string, content: string, extra = '') => `<a href="loaderly-capture://${name}" role="button" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}" ${extra}>${content}</a>`;
  const hideLabel = t('Hide floating button', 'إخفاء الزر العائم');
  const restore = t('Bring it back from the Loaderly icon beside the clock: Show floating button. You can also enable it in Downloads > Quick downloads.', 'لإرجاعه: افتح قائمة أيقونة Loaderly بجانب الساعة واختر «إظهار الزر العائم»، أو فعّله من التنزيلات > التنزيل السريع.');
  const keys = shortcutLabel(captureBindings(settings).floating, options.platform);
  const shortcut = !settings.shortcuts ? t('Shortcut disabled:', 'الاختصار معطّل:') : options.shortcutAvailable === false ? t('Shortcut unavailable. Change it in Quick downloads:', 'الاختصار غير متاح. غيّره في التنزيل السريع:') : t('Show / hide:', 'إظهار / إخفاء:');
  const status = options.status === 'sent' ? t('Sent to Downloads.', 'أُرسل إلى التنزيلات.')
    : options.status === 'full' ? t('The queue is full. Try again after a download starts.', 'قائمة التنزيل ممتلئة. حاول بعد بدء أحد التنزيلات.')
    : options.status === 'unavailable' ? t('Clipboard unavailable. Paste your link in Downloads.', 'تعذر الوصول للحافظة. الصق الرابط في التنزيلات.')
    : t('Copy a complete video link, then refresh here.', 'انسخ رابط المقطع كاملًا، ثم اضغط تحديث هنا.');
  const header = `<header><span class="grip" title="${t('Drag to move', 'اسحب للتحريك')}">${icon('grip')} Loaderly</span>${action('options', t('Button options', 'خيارات الزر'), icon('more'), 'class="icon-button"')}${action('collapse', t('Collapse to button', 'تصغير إلى الزر'), icon('collapse'), 'class="icon-button"')}${action('hide', hideLabel, icon('close'), 'class="icon-button"')}</header>`;
  const settingsPanel = `<main class="panel options"><h1>${t('Floating button', 'الزر العائم')}</h1><p>${t('Choose its size. Drag the grip to move it.', 'اختر حجمه، واسحبه من المقبض لتغيير مكانه.')}</p><div class="sizes">${(['compact','label'] as const).map(size=>action(size,t(size==='compact'?'Small icon':'Icon and label',size==='compact'?'أيقونة صغيرة':'أيقونة مع اسم'),size==='compact'?icon('download'):icon('download')+t('Download','تنزيل'),`aria-pressed="${settings.floatingSize===size}"`)).join('')}</div>${action('expand',t('Download copied link','تنزيل الرابط المنسوخ'),icon('download')+t('Download copied link','تنزيل الرابط المنسوخ'),'class="menu-row"')}${action('hide',hideLabel,icon('close')+hideLabel,'class="menu-row"')}<p class="help">${restore}</p><p class="shortcut">${shortcut} <kbd dir="ltr">${keys}</kbd></p><p>${t('Escape returns to the small button. Hiding it does not stop your downloads.', 'يعيد Escape النافذة إلى الزر الصغير. إخفاؤه لا يوقف تنزيلاتك.')}</p></main>`;
  const downloadPanel = `<main class="panel"><h1>${t('Download copied link','تنزيل الرابط المنسوخ')}</h1><p>${t('Review the link, then choose how to download it.','راجع الرابط، ثم اختر طريقة تنزيله.')}</p><div class="link"><div class="link-copy"><p>${t('Copied link','الرابط المنسوخ')}</p><bdi class="host" dir="ltr" title="${escapeHtml(options.copiedUrl||'')}">${escapeHtml(options.copiedUrl||t('No link copied','لا يوجد رابط منسوخ'))}</bdi></div>${action('refresh',t('Read copied link again','قراءة الرابط المنسوخ مجددًا'),icon('refresh'),'class="icon-button"')}</div><section class="sound-options" aria-label="${t('Sound','الصوت')}"><strong>${t('Sound','الصوت')}</strong><div class="audio-modes">${downloadAudioModes.map(mode=>action(`sound-${mode}` as FloatingAction,downloadAudioLabel(mode,ar),downloadAudioLabel(mode,ar),`aria-pressed="${settings.audioMode===mode}"`)).join('')}</div><p>${downloadAudioDescription(settings.audioMode,ar)} ${settings.audioMode!=='original'?t('Separation follows the download. Keeps the original. Some sounds may remain.','يُفصل الصوت بعد التنزيل مع الاحتفاظ بالأصل. قد تبقى بعض الأصوات.'):''}</p></section><div class="choice">${(['video','audio'] as const).map(kind=>action(kind,kind==='video'?t('Download video','تنزيل فيديو'):t('Download audio','تنزيل صوت'),icon(kind)+(kind==='video'?t('Download video','تنزيل فيديو'):t('Download audio','تنزيل صوت')),`class="${settings.kind===kind?'preferred':''}" aria-disabled="${!options.copiedUrl}" ${!options.copiedUrl?'tabindex="-1"':''}`)).join('')}</div><p class="status" role="status">${options.status||!options.copiedUrl?status:t('Ready to download.','جاهز للتنزيل.')}</p><footer>${action('downloads',t('View downloads','عرض التنزيلات'),`<span id="queue">${escapeHtml(options.queueText)}</span>`)}<small>${settings.watch?t('Auto capture on','التلقائي مفعّل'):t('Starts when you choose','يبدأ باختيارك')}</small></footer></main>`;
  const bubble = `<div class="bubble"><span class="grip" title="${t('Drag to move','اسحب للتحريك')}">${icon('grip')}</span>${action('expand',t('Copy a link, then click to download','انسخ رابطًا، ثم اضغط للتنزيل'),icon('download')+(settings.floatingSize==='label'?`<span>${t('Download','تنزيل')}</span>`:''),'class="download"')}${action('options',t('Button options','خيارات الزر'),icon('more'),'class="more"')}</div>`;
  return `<!doctype html><html lang="${ar?'ar':'en'}" dir="${ar?'rtl':'ltr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; font-src data:; script-src 'nonce-floating-controls'; base-uri 'none'; form-action 'none'"><title>Loaderly · ${t('Quick download','التنزيل السريع')}</title><style>
  ${options.fontCss}
  *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden}
  body{display:flex;flex-direction:column;color-scheme:${options.dark?'dark':'light'};font:14px ${ar?"'LoaderlyArabic',":''}system-ui,sans-serif;color:${colors.foreground};background:${colors.surface};border:1px solid ${colors.border};border-radius:8px;user-select:none}
  a{color:inherit;text-decoration:none;cursor:pointer;-webkit-app-region:no-drag;border-radius:6px}a:focus-visible{outline:2px solid ${colors.accent};outline-offset:-3px}a:hover{background:${colors.selection}}a:active{background:${colors.pressed}}
  svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;flex:none}
  .grip{cursor:move;-webkit-app-region:drag;color:${colors.muted};display:flex;align-items:center;justify-content:center}.grip svg{stroke-width:3;width:14px}
  .bubble{display:flex;align-items:stretch;height:100%;padding:3px;gap:2px}.bubble .grip{width:12px;flex:none}.bubble a{display:flex;align-items:center;justify-content:center;gap:6px;font-size:12px;font-weight:600;min-width:0}.bubble .download{flex:1}.bubble .more{width:24px;flex:none;color:${colors.muted}}.bubble .more svg{width:16px}
  header{display:flex;flex:none;align-items:center;gap:4px;padding:6px 8px;border-bottom:1px solid ${colors.border}}header .grip{justify-content:start;gap:5px;flex:1;font-weight:600;font-size:12px;min-height:30px}
  .icon-button{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;flex:none}
  .panel{flex:1;min-height:0;overflow:auto;padding:16px;scrollbar-width:thin}h1{font-size:18px;line-height:1.5;margin:0 0 6px}p{margin:0;color:${colors.muted};font-size:12px;line-height:1.8}
  .link{display:flex;gap:8px;align-items:center;margin:14px 0;padding:10px;border:1px solid ${colors.border};border-radius:8px}.link-copy{min-width:0;flex:1}.host{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere;font-size:12px;line-height:1.8;text-align:start}
  .sound-options{margin:14px 0 8px}.sound-options strong{font-size:13px}.audio-modes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:8px 0}.audio-modes a{padding:9px 4px;text-align:center;border:1px solid ${colors.border};font-size:12px}.audio-modes [aria-pressed=true]{background:${colors.accent};color:${accentInk}}
  .choice{display:flex;gap:10px;margin-top:18px}.choice a{display:flex;align-items:center;justify-content:center;gap:7px;flex:1;min-width:0;padding:11px 6px;border:1px solid ${colors.border};font-size:13px;font-weight:600}.choice .preferred{border-color:${colors.accent};background:${colors.accent};color:${accentInk}}.choice [aria-disabled=true]{opacity:.45;pointer-events:none}
  .panel{padding:12px 14px}.link{margin:10px 0;padding:8px}.sound-options{margin:10px 0 6px}.choice{margin-top:12px}
  .status{margin-top:10px;min-height:22px}footer{margin-top:10px;padding-top:8px;border-top:1px solid ${colors.border};display:flex;justify-content:space-between;align-items:center;gap:8px}footer a{padding:6px;font-size:12px}footer small{color:${colors.muted};font-size:11px}
  .sizes{display:flex;gap:10px;margin:16px 0}.sizes a{display:flex;align-items:center;justify-content:center;gap:7px;flex:1;padding:12px;border:1px solid ${colors.border}}.sizes [aria-pressed=true]{background:${colors.accent};color:${accentInk};border-color:${colors.accent}}.menu-row{display:flex;align-items:center;gap:10px;padding:12px 8px;margin:4px 0}.help{margin-top:14px;padding-top:12px;border-top:1px solid ${colors.border}}.shortcut{margin:12px 0}kbd{display:inline-block;font:11px monospace;border:1px solid ${colors.border};padding:3px 5px;border-radius:4px}
  </style></head><body>${expanded?header+(menu?settingsPanel:downloadPanel):bubble}<script nonce="floating-controls">document.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();location.href='loaderly-capture://collapse'}if(event.key===' '&&event.target instanceof HTMLAnchorElement){event.preventDefault();event.target.click()}});document.addEventListener('click',event=>{if(event.target.closest('a')?.getAttribute('aria-disabled')==='true')event.preventDefault()});</script></body></html>`;
}
