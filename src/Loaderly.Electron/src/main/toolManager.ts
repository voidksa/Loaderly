import { execFile } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { chmod, mkdir, open, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { isNewerToolVersion, parseToolVersion, toolNames, type ToolName, type ToolStatus } from '../shared/tool-manager/toolStatus';
import { currentToolPlatform, executableName, packageFor, packageSource, type ToolPackage, type ToolPlatform } from './toolPlatform';
import { extractToolZip } from './toolArchive';

const execute = promisify(execFile);
type Asset = { url: string; sha256: string; zipped: boolean; binaries: string[] };
type Release = { version: string; assets: Asset[] };
const errorText = (error: unknown) => error instanceof Error ? error.message : String(error);

export class ToolManager {
  private busy = false;
  private releases = new Map<ToolPackage, { time: number; request: Promise<Release> }>();
  constructor(private root: string, private fallback: (name: ToolName) => string | undefined, private target: ToolPlatform = currentToolPlatform) {}

  resolve(name: ToolName): string | undefined {
    try {
      const active = JSON.parse(readFileSync(join(this.root, `${packageFor(name)}.json`), 'utf8'));
      if (/^[a-z0-9-]+$/i.test(active.directory)) {
        const path = join(this.root, active.directory, executableName(name, this.target.platform));
        if (existsSync(path)) return path;
      }
    } catch { /* No managed version yet. */ }
    return this.fallback(name);
  }

  private release(name: ToolName, fresh = false): Promise<Release> {
    const key = packageFor(name);
    const cached = this.releases.get(key);
    if (!fresh && cached && Date.now() - cached.time < 5 * 60_000) return cached.request;
    const request = this.fetchRelease(key).catch((error) => { this.releases.delete(key); throw error; });
    this.releases.set(key, { time: Date.now(), request });
    return request;
  }

  private async fetchRelease(name: ToolPackage): Promise<Release> {
    const source = packageSource(name, this.target);
    const response = await fetch(`https://api.github.com/repos/${source.repository}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Loaderly/2.0' },
      signal: AbortSignal.timeout(12_000)
    });
    if (!response.ok) throw new Error(`Could not check releases (HTTP ${response.status}). Try again later.`);
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
      const { stdout } = await execute(path, [name === 'ffmpeg' || name === 'ffprobe' ? '-version' : '--version'], { timeout: 15_000, windowsHide: true, maxBuffer: 256 * 1024 });
      const version = stdout.split(/\r?\n/)[0].trim();
      if (!parseToolVersion(version)) throw new Error('Could not read the installed version.');
      return { ...base, available: true, version };
    } catch (error) { return { ...base, message: errorText(error) }; }
  }

  async check(name: ToolName): Promise<ToolStatus> {
    const [local, remote] = await Promise.all([this.localStatus(name), this.release(name).then(value => ({ value }), error => ({ error: errorText(error) }))]);
    if ('error' in remote) return { ...local, checkError: remote.error };
    return { ...local, latestVersion: remote.value.version, updateAvailable: local.available ? isNewerToolVersion(local.version ?? '', remote.value.version) : undefined };
  }

  async checkAll(): Promise<readonly ToolStatus[]> { return Promise.all(toolNames.map(name => this.check(name))); }

  async install(input: string): Promise<{ ok: boolean; name: string; message?: string; status?: ToolStatus }> {
    if (!toolNames.includes(input as ToolName)) return { ok: false, name: input, message: 'Unknown tool.' };
    if (this.busy) return { ok: false, name: input, message: 'Another tool installation is in progress.' };
    this.busy = true;
    const name = input as ToolName;
    const pkg = packageFor(name);
    const directory = `${pkg}-${randomUUID()}`;
    const stage = join(this.root, directory);
    let activated = false;
    try {
      const release = await this.release(name, true);
      await mkdir(stage, { recursive: true });
      for (const [index, asset] of release.assets.entries()) {
        const names = asset.binaries.map(binary => executableName(binary, this.target.platform));
        const archive = join(stage, asset.zipped ? `package-${index}.zip` : names[0]);
        const response = await fetch(asset.url, { signal: AbortSignal.timeout(5 * 60_000) });
        if (!response.ok || !response.body) throw new Error(`Download failed (HTTP ${response.status}).`);
        const file = await open(archive, 'wx');
        const hash = createHash('sha256');
        let received = 0;
        const reader = response.body.getReader();
        try {
          while (true) {
            const { value: chunk, done } = await reader.read();
            if (done) break;
            received += chunk.length;
            if (received > 350 * 1024 * 1024) throw new Error('Tool package exceeds the download limit.');
            hash.update(chunk);
            await file.writeFile(chunk);
          }
        } finally { await reader.cancel().catch(() => {}); await file.close(); }
        if (hash.digest('hex').toLowerCase() !== asset.sha256.toLowerCase()) throw new Error('Package checksum did not match. Your installed tools were kept.');
        if (asset.zipped) { await extractToolZip(archive, stage, names); await rm(archive); }
        for (const binary of names) {
          const path = join(stage, binary);
          if (this.target.platform !== 'win32') await chmod(path, 0o755);
          const { stdout } = await execute(path, [pkg === 'ffmpeg' ? '-version' : '--version'], { timeout: 30_000, windowsHide: true, maxBuffer: 256 * 1024 });
          if (parseToolVersion(stdout) !== parseToolVersion(release.version)) throw new Error('Downloaded tool version could not be verified.');
        }
      }
      const manifest = join(this.root, `${pkg}.json`);
      await writeFile(`${manifest}.tmp`, JSON.stringify({ directory, version: release.version }));
      await rename(`${manifest}.tmp`, manifest);
      activated = true;
      return { ok: true, name, status: await this.check(name) };
    } catch (error) { return { ok: false, name, message: errorText(error) }; }
    finally {
      if (!activated) await rm(stage, { recursive: true, force: true }).catch(() => {});
      this.busy = false;
    }
  }
}
