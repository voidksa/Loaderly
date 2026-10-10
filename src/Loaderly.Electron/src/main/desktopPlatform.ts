import { posix, win32 } from 'node:path';
import { executableName } from './toolPlatform';
import { editorTextFontOptionFor } from '../shared/editor-project/editorTextOverlay';

export function toolCandidates(name: string, platform: NodeJS.Platform, resources: string, executable: string, projectRoot: string, searchPath: string): string[] {
  const path = platform === 'win32' ? win32 : posix;
  const folder = platform === 'win32' ? 'windows' : platform;
  const directories = [
    path.join(resources, 'tools'),
    path.join(resources, 'tools', folder),
    path.join(path.dirname(executable), 'tools', folder),
    path.join(projectRoot, 'tools', folder),
    path.join(projectRoot, 'tools', folder, 'ffmpeg', 'bin'),
    ...searchPath.split(platform === 'win32' ? ';' : ':').filter(Boolean),
    ...(platform === 'darwin' ? ['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin'] : platform === 'linux' ? ['/usr/local/bin', '/usr/bin', '/bin'] : [])
  ];
  return [...new Set(directories.map(directory => path.join(directory, executableName(name, platform))))];
}

export function textFontCandidates(value: unknown, platform: NodeJS.Platform, bundledFont: string): string[] {
  const option = editorTextFontOptionFor(value);
  if (platform === 'win32') return [...option.windowsFontPaths, bundledFont];
  const serif = ['traditional-arabic', 'times-new-roman'].includes(option.value);
  const mono = option.value === 'courier-new';
  if (platform === 'darwin') return [
    `/System/Library/Fonts/Supplemental/${mono ? 'Courier New Bold' : serif ? 'Times New Roman Bold' : 'Arial Bold'}.ttf`,
    `/Library/Fonts/${mono ? 'Courier New Bold' : serif ? 'Times New Roman Bold' : 'Arial Bold'}.ttf`,
    bundledFont
  ];
  return [
    `/usr/share/fonts/truetype/dejavu/DejaVu${mono ? 'SansMono' : serif ? 'Serif' : 'Sans'}-Bold.ttf`,
    `/usr/share/fonts/truetype/liberation2/Liberation${mono ? 'Mono' : serif ? 'Serif' : 'Sans'}-Bold.ttf`,
    bundledFont
  ];
}
