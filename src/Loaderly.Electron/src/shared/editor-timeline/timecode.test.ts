import {expect,it} from 'vitest';
import {formatTimecode,parseTimecode} from './timecode';
it('displays familiar times with fractional seconds and carries at minute and hour boundaries',()=>{
  expect(formatTimecode(166.04)).toBe('02:46.04');
  expect(formatTimecode(59.999)).toBe('01:00.00');
  expect(formatTimecode(3600.01)).toBe('01:00:00.01');
  for(const n of [0,.01,59.99,169.04,3599.99,86400])expect(parseTimecode(formatTimecode(n))).toBeCloseTo(n);
});
it('accepts timecodes, plain seconds and Arabic numerals without accepting malformed times',()=>{
  expect(parseTimecode('02:46.04')).toBeCloseTo(166.04);
  expect(parseTimecode('٠٢:٤٦٫٠٤')).toBeCloseTo(166.04);
  expect(parseTimecode('166.04')).toBeCloseTo(166.04);
  for(const s of ['', '2:60', '1:60:00', '1:2:3:4', '-5', '1e5', '1:xx','Infinity'])expect(parseTimecode(s)).toBeUndefined();
});
