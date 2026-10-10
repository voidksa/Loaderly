import {describe,expect,it} from 'vitest';
import {createMediaIdAllocator} from './mediaIdentity';

describe('media identities',()=>{
  it('keeps simultaneous imports and playlist entries independently selectable',()=>{
    const next=createMediaIdAllocator([],()=>1000);
    const imports=Array.from({length:3},next),playlist=Array.from({length:1000},next);
    const ids=[...imports,...playlist];
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter(id=>id!==imports[1])).toContain(imports[0]);
    expect(ids.filter(id=>id!==imports[1])).toContain(imports[2]);
  });
  it('starts beyond saved identities even when the clock goes backwards',()=>{
    let time=900;
    const next=createMediaIdAllocator([1000,1200],()=>time);
    expect(next()).toBe(1201);time=100;expect(next()).toBe(1202);
    time=5000;expect(next()).toBe(5000);expect(next()).toBe(5001);
  });
});
