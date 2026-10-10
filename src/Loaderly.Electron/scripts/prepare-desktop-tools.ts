import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { ToolManager } from '../src/main/toolManager';

if (!['darwin', 'linux'].includes(process.platform)) throw new Error('Run on the target macOS or Linux system.');
const root = resolve('build/managed-tools');
const output = resolve('build/tools');
await mkdir(output, { recursive: true });
const manager = new ToolManager(root, () => undefined);
for (const name of ['yt-dlp', 'deno']) {
  const result = await manager.install(name);
  if (!result.ok) throw new Error(`${name}: ${result.message}`);
  console.log(`${name}: ${result.status?.version}`);
}
const versions: Record<string, string> = {};
for (const name of ['yt-dlp', 'ffmpeg', 'ffprobe', 'deno'] as const) {
  const source = name.startsWith('ff') ? join(output, name) : manager.resolve(name);
  if (!source) throw new Error(`Missing ${name}`);
  if (source !== join(output, name)) await copyFile(source, join(output, name));
  versions[name] = execFileSync(source, [name.startsWith('ff') ? '-version' : '--version'], { encoding: 'utf8' }).split('\n')[0];
}
const filters = execFileSync(join(output, 'ffmpeg'), ['-hide_banner', '-filters'], { encoding: 'utf8' });
for (const filter of ['drawtext', 'subtitles', 'boxblur', 'crop', 'scale', 'atempo']) {
  if (!new RegExp(`\\b${filter}\\b`).test(filters)) throw new Error(`Bundled FFmpeg is missing ${filter}`);
}
await writeFile(join(output, 'versions.json'), JSON.stringify(versions, null, 2));
const configuration = execFileSync(join(output, 'ffmpeg'), ['-buildconf'], { encoding: 'utf8' });
if (configuration.includes('--enable-nonfree')) throw new Error('Do not bundle a non-redistributable FFmpeg build.');
await writeFile(join(output, 'THIRD-PARTY.txt'), `Loaderly invokes these separate executables; their own licenses apply.\n\nFFmpeg and FFprobe: see FFmpeg-README.txt and FFmpeg-LICENSE.txt in this folder for build and source information.\n\nyt-dlp: https://github.com/yt-dlp/yt-dlp\nLicense: https://github.com/yt-dlp/yt-dlp/blob/master/LICENSE\n\nDeno: https://github.com/denoland/deno\nLicense: https://github.com/denoland/deno/blob/main/LICENSE.md\n`);
