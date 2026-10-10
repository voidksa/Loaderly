import {it,expect} from 'vitest';
import {validateCatalog,normalizedLookCode} from './community';
import starters from './community-starters.json';
it('imports all real community examples and strips unknown executable content',()=>{const c=validateCatalog(starters);expect(c.looks).toHaveLength(starters.looks.length);for(const l of c.looks)expect(normalizedLookCode(l.code,l.kind)).toBeTruthy();const v=JSON.parse(c.looks.find(l=>l.kind==='visualizer')!.code);v.settings.script='evil';expect(normalizedLookCode(JSON.stringify(v),'visualizer')).not.toContain('evil');});
it('rejects unrelated formats, malformed codes, unsafe URLs and duplicated designs',()=>{expect(normalizedLookCode('{}','theme')).toBeUndefined();const l=starters.looks[0];expect(validateCatalog({...starters,looks:[{...l,url:'javascript:alert(1)'},{...l,code:'{}'},l,l]}).looks).toHaveLength(1);});

it('accepts official new and legacy community URLs without trusting lookalike domains',()=>{
 const path='/api/community/design?id=design-12345678-1234-1234-1234-123456789abc';
 for(const origin of ['https://loaderly.app','https://loaderly-docs.voidksa.workers.dev']){
  expect(validateCatalog({...starters,looks:[{...starters.looks[0],url:origin+path}]}).looks).toHaveLength(1);
 }
 for(const origin of ['https://loaderly.app.evil.test','http://loaderly.app','https://fake-loaderly.app','https://loaderly.app@evil.test']){
  expect(validateCatalog({...starters,looks:[{...starters.looks[0],url:origin+path}]}).looks).toHaveLength(0);
 }
});
