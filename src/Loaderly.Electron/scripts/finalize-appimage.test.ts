import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const hook = require('./finalize-appimage.cjs');

function runtime() {
  const bytes = Buffer.alloc(1100);
  Buffer.from([127, 69, 76, 70, 2, 1]).copy(bytes);
  Buffer.from('414902', 'hex').copy(bytes, 8);
  bytes.writeUInt16LE(62, 18);
  bytes.writeBigUInt64LE(64n, 32);
  bytes.writeBigUInt64LE(768n, 40);
  bytes.writeUInt16LE(56, 54);
  bytes.writeUInt16LE(1, 56);
  bytes.writeUInt16LE(64, 58);
  bytes.writeUInt16LE(3, 60);
  bytes.writeUInt16LE(1, 62);
  bytes.writeUInt32LE(1, 64);
  const names = Buffer.from('\0.shstrtab\0.upd_info\0');
  names.copy(bytes, 128);
  bytes.writeUInt32LE(1, 832);
  bytes.writeBigUInt64LE(128n, 856);
  bytes.writeBigUInt64LE(BigInt(names.length), 864);
  bytes.writeUInt32LE(11, 896);
  bytes.writeBigUInt64LE(256n, 920);
  bytes.writeBigUInt64LE(256n, 928);
  bytes.write('hsqs', 960);
  return bytes;
}

describe('AppImage release finalization', () => {
  it('locates only reserved runtime bytes before the application payload', () => {
    expect(hook.updateSection(runtime())).toEqual({ start: 256, size: 256 });
    expect(hook.UPDATE_INFO).toBe('gh-releases-zsync|voidksa|Loaderly|latest|Loaderly-*-x86_64.AppImage.zsync');
  });
  it('rejects the old dynamic runtime instead of silently releasing it', () => {
    const bytes = runtime(); bytes.writeUInt32LE(3, 64);
    expect(() => hook.updateSection(bytes)).toThrow('static');
  });
  it('rejects out-of-bounds tables, sections, and missing payload boundaries', () => {
    for (const mutate of [
      (b: Buffer) => b.writeBigUInt64LE(10000n, 40),
      (b: Buffer) => b.writeBigUInt64LE(10000n, 920),
      (b: Buffer) => b.writeBigUInt64LE(10000n, 928),
      (b: Buffer) => b.writeUInt16LE(99, 62),
      (b: Buffer) => b.fill(0, 960, 964),
      (b: Buffer) => b.writeBigUInt64LE(800n, 920),
    ]) {
      const bytes = runtime(); mutate(bytes);
      expect(() => hook.updateSection(bytes)).toThrow();
    }
  });
  it('rejects an absent or too small update section', () => {
    const missing = runtime(); missing.writeUInt32LE(1, 896);
    expect(() => hook.updateSection(missing)).toThrow('no reserved');
    const small = runtime(); small.writeBigUInt64LE(8n, 928);
    expect(() => hook.updateSection(small)).toThrow('space');
  });
  it('leaves Windows, macOS and other Linux packages alone', async () => {
    await expect(hook({ artifactPaths: ['app.zip', 'app.deb', 'app.msix'], configuration: {} })).resolves.toEqual([]);
  });
  it('rejects automatic publication before release checksums are signed', async () => {
    await expect(hook({ artifactPaths: ['Loaderly-2.3.0-x86_64.AppImage'], configuration: { publish: ['github'] } })).rejects.toThrow('before publishing');
  });
});
