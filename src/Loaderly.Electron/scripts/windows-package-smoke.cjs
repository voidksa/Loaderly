const { _electron: electron } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createRequire } = require('node:module');

(async () => {
  const executablePath = path.resolve(process.argv[2]);
  const resources = path.join(path.dirname(executablePath), 'resources', 'app');
  const runtimeRequire = createRequire(path.join(resources, 'package.json'));
  const manifest = runtimeRequire('./package.json');
  for (const name of Object.keys(manifest.dependencies || {})) {
    const resolved = runtimeRequire.resolve(name);
    assert.ok(resolved.startsWith(resources + path.sep), `${name} resolved outside the package: ${resolved}`);
  }
  // Read a real ZIP to exercise yauzl's transitive dependencies too.
  const zip = runtimeRequire('yauzl');
  await new Promise((resolve, reject) => zip.fromBuffer(
    Buffer.from('504b0506000000000000000000000000000000000000', 'hex'),
    (error, archive) => { if (error) reject(error); else { archive.close(); resolve(); } }
  ));
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'loaderly-package-check-'));
  const env = { ...process.env };
  for (const name of ['ELECTRON_RUN_AS_NODE', 'ELECTRON_RENDERER_URL', 'NODE_PATH', 'NODE_OPTIONS']) delete env[name];
  let app;
  try {
    app = await electron.launch({ executablePath, cwd: profile, args: [`--user-data-dir=${profile}`, '--disable-gpu'], env, timeout: 30000 });
    const page = await app.firstWindow();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.waitForSelector('.product-nav');
    assert.equal(await page.evaluate(() => window.loaderly.platform), 'win32');
    assert.equal(await app.evaluate(({ app }) => app.isPackaged), true);
    assert.equal(await app.evaluate(({ app }) => app.getVersion()), manifest.version);
    assert.deepEqual(errors, []);
    console.log(`Packaged Loaderly ${manifest.version}: dependencies, ZIP reader, main process and renderer passed.`);
  } finally {
    if (app) await app.close();
    assert.equal(path.dirname(path.resolve(profile)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(profile).startsWith('loaderly-package-check-'));
    // Let Chromium and Windows release the temporary profile after shutdown.
    await fs.promises.rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 250 });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
