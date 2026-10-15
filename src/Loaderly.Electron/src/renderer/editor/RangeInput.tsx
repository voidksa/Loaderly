import type { CSSProperties, InputHTMLAttributes } from 'react';

export function RangeInput({ value, min = 0, max = 100, style, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const amount = Math.max(0, Math.min(100, (Number(value ?? min) - Number(min)) / Math.max(.001, Number(max) - Number(min)) * 100));
  // Numeric scales always increase physically to the right, regardless of label language.
  return <input {...props} type="range" dir="ltr" min={min} max={max} value={value}
    style={{ '--range-fill': `${amount}%`, ...style } as CSSProperties} />;
}
