// Run against a packaged Linux executable in an isolated X11 display with a window manager.
const { _electron } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');

(async () => {
  assert.equal(process.platform, 'linux');
  const executablePath = process.env.LOADERLY_EXECUTABLE;
  assert(executablePath, 'Set LOADERLY_EXECUTABLE to the packaged Linux app');
  const evidence = path.resolve(process.env.LOADERLY_EVIDENCE_DIR || 'desktop-smoke/linux-review');
  fs.mkdirSync(evidence, { recursive: true });
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'loaderly-linux-review-'));
  const source = path.join(temporary, 'A long media title for Linux layout verification تجربة صوتية.wav');
  const ffmpeg = process.env.LOADERLY_FFMPEG || path.join(path.dirname(executablePath), 'resources/tools/ffmpeg');
  execFileSync(ffmpeg, ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3', source]);
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.ELECTRON_RENDERER_URL;
  const app = await _electron.launch({ executablePath, args: ['--user-data-dir=' + path.join(temporary, 'profile'), '--disable-gpu'], env, timeout: 60000 });
  const errors = [], checks = [];
  let page;
  try {
    page = await app.firstWindow({ timeout: 60000 });
    page.setDefaultTimeout(20000);
    page.on('pageerror', error => errors.push(error.message));
    await page.waitForSelector('.product-nav');
    const win = await app.browserWindow(page);
    assert.equal(await page.evaluate(() => window.loaderly.appVersion), '2.1.3');
    assert.equal(await win.evaluate(w => w.getTitle()), 'Loaderly 2.1.3');
    assert.equal(await page.title(), 'Loaderly 2.1.3');
    assert.equal(await page.locator('.window-control').count(), 3);
    await page.getByRole('button', { name: 'Maximize', exact: true }).click();
    await page.waitForTimeout(350);
    assert.equal(await win.evaluate(w => w.isMaximized()), true);
    await page.getByRole('button', { name: 'Maximize', exact: true }).click();
    await page.waitForTimeout(350);
    assert.equal(await win.evaluate(w => w.isMaximized()), false);
    await page.getByRole('button', { name: 'Minimize', exact: true }).click();
    await page.waitForTimeout(350);
    assert.equal(await win.evaluate(w => w.isMinimized()), true);
    await win.evaluate(w => { w.restore(); w.show(); });
    checks.push('Installed version/title, minimize, maximize and restore');

    await app.evaluate(({ dialog }, file) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [file] }); }, source);
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    await page.waitForSelector('.library-card');
    const media = await page.evaluate(() => window.loaderly.pickMediaFile());
    assert(!media.canceled && media.durationSeconds > 2);
    const playback = await page.evaluate(async url => {
      const audio = document.createElement('audio');
      audio.muted = true;
      audio.src = url;
      await audio.play();
      await new Promise(resolve => setTimeout(resolve, 300));
      const advanced = audio.currentTime > 0;
      audio.pause();
      return advanced;
    }, media.fileUrl);
    assert(playback);
    checks.push('Real audio import, metadata and media-clock playback (muted)');

    const fontEvidence = [];
    for (const locale of ['en', 'ar']) {
      for (const textScale of [100, 120]) {
        await page.evaluate(({ locale, textScale }) => {
          const preferences = JSON.parse(localStorage.getItem('loaderly:preferences') || '{}');
          localStorage.setItem('loaderly:preferences', JSON.stringify({ ...preferences, locale, themeMode: 'dark', appearance: { preset: 'graphite', glass: true, textScale, opacity: { background: 30, sidebar: 24, titlebar: 43 } } }));
          localStorage.setItem('loaderly:discovery:2.1', 'dismissed');
          const rows = JSON.parse(localStorage.getItem('loaderly:media-library:v1') || '[]');
          if (!rows[0]) throw new Error('Imported media did not persist');
          rows[0].title = locale === 'ar' ? 'تجربة اسم طويل للمقطع الصوتي مع تفاصيل إضافية لاختبار التفاف النص بدون تداخل مع معلومات الملف [Linux-2.1.3-1791672141972]' : 'Gigi Perez - Sailor Song (Lyrics) [KZGWFhdFWQs]-audio-1791672141972 - A long title wrapping across multiple lines';
          localStorage.setItem('loaderly:media-library:v1', JSON.stringify(rows));
        }, { locale, textScale });
        await page.reload();
        await page.waitForSelector('.library-card');
        await page.evaluate(() => document.fonts.ready);
        await page.locator('.library-card__main').first().click();
        await page.waitForSelector('.route-inspector');
        for (const [width, height] of [[1440, 920], [1180, 720]]) {
          await win.evaluate((w, size) => w.setSize(...size), [width, height]);
          await page.waitForTimeout(180);
          assert(await page.locator('.brand-version').isVisible());
          assert.equal(await page.locator('.brand-version').innerText(), '2.1.3');
          const metrics = await page.locator('.route-inspector').evaluate(el => {
            const media = el.querySelector('.route-inspector__media'), title = media.querySelector('h2'), source = media.querySelector('p'), details = el.querySelector('.detail-list');
            return { titleBottom: title.getBoundingClientRect().bottom, sourceBottom: source.getBoundingClientRect().bottom, mediaBottom: media.getBoundingClientRect().bottom, detailsTop: details.getBoundingClientRect().top, overflowX: el.scrollWidth > el.clientWidth + 1, font: getComputedStyle(title).fontFamily };
          });
          assert(metrics.titleBottom <= metrics.sourceBottom && metrics.sourceBottom <= metrics.mediaBottom + 1 && metrics.mediaBottom <= metrics.detailsTop + 1, JSON.stringify(metrics));
          assert(!metrics.overflowX, JSON.stringify(metrics));
          assert(metrics.font.startsWith(locale === 'ar' ? 'NotoArabic' : 'Inter'), metrics.font);
          await page.screenshot({ path: path.join(evidence, `library-${locale}-${textScale}-${width}.png`) });
        }
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
        const { root } = await cdp.send('DOM.getDocument');
        const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '.route-inspector h2' });
        const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
        assert(fonts.some(font => font.isCustomFont && new RegExp(locale === 'ar' ? 'Noto.*Arabic' : 'Inter', 'i').test(font.familyName)), JSON.stringify(fonts));
        fontEvidence.push({ locale, textScale, fonts });
        await cdp.detach();
      }
      await page.getByRole('button', { name: locale === 'ar' ? 'الإعدادات' : 'Preferences', exact: true }).click();
      await page.getByRole('tab', { name: locale === 'ar' ? 'الشفافية' : 'Transparency', exact: true }).click();
      const glass = page.getByRole('checkbox', { name: locale === 'ar' ? 'إظهار الزجاج فوق سطح المكتب' : 'Show desktop glass' });
      assert(await glass.isDisabled()); assert(!(await glass.isChecked()));
      assert.match(await page.locator('#desktop-glass-hint').innerText(), locale === 'ar' ? /غير متاح على لينكس/ : /not available on Linux/);
      assert.equal(await page.locator('.theme-live-preview').evaluate(el => getComputedStyle(el).backgroundImage), 'none');
      assert.equal(await page.evaluate(() => document.documentElement.dataset.desktopGlass), 'false');
      await page.screenshot({ path: path.join(evidence, `transparency-${locale}.png`) });
    }
    checks.push('Long inspector titles at two window sizes and two text scales in English and Arabic');
    checks.push('Bundled fonts rendered, Linux glass disabled and preview matches supported blending');
    assert.deepEqual(errors, []);
    const closed = app.waitForEvent('close', { timeout: 15000 });
    await page.getByRole('button', { name: 'إغلاق', exact: true }).first().click();
    await closed;
    checks.push('Linux close exits the application');
    fs.writeFileSync(path.join(evidence, 'result.json'), JSON.stringify({ passed: true, version: '2.1.3', executablePath, checks, fontEvidence, profile: temporary, limitation: 'Headless X11/software rendering; subjective audio quality, Wayland and Mint compositor require owner testing.' }, null, 2));
    console.log('PASS: ' + checks.join('; '));
  } catch (error) {
    if (page && !page.isClosed()) await page.screenshot({ path: path.join(evidence, 'failure.png') }).catch(() => {});
    throw error;
  } finally {
    await app.close().catch(() => {});
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
