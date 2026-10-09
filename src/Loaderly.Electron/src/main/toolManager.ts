import { execFile } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, open, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { isNewerToolVersion, parseToolVersion, toolNames, type ToolName, type ToolStatus } from '../shared/tool-manager/toolStatus';

const execute = promisify(execFile);
const repositories = { 'yt-dlp': 'yt-dlp/yt-dlp', ffmpeg: 'GyanD/codexffmpeg', deno: 'denoland/deno' };
type PackageName = keyof typeof repositories;
type Release = { version: string; url: string; sha256: string; zipped: boolean };
const packageFor = (name: ToolName): PackageName => name === 'ffprobe' ? 'ffmpeg' : name;
const errorText = (error: unknown) => error instanceof Error ? error.message : String(error);

export class ToolManager {
  private busy = false;
  private releases = new Map<PackageName, { time: number; request: Promise<Release> }>();
  constructor(private root: string, private fallback: (name: ToolName) => string | undefined) {}

  resolve(name: ToolName): string | undefined {
    try {
      const active = JSON.parse(readFileSync(join(this.root, `${packageFor(name)}.json`), 'utf8'));
      if (/^[a-z0-9-]+$/i.test(active.directory)) {
        const path = join(this.root, active.directory, `${name}.exe`);
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

  private async fetchRelease(name: PackageName): Promise<Release> {
    const response = await fetch(`https://api.github.com/repos/${repositories[name]}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Loaderly/2.0' },
      signal: AbortSignal.timeout(12_000)
    });
    if (!response.ok) throw new Error(`Could not check releases (HTTP ${response.status}). Try again later.`);
    const release = await response.json() as { tag_name: string; assets: { name: string; browser_download_url: string; digest?: string }[] };
    const assetName = name === 'yt-dlp' ? 'yt-dlp.exe' : name === 'deno'
      ? 'deno-x86_64-pc-windows-msvc.zip' : `ffmpeg-${release.tag_name}-essentials_build.zip`;
    const asset = release.assets.find((item) => item.name === assetName);
    const sha256 = asset?.digest?.match(/^sha256:([a-f0-9]{64})$/i)?.[1];
    const prefix = `https://github.com/${repositories[name]}/releases/download/`;
    if (!asset || !sha256 || !asset.browser_download_url.startsWith(prefix)) {
      throw new Error('A verified Windows package is not available for this release. Try again later.');
    }
    return { version: release.tag_name.replace(/^v/, ''), url: asset.browser_download_url, sha256, zipped: assetName.endsWith('.zip') };
  }

  private async localStatus(name: ToolName): Promise<ToolStatus> {
    const path = this.resolve(name);
    const base = { name, path, available: false, updateSupported: process.platform === 'win32' };
    if (!path) return { ...base, message: 'Not installed' };
    try {
      const { stdout } = await execute(path, [name === 'ffmpeg' || name === 'ffprobe' ? '-version' : '--version'], { timeout: 5000, windowsHide: true, maxBuffer: 256 * 1024 });
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

  async checkAll(): Promise<readonly ToolStatus[]> {
    return Promise.all(toolNames.map(name => this.check(name)));
  }

  async install(input: string): Promise<{ ok: boolean; name: string; message?: string; status?: ToolStatus }> {
    if (!toolNames.includes(input as ToolName)) return { ok: false, name: input, message: 'Unknown tool.' };
    if (this.busy) return { ok: false, name: input, message: 'Another tool installation is in progress.' };
    if (process.platform !== 'win32') return { ok: false, name: input, message: 'Tool installation requires Windows.' };
    this.busy = true;
    const name = input as ToolName;
    const pkg = packageFor(name);
    const directory = `${pkg}-${randomUUID()}`;
    const stage = join(this.root, directory);
    let activated = false;
    try {
      const release = await this.release(name, true);
      await mkdir(stage, { recursive: true });
      const archive = join(stage, release.zipped ? 'package.zip' : `${name}.exe`);
      const response = await fetch(release.url, { signal: AbortSignal.timeout(5 * 60_000) });
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
      if (hash.digest('hex').toLowerCase() !== release.sha256.toLowerCase()) throw new Error('Package checksum did not match. Your installed tools were kept.');
      if (release.zipped) {
        // Extract only the expected binaries to fixed paths, never archive-supplied paths.
        const names = pkg === 'ffmpeg' ? ['ffmpeg.exe', 'ffprobe.exe'] : ['deno.exe'];
        const script = `Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::OpenRead($env:LOADERLY_TOOL_ARCHIVE)
try { foreach ($name in ($env:LOADERLY_TOOL_FILES -split ',')) {
  $entries = @($zip.Entries | Where-Object { $_.Name -ceq $name })
  if ($entries.Count -ne 1 -or $entries[0].Length -gt 400MB) { throw 'Invalid tool archive' }
  [IO.Compression.ZipFileExtensions]::ExtractToFile($entries[0], [IO.Path]::Combine($env:LOADERLY_TOOL_STAGE, $name), $false)
} } finally { $zip.Dispose() }`;
        await execute('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], {
          windowsHide: true, timeout: 120_000,
          env: { ...process.env, LOADERLY_TOOL_ARCHIVE: archive, LOADERLY_TOOL_STAGE: stage, LOADERLY_TOOL_FILES: names.join(',') }
        });
        await rm(archive);
      }
      for (const binary of (await readdir(stage)).filter(file => file.endsWith('.exe'))) {
        const { stdout } = await execute(join(stage, binary), [pkg === 'ffmpeg' ? '-version' : '--version'], { timeout: 10_000, windowsHide: true, maxBuffer: 256 * 1024 });
        if (parseToolVersion(stdout) !== parseToolVersion(release.version)) throw new Error('Downloaded tool version could not be verified.');
      }
      const manifest = join(this.root, `${pkg}.json`);
      await writeFile(`${manifest}.tmp`, JSON.stringify({ directory, version: release.version }));
      await rename(`${manifest}.tmp`, manifest);
      activated = true;
      return { ok: true, name, status: await this.check(name) };
    } catch (error) {
      return { ok: false, name, message: errorText(error) };
    } finally {
      if (!activated) await rm(stage, { recursive: true, force: true }).catch(() => {});
      this.busy = false;
    }
  }
}
