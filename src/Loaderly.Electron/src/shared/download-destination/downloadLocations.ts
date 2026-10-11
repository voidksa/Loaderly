export type DownloadLocation = { id: string; name: string; path: string; kind: 'all' | 'audio' | 'video'; groupByPlatform: boolean };
export type DownloadLocations = {
  downloadDirectory: string; groupDownloadsByPlatform: boolean;
  downloadLocations: readonly DownloadLocation[]; audioLocationId: string; videoLocationId: string;
};
export function normalizeDownloadLocations(value: unknown): DownloadLocation[] {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  return value.flatMap(item => {
    if (!item || typeof item.id !== 'string' || !item.id || ids.has(item.id) || typeof item.path !== 'string' || !item.path || typeof item.name !== 'string' || !item.name.trim()) return [];
    ids.add(item.id);
    return [{ id: item.id.slice(0,80), name: item.name.trim().slice(0,80), path:item.path, kind: item.kind === 'audio' || item.kind === 'video' ? item.kind : 'all', groupByPlatform: item.groupByPlatform === true } as DownloadLocation];
  }).slice(0,50);
}
export function downloadLocationFor(preferences: DownloadLocations, quality: string, selectedId = '') {
  const kind = quality === 'audio' ? 'audio' : 'video';
  const id = selectedId || (kind === 'audio' ? preferences.audioLocationId : preferences.videoLocationId);
  const location = preferences.downloadLocations.find(item => item.id === id && (item.kind === 'all' || item.kind === kind));
  return location ? { path:location.path, groupByPlatform:location.groupByPlatform, name:location.name } : { path:preferences.downloadDirectory, groupByPlatform:preferences.groupDownloadsByPlatform, name:'' };
}
