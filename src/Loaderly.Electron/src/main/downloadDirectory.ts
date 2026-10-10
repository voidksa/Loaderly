import { mkdir, open, stat, unlink } from 'node:fs/promises';
import { join, posix } from 'node:path';
import { randomUUID } from 'node:crypto';

/** Check removable volumes before creating subfolders, and keep system paths out of UI errors. */
export async function prepareDownloadDirectory(directory: string, platform: NodeJS.Platform = process.platform, create = true): Promise<string | undefined> {
  try {
    if (platform === 'darwin') {
      const volume = posix.resolve(directory).match(/^\/Volumes\/[^/]+/);
      if (volume && !(await stat(volume[0])).isDirectory()) return 'DOWNLOAD_FOLDER_UNAVAILABLE';
    }
    if (create) await mkdir(directory, { recursive: true });
    else if (!(await stat(directory)).isDirectory()) return 'DOWNLOAD_FOLDER_UNAVAILABLE';
    // A saved path or successful stat does not establish write access (ACLs, TCC, read-only media).
    const probe = join(directory, `.loaderly-access-${randomUUID()}`);
    const handle = await open(probe, 'wx');
    try { await handle.writeFile('1'); }
    finally { try { await handle.close(); } finally { await unlink(probe); } }
    return undefined;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'EACCES' || code === 'EPERM') return 'DOWNLOAD_FOLDER_PERMISSION';
    if (code === 'EROFS') return 'DOWNLOAD_FOLDER_READONLY';
    if (code === 'ENOSPC' || code === 'EDQUOT') return 'DOWNLOAD_FOLDER_FULL';
    return 'DOWNLOAD_FOLDER_UNAVAILABLE';
  }
}
