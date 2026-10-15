/** Limit parallel work per download. Explicit bandwidth caps keep one fragment worker. */
export function downloadNetworkArgs(rateKib?: number, directTransfer = false): string[] {
  const limited = Number.isFinite(rateKib) && rateKib! > 0;
  const parallel = !limited && !directTransfer;
  return ['--concurrent-fragments', parallel ? '4' : '1', '--abort-on-unavailable-fragments',
    // YouTube's direct HTTPS formats otherwise ignore fragment concurrency.
    // The extractor supplies ordered byte ranges, preserving its resume/retry handling.
    ...(parallel ? ['--extractor-args', 'youtube:formats=dashy'] : []),
    ...(limited ? ['--limit-rate', String(Math.max(1, Math.floor(rateKib! * 1024)))] : [])];
}
