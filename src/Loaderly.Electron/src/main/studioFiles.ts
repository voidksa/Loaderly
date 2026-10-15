import { createHash, randomUUID } from 'node:crypto';
import { copyFile, mkdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { normalizeStudioEdits, normalizeTranscript, type StudioEdits, type Transcript } from '../shared/editor-project/studio';
import { validStudioSnapshot } from '../shared/editor-project/studioSnapshot';

export type PortableProject = { schema: 1; name: string; sourcePath: string; snapshot: Record<string, unknown>; edits: StudioEdits; transcript?: Transcript; revisions: { name: string; createdAt: string; snapshot: Record<string, unknown>; edits: StudioEdits; thumbnail?:string }[] };
export async function atomicJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true }); const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, JSON.stringify(value), { encoding: 'utf8', flag: 'wx' });
    for(let attempt=0;;attempt++){
      try { await rename(temporary,path); break; }
      catch(error){if(attempt>=5||!['EPERM','EACCES','EBUSY'].includes((error as NodeJS.ErrnoException).code??''))throw error;await new Promise(resolve=>setTimeout(resolve,25*(attempt+1)));}
    }
  }
  finally { await unlink(temporary).catch(() => {}); }
}
export function validateProject(value: unknown): PortableProject {
  if (JSON.stringify(value).length > 16 * 1024 * 1024) throw new Error('PROJECT_TOO_LARGE');
  const p = value as PortableProject;
  if (!p || p.schema !== 1 || typeof p.name !== 'string' || typeof p.sourcePath !== 'string' || !p.snapshot || typeof p.snapshot !== 'object' || Array.isArray(p.snapshot)) throw new Error('INVALID_PROJECT');
  if(!validStudioSnapshot(p.snapshot)||(Array.isArray(p.revisions)&&p.revisions.some(r=>!r||!validStudioSnapshot(r.snapshot))))throw new Error('INVALID_PROJECT');
  // Only editor state is portable. Application accounts and connection settings have no place here.
  const clean = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(clean);
    if (!input || typeof input !== 'object') return input;
    const output: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(input)) {
      if (/__proto__|constructor|prototype|api.?key|password|token|credential|preferences/i.test(key)) continue;
      output[key] = clean(v);
    }
    return output;
  };
  return { schema: 1, name: p.name.slice(0, 200), sourcePath: p.sourcePath, snapshot: clean(p.snapshot) as Record<string, unknown>, edits: normalizeStudioEdits(p.edits), transcript: normalizeTranscript(p.transcript),
    revisions: (Array.isArray(p.revisions) ? p.revisions : []).slice(0, 30).filter(r => r && typeof r.name === 'string' && r.snapshot && typeof r.snapshot === 'object').map(r => ({ name: r.name.slice(0, 200), createdAt: String(r.createdAt).slice(0, 40), snapshot: clean(r.snapshot) as Record<string, unknown>, edits: normalizeStudioEdits(r.edits), thumbnail: typeof r.thumbnail === 'string' && r.thumbnail.length < 256000 && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(r.thumbnail) ? r.thumbnail : undefined })) };
}
const mediaPathKeys = new Set(['sourcePath', 'path', 'subtitlePath', 'extraPath', 'image']);
async function mapPaths(value: unknown, map: (path: string) => Promise<string>, key = ''): Promise<unknown> {
  if (typeof value === 'string' && mediaPathKeys.has(key) && value && !/^[a-z]+:\/\//i.test(value)) return map(value);
  if (Array.isArray(value)) { const result: unknown[] = []; for (const v of value) result.push(await mapPaths(v, map)); return result; }
  if (!value || typeof value !== 'object') return value;
  const result: Record<string, unknown> = {}; for (const [k,v] of Object.entries(value)) result[k] = await mapPaths(v,map,k); return result;
}
function portableDestinations(value:unknown):unknown {
  if(Array.isArray(value))return value.map(portableDestinations);
  if(!value||typeof value!=='object')return value;
  return Object.fromEntries(Object.entries(value).filter(([key])=>key!=='directory').map(([key,item])=>[key,portableDestinations(item)]));
}
export async function savePortableProject(target: string, input: unknown, collect: boolean): Promise<PortableProject> {
  const project = validateProject(input), assetDirectory = join(dirname(target), `${basename(target)}.assets`);
  const copied = new Map<string, string>();
  const created: string[] = [];
  try { const portable = collect ? await mapPaths(project, async path => {
    if (!isAbsolute(path)) throw new Error('INVALID_MEDIA_PATH');
    if (copied.has(path)) return copied.get(path)!;
    const info = await stat(path); if (!info.isFile()) throw new Error('MISSING_MEDIA');
    await mkdir(assetDirectory, { recursive: true });
    const name = `${createHash('sha256').update(path).digest('hex').slice(0, 16)}-${basename(path).replace(/[^\p{L}\p{N}._-]/gu, '_')}`;
    const destination = join(assetDirectory, `${randomUUID().slice(0, 8)}-${name}`);
    created.push(destination); await copyFile(path, destination);
    const ref = relative(dirname(target), destination).split(sep).join('/'); copied.set(path, ref); return ref;
  }) : project;
  // A collected project must not export into a previous device's destination.
  await atomicJson(target, collect?portableDestinations(portable):portable); return project;
  } catch (error) { await Promise.all(created.map(path=>unlink(path).catch(()=>{}))); throw error; }
}
export async function openPortableProject(path: string): Promise<{ project: PortableProject; missing: string[] }> {
  const info = await stat(path); if (info.size > 16 * 1024 * 1024) throw new Error('PROJECT_TOO_LARGE');
  const input = validateProject(JSON.parse(await readFile(path, 'utf8'))), missing = new Set<string>();
  const project = await mapPaths(input, async ref => {
    if (!isAbsolute(ref) && (ref.split(/[\\/]/).includes('..') || ref.includes(':'))) throw new Error('INVALID_MEDIA_PATH');
    const absolute = isAbsolute(ref) ? ref : resolve(dirname(path), ref);
    if (!(await stat(absolute).catch(() => undefined))?.isFile()) missing.add(absolute);
    return absolute;
  }) as PortableProject;
  return { project, missing: [...missing] };
}
export function safeOutputName(name: string, extension: string) {
  const clean = name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/[. ]+$/g, '').slice(0, 120) || 'Loaderly';
  const reserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(clean) ? `_${clean}` : clean;
  return `${reserved.replace(new RegExp(`${extname(reserved).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), '')}-${randomUUID().slice(0, 8)}.${extension}`;
}
