import {expect,it} from 'vitest';
import {shouldShowWhatsNew,whatsNewBuild} from './whatsNew';
it('announces a new installed build once, including a same-version repack',()=>{
 expect(shouldShowWhatsNew('2.3.1',null)).toBe(true);
 expect(shouldShowWhatsNew('2.3.1-preview.1',null)).toBe(true);
 expect(shouldShowWhatsNew('2.3.1',whatsNewBuild)).toBe(false);
 expect(shouldShowWhatsNew('2.3.1','older-build-of-2.3.1')).toBe(true);
 expect(shouldShowWhatsNew('2.1.3',null)).toBe(false);
});

it('uses the installed content fingerprint for silent repacks',()=>{expect(shouldShowWhatsNew('2.3.1','2.3.1:old','2.3.1:new')).toBe(true);expect(shouldShowWhatsNew('2.3.1','2.3.1:new','2.3.1:new')).toBe(false);});
