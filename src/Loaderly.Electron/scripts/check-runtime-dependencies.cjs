const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { createRequire, isBuiltin } = require('node:module');

(async () => {
  const input = path.resolve(process.argv[2]);
  let temporary;
  try {
    const root = input.endsWith('.asar') ? (temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'loaderly-deps-'))) : input;
    if (temporary) require('@electron/asar').extractAll(input, root);
    const main = path.join(root, 'out/main/index.js');
    const source = fs.readFileSync(main, 'utf8');
    const external = new Set([...source.matchAll(/(?:from\s*|import\s*\(|require\s*\()\s*['"]([^'"]+)['"]/g)]
      .map(match => match[1]).filter(name => name !== 'electron' && !isBuiltin(name) && !name.startsWith('.')));
    const targetPlatform = process.argv[3] || process.platform;
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    if (targetPlatform === 'darwin' && manifest.optionalDependencies?.['electron-liquid-glass']) {
      external.add('electron-liquid-glass');
    }
    const visited = new Set();
    function check(name, from) {
      const req = createRequire(from);
      const resolved = req.resolve(name);
      assert.ok(resolved.startsWith(root + path.sep), `${name} is missing from package (resolved ${resolved})`);
      if (visited.has(resolved)) return;
      visited.add(resolved);
      let directory = path.dirname(resolved);
      while (!fs.existsSync(path.join(directory, 'package.json'))) {
        assert.notEqual(directory, root, `Missing package metadata for ${name}`);
        directory = path.dirname(directory);
      }
      const manifest = path.join(directory, 'package.json');
      for (const dependency of Object.keys(JSON.parse(fs.readFileSync(manifest, 'utf8')).dependencies || {})) check(dependency, manifest);
    }
    for (const name of external) check(name, main);
    if (external.has('electron-liquid-glass')) {
      const nativeEntry = createRequire(main).resolve('electron-liquid-glass');
      check('node-gyp-build', nativeEntry);
      const targetArch = process.argv[4];
      if (targetArch) {
        assert.ok(['arm64', 'x64'].includes(targetArch), 'Unsupported Mac architecture');
        const prebuild = path.join(path.dirname(nativeEntry), '..', 'prebuilds', 'darwin-' + targetArch);
        assert.ok(fs.readdirSync(prebuild).some(file => file.endsWith('.node')), 'Missing native glass binary');
      }
    }
    const yauzl = createRequire(main)('yauzl');
    await new Promise((resolve, reject) => yauzl.fromBuffer(Buffer.from('504b0506000000000000000000000000000000000000', 'hex'),
      (error, archive) => { if (error) reject(error); else { archive.close(); resolve(); } }));
    console.log(JSON.stringify({ package: input, external: [...external], resolvedModules: visited.size, zipReader: 'passed' }));
  } finally {
    if (temporary) fs.rmSync(temporary, { recursive: true, force: true, maxRetries: 3 });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
