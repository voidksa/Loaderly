export type ReleaseAsset = { platform: string; arch: string; format: 'exe'|'zip'|'AppImage'|'deb'; url: string; size: number; sha256: string };
export type ReleaseManifest = { schema: 1; version: string; notes: string; notesAr?: string; publishedAt: string; assets: ReleaseAsset[] };
export type UpdateState = { phase: 'idle'|'checking'|'current'|'available'|'downloading'|'ready'|'installing'|'installed'|'error'; current: string; version?: string; notes?: string; notesAr?: string; progress?: number; checkedAt?: string; message?: string; automatic: boolean; distribution?: 'store'; installIssue?: 'location'|'verification'|'installation'; storeIssue?: 'check'|'download'|'install'|'canceled'|'busy'; snoozedUntil?: number; workBusy?: boolean };
export const releaseOrigin = 'https://loaderly.app';
export function versionParts(version: string): number[] | undefined {
  if (!/^\d+\.\d+\.\d+$/.test(version)) return;
  const parts = version.split('.').map(Number);
  return parts.every(Number.isSafeInteger) ? parts : undefined;
}
export function newerVersion(next: string, current: string): boolean {
  const a=versionParts(next), b=versionParts(current.split('-')[0]);
  if (!a || !b) return false;
  for (let i=0;i<3;i++) if(a[i]!==b[i]) return a[i]>b[i];
  return false;
}
export function validateRelease(value: unknown): ReleaseManifest {
  const m=value as ReleaseManifest;
  if(!m || m.schema!==1 || !versionParts(m.version) || typeof m.notes!=='string' || m.notes.length>12000 || !Number.isFinite(Date.parse(m.publishedAt)) || !Array.isArray(m.assets) || m.assets.length>12) throw Error('Invalid release manifest');
  if(m.notesAr!==undefined && (typeof m.notesAr!=='string' || m.notesAr.length>12000)) throw Error('Invalid release notes');
  const targets=new Set<string>();
  for(const a of m.assets) {
    const key=`${a.platform}/${a.arch}/${a.format}`;
    if(targets.has(key) || !['win32','darwin','linux'].includes(a.platform) || !['x64','arm64'].includes(a.arch) || !['exe','zip','AppImage','deb'].includes(a.format) || !Number.isSafeInteger(a.size) || a.size<=0 || a.size>2_000_000_000 || !/^[a-f0-9]{64}$/.test(a.sha256)) throw Error('Invalid release asset');
    targets.add(key);
    const url=new URL(a.url);
    if(url.origin!=='https://github.com' || url.search || url.hash || url.username || url.password || !url.pathname.startsWith(`/voidksa/Loaderly/releases/download/v${m.version}/`) || !/^Loaderly[-\w.]+$/.test(decodeURIComponent(url.pathname.split('/').pop()!)) || !url.pathname.endsWith('.'+a.format)) throw Error('Untrusted release URL');
  }
  return m;
}
