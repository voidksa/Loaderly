// Blackman-window FFT with the same bin count and dB range as the live analyser.
// Kept independent from the browser so file exports can run without real-time playback.
export class AudioSpectrum {
  private previous=new Float64Array(1024);
  frame(samples:Float32Array,smoothing:number){
    const n=2048,re=new Float64Array(n),im=new Float64Array(n),wave=new Uint8Array(n);
    for(let i=0;i<n;i++){const sample=Number.isFinite(samples[i])?samples[i]:0;wave[i]=Math.max(0,Math.min(255,Math.round(128+sample*128)));re[i]=sample*(.42-.5*Math.cos(2*Math.PI*i/n)+.08*Math.cos(4*Math.PI*i/n));}
    for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){[re[i],re[j]]=[re[j],re[i]];}}
    for(let size=2;size<=n;size<<=1){const angle=-2*Math.PI/size;for(let start=0;start<n;start+=size)for(let j=0;j<size/2;j++){const c=Math.cos(angle*j),s=Math.sin(angle*j),a=start+j,b=a+size/2,tr=re[b]*c-im[b]*s,ti=re[b]*s+im[b]*c;re[b]=re[a]-tr;im[b]=im[a]-ti;re[a]+=tr;im[a]+=ti;}}
    const spectrum=new Uint8Array(1024),smooth=Math.max(0,Math.min(.95,smoothing));
    for(let i=0;i<1024;i++){const magnitude=Math.hypot(re[i],im[i])/n;this.previous[i]=smooth*this.previous[i]+(1-smooth)*magnitude;const db=20*Math.log10(Math.max(1e-12,this.previous[i]));spectrum[i]=Math.max(0,Math.min(255,Math.round((db+100)/70*255)));}
    return {spectrum,waveform:wave};
  }
}
