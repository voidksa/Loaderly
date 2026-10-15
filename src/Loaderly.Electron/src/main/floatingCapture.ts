import { app, BrowserWindow, clipboard, nativeTheme, screen } from 'electron';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { release } from 'node:os';
import type { QuickCapture } from './quickCapture';
import { captureUrl, type QuickCaptureSettings } from '../shared/quickCapture';
import type { DownloadControlState } from '../shared/downloadControl';
import type { Appearance } from '../shared/app-preferences/appearance';
import { buildFloatingCaptureHtml, floatingAction, floatingBounds, floatingQueueText, savedCapturePoint, type CapturePoint, type FloatingAction, type FloatingView } from './floatingCaptureView';
import { applyWindowAppearance, retainInactiveWindowGlass } from './windowAppearance';
import { macLiquidGlass } from './macLiquidGlass';
import { linuxGlass } from './linuxGlass';
import { fitTrayPopupContentSize, supportsNativeTrayCorners, trayPopupShape } from './trayPopup';

type Context = {
  capture: () => QuickCapture;
  appearance: () => { appearance: Appearance; dark: boolean; ar: boolean; fontCss: string };
  downloads: () => void;
  queue: () => DownloadControlState;
  quitting: () => boolean;
};

/** A separate, sandboxed desktop surface. It reads the clipboard only on an
 * explicit open/refresh and has no preload, filesystem or general IPC access. */
export class FloatingCapture {
  private window?: BrowserWindow;
  private expanded = false;
  private menu = false;
  private copiedUrl?: string;
  private status?: FloatingView['status'];
  private point?: CapturePoint;
  private layout?: Electron.Rectangle;
  private html = '';
  private removeListeners?: () => void;
  private saving?: ReturnType<typeof setTimeout>;
  private visibilityTimer?: ReturnType<typeof setTimeout>;
  private positionFile = join(app.getPath('userData'), 'quick-download-position.json');
  constructor(private context: Context) {
    try { this.point = savedCapturePoint(JSON.parse(readFileSync(this.positionFile, 'utf8'))); } catch { /* First run or an obsolete position. */ }
  }
  sync(settings: QuickCaptureSettings) {
    if (!settings.floating) { this.close(); return; }
    if (!this.window || this.window.isDestroyed()) this.create();
    this.position();
    this.render();
    this.refreshVisibility();
  }
  refreshAppearance() { if (this.window) this.render(); }
  updateQueue(state: DownloadControlState) {
    if (!this.window || this.window.isDestroyed() || !this.expanded) return;
    const text = floatingQueueText(state, this.context.appearance().ar);
    void this.window.webContents.executeJavaScript(`{const e=document.getElementById('queue');if(e)e.textContent=${JSON.stringify(text)};}`).catch(() => {});
  }
  private create() {
    const nativeCorners = supportsNativeTrayCorners(process.platform, release());
    const win = new BrowserWindow({
      width: 84, height: 52, show: false, frame: false, useContentSize: true,
      ...macLiquidGlass.windowOptions(), ...linuxGlass.windowOptions(),
      thickFrame: nativeCorners, roundedCorners: true,
      resizable: false, minimizable: false, maximizable: false, fullscreenable: false,
      skipTaskbar: true, alwaysOnTop: true, acceptFirstMouse: true, hasShadow: true,
      webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, devTools: !app.isPackaged, backgroundThrottling: true },
    });
    this.window = win;
    win.setMenu(null);
    // Draggable regions otherwise open the Windows/Linux system titlebar menu.
    win.on('system-context-menu', event => { event.preventDefault(); this.act('options'); });
    win.webContents.on('context-menu', event => { event.preventDefault(); this.act('options'); });
    win.on('close', event => {
      if (this.context.quitting()) return;
      event.preventDefault();
      const capture = this.context.capture();
      capture.configure({ ...capture.state().settings, floating: false });
      this.close();
    });
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.webContents.on('will-navigate', (event, url) => {
      event.preventDefault(); // Never load a copied link or any remote page here.
      const action = floatingAction(url);
      if (action) this.act(action);
    });
    win.webContents.on('will-redirect', event => event.preventDefault());
    win.webContents.on('will-attach-webview', event => event.preventDefault());
    win.webContents.on('before-input-event', (event, input) => {
      if (input.type === 'keyDown' && input.key === 'Escape') { event.preventDefault(); this.collapse(); }
    });
    win.webContents.on('did-finish-load', () => {
      if (win.isDestroyed()) return;
      this.updateQueue(this.context.queue());
      this.refreshVisibility();
    });
    win.on('blur', () => {
      if (this.expanded) this.collapse();
      const { appearance, dark } = this.context.appearance();
      retainInactiveWindowGlass(win, appearance, dark, this.environment());
    });
    win.on('move', () => {
      if (win.isDestroyed()) return;
      const bounds = win.getBounds();
      if (bounds.x === this.layout?.x && bounds.y === this.layout?.y) return;
      this.point = { x: bounds.x, y: bounds.y };
      clearTimeout(this.saving);
      this.saving = setTimeout(() => this.savePosition(), 250);
    });
    const refresh = () => { this.position(); this.render(); };
    const focusChanged = () => {
      clearTimeout(this.visibilityTimer);
      if (this.loaderlyVisible()) { this.refreshVisibility(); return; }
      // Visibility, not blur, determines eligibility. Screen capture overlays
      // and native dialogs take focus without taking the user out of Loaderly.
      this.visibilityTimer = setTimeout(() => this.refreshVisibility(), 450);
    };
    const visibilityGuard = setInterval(() => this.refreshVisibility(), 200);
    visibilityGuard.unref();
    app.on('browser-window-focus', focusChanged);
    app.on('browser-window-blur', focusChanged);
    const removeLinuxListener = linuxGlass.onChange(refresh);
    nativeTheme.on('updated', refresh);
    screen.on('display-removed', refresh); screen.on('display-metrics-changed', refresh);
    macLiquidGlass.register(win, () => {
      const { appearance, dark } = this.context.appearance();
      applyWindowAppearance(win, appearance, dark, this.environment(), true);
    }, { cornerRadius: 8, windowButtons: false });
    this.removeListeners = () => { clearInterval(visibilityGuard); clearTimeout(this.visibilityTimer); app.removeListener('browser-window-focus', focusChanged); app.removeListener('browser-window-blur', focusChanged); removeLinuxListener(); nativeTheme.removeListener('updated', refresh); screen.removeListener('display-removed', refresh); screen.removeListener('display-metrics-changed', refresh); };
    win.on('closed', () => { this.removeListeners?.(); this.removeListeners = undefined; this.window = undefined; this.html = ''; });
    this.position();
  }
  private loaderlyVisible() {
    return BrowserWindow.getAllWindows().some(window => window !== this.window && !window.isDestroyed() && window.isVisible() && !window.isMinimized());
  }
  private refreshVisibility() {
    const win = this.window;
    if (!win || win.isDestroyed()) return;
    if (this.loaderlyVisible()) {
      win.hide();
      if (this.expanded) this.collapse();
    } else if (!win.webContents.isLoading() && !win.isVisible()) win.showInactive();
  }
  private environment() { return { platform: process.platform, release: release(), reduceTransparency: nativeTheme.prefersReducedTransparency || nativeTheme.shouldUseHighContrastColors }; }
  private savePosition() { if (this.point) { try { writeFileSync(this.positionFile, JSON.stringify(this.point)); } catch { /* Saving position must not interrupt a download. */ } } }
  private position() {
    const win = this.window;
    if (!win || win.isDestroyed()) return;
    const display = this.point ? screen.getDisplayNearestPoint(this.point) : screen.getPrimaryDisplay();
    const work = display.workArea;
    this.point ??= { x: work.x + work.width - 108, y: work.y + Math.round(work.height * .65) };
    const size = this.context.capture().state().settings.floatingSize;
    this.point = savedCapturePoint(floatingBounds(this.point, work, false, size));
    const bounds = floatingBounds(this.point!, work, this.expanded, size);
    this.layout = bounds;
    win.setBounds(bounds);
    fitTrayPopupContentSize(win, bounds.width, bounds.height);
    if (process.platform === 'linux' || (process.platform === 'win32' && !supportsNativeTrayCorners(process.platform, release()))) {
      const [width, height] = win.getSize();
      win.setShape(trayPopupShape(this.context.appearance().appearance, width, height));
    }
  }
  private readCopiedLink() {
    this.copiedUrl = undefined;
    try { this.copiedUrl = captureUrl(clipboard.readText()); this.status = this.copiedUrl ? undefined : 'invalid'; }
    catch { this.status = 'unavailable'; }
  }
  private act(action: FloatingAction) {
    const capture = this.context.capture();
    if (action === 'hide') { capture.configure({ ...capture.state().settings, floating: false }); return; }
    if (action === 'compact' || action === 'label') { capture.configure({ ...capture.state().settings, floatingSize: action }); this.collapse(); return; }
    if (action === 'options') { this.expanded = true; this.menu = true; this.position(); this.render(); return; }
    if (action === 'downloads') { this.collapse(); this.context.downloads(); return; }
    if (action === 'collapse') { this.collapse(); return; }
    if (action === 'expand') { this.expanded = true; this.menu = false; this.readCopiedLink(); this.position(); }
    else if (!this.expanded) return;
    else if (action === 'refresh') this.readCopiedLink();
    else if (action === 'sound-original' || action === 'sound-vocals' || action === 'sound-instrumental') capture.configure({ ...capture.state().settings, audioMode: action === 'sound-vocals' ? 'vocals' : action === 'sound-instrumental' ? 'instrumental' : 'original' });
    else if (action === 'video' || action === 'audio') {
      if (!this.copiedUrl) return;
      const reviewed = this.copiedUrl;
      this.copiedUrl = undefined; // A second click cannot enqueue the same selection twice.
      capture.configure({ ...capture.state().settings, kind: action });
      const result = capture.captureLink(reviewed, action);
      this.status = result.message === 'CAPTURE_QUEUE_FULL' ? 'full' : result.message ? 'invalid' : 'sent';
      if (this.status !== 'sent') this.copiedUrl = reviewed;
    }
    this.render();
  }
  private collapse() {
    this.expanded = false; this.menu = false; this.copiedUrl = undefined; this.status = undefined;
    this.position(); this.render();
  }
  private render() {
    const win = this.window;
    if (!win || win.isDestroyed()) return;
    const appearance = this.context.appearance(), environment = this.environment();
    const desktopGlass = applyWindowAppearance(win, appearance.appearance, appearance.dark, environment);
    const captureState = this.context.capture().state();
    const html = buildFloatingCaptureHtml({ ...appearance, ...environment, desktopGlass, expanded: this.expanded, menu: this.menu, copiedUrl: this.copiedUrl, status: this.status, settings: captureState.settings, shortcutAvailable: captureState.shortcuts.floating, queueText: floatingQueueText(this.context.queue(), appearance.ar) });
    if (html === this.html) return;
    this.html = html;
    void win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`).catch(() => {});
  }
  close() {
    clearTimeout(this.saving); this.savePosition();
    this.removeListeners?.(); this.removeListeners = undefined;
    this.window?.destroy(); this.window = undefined;
    this.expanded = false; this.menu = false; this.copiedUrl = undefined; this.status = undefined; this.html = '';
  }
}
