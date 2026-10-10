import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { audioFilterChain, normalizeAudioSettings } from '../shared/editor-project/audioProcessing';
import { spaceImpulse } from '../shared/editor-project/audioSpace';
import { runEncoder } from './visualizerExport';
import {audioSectionPieces,normalizeAudioSections} from '../shared/editor-project/audioSections';

export function impulseWav(channels: [Float32Array, Float32Array], rate = 48000): Buffer {
  const size = channels[0].length * 8, buffer = Buffer.alloc(44 + size);
  buffer.write('RIFF'); buffer.writeUInt32LE(36 + size, 4); buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(3, 20); buffer.writeUInt16LE(2, 22);
  buffer.writeUInt32LE(rate, 24); buffer.writeUInt32LE(rate * 8, 28); buffer.writeUInt16LE(8, 32); buffer.writeUInt16LE(32, 34);
  buffer.write('data', 36); buffer.writeUInt32LE(size, 40);
  for (let i = 0; i < channels[0].length; i++) { buffer.writeFloatLE(channels[0][i], 44 + i * 8); buffer.writeFloatLE(channels[1][i], 48 + i * 8); }
  return buffer;
}
export function needsAudioEffects(value: unknown, duration: number, sections?:unknown) {
  const s = normalizeAudioSettings(value);
  return Boolean(normalizeAudioSections(sections,duration).length || audioFilterChain(s, duration) || (s.space?.enabled && s.space.mix > 0));
}
export async function applyAudioEffects(executable: string, source: string, output: string, value: unknown, duration: number, codec: 'pcm_s16le' | 'libmp3lame' | 'aac', signal: AbortSignal, sections?:unknown) {
  const s = normalizeAudioSettings(value), directory = await mkdtemp(join(tmpdir(), 'Loaderly-audio-'));
  try {
    const args = ['-v', 'error', '-y', '-i', source];
    const chain = audioFilterChain(s, duration) || 'anull';
    const parts=normalizeAudioSections(sections,duration);
    if(parts.length){
      const pieces=audioSectionPieces(s,parts,duration),filters:string[]=[];
      filters.push(`[0:a]asplit=${pieces.length}${pieces.map((_,i)=>`[input${i}]`).join('')}`);
      let impulseIndex=0;
      for(const [i,piece] of pieces.entries()){
        const length=piece.end-piece.start,settings=piece.settings;
        filters.push(`[input${i}]atrim=start=${piece.start.toFixed(6)}:end=${piece.end.toFixed(6)},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo[part${i}]`);
        let input=`[part${i}]`;
        if(settings.space?.enabled&&settings.space.mix>0){
          const impulse=join(directory,`space-${i}.wav`);await writeFile(impulse,impulseWav(spaceImpulse(settings.space)));args.push('-i',impulse);impulseIndex++;
          filters.push(`${input}[${impulseIndex}:a]afir=dry=1:wet=1:gtype=none:irnorm=-1:irfmt=input[space${i}]`);input=`[space${i}]`;
        }
        filters.push(`${input}${audioFilterChain(settings,length)||'anull'},aformat=sample_fmts=fltp:channel_layouts=stereo,apad,atrim=duration=${length.toFixed(6)},asetpts=PTS-STARTPTS[out${i}]`);
      }
      const fades=audioFilterChain({fadeIn:s.fadeIn,fadeOut:s.fadeOut},duration)||'anull';
      filters.push(`${pieces.map((_,i)=>`[out${i}]`).join('')}concat=n=${pieces.length}:v=0:a=1,${fades}[out]`);
      args.push('-filter_complex',filters.join(';'),'-map','0:v?','-map','[out]');
    } else if (s.space?.enabled && s.space.mix > 0) {
      const impulse = join(directory, 'space.wav');
      await writeFile(impulse, impulseWav(spaceImpulse(s.space)));
      args.push('-i', impulse, '-filter_complex', `[0:a]aresample=48000:out_chlayout=stereo:center_mix_level=1[a];[a][1:a]afir=dry=1:wet=1:gtype=none:irnorm=-1:irfmt=input[space];[space]${chain},atrim=duration=${duration.toFixed(6)}[out]`, '-map', '0:v?', '-map', '[out]');
    } else args.push('-map', '0', '-af', chain);
    args.push('-c:v', 'copy', '-c:a', codec);
    if (codec === 'libmp3lame') args.push('-q:a', '0');
    if (codec === 'aac') args.push('-b:a', '192k');
    args.push(output);
    await runEncoder(executable, args, signal);
  } finally { await rm(directory, { recursive: true, force: true }); }
}
