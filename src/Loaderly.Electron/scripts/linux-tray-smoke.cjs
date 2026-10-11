const { _electron } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn, execFile } = require('node:child_process');
const { promisify } = require('node:util');
const exec = promisify(execFile);
const helper = path.join(__dirname, 'linux-tray-host.py');
const evidence = process.env.LOADERLY_EVIDENCE_DIR;
const executablePath = process.env.LOADERLY_EXECUTABLE;
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
delete env.ELECTRON_RENDERER_URL;
const checks = [];
let host, app;
const bus = async (...args) => JSON.parse((await exec('python3', [helper, 'client', ...args])).stdout || 'null');
const waitFor = async (check, timeout = 15000) => {
  const start = Date.now();
  while (!(await check())) {
    if (Date.now() - start > timeout) throw Error('Condition timed out');
    await new Promise(resolve => setTimeout(resolve, 150));
  }
};
async function launch(profile) {
  app = await _electron.launch({ executablePath, args: ['--user-data-dir=' + profile, '--disable-gpu'], env, timeout: 60000 });
  const page = await app.firstWindow();
  await page.waitForSelector('.product-nav');
  return { page, win: await app.browserWindow(page) };
}
async function quit() { if (app) await app.close().catch(() => {}); app = undefined; }

(async () => {
  assert.equal(process.platform, 'linux');
  fs.mkdirSync(evidence, { recursive: true });
  host = spawn('python3', [helper], { env });
  await new Promise((resolve, reject) => {
    host.stdout.once('data', resolve);
    host.once('error', reject);
    host.once('exit', code => reject(Error('Tray host exited: ' + code)));
  });
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'loaderly-tray-'));
  let { page, win } = await launch(profile);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const welcome = page.locator('.linux-welcome[open]');
  await welcome.waitFor();
  assert.match(await welcome.innerText(), /You’re in our hearts/);
  assert.equal(await welcome.getAttribute('dir'), 'ltr');
  assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('linux-welcome__start')), true);
  assert.equal(await page.evaluate(() => localStorage.getItem('loaderly:linux-welcome:seen')), 'yes');
  assert.equal(await welcome.evaluate(el => getComputedStyle(el).animationName), 'linux-welcome-enter');
  await page.screenshot({ path: path.join(evidence, 'welcome-en.png') });
  await page.keyboard.press('Escape');
  await page.reload();
  await page.waitForSelector('.product-nav');
  assert.equal(await welcome.count(), 0);
  checks.push('English welcome, keyboard dismiss, animation and once-only across reload');

  await page.evaluate(() => {
    const prefs = JSON.parse(localStorage.getItem('loaderly:preferences') || '{}');
    localStorage.setItem('loaderly:preferences', JSON.stringify({ ...prefs, locale: 'ar', themeMode: 'dark', appearance: {preset: 'graphite', textScale: 120} }));
    localStorage.removeItem('loaderly:linux-welcome:seen');
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await welcome.waitFor();
  assert.match(await welcome.innerText(), /أنتم في القلب/);
  assert.equal(await welcome.getAttribute('dir'), 'rtl');
  assert.equal(await welcome.evaluate(el => getComputedStyle(el).animationName), 'none');
  assert.equal(await welcome.locator('svg').last().evaluate(el => getComputedStyle(el).transform), 'matrix(-1, 0, 0, 1, 0, 0)');
  const bounds = await welcome.boundingBox();
  assert(bounds.y >= 0 && bounds.height < 720);
  await page.screenshot({ path: path.join(evidence, 'welcome-ar.png') });
  await welcome.locator('.linux-welcome__start').click();
  checks.push('Arabic/RTL dark welcome at 120%, reduced motion and continue button');

  await waitFor(async () => (await bus('inspect')).some(item => item.entries.some(e => e.label === 'فتح Loaderly')));
  let items = await bus('inspect');
  assert(items[0].iconPixels > 0, 'Tray must carry real icon pixels');
  await page.locator('.window-control--close').click();
  await waitFor(async () => !(await win.evaluate(w => w.isVisible())));
  assert(await app.evaluate(({app}) => app.isReady()));
  // A renderer-owned clock continues when its window is hidden.
  const counter = await page.evaluate(() => { window.trayTicks = 0; window.trayTimer = setInterval(() => window.trayTicks++, 100); return window.trayTicks; });
  await new Promise(resolve => setTimeout(resolve, 1300));
  assert(await page.evaluate(() => window.trayTicks) > counter);
  await bus('activate');
  await waitFor(() => win.evaluate(w => w.isVisible()));
  await page.evaluate(() => clearInterval(window.trayTimer));
  checks.push('Real D-Bus tray registration/icon, close hides, background work continues, activation restores');

  await page.locator('.window-control--close').click();
  await waitFor(async () => !(await win.evaluate(w => w.isVisible())));
  await exec(executablePath, ['--user-data-dir=' + profile, '--disable-gpu'], { env, timeout: 15000 });
  await waitFor(() => win.evaluate(w => w.isVisible()));
  checks.push('Launching the app again restores the existing hidden instance');

  for (const [label, route] of [['التنزيلات', 'downloads'], ['الإعدادات…', 'settings']]) {
    await page.locator('.window-control--close').click();
    await waitFor(async () => !(await win.evaluate(w => w.isVisible())));
    await bus('click', label);
    await waitFor(() => win.evaluate(w => w.isVisible()));
    await waitFor(async () => await page.getByRole('button', { name: route === 'downloads' ? 'التنزيلات' : 'الإعدادات', exact: true }).getAttribute('aria-current') === 'page');
  }
  checks.push('Native Arabic menu opens Downloads and Settings');
  await page.locator('.window-control--close').click();
  await waitFor(async () => !(await win.evaluate(w => w.isVisible())));
  host.kill();
  await waitFor(() => win.evaluate(w => w.isVisible()), 18000);
  checks.push('Loss of tray host restores hidden window automatically');
  const closed = app.waitForEvent('close');
  await page.locator('.window-control--close').click();
  await closed;
  app = undefined;
  checks.push('Close without a tray host exits normally');

  host = spawn('python3', [helper], { env });
  await new Promise(resolve => host.stdout.once('data', resolve));
  ({ page, win } = await launch(profile));
  assert.equal(await page.locator('.linux-welcome').count(), 0);
  await waitFor(async () => (await bus('inspect')).some(item => item.entries.some(e => e.label === 'إنهاء Loaderly')));
  const exited = app.waitForEvent('close');
  await bus('click', 'إنهاء Loaderly');
  await exited;
  app = undefined;
  checks.push('Welcome stays dismissed after full restart; native Quit terminates process');
  const freshProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'loaderly-welcome-once-'));
  ({ page } = await launch(freshProfile));
  await page.locator('.linux-welcome[open]').waitFor();
  await quit();
  ({ page } = await launch(freshProfile));
  assert.equal(await page.locator('.linux-welcome').count(), 0);
  await waitFor(async () => (await bus('inspect')).some(item => item.entries.some(e => e.label === 'Quit Loaderly')));
  await bus('host', 'false');
  const noHostExit = app.waitForEvent('close');
  await page.locator('.window-control--close').click();
  await noHostExit;
  app = undefined;
  checks.push('Welcome shown only once even without dismissal; watcher without a registered host cannot hide app');
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(evidence, 'result.json'), JSON.stringify({ passed: true, executablePath, checks, items, limitation: 'Isolated X11 with a protocol test host; user Mint desktop and Wayland not controlled.' }, null, 2));
  console.log('PASS: ' + checks.join('; '));
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await quit(); host?.kill(); });
