import { createWriteStream } from 'node:fs';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { open, type ZipFile, type Entry } from 'yauzl';

// Never extract archive paths. Only exact, unique regular binaries are streamed
// into new files at paths chosen by Loaderly, with bounded uncompressed sizes.
export async function extractToolZip(archive: string, stage: string, names: readonly string[]): Promise<void> {
  const zip = await new Promise<ZipFile>((resolve, reject) => open(archive, { lazyEntries: true, autoClose: false }, (error, value) => error || !value ? reject(error ?? new Error('Invalid ZIP')) : resolve(value)));
  const entries = new Map<string, Entry>();
  try {
    await new Promise<void>((resolve, reject) => {
      zip.on('error', reject);
      zip.on('end', resolve);
      zip.on('entry', (entry: Entry) => {
        const name = entry.fileName.split('/').at(-1)!;
        if (names.includes(name)) {
          const mode = (entry.externalFileAttributes >>> 16) & 0xf000;
          if (entries.has(name) || entry.uncompressedSize > 400 * 1024 * 1024 || entry.uncompressedSize === 0 || (mode !== 0 && mode !== 0x8000)) {
            reject(new Error('Invalid or duplicate tool in archive.'));
            return;
          }
          entries.set(name, entry);
        }
        zip.readEntry();
      });
      zip.readEntry();
    });
    for (const name of names) {
      const entry = entries.get(name);
      if (!entry) throw new Error(`Archive does not contain ${name}.`);
      const stream = await new Promise<NodeJS.ReadableStream>((resolve, reject) => zip.openReadStream(entry, (error, value) => error || !value ? reject(error ?? new Error('Invalid ZIP entry')) : resolve(value)));
      await pipeline(stream, createWriteStream(join(stage, name), { flags: 'wx', mode: 0o755 }));
    }
  } finally { zip.close(); }
}
