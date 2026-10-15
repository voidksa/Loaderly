import { PytubefixManager } from './pytubefixManager';
import { execFile } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { chmod, mkdir, open, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { isNewerToolVersion, parseToolVersion, toolNames, type ToolName, type ToolStatus, type ToolInstallProgress, type ToolInstallResult } from '../shared/tool-manager/toolStatus';
import { currentToolPlatform, executableName, packageFor, packageSource, type ToolPackage, type ToolPlatform } from './toolPlatform';
import { extractToolZip } from './toolArchive';

const execute = promisify(execFile);
type Asset = { url: string; sha256: string; zipped: boolean; binaries: string[] };
type Release = { version: string; assets: Asset[] };
const errorText = (error: unknown) => error instanceof Error ? error.message : String(error);
const checkErrorText = (error: unknown) => {
  if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) return 'The update service took too long to respond. Try again in a minute.';
  if (error instanceof TypeError) return 'Could not reach the update service. Check your connection and try again in a minute.';
  return errorText(error);
};

export class ToolManager {
  private busy = false;
  private installation?: AbortController;
  cancel() { this.installation?.abort(new Error('Installation canceled. Your previous tools were kept.')); }
  private releases = new Map<ToolPackage, { expires: number; request: Promise<Release> }>();
  private checks = new Map<ToolName, { expires: number; request: Promise<ToolStatus> }>();
  readonly backup: PytubefixManager;
  constructor(private root: string, private fallback: (name: ToolName) => string | undefined, private target: ToolPlatform = currentToolPlatform) { this.backup = new PytubefixManager(join(root, 'pytubefix'), target); }

  resolve(name: ToolName): string | undefined {
    if (name === 'pytubefix') return this.backup.runtime()?.python;
    try {
      const active = JSON.parse(readFileSync(join(this.root, `${packageFor(name)}.json`), 'utf8'));
      if (/^[a-z0-9-]+$/i.test(active.directory)) {
        const path = join(this.root, active.directory, executableName(name, this.target.platform));
        if (existsSync(path)) return path;
      }
    } catch { /* No managed version yet. */ }
    return this.fallback(name);
  }

  private release(name: ToolName, fresh = false, signal?: AbortSignal): Promise<Release> {
    const key = packageFor(name);
    const cached = this.releases.get(key);
    if (!fresh && cached && Date.now() < cached.expires) return cached.request;
    const entry = { expires: Infinity, request: undefined as unknown as Promise<Release> };
    entry.request = this.fetchRelease(key, signal).then(value => {
      entry.expires = Date.now() + 5 * 60_000;
      return value;
    }, error => {
      // Keep failed requests briefly too: repeated clicks must not hammer the service.
      entry.expires = Date.now() + 60_000;
      throw error;
    });
    this.releases.set(key, entry);
    return entry.request;
  }

  private async fetchRelease(name: ToolPackage, signal?: AbortSignal): Promise<Release> {
    const source = packageSource(name, this.target);
    const response = await fetch(`https://api.github.com/repos/${source.repository}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Loaderly/2.1' },
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(12_000)]) : AbortSignal.timeout(12_000)
    });
    if (response.status === 429 || (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0')) throw new Error('The update service has temporarily limited requests. Try again later.');
    if (!response.ok) throw new Error(`Could not check for updates (HTTP ${response.status}). Try again later.`);
    const release = await response.json() as { tag_name: string; assets: { name: string; browser_download_url: string; digest?: string }[] };
    const assets = source.assets(release.tag_name).map(expected => {
      const asset = release.assets.find(item => item.name === expected.name);
      const sha256 = asset?.digest?.match(/^sha256:([a-f0-9]{64})$/i)?.[1];
      if (!asset || !sha256 || !asset.browser_download_url.startsWith(`https://github.com/${source.repository}/releases/download/`)) {
        throw new Error('A verified package is not available for this system. Try again later.');
      }
      return { url: asset.browser_download_url, sha256, zipped: expected.zipped, binaries: expected.binaries };
    });
    return { version: source.version(release.tag_name), assets };
  }

  private async localStatus(name: ToolName): Promise<ToolStatus> {
    const path = this.resolve(name);
    let updateSupported = true;
    try { packageSource(packageFor(name), this.target); } catch { updateSupported = false; }
    const base = { name, path, available: false, updateSupported };
    if (!path) return { ...base, message: 'Not installed' };
    try {
      // The macOS one-file executable unpacks Python and is scanned on its first run.
      const { stdout } = await execute(path, [name === 'ffmpeg' || name === 'ffprobe' ? '-version' : '--version'], { timeout: this.target.platform === 'darwin' && name === 'yt-dlp' ? 90_000 : 15_000, windowsHide: true, maxBuffer: 256 * 1024 });
      const version = stdout.split(/\r?\n/)[0].trim();
      if (!parseToolVersion(version)) throw new Error('Could not read the installed version.');
      return { ...base, available: true, version };
    } catch (error) { return { ...base, message: this.executionError(error) }; }
  }

  private executionError(error: unknown): string {
    const detail = error as { killed?: boolean; code?: string; signal?: string; stderr?: string };
    if (detail.killed || detail.code === 'ETIMEDOUT') return 'The tool took too long to start. Retry after the system finishes checking it.';
    if (detail.code === 'EACCES') return 'The system did not allow this tool to run. Try reinstalling it from Tools.';
    if (this.target.platform === 'darwin' && (detail.signal || detail.code)) return 'macOS could not start this tool. Move Loaderly to Applications and try Install again.';
    const stderr = detail.stderr?.trim().split(/\r?\n/).filter(Boolean).slice(-2).join(' ');
    return stderr ? `The tool could not start: ${stderr.slice(0, 350)}` : 'The tool could not start. Try reinstalling it from Tools.';
  }

  check(name: ToolName): Promise<ToolStatus> {
    const cached = this.checks.get(name);
    if (cached && Date.now() < cached.expires) return cached.request;
    const entry = { expires: Infinity, request: undefined as unknown as Promise<ToolStatus> };
    entry.request = this.readStatus(name).then(status => {
      entry.expires = Date.now() + 30_000;
      return status;
    }, error => { if (this.checks.get(name) === entry) this.checks.delete(name); throw error; });
    this.checks.set(name, entry);
    return entry.request;
  }

  private async readStatus(name: ToolName): Promise<ToolStatus> {
    if (name === 'pytubefix') return this.backup.check();
    try { packageSource(packageFor(name), this.target); } catch { return this.localStatus(name); }
    const [local, remote] = await Promise.all([this.localStatus(name), this.release(name).then(value => ({ value }), error => ({ error: checkErrorText(error) }))]);
    if ('error' in remote) return { ...local, checkError: remote.error };
    return { ...local, latestVersion: remote.value.version, updateAvailable: local.available ? isNewerToolVersion(local.version ?? '', remote.value.version) : undefined };
  }

  async checkAll(): Promise<readonly ToolStatus[]> { return Promise.all(toolNames.map(name => this.check(name))); }

  async install(input: string, progress: (value: ToolInstallProgress) => void = () => {}): Promise<ToolInstallResult> {
    if (!toolNames.includes(input as ToolName)) return { ok: false, name: input, message: 'Unknown tool.' };
    if (this.busy) return { ok: false, name: input, message: 'Another tool installation is in progress.' };
    this.busy = true;
    const controller = this.installation = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(input === 'pytubefix' ? 15 * 60_000 : 6 * 60_000)]);
    const name = input as ToolName;
    const pkg = packageFor(name);
    const directory = `${pkg}-${randomUUID()}`;
    const stage = join(this.root, directory);
    let activated = false;
    try {
      if (name === 'pytubefix') return await this.backup.install(signal, progress);
      progress({ name, phase: 'checking' });
      const release = await this.release(name, true, signal);
      signal.throwIfAborted();
      await mkdir(stage, { recursive: true });
      for (const [index, asset] of release.assets.entries()) {
        const names = asset.binaries.map(binary => executableName(binary, this.target.platform));
        const archive = join(stage, asset.zipped ? `package-${index}.zip` : names[0]);
        progress({ name, phase: 'downloading', received: 0 });
        const response = await fetch(asset.url, { signal });
        if (!response.ok || !response.body) throw new Error(`Download failed (HTTP ${response.status}).`);
        const file = await open(archive, 'wx');
        const hash = createHash('sha256');
        let received = 0;
        let lastProgress = 0;
        const total = Number(response.headers.get('content-length')) || undefined;
        const reader = response.body.getReader();
        try {
          while (true) {
            signal.throwIfAborted();
            const { value: chunk, done } = await reader.read();
            if (done) break;
            received += chunk.length;
            if (Date.now() - lastProgress > 200) { progress({ name, phase: 'downloading', received, total }); lastProgress = Date.now(); }
            if (received > 350 * 1024 * 1024) throw new Error('Tool package exceeds the download limit.');
            hash.update(chunk);
            await file.writeFile(chunk);
          }
        } finally { await reader.cancel().catch(() => {}); await file.close(); }
        if (hash.digest('hex').toLowerCase() !== asset.sha256.toLowerCase()) throw new Error('Package checksum did not match. Your installed tools were kept.');
        signal.throwIfAborted();
        progress({ name, phase: 'verifying' });
        if (asset.zipped) { await extractToolZip(archive, stage, names); await rm(archive); }
        for (const binary of names) {
          const path = join(stage, binary);
          if (this.target.platform !== 'win32') await chmod(path, 0o755);
          let stdout: string;
          try { ({ stdout } = await execute(path, [pkg === 'ffmpeg' ? '-version' : '--version'], { signal, timeout: this.target.platform === 'darwin' ? 90_000 : 30_000, windowsHide: true, maxBuffer: 256 * 1024 })); }
          catch (error) { signal.throwIfAborted(); throw new Error(this.executionError(error)); }
          if (parseToolVersion(stdout) !== parseToolVersion(release.version)) throw new Error('Downloaded tool version could not be verified.');
        }
      }
      const manifest = join(this.root, `${pkg}.json`);
      signal.throwIfAborted();
      progress({ name, phase: 'activating' });
      await writeFile(`${manifest}.tmp`, JSON.stringify({ directory, version: release.version }));
      await rename(`${manifest}.tmp`, manifest);
      activated = true;
      const statuses = toolNames.filter(tool => packageFor(tool) === pkg).map(tool => ({ name: tool, path: this.resolve(tool), available: true, version: release.version, latestVersion: release.version, updateSupported: true, updateAvailable: false }));
      return { ok: true, name, status: statuses.find(status => status.name === name), statuses };
    } catch (error) {
      const message = controller.signal.aborted ? 'Installation canceled. Your previous tools were kept.' : signal.aborted ? 'Installation timed out. Check your connection and retry. Your previous tools were kept.' : errorText(error);
      // Keep diagnostics private, without requiring a second failed attempt to inspect them.
      await mkdir(this.root, { recursive: true }).then(() => writeFile(join(this.root, `${name}-last-error.json`), JSON.stringify({ time: new Date().toISOString(), name, message: message.slice(0, 6000) }, null, 2))).catch(() => {});
      return { ok: false, name, message };
    }
    finally {
      for (const tool of toolNames) if (packageFor(tool) === pkg) this.checks.delete(tool);
      if (!activated) await rm(stage, { recursive: true, force: true }).catch(() => {});
      this.busy = false;
      this.installation = undefined;
    }
  }
}
