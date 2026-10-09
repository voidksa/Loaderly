import { describe, expect, it } from 'vitest';
import { hexHsv, hexRgb, hsvHex, parseHex, rgbHex } from './colorMath';

describe('color values entered or dragged in the shared editor', () => {
  it('accepts short and full HEX codes with optional hash and surrounding whitespace', () => {
    expect(parseHex('  AbC  ')).toBe('#aabbcc');
    expect(parseHex('#A1b2C3')).toBe('#a1b2c3');
    for (const text of ['', '#abcd', 'red', '#12345678', 'rgb(0,0,0)', '#zzzzzz']) expect(parseHex(text)).toBeUndefined();
  });
  it('roundtrips the RGB gamut through HSV without changing channel values', () => {
    for (const r of [0, 1, 64, 128, 254, 255]) for (const g of [0, 1, 64, 128, 254, 255]) for (const b of [0, 1, 64, 128, 254, 255]) {
      const hex=rgbHex([r,g,b]);
      expect(hexRgb(hex)).toEqual([r,g,b]);
      expect(hsvHex(hexHsv(hex))).toBe(hex);
    }
  });
  it('keeps the chosen hue when brightness or saturation reaches zero', () => {
    expect(hexHsv('#000000', 217)).toEqual({ h:217, s:0, v:0 });
    expect(hexHsv('#ffffff', 217)).toEqual({ h:217, s:0, v:1 });
    expect(hsvHex({ h:217, s:1, v:1 })).toBe('#0062ff');
  });
});
