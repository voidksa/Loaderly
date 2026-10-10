export const spaceTypes = ['echo', 'slapback', 'ping-pong', 'tape', 'room', 'hall', 'plate', 'cathedral'] as const;
export type SpaceType = typeof spaceTypes[number];
export type AudioSpace = { enabled: boolean; type: SpaceType; mix: number; delayMs: number; feedback: number; decay: number; preDelay: number; width: number; tone: number };
export const defaultAudioSpace: AudioSpace = { enabled: false, type: 'hall', mix: 25, delayMs: 300, feedback: 40, decay: 2, preDelay: 20, width: 80, tone: 6500 };
export function normalizeAudioSpace(value: unknown): AudioSpace {
  const v = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const n = (key: keyof AudioSpace, min: number, max: number) => typeof v[key] === 'number' && Number.isFinite(v[key]) ? Math.max(min, Math.min(max, v[key] as number)) : defaultAudioSpace[key] as number;
  return { enabled: v.enabled === true, type: spaceTypes.includes(v.type as SpaceType) ? v.type as SpaceType : 'hall', mix: n('mix', 0, 100), delayMs: n('delayMs', 20, 1500), feedback: n('feedback', 0, 85), decay: n('decay', .2, 8), preDelay: n('preDelay', 0, 200), width: n('width', 0, 100), tone: n('tone', 500, 16000) };
}
export const isDelay = (type: SpaceType) => ['echo', 'slapback', 'ping-pong', 'tape'].includes(type);
export function spacePreset(type: SpaceType): AudioSpace {
  const presets: Record<SpaceType, Partial<AudioSpace>> = {
    echo: { delayMs: 320, feedback: 40, mix: 25 }, slapback: { delayMs: 90, feedback: 0, mix: 20 },
    'ping-pong': { delayMs: 250, feedback: 55, width: 100, mix: 30 }, tape: { delayMs: 380, feedback: 50, tone: 2200, mix: 30 },
    room: { decay: .65, preDelay: 8, width: 55, mix: 20 }, hall: { decay: 2.6, preDelay: 25, mix: 25 },
    plate: { decay: 1.8, preDelay: 10, tone: 9500, width: 100, mix: 25 }, cathedral: { decay: 6, preDelay: 55, tone: 4500, width: 100, mix: 35 }
  };
  return { ...defaultAudioSpace, ...presets[type], enabled: true, type };
}
// The same deterministic stereo impulse drives Web Audio and offline FFmpeg exports.
// It includes the dry signal, so neither engine applies hidden normalization or gain.
export function spaceImpulse(value: unknown, sampleRate = 48000): [Float32Array, Float32Array] {
  const s = normalizeAudioSpace(value), wet = s.enabled ? s.mix / 100 : 0;
  if (!wet) return [Float32Array.of(1), Float32Array.of(1)];
  const delay = isDelay(s.type), seconds = delay ? Math.min(10, s.delayMs / 1000 * 32 + .05) : s.decay + s.preDelay / 1000;
  const size = Math.ceil(seconds * sampleRate) + 1;
  const channels: [Float32Array, Float32Array] = [new Float32Array(size), new Float32Array(size)];
  let seed = 0x13579bdf;
  const noise = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 2147483648 - 1; };
  for (let channel = 0; channel < 2; channel++) {
    const data = channels[channel];
    if (delay) {
      for (let repeat = 1; repeat <= 32; repeat++) {
        const amplitude = (s.feedback / 100) ** (repeat - 1);
        if (amplitude < .001) break;
        const at = Math.round(repeat * s.delayMs / 1000 * sampleRate);
        if (at >= size) break;
        const side = s.type === 'ping-pong' && repeat % 2 !== channel ? 1 - s.width / 100 : 1;
        const cutoff = s.type === 'tape' ? s.tone / Math.sqrt(repeat) : s.tone;
        const a = 1 - Math.exp(-2 * Math.PI * cutoff / sampleRate);
        for (let k = 0; k < Math.min(size - at, 256); k++) data[at + k] += amplitude * side * a * (1 - a) ** k;
      }
      // Bound the energy of long feedback trains without changing their decay rate.
      const gain = Math.sqrt(1 - (s.feedback / 100) ** 2);
      for (let i = 1; i < size; i++) data[i] *= gain;
    } else {
      const start = Math.round(s.preDelay / 1000 * sampleRate), a = 1 - Math.exp(-2 * Math.PI * s.tone / sampleRate);
      let low = 0, energy = 0;
      for (let i = start; i < size; i++) {
        const t = (i - start) / sampleRate;
        low += a * (noise() - low);
        const attack = s.type === 'plate' ? 1 : Math.min(1, t / .025);
        data[i] = low * attack * Math.exp(-6.9078 * t / s.decay);
        energy += data[i] ** 2;
      }
      const gain = .8 / Math.sqrt(energy || 1);
      for (let i = start; i < size; i++) data[i] *= gain;
      for (const [time, gain] of [[.011, .22], [.019, .16], [.031, .12], [.047, .09]]) {
        const at = start + Math.round((time + channel * .0017) * sampleRate);
        if (at < size) data[at] += gain;
      }
    }
  }
  if (!delay || s.type !== 'ping-pong') for (let i = 0; i < size; i++) {
    const mid = (channels[0][i] + channels[1][i]) / 2, width = s.width / 100;
    channels[0][i] = mid + (channels[0][i] - mid) * width;
    channels[1][i] = mid + (channels[1][i] - mid) * width;
  }
  for (const channel of channels) { for (let i = 0; i < size; i++) channel[i] *= wet; channel[0] += 1 - wet; }
  return channels;
}
