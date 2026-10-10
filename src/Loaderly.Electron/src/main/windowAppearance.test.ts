import {describe,it,expect} from 'vitest';
import {supportsDesktopGlass} from './windowAppearance';
describe('desktop glass compatibility',()=>{
 it('keeps native resizing and falls back on unsupported systems',()=>{
  expect(supportsDesktopGlass('darwin','')).toBe(true);
  expect(supportsDesktopGlass('win32','10.0.22631')).toBe(true);
  expect(supportsDesktopGlass('win32','10.0.22621')).toBe(true);
  expect(supportsDesktopGlass('win32','10.0.22000')).toBe(false);
  expect(supportsDesktopGlass('win32','unknown')).toBe(false);
  expect(supportsDesktopGlass('linux','6.14.0')).toBe(false);
 });
});
