export type DownloadAudioMode = 'original' | 'vocals' | 'instrumental';
export const downloadAudioModes = ['original', 'vocals', 'instrumental'] as const;

/** Explicit modes take precedence over the old saved toggle, including original. */
export function normalizeDownloadAudioMode(value: unknown, removeMusic?: unknown): DownloadAudioMode {
  return value === 'original' || value === 'vocals' || value === 'instrumental' ? value : removeMusic === true ? 'vocals' : 'original';
}
export function downloadAudioMode(value: { audioMode?: unknown; removeMusic?: unknown }): DownloadAudioMode {
  return normalizeDownloadAudioMode(value.audioMode, value.removeMusic);
}
export function downloadAudioLabel(mode: DownloadAudioMode, ar: boolean): string {
  return mode === 'vocals' ? ar ? 'بدون موسيقى' : 'Vocals only' : mode === 'instrumental' ? ar ? 'موسيقى فقط' : 'Instrumental' : ar ? 'الصوت الأصلي' : 'Original audio';
}
export function downloadAudioDescription(mode: DownloadAudioMode, ar: boolean): string {
  return mode === 'vocals' ? ar ? 'يحتفظ بالكلام والغناء ويقلّل الموسيقى.' : 'Keep speech and singing, reduce music.' : mode === 'instrumental' ? ar ? 'يحتفظ بالموسيقى ويقلّل الغناء والكلام.' : 'Keep music, reduce singing and speech.' : ar ? 'يحتفظ بصوت المقطع كاملًا كما هو.' : 'Keep the complete original sound.';
}
