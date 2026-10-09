export const speedSoundModes = ['normal', 'preserve-pitch', 'warm', 'bright', 'radio'] as const;
export type SpeedSoundMode = typeof speedSoundModes[number];
export function normalizeSpeedMode(value: unknown): SpeedSoundMode {
  return speedSoundModes.includes(value as SpeedSoundMode) ? value as SpeedSoundMode : 'preserve-pitch';
}
export function hasSpeedSound(rate: number, mode: unknown): boolean {
  return rate !== 1 || ['warm', 'bright', 'radio'].includes(normalizeSpeedMode(mode));
}
export function speedTone(mode: unknown) {
  return { bass: mode === 'warm' ? 6 : 0, treble: mode === 'warm' ? -4 : mode === 'bright' ? 6 : 0,
    highpass: mode === 'radio' ? 300 : 0, lowpass: mode === 'radio' ? 3400 : 0 };
}
export function audioSpeedFilterChain(rate: number, mode: SpeedSoundMode): string {
  const speed = Number.isFinite(rate) ? Math.max(.25, Math.min(8, rate)) : 1;
  if (mode === 'normal') {
    // Normalize first: asetrate reinterprets samples, it does not resample them.
    return `aresample=44100,asetrate=${Math.round(44100 * speed)},aresample=44100`;
  }
  const filters: string[] = [];
  let remaining = speed;
  while (remaining > 2) { filters.push('atempo=2'); remaining /= 2; }
  while (remaining < .5) { filters.push('atempo=0.5'); remaining /= .5; }
  filters.push(`atempo=${Number(remaining.toFixed(6))}`);
  const tone = speedTone(mode);
  if (tone.bass) filters.push(`bass=g=${tone.bass}:f=200:t=q:w=0.7071`);
  if (tone.treble) filters.push(`treble=g=${tone.treble}:f=3000:t=q:w=0.7071`);
  if (tone.highpass) filters.push(`highpass=f=${tone.highpass}:t=q:w=0.7071`);
  if (tone.lowpass) filters.push(`lowpass=f=${tone.lowpass}:t=q:w=0.7071`);
  return filters.join(',');
}
