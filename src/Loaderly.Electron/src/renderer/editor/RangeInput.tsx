import type { CSSProperties, InputHTMLAttributes } from 'react';

export function RangeInput({ value, min = 0, max = 100, style, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const amount = Math.max(0, Math.min(100, (Number(value ?? min) - Number(min)) / Math.max(.001, Number(max) - Number(min)) * 100));
  return <input {...props} type="range" min={min} max={max} value={value}
    style={{ '--range-fill': `${amount}%`, ...style } as CSSProperties} />;
}
