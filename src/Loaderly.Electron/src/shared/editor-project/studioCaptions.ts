import type { EditorSubtitleCue } from './editorSubtitles';
import type { TranscriptWord } from './studio';

export function subtitleWarnings(cues: readonly EditorSubtitleCue[], duration: number): number[] {
  return cues.flatMap((cue, i) => !Number.isFinite(cue.startSeconds) || !Number.isFinite(cue.endSeconds) || cue.startSeconds < 0 || cue.endSeconds > duration + .01 || cue.endSeconds <= cue.startSeconds || (i > 0 && cue.startSeconds < cues[i - 1].endSeconds) ? [i] : []);
}
const time = (s: number, decimal: string) => { const ms = Math.max(0, Math.round(s * 1000)); return `${String(Math.floor(ms / 3600000)).padStart(2,'0')}:${String(Math.floor(ms / 60000) % 60).padStart(2,'0')}:${String(Math.floor(ms / 1000) % 60).padStart(2,'0')}${decimal}${String(ms % 1000).padStart(3,'0')}`; };
export function serializeStudioSubtitles(cues: readonly EditorSubtitleCue[], format: 'srt' | 'vtt') {
  return (format === 'vtt' ? 'WEBVTT\n\n' : '') + cues.filter(c => Number.isFinite(c.startSeconds) && Number.isFinite(c.endSeconds) && c.endSeconds > c.startSeconds).map((c,i) => `${format === 'srt' ? `${i+1}\n` : ''}${time(c.startSeconds,format==='srt'?',':'.')} --> ${time(c.endSeconds,format==='srt'?',':'.')}\n${c.text.replaceAll('\r','').replaceAll(/\n{2,}/g,'\n')}\n`).join('\n');
}
const assTime = (s: number) => time(s,'.').slice(0,-1).replace(/^0(?=\d:)/,'');
const assText = (s: string) => s.replaceAll('\\','\\\\').replaceAll('{','\\{').replaceAll('}','\\}').replaceAll(/\r?\n/g,'\\N');
export function wordCaptionAss(words: readonly TranscriptWord[], width: number, height: number, color: string, style: 'plain'|'box'|'pop' = 'box') {
  const bgr = color.slice(5,7)+color.slice(3,5)+color.slice(1,3);
  const header = `[Script Info]\nScriptType: v4.00+\nPlayResX: ${width}\nPlayResY: ${height}\nWrapStyle: 2\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Words,Noto Sans Arabic,${Math.round(height/18)},&H00${bgr},&H00FFFFFF,&H88000000,&H88000000,0,0,0,0,100,100,0,0,${style==='box'?3:1},${style==='box'?8:2},0,2,20,20,${Math.round(height*.12)},1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
  return header + words.filter(w => w.end>w.start && w.text.trim()).map(w => `Dialogue: 0,${assTime(w.start)},${assTime(w.end)},Words,,0,0,0,,${style==='pop'?'{\\fscx85\\fscy85\\t(0,100,\\fscx100\\fscy100)}':''}${assText(w.text.trim())}\n`).join('');
}
