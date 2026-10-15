// AppImageUpdate metadata for the Linux artifact. Downloads remain in our repository.
// electron-builder verifies the pinned static runtime toolset before using it.
// Linux release builders need zsyncmake from their distribution's zsync package.
const fs = require('node:fs/promises');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { inflateRawSync } = require('node:zlib');

const UPDATE_INFO = 'gh-releases-zsync|voidksa|Loaderly|latest|Loaderly-*-x86_64.AppImage.zsync';
const MAX_HEADER = 4 * 1024 * 1024;

function updateSection(header) {
  if (header.length < 64 || !header.subarray(0, 4).equals(Buffer.from([127, 69, 76, 70])) || header[4] !== 2 || header[5] !== 1 || header.readUInt16LE(18) !== 62 || header.subarray(8, 11).toString('hex') !== '414902') {
    throw new Error('Expected an x86_64 ELF64 AppImage type 2');
  }
  const offset = at => {
    const value = header.readBigUInt64LE(at);
    if (value > BigInt(header.length)) throw new Error('ELF header offset exceeds inspected runtime');
    return Number(value);
  };
  const bounded = (at, size) => {
    if (!Number.isSafeInteger(at) || !Number.isSafeInteger(size) || at < 0 || size < 0 || at + size > header.length) throw new Error('ELF header range exceeds inspected runtime');
  };
  const phoff = offset(32), shoff = offset(40);
  const phsize = header.readUInt16LE(54), phcount = header.readUInt16LE(56);
  const shsize = header.readUInt16LE(58), shcount = header.readUInt16LE(60), namesIndex = header.readUInt16LE(62);
  if (phsize !== 56 || shsize !== 64 || !shcount || namesIndex >= shcount) throw new Error('Unsupported ELF table layout');
  bounded(phoff, phsize * phcount);
  bounded(shoff, shsize * shcount);
  for (let i = 0; i < phcount; i++) {
    if (header.readUInt32LE(phoff + i * phsize) === 3) throw new Error('AppImage runtime must be static (no PT_INTERP)');
  }
  const namesEntry = shoff + namesIndex * shsize;
  const namesStart = offset(namesEntry + 24), namesSize = offset(namesEntry + 32);
  bounded(namesStart, namesSize);
  const names = header.subarray(namesStart, namesStart + namesSize);
  let found;
  let runtimeEnd = shoff + shsize * shcount;
  for (let i = 0; i < shcount; i++) {
    const entry = shoff + i * shsize;
    const nameAt = header.readUInt32LE(entry);
    const end = names.indexOf(0, nameAt);
    if (nameAt >= names.length || end < 0) throw new Error('Invalid ELF section name');
    if (header.readUInt32LE(entry + 4) === 8) continue; // NOBITS occupies no file bytes.
    const start = offset(entry + 24), size = offset(entry + 32);
    bounded(start, size);
    runtimeEnd = Math.max(runtimeEnd, start + size);
    if (names.toString('utf8', nameAt, end) === '.upd_info') {
      if (found || size <= Buffer.byteLength(UPDATE_INFO)) throw new Error('Missing space for AppImage update information');
      found = { start, size };
    }
  }
  if (!found) throw new Error('Runtime has no reserved .upd_info section');
  // The payload begins after the ELF runtime. Never rewrite or relocate it.
  bounded(runtimeEnd, 4);
  if (header.toString('ascii', runtimeEnd, runtimeEnd + 4) !== 'hsqs') throw new Error('SquashFS does not follow the ELF runtime');
  if (found.start < 64 || found.start + found.size > shoff || found.start + found.size > runtimeEnd) throw new Error('Unsafe update section location');
  return found;
}

async function finalize(file) {
  const name = path.basename(file);
  const match = /^Loaderly-(\d+\.\d+\.\d+)-x86_64\.AppImage$/.exec(name);
  if (!match) throw new Error(`Unexpected AppImage name: ${name}`);
  // Check the build dependency before changing the artifact.
  execFileSync('zsyncmake', ['-V'], { stdio: 'pipe' });
  const handle = await fs.open(file, 'r+');
  try {
    const { size } = await handle.stat();
    const header = Buffer.alloc(Math.min(MAX_HEADER, size));
    await handle.read(header, 0, header.length, 0);
    const section = updateSection(header);
    const tail = Buffer.alloc(4);
    await handle.read(tail, 0, 4, size - 4);
    const mapSize = tail.readUInt32BE();
    if (!mapSize || mapSize > 16 * 1024 * 1024 || mapSize + 4 >= size) throw new Error('Missing electron-builder blockmap');
    const compressed = Buffer.alloc(mapSize);
    await handle.read(compressed, 0, mapSize, size - 4 - mapSize);
    const map = JSON.parse(inflateRawSync(compressed, { maxOutputLength: 64 * 1024 * 1024 }));
    const payloadSize = size - mapSize - 4;
    if (map.version !== '2' || map.files?.length !== 1 || map.files[0].offset !== 0 || !Array.isArray(map.files[0].sizes) || !map.files[0].sizes.every(n => Number.isSafeInteger(n) && n > 0) || map.files[0].sizes.reduce((a, b) => a + b, 0) !== payloadSize) throw new Error('Invalid electron-builder blockmap');
    const bytes = Buffer.alloc(section.size);
    bytes.write(UPDATE_INFO, 'utf8');
    await handle.write(bytes, 0, bytes.length, section.start);
    await handle.truncate(payloadSize);
  } finally {
    await handle.close();
  }
  // Refresh the blockmap because its runtime bytes changed before checksums/signing.
  await require('app-builder-lib/out/targets/differentialUpdateInfoBuilder').appendBlockmap(file);
  const zsync = `${file}.zsync`;
  const url = `https://github.com/voidksa/Loaderly/releases/download/v${match[1]}/${name}`;
  execFileSync('zsyncmake', ['-u', url, '-o', zsync, file], { stdio: 'inherit' });
  const observed = execFileSync(file, ['--appimage-updateinformation'], { encoding: 'utf8' }).trim();
  if (observed !== UPDATE_INFO) throw new Error('AppImage runtime did not report the expected update source');
  return zsync;
}

module.exports = async function afterAllArtifactBuild(result) {
  const images = result.artifactPaths.filter(file => file.endsWith('.AppImage'));
  if (!images.length) return [];
  // Publication and signed feed generation happen after this hook finishes.
  if (result.configuration.publish != null) throw new Error('Finalize AppImage before publishing; use the signed release workflow');
  const extra = [];
  for (const file of images) extra.push(await finalize(file));
  return extra;
};
module.exports.updateSection = updateSection;
module.exports.UPDATE_INFO = UPDATE_INFO;
