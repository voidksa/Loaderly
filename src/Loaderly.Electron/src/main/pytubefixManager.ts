import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { chmod, mkdir, open, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { extractToolZip } from './toolArchive';
import { studioProcess } from './studioProcess';
import { currentToolPlatform, type ToolPlatform } from './toolPlatform';
import { isNewerToolVersion, type ToolInstallProgress, type ToolInstallResult, type ToolStatus } from '../shared/tool-manager/toolStatus';

export function uvAsset(target: ToolPlatform) {
  if (!['win32','darwin','linux'].includes(target.platform) || !['x64','arm64'].includes(target.arch)) throw Error('Backup engine is not available for this system.');
  const triple = `${target.arch === 'arm64' ? 'aarch64' : 'x86_64'}-${target.platform === 'win32' ? 'pc-windows-msvc' : target.platform === 'darwin' ? 'apple-darwin' : 'unknown-linux-gnu'}`;
  return { name: `uv-${triple}.${target.platform === 'win32' ? 'zip' : 'tar.gz'}`, binary: target.platform === 'win32' ? 'uv.exe' : 'uv', member: `uv-${triple}/uv` };
}
export function isolatedPythonEnvironment(root: string): NodeJS.ProcessEnv {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(UV_|PIP_|PYTHON|VIRTUAL_ENV$|CONDA_|NODE_OPTIONS$)/i.test(key)));
  return { ...env, UV_PYTHON_INSTALL_DIR: join(root, 'python'), UV_CACHE_DIR: join(root, 'cache'), UV_PYTHON_PREFERENCE: 'only-managed', UV_NO_PROGRESS: '1', UV_NO_CONFIG: '1', PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' };
}

export function managedPythonVersion(output: string): string {
  const entries = JSON.parse(output) as { implementation?: string; variant?: string; version?: string }[];
  const versions = entries.filter(entry => entry.implementation === 'cpython' && entry.variant === 'default' && /^3\.12\.\d+$/.test(entry.version ?? '')).map(entry => entry.version!);
  versions.sort((a, b) => Number(b.split('.')[2]) - Number(a.split('.')[2]));
  if (!versions[0]) throw Error('A supported private Python runtime is unavailable.');
  return versions[0];
}

/** Optional, private runtime. Updates activate only after an isolated import check;
 * no system Python, PATH, registry or pre-existing environment is changed. */
export class PytubefixManager {
  constructor(private root: string, private target: ToolPlatform = currentToolPlatform) {}
  runtime(): { python: string; version: string } | undefined {
    try {
      const active = JSON.parse(readFileSync(join(this.root, 'active.json'), 'utf8'));
      if (!/^engine-[a-f\d-]+$/.test(active.directory) || !/^\d+(?:\.\d+){1,3}$/.test(active.version)) return;
      const python = join(this.root, active.directory, 'env', this.target.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
      return existsSync(python) ? { python, version: active.version } : undefined;
    } catch { return; }
  }
  private async latest(signal?: AbortSignal): Promise<string> {
    const response = await fetch('https://pypi.org/pypi/pytubefix/json', { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15_000)]) : AbortSignal.timeout(15_000) });
    if (!response.ok) throw Error('Could not check backup engine updates. Try again later.');
    const data = await response.json() as { info?: { version?: string } };
    const version = data.info?.version;
    if (!version || !/^\d+(?:\.\d+){1,3}$/.test(version)) throw Error('No stable backup engine package is available.');
    return version;
  }
  async check(): Promise<ToolStatus> {
    const runtime = this.runtime();
    const base: ToolStatus = { name: 'pytubefix', available: !!runtime, version: runtime?.version, path: runtime?.python, updateSupported: true };
    try { uvAsset(this.target); } catch { return { ...base, updateSupported: false }; }
    try {
      const latestVersion = await this.latest();
      return { ...base, latestVersion, updateAvailable: runtime ? isNewerToolVersion(runtime.version, latestVersion) : undefined };
    } catch (error) { return { ...base, checkError: error instanceof Error ? error.message : 'Could not check for updates.' }; }
  }
  async install(signal: AbortSignal, progress: (value: ToolInstallProgress) => void): Promise<ToolInstallResult> {
    const directory = `engine-${randomUUID()}`, stage = join(this.root, directory);
    let activated = false;
    const emit = (phase: ToolInstallProgress['phase'], extra = {}) => progress({ name: 'pytubefix', phase, ...extra });
    try {
      emit('checking'); const version = await this.latest(signal), asset = uvAsset(this.target);
      await mkdir(stage, { recursive: true });
      const response = await fetch('https://api.github.com/repos/astral-sh/uv/releases/latest', { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Loaderly' }, signal });
      if (!response.ok) throw Error('Could not retrieve the verified runtime. Try again later.');
      const release = await response.json() as { assets: { name: string; browser_download_url: string; digest?: string }[] };
      const source = release.assets.find(item => item.name === asset.name);
      const expected = source?.digest?.match(/^sha256:([a-f\d]{64})$/i)?.[1];
      if (!source || !expected || !source.browser_download_url.startsWith('https://github.com/astral-sh/uv/releases/download/')) throw Error('A verified runtime package is unavailable.');
      const archive = join(stage, asset.name);
      const download = await fetch(source.browser_download_url, { signal });
      if (!download.ok || !download.body) throw Error('The backup engine runtime could not be downloaded.');
      const reader = download.body.getReader(), file = await open(archive, 'wx'), hash = createHash('sha256');
      let received = 0, last = 0;
      try {
        for (;;) {
          signal.throwIfAborted(); const next = await reader.read(); if (next.done) break;
          received += next.value.byteLength;
          if (received > 100 * 1024 * 1024) throw Error('Runtime package exceeds the size limit.');
          hash.update(next.value); await file.writeFile(next.value);
          if (Date.now() - last > 200) { emit('downloading', { received, total: Number(download.headers.get('content-length')) || undefined }); last = Date.now(); }
        }
      } finally { await reader.cancel().catch(() => {}); await file.close(); }
      if (hash.digest('hex') !== expected) throw Error('Runtime checksum did not match. Your previous engine was kept.');
      emit('verifying');
      const uv = join(stage, asset.binary);
      if (this.target.platform === 'win32') await extractToolZip(archive, stage, [asset.binary]);
      else {
        // Stream a single known member; archive paths never become output paths.
        const result = await studioProcess('/usr/bin/tar', ['-xOzf', archive, asset.member], { signal, maxOutput: 80 * 1024 * 1024 });
        await writeFile(uv, result.stdout, { flag: 'wx', mode: 0o755 });
        await chmod(uv, 0o755);
      }
      const env = isolatedPythonEnvironment(this.root);
      const run = (args: string[]) => studioProcess(uv, args, { signal, env, maxOutput: 1024 * 1024 });
      // Pin this environment to a concrete patch version. uv's rolling minor
      // version junction can fail on Windows even when its target is present.
      // A new engine can use a newer patch without changing an active engine.
      emit('preparing-runtime');
      const catalog = await run(['python', 'list', '3.12', '--only-downloads', '--output-format', 'json', '--no-config']);
      const pythonVersion = managedPythonVersion(catalog.stdout.toString());
      await run(['venv', '--python', pythonVersion, '--no-config', join(stage, 'env')]);
      const python = join(stage, 'env', this.target.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
      const requirements = join(stage, 'requirements.in'), lock = join(stage, 'requirements.lock');
      await writeFile(requirements, `pytubefix==${version}\n`);
      emit('installing');
      await run(['pip', 'compile', requirements, '--python', python, '--generate-hashes', '--only-binary', ':all:', '--default-index', 'https://pypi.org/simple', '--output-file', lock, '--no-config']);
      await run(['pip', 'sync', lock, '--python', python, '--require-hashes', '--only-binary', ':all:', '--default-index', 'https://pypi.org/simple', '--no-config']);
      emit('verifying');
      const verified = await studioProcess(python, ['-I', '-c', 'import importlib.metadata, pytubefix; print(importlib.metadata.version("pytubefix"))'], { signal, env, maxOutput: 65536 });
      if (verified.stdout.toString().trim() !== version) throw Error('The backup engine failed its installation check.');
      // Keep license metadata and exact hash lock alongside each active version.
      await readFile(lock); signal.throwIfAborted(); emit('activating');
      const manifest = join(this.root, 'active.json');
      await writeFile(`${manifest}.tmp`, JSON.stringify({ directory, version }));
      await rename(`${manifest}.tmp`, manifest); activated = true;
      const status: ToolStatus = { name: 'pytubefix', available: true, path: python, version, latestVersion: version, updateAvailable: false, updateSupported: true };
      return { ok: true, name: 'pytubefix', status, statuses: [status] };
    } finally {
      // stage is generated beneath this manager's private root only.
      if (!activated && resolve(stage).startsWith(resolve(this.root) + sep)) await rm(stage, { recursive: true, force: true }).catch(() => {});
    }
  }
}
