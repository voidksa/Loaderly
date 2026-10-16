export type SpeechMode = 'auto' | 'speech' | 'music';
export type SpeechAnalysis = { mode:'speech'|'music'; reason:'speech'|'mixed'|'quiet'; sampledSeconds:number };
export type SpeechPlan = SpeechAnalysis & { model:'base'|'small'; modelReady:boolean };

// Prefer an installed model on capable machines; do not silently turn a small
// first-use download into a larger one just because the machine has more RAM.
export function recommendedSpeechModel(installed:readonly string[], memoryBytes:number, cores:number):'base'|'small' {
  return installed.includes('small') && memoryBytes >= 6*1024**3 && cores >= 4 ? 'small' : 'base';
}

export function speechSampleOffsets(duration:number):number[] {
  if(!Number.isFinite(duration)||duration<=0)throw Error('INVALID_MEDIA_DURATION');
  return duration<=24?[0]:[Math.min(30,duration*.1),duration*.5,Math.max(0,duration*.85-4)].map(n=>Math.min(duration-8,n));
}
