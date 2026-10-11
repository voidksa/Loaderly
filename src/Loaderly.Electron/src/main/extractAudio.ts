import { lstat, mkdir, mkdtemp, open, readdir, rename, rm } from 'node:fs/promises';
import { basename, dirname, extname, isAbsolute, join, parse, resolve } from 'node:path';
import { audioMatchesSource, type ExtractAudioRequest } from '../shared/audioExtraction';

const audioExtensions = new Set(['.mp3', '.m4a', '.aac', '.wav', '.flac', '.ogg', '.opus', '.wma', '.aiff', '.aif']);
type ExtractionOutcome = { canceled: true } | { existingPath: string } | { path: string; reused: boolean; replacedPath?: string };
type ExtractionServices = {
  readonly directory: string;
  readonly playableAudio: (path: string) => Promise<boolean>;
  readonly render: (sourcePath: string, targetPath: string) => Promise<{ ok: boolean; message?: string }>;
};
const jobs = new Map<string, Promise<unknown>>();

export async function extractAudioFile(request: ExtractAudioRequest, services: ExtractionServices): Promise<ExtractionOutcome> {
  if (!request || typeof request.sourcePath !== 'string' || !isAbsolute(request.sourcePath)) throw Error('Source file was not found.');
  if (request.source !== undefined && typeof request.source !== 'string') throw Error('Invalid source identity.');
  if (request.choice && !['use', 'replace', 'keep', 'cancel'].includes(request.choice)) throw Error('Invalid extraction choice.');
  if (request.choice === 'cancel') return { canceled: true };
  if (request.knownAudio && (!Array.isArray(request.knownAudio) || request.knownAudio.length > 10000)) throw Error('Invalid audio library.');
  const key = resolve(request.sourcePath);
  const previous = jobs.get(key) ?? Promise.resolve();
  const current = previous.catch(() => {}).then(() => runExtraction(request, services));
  jobs.set(key, current);
  try { return await current; } finally { if (jobs.get(key) === current) jobs.delete(key); }
}

async function reserveAudioName(directory: string, stem: string, start = 1): Promise<string> {
  for (let index = start; index < 10000; index++) {
    const path = join(directory, `${stem}${index === 1 ? '' : ` (${index})`}.mp3`);
    try { const file = await open(path, 'wx'); await file.close(); return path; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
  }
  throw Error('Too many audio copies in this folder.');
}

async function runExtraction(request: ExtractAudioRequest, services: ExtractionServices): Promise<ExtractionOutcome> {
  const sourceInfo = await lstat(request.sourcePath);
  if (!sourceInfo.isFile() || sourceInfo.isSymbolicLink()) throw Error('Source file was not found.');
  const stored = (request.knownAudio ?? []).filter(candidate => candidate && typeof candidate.path === 'string' && (!candidate.source || typeof candidate.source === 'string'));
  const directoryEntries = await readdir(services.directory).catch(() => [] as string[]);
  const pathKey = (path: string) => process.platform === 'win32' ? resolve(path).toLowerCase() : resolve(path);
  const storedPaths = new Set(stored.map(candidate => pathKey(candidate.path)));
  const candidates = [...stored, ...directoryEntries.map(name => ({ path: join(services.directory, name) })).filter(candidate => !storedPaths.has(pathKey(candidate.path)))];
  let existing: string | undefined;
  for (const candidate of candidates) {
    if (!isAbsolute(candidate.path) || !audioExtensions.has(extname(candidate.path).toLowerCase()) || resolve(candidate.path) === resolve(request.sourcePath)) continue;
    if (!audioMatchesSource(request, candidate)) continue;
    const info = await lstat(candidate.path).catch(() => undefined);
    if (info?.isFile() && !info.isSymbolicLink() && await services.playableAudio(candidate.path)) { existing = candidate.path; break; }
  }
  if (existing && !request.choice) return { existingPath: existing };
  if (request.choice && request.existingPath && (!existing || resolve(existing) !== resolve(request.existingPath))) throw Error('The existing audio changed. Try extracting again.');
  if (request.choice === 'use') {
    if (!existing) throw Error('The existing audio is no longer available.');
    return { path: existing, reused: true };
  }
  if (request.choice === 'replace' && !existing) throw Error('The existing audio is no longer available.');
  const replacing = request.choice === 'replace' ? existing : undefined;
  const original = replacing ? await lstat(replacing) : undefined;
  const directory = replacing ? dirname(replacing) : services.directory;
  await mkdir(directory, { recursive: true });
  const sameTarget = replacing && extname(replacing).toLowerCase() === '.mp3' ? replacing : undefined;
  const stem = replacing ? parse(replacing).name : `${parse(request.sourcePath).name} - audio`;
  const target = sameTarget ?? await reserveAudioName(directory, stem);
  let staging: string | undefined, committed = false, retainStaging = false;
  try {
    staging = await mkdtemp(join(directory, '.loaderly-audio-'));
    const output = join(staging, 'audio.mp3');
    const result = await services.render(request.sourcePath, output);
    if (!result.ok) throw Error(result.message || 'Could not extract audio.');
    const outputInfo = await lstat(output);
    if (!outputInfo.isFile() || outputInfo.isSymbolicLink() || outputInfo.size === 0 || !await services.playableAudio(output)) throw Error('The extracted audio could not be verified. Your existing file is unchanged.');
    const file = await open(output, 'r+');
    try { await file.sync(); } finally { await file.close(); }
    if (replacing) {
      const latest = await lstat(replacing);
      if (!latest.isFile() || latest.isSymbolicLink() || latest.size !== original!.size || latest.mtimeMs !== original!.mtimeMs || latest.ino !== original!.ino) throw Error('The existing audio changed while extracting. It was not replaced.');
    }
    // The staging file is on the destination volume. A failed render never touches the old audio.
    if (replacing && !sameTarget) {
      const backup = join(staging, basename(replacing));
      await rename(replacing, backup);
      try { await rename(output, target); }
      catch (error) {
        try { await rename(backup, replacing); }
        catch { retainStaging = true; throw Error(`Could not restore the audio to its original location. The original is preserved at ${backup}`); }
        throw error;
      }
    } else await rename(output, target);
    committed = true;
    return { path: target, reused: false, replacedPath: replacing };
  } finally {
    if (!sameTarget && !committed) await rm(target, { force: true }).catch(() => {});
    if (staging && !retainStaging) await rm(staging, { recursive: true, force: true }).catch(() => {});
  }
}
