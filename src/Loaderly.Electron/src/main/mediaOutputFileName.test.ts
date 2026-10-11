import { describe, expect, it } from 'vitest';
import { suggestedMediaOutputFileName } from './mediaOutputFileName';

describe.each([
  ['win32', 'C:\\Users\\listener\\Downloads\\'],
  ['linux', '/home/listener/Downloads/'],
  ['darwin', '/Users/listener/Downloads/']
] as const)('suggested export filename on %s', (platform, directory) => {
  it('keeps the downloaded audio name, including Arabic, spaces, case and source ID', () => {
    const name = 'TUL8TE, Elyanna - Haneish ｜ توليت - هنعيش [zCo8uUz6W1U]';
    expect(suggestedMediaOutputFileName(`${directory}${name}.mp3`, 'audio', platform))
      .toBe(`${name}.mp3`);
  });

  it.each([
    ['audio', 'mp3'],
    ['video', 'mp4'],
    ['gif', 'gif'],
    ['image', 'png'],
    ['snapshot', 'png']
  ] as const)('uses the %s output extension and preserves dots in the title', (kind, extension) => {
    expect(suggestedMediaOutputFileName(`${directory}Live Mix Vol. 2.webm`, kind, platform))
      .toBe(`Live Mix Vol. 2.${extension}`);
  });

  it('handles imported media without an extension', () => {
    expect(suggestedMediaOutputFileName(`${directory}Recording`, 'audio', platform))
      .toBe('Recording.mp3');
  });
});

it('provides a fallback when the source name is missing', () => {
  expect(suggestedMediaOutputFileName('', 'video')).toBe('Export.mp4');
});

it('preserves valid Linux and macOS filename characters', () => {
  for (const platform of ['linux', 'darwin'] as const) {
    expect(suggestedMediaOutputFileName('/music/Live: Part 1 | Encore.flac', 'audio', platform))
      .toBe('Live: Part 1 | Encore.mp3');
  }
});
