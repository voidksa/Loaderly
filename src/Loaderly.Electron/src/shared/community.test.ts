import {it,expect} from 'vitest';
import {validateCatalog,normalizedLookCode} from './community';
import starters from './community-starters.json';
it('imports all real community examples and strips unknown executable content',()=>{const c=validateCatalog(starters);expect(c.looks).toHaveLength(starters.looks.length);for(const l of c.looks)expect(normalizedLookCode(l.code,l.kind)).toBeTruthy();const v=JSON.parse(c.looks.find(l=>l.kind==='visualizer')!.code);v.settings.script='evil';expect(normalizedLookCode(JSON.stringify(v),'visualizer')).not.toContain('evil');});
it('rejects unrelated formats, malformed codes, unsafe URLs and duplicated designs',()=>{expect(normalizedLookCode('{}','theme')).toBeUndefined();const l=starters.looks[0];expect(validateCatalog({...starters,looks:[{...l,url:'javascript:alert(1)'},{...l,code:'{}'},l,l]}).looks).toHaveLength(1);});
