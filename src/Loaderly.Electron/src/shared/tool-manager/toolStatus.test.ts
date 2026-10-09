import { describe, expect, it } from 'vitest';
import { isNewerToolVersion, parseToolVersion } from './toolStatus';

describe('tool versions', () => {
  it.each([
    ['2026.07.04', '2026.08.19', true],
    ['ffmpeg version 8.1.1-essentials_build-www.gyan.dev', '9.0.2', true],
    ['deno 2.9.5 (stable, release, x86_64-pc-windows-msvc)', 'v2.9.5', false],
    ['ffprobe version 9.0.2', '8.1.2', false],
    ['ffmpeg version 2026-10-08-git-abc', '9.0.2', undefined],
    ['unavailable', '9.0.2', undefined]
  ])('compares %s with %s', (installed, latest, expected) => {
    expect(isNewerToolVersion(installed, latest)).toBe(expected);
  });
  it('does not mistake architecture for a version', () => expect(parseToolVersion('windows x86_64')).toBeUndefined());
});
