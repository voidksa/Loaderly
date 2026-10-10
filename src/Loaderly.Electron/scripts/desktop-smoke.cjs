const { _electron: electron } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const http = require('node:http');

(async () => {
  const out = path.resolve('desktop-smoke');
  fs.mkdirSync(out, { recursive: true });
  const bundle = process.platform === 'darwin'
    ? path.resolve(`dist-installer/${process.arch === 'arm64' ? 'mac-arm64' : 'mac'}/Loaderly.app/Contents`)
    : path.resolve('dist-installer/linux-unpacked');
  const resources = path.join(bundle, process.platform === 'darwin' ? 'Resources' : 'resources');
  const executablePath = path.join(bundle, process.platform === 'darwin' ? 'MacOS/Loaderly' : 'loaderly');
  const ffmpeg = path.join(resources, 'tools/ffmpeg');
  const source = path.join(out, 'test video عربي.mp4');
  execFileSync(ffmpeg, ['-y', '-f', 'lavfi', '-i', 'testsrc2=size=640x360:rate=24', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100', '-t', '3', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', source], { stdio: 'pipe' });
  if (process.platform === 'darwin') execFileSync('codesign', ['--verify', '--deep', '--strict', path.dirname(bundle)], { stdio: 'pipe' });
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({ executablePath, args: [`--user-data-dir=${path.join(out, 'profile')}`, '--disable-gpu'], env, timeout: 60000 });
  const errors = [];
  app.process().stderr.on('data', chunk => fs.appendFileSync(path.join(out, 'app-stderr.log'), chunk));
  let server;
  try {
    const page = await app.firstWindow({ timeout: 60000 });
    page.on('pageerror', error => errors.push(error.message));
    await page.waitForSelector('.product-nav');
    const platform = await page.evaluate(() => window.loaderly.platform);
    assert.equal(platform, process.platform);
    assert.equal(await page.evaluate(() => window.loaderly.supportsClipboardFiles), process.platform === 'darwin');
    const tools = await page.evaluate(() => window.loaderly.checkTools());
    assert.equal(tools.length, 4);
    for (const tool of tools) assert.equal(tool.available, true, JSON.stringify(tool));
    await app.evaluate(({ dialog }, file) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [file] }); }, source);
    const media = await page.evaluate(() => window.loaderly.pickMediaFile());
    assert.equal(media.canceled, false);
    assert.ok(media.durationSeconds > 2);
    const preview = await page.evaluate(async url => {
      const response = await fetch(url, { headers: { Range: 'bytes=0-1023' } });
      const video = document.createElement('video');
      video.muted = true;
      video.src = url;
      document.body.append(video);
      await video.play();
      await new Promise(resolve => setTimeout(resolve, 300));
      const result = { status: response.status, size: (await response.arrayBuffer()).byteLength, width: video.videoWidth, advanced: video.currentTime > 0 };
      video.remove();
      return result;
    }, media.fileUrl);
    assert.deepEqual(preview, { status: 206, size: 1024, width: 640, advanced: true });
    const exports = [];
    for (const kind of ['video', 'audio', 'gif', 'snapshot']) {
      const output = path.join(out, `export-${kind}.${{ video: 'mp4', audio: 'mp3', gif: 'gif', snapshot: 'png' }[kind]}`);
      await app.evaluate(({ dialog }, filePath) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath }); }, output);
      const result = await page.evaluate(async ({ source, kind }) => window.loaderly.saveMediaOutput({
        sourcePath: source, kind, label: 'Native preview', startSeconds: 0, endSeconds: 2, frameSeconds: 0.5,
        textOverlays: kind === 'audio' ? [] : [{ text: 'Loaderly تجربة', x: 12, y: 15, fontSize: 32, startSeconds: 0, endSeconds: 2 }],
        subtitleCues: kind === 'audio' ? [] : [{ startSeconds: 0, endSeconds: 2, text: 'Native desktop subtitles' }]
      }), { source, kind });
      assert.equal(result.ok, true, `${kind}: ${JSON.stringify(result)}`);
      assert.ok(fs.statSync(output).size > 500);
      exports.push({ kind, bytes: fs.statSync(output).size });
    }
    await page.evaluate(() => window.loaderly.copyText('Loaderly clipboard test'));
    assert.equal(await app.evaluate(({ clipboard }) => clipboard.readText()), 'Loaderly clipboard test');
    if (process.platform === 'darwin') {
      const copied = await page.evaluate(source => window.loaderly.copyMediaOutput({ sourcePath: source, kind: 'audio', label: 'Clipboard test', startSeconds: 0, endSeconds: 1, frameSeconds: 0 }), source);
      assert.equal(copied.ok, true, JSON.stringify(copied));
      assert.match(await app.evaluate(({ clipboard }) => clipboard.readBuffer('public.file-url').toString()), /^file:\/\//);
    }
    // Exercise the real downloader without relying on a third-party video site.
    server = http.createServer((req, res) => {
      if (req.url !== '/test.mp4') { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': 'video/mp4', 'Content-Length': fs.statSync(source).size });
      fs.createReadStream(source).pipe(res);
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const download = await page.evaluate(async ({ url, directory }) => window.loaderly.downloadUrl({ url, downloadDirectory: directory, quality: 'best', writeSubtitles: false, groupDownloadsByPlatform: false }), { url: `http://127.0.0.1:${server.address().port}/test.mp4`, directory: path.join(out, 'downloads') });
    assert.equal(download.ok, true, JSON.stringify(download));
    await page.screenshot({ path: path.join(out, 'app-en.png') });
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify({ ok: true, platform, arch: process.arch, tools, preview, exports, download }, null, 2));
    console.log('Native application, media playback, download, exports and clipboard passed.');
  } catch (error) {
    fs.writeFileSync(path.join(out, 'failure.txt'), String(error.stack || error));
    throw error;
  } finally {
    if (server) server.close();
    await app.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
