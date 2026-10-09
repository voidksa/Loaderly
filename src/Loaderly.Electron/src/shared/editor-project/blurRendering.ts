export function blurAmount(strength: number): number {
  return Number.isFinite(strength) ? Math.max(0, Math.min(48, strength)) : 0;
}

export function pixelBlockSize(strength: number): number {
  return strength <= 0 ? 1 : Math.max(2, Math.round(blurAmount(strength) * 2));
}

export function blurShapeAlpha(shape: string | undefined): string | undefined {
  if (shape === 'ellipse' || shape === 'face') {
    return 'if(lte(pow((X-W/2)/(W/2),2)+pow((Y-H/2)/(H/2),2),1),255,0)';
  }
  if (shape === 'rounded') {
    const radius = 'min(W,H)*0.18';
    return `if(lte(pow(max(abs(X-W/2)-(W/2-${radius}),0),2)+pow(max(abs(Y-H/2)-(H/2-${radius}),0),2),pow(${radius},2)),255,0)`;
  }
  return undefined;
}
