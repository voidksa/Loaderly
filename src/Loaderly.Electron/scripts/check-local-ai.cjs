const { existsSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const { createHash } = require('node:crypto');
module.exports = async context => {
  const root = context.packager.projectDir;
  if (context.electronPlatformName === 'win32') require('./build-startup-helper.cjs')(root);
  const path = join(root,'build/local-ai/build.json');
  if (!existsSync(path)) throw new Error('Build the native local media runtime before packaging (npm run build:local-ai).');
  const manifest = JSON.parse(readFileSync(path,'utf8'));
  const arch = require('builder-util').Arch[context.arch];
  if (manifest.platform !== context.electronPlatformName || manifest.arch !== arch) throw new Error('Local media runtime architecture does not match this package.');
  const hash = createHash('sha256').update(readFileSync(join(root,'local-ai/worker.py'))).update(readFileSync(join(root,'local-ai/models.json'))).digest('hex');
  if (hash !== manifest.sourceSha256) throw new Error('Rebuild local media runtime after changing worker or models.');
  if (!existsSync(join(root,'build/local-ai',manifest.platform==='win32'?'loaderly-ai.exe':'loaderly-ai'))) throw new Error('Local media runtime executable is missing.');
};
