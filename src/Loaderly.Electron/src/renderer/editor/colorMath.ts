export type HSV = { h: number; s: number; v: number };
export const clampColor = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));

export function parseHex(text: string): string | undefined {
  const hex = text.trim().replace(/^#/, '');
  if (/^[a-f\d]{6}$/i.test(hex)) return '#' + hex.toLowerCase();
  if (/^[a-f\d]{3}$/i.test(hex)) return '#' + [...hex].map(c => c + c).join('').toLowerCase();
}

export const hexRgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
export const rgbHex = (rgb: number[]) => '#' + rgb.map(n => Math.round(clampColor(n, 0, 255)).toString(16).padStart(2, '0')).join('');

export function hexHsv(hex: string, lastHue = 0): HSV {
  const [r, g, b] = hexRgb(hex).map(n => n / 255);
  const v = Math.max(r, g, b), min = Math.min(r, g, b), delta = v - min;
  const h = delta ? (((v === r ? (g - b) / delta : v === g ? (b - r) / delta + 2 : (r - g) / delta + 4) * 60) + 360) % 360 : lastHue;
  return { h, s: v ? delta / v : 0, v };
}

export function hsvHex({ h, s, v }: HSV): string {
  const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c;
  const rgb = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return rgbHex(rgb.map(n => (n + m) * 255));
}
