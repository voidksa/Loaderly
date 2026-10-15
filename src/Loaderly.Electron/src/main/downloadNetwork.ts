/** Limit parallel work per download. Explicit bandwidth caps keep one fragment worker. */
export function downloadNetworkArgs(rateKib?: number): string[] {
  const limited = Number.isFinite(rateKib) && rateKib! > 0;
  return ['--concurrent-fragments', limited ? '1' : '4', '--abort-on-unavailable-fragments',
    // YouTube's direct HTTPS formats otherwise ignore fragment concurrency.
    // The extractor supplies ordered byte ranges, preserving its resume/retry handling.
    ...(!limited ? ['--extractor-args', 'youtube:formats=dashy'] : []),
    ...(limited ? ['--limit-rate', String(Math.max(1, Math.floor(rateKib! * 1024)))] : [])];
}
