const { existsSync, readdirSync, mkdirSync } = require('node:fs');
const { join } = require('node:path');
const { execFileSync } = require('node:child_process');
module.exports = root => {
  if (process.platform !== 'win32') throw Error('Build the Windows startup helper on Windows.');
  const framework = join(process.env.SystemRoot || 'C:\\Windows', 'Microsoft.NET', 'Framework64', 'v4.0.30319');
  const metadata = join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Windows Kits', '10', 'UnionMetadata');
  const sdk = readdirSync(metadata).filter(name => /^10\./.test(name)).sort((a,b) => b.localeCompare(a, undefined, { numeric:true })).find(name => existsSync(join(metadata,name,'Windows.winmd')));
  if (!sdk) throw Error('Install the Windows SDK before building the startup helper.');
  mkdirSync(join(root,'build','native'), {recursive:true});
  execFileSync(join(framework,'csc.exe'), ['/nologo','/optimize+','/target:exe',`/out:${join(root,'build','native','LoaderlyStartupTask.exe')}`,`/reference:${join(metadata,sdk,'Windows.winmd')}`,`/reference:${join(framework,'System.Runtime.dll')}`,`/reference:${join(framework,'System.Runtime.WindowsRuntime.dll')}`,join(root,'native','StartupTask.cs')], {windowsHide:true, stdio:'pipe'});
  execFileSync(join(framework,'csc.exe'), ['/nologo','/optimize+','/platform:x64','/target:exe',`/out:${join(root,'build','native','LoaderlyStoreUpdates.exe')}`,`/reference:${join(metadata,sdk,'Windows.winmd')}`,`/reference:${join(framework,'System.Runtime.dll')}`,`/reference:${join(framework,'System.Runtime.WindowsRuntime.dll')}`,`/reference:${join(framework,'System.Windows.Forms.dll')}`,join(root,'native','StoreUpdates.cs')], {windowsHide:true, stdio:'pipe'});
};
