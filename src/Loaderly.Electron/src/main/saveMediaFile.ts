import { mkdtemp, open, rename, rm, stat } from 'node:fs/promises';
import { dirname, extname, join, parse } from 'node:path';

export async function reserveEditedCopy(sourcePath: string, fileName: string): Promise<string> {
  const { name, ext } = parse(fileName);
  for (let index = 1; index < 10000; index++) {
    const target = join(dirname(sourcePath), `${name} - edited${index === 1 ? '' : ` (${index})`}${ext}`);
    try {
      const file = await open(target, 'wx');
      await file.close();
      return target;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }
  }
  throw new Error('Too many edited copies in this folder. Choose another location.');
}

// Render on the destination volume, then atomically replace the destination.
// A failed render or rename leaves the original file intact, including on USB drives.
export async function saveMediaFile(
  target: string,
  render: (stagingPath: string) => Promise<{ ok: boolean; message?: string }>,
  reserved = false
): Promise<{ ok: boolean; path?: string; message?: string }> {
  let stagingDirectory: string | undefined;
  let committed = false;
  try {
    stagingDirectory = await mkdtemp(join(dirname(target), '.loaderly-export-'));
    const stagingPath = join(stagingDirectory, `output${extname(target)}`);
    const result = await render(stagingPath);
    if (!result.ok) return result;
    if ((await stat(stagingPath)).size === 0) throw new Error('The exported file is empty. Your original is unchanged.');
    const file = await open(stagingPath, 'r+');
    try { await file.sync(); } finally { await file.close(); }
    await rename(stagingPath, target);
    committed = true;
    return { ok: true, path: target };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Could not save output.' };
  } finally {
    if (stagingDirectory) await rm(stagingDirectory, { recursive: true, force: true }).catch(() => {});
    if (reserved && !committed) await rm(target, { force: true }).catch(() => {});
  }
}
