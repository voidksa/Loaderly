import { describe, expect, it } from 'vitest';
import { textFontCandidates, toolCandidates } from './desktopPlatform';
import { executableName, packageSource } from './toolPlatform';

describe('desktop platform integration', () => {
  it.each(['darwin', 'linux'] as const)('finds bundled and system executables on %s without Windows names', platform => {
    const candidates = toolCandidates('ffmpeg', platform, '/Apps/Loaderly/resources', '/Apps/Loaderly/loaderly', '/src/Loaderly', '/custom/bin:/usr/bin');
    expect(candidates[0]).toBe('/Apps/Loaderly/resources/tools/ffmpeg');
    expect(candidates).toContain('/custom/bin/ffmpeg');
    expect(candidates.some(path => path.includes('.exe') || path.includes(';'))).toBe(false);
    expect(new Set(candidates).size).toBe(candidates.length);
  });
  it('preserves Windows portable tool paths and semicolon PATH', () => {
    const candidates = toolCandidates('yt-dlp', 'win32', 'C:\\Loaderly\\resources', 'C:\\Loaderly\\Loaderly.exe', 'C:\\src', 'C:\\Tools;D:\\Tools');
    expect(candidates).toContain('C:\\Loaderly\\tools\\windows\\yt-dlp.exe');
    expect(candidates).toContain('D:\\Tools\\yt-dlp.exe');
  });
  it.each(['darwin', 'linux', 'win32'] as const)('provides a bundled font fallback on %s', platform => {
    expect(textFontCandidates('courier-new', platform, '/bundle/font.ttf').at(-1)).toBe('/bundle/font.ttf');
  });
  it.each(['x64', 'arm64'])('selects native Mac/Linux tools for %s', arch => {
    expect(packageSource('yt-dlp', { platform: 'darwin', arch }).assets('1')[0].name).toBe('yt-dlp_macos');
    expect(packageSource('deno', { platform: 'darwin', arch }).assets('1')[0].name).toBe(`deno-${arch === 'x64' ? 'x86_64' : 'aarch64'}-apple-darwin.zip`);
    expect(() => packageSource('ffmpeg', { platform: 'linux', arch })).toThrow('updated with the desktop preview');
    expect(executableName('deno', 'darwin')).toBe('deno');
  });
  it('rejects unsupported systems instead of downloading a different architecture', () => {
    expect(() => packageSource('deno', { platform: 'linux', arch: 'ia32' })).toThrow('not supported');
  });
});
