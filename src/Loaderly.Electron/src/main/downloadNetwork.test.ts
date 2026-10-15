import { expect, it } from 'vitest';
import { downloadNetworkArgs } from './downloadNetwork';

it('uses four fragment workers for uncapped transfers', () => {
  for (const rate of [undefined, 0, -1, NaN, Infinity]) {
    expect(downloadNetworkArgs(rate)).toEqual(['--concurrent-fragments', '4', '--abort-on-unavailable-fragments', '--extractor-args', 'youtube:formats=dashy']);
  }
});
it('keeps a single worker when bandwidth is explicitly limited', () => {
  expect(downloadNetworkArgs(128.5)).toEqual(['--concurrent-fragments', '1', '--abort-on-unavailable-fragments', '--limit-rate', '131584']);
  expect(downloadNetworkArgs(0.0001)).toEqual(['--concurrent-fragments', '1', '--abort-on-unavailable-fragments', '--limit-rate', '1']);
});
it('direct recovery drops synthetic DASH while retaining an explicit bandwidth cap', () => {
  expect(downloadNetworkArgs(0, true)).toEqual(['--concurrent-fragments', '1', '--abort-on-unavailable-fragments']);
  expect(downloadNetworkArgs(128.5, true)).toEqual(['--concurrent-fragments', '1', '--abort-on-unavailable-fragments', '--limit-rate', '131584']);
});
