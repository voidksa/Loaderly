import type { ToolName } from '../shared/tool-manager/toolStatus';

export type ToolPlatform = { platform: NodeJS.Platform; arch: string };
export type ToolPackage = 'yt-dlp' | 'ffmpeg' | 'deno';
export type PackageSource = { repository: string; version: (tag: string) => string; assets: (tag: string) => { name: string; binaries: string[]; zipped: boolean }[] };
export const currentToolPlatform: ToolPlatform = { platform: process.platform, arch: process.arch };
export const packageFor = (name: ToolName): ToolPackage => name === 'ffprobe' ? 'ffmpeg' : name;
export const executableName = (name: string, platform: NodeJS.Platform) => `${name}${platform === 'win32' ? '.exe' : ''}`;

export function packageSource(name: ToolPackage, { platform, arch }: ToolPlatform): PackageSource {
  if (!['win32', 'darwin', 'linux'].includes(platform) || !['x64', 'arm64'].includes(arch)) throw new Error('This system is not supported by automatic tool installation.');
  const version = (tag: string) => tag.replace(/^[vb]/, '');
  if (name === 'yt-dlp') return {
    repository: 'yt-dlp/yt-dlp', version,
    assets: () => [{ name: platform === 'darwin' ? 'yt-dlp_macos' : platform === 'linux' ? `yt-dlp_linux${arch === 'arm64' ? '_aarch64' : ''}` : arch === 'arm64' ? 'yt-dlp_arm64.exe' : 'yt-dlp.exe', binaries: ['yt-dlp'], zipped: false }]
  };
  if (name === 'deno') return {
    repository: 'denoland/deno', version,
    assets: () => [{ name: `deno-${arch === 'arm64' ? 'aarch64' : 'x86_64'}-${platform === 'darwin' ? 'apple-darwin' : platform === 'linux' ? 'unknown-linux-gnu' : 'pc-windows-msvc'}.zip`, binaries: ['deno'], zipped: true }]
  };
  if (platform === 'win32' && arch === 'x64') return {
    repository: 'GyanD/codexffmpeg', version,
    assets: tag => [{ name: `ffmpeg-${tag}-essentials_build.zip`, binaries: ['ffmpeg', 'ffprobe'], zipped: true }]
  };
  if (platform === 'win32') throw new Error('Use the Windows x64 edition for bundled FFmpeg.');
  return {
    repository: 'eugeneware/ffmpeg-static', version,
    assets: () => ['ffmpeg', 'ffprobe'].map(binary => ({ name: `${binary}-${platform}-${arch}`, binaries: [binary], zipped: false }))
  };
}
