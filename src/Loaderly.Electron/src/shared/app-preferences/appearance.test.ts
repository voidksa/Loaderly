import {describe,it,expect} from 'vitest';
import {appearanceVariables,decodeTheme,encodeTheme,normalizeAppearance} from './appearance';
describe('portable themes',()=>{
 it('preserves independent surfaces, transparency and layout through sharing',()=>{
  const value=normalizeAppearance({preset:'ocean',glass:true,density:'spacious',colors:{dark:{sidebar:'#123456',popover:'#223344',editor:'#334455',titlebar:'#445566',selection:'#556677',buttonText:'#ffffff'}},opacity:{background:30,sidebar:0,titlebar:80,surface:70,editor:65,popover:90},textScale:115,sidebarWidth:244,panelRadius:18,borderWidth:.5});
  expect(decodeTheme(encodeTheme(value))).toEqual(value);
  const css=appearanceVariables(value,true);expect(css['--sidebar-fill']).toContain('#123456 0%');expect(css['--popover']).toBe('#223344');expect(css['--ui-font-scale']).toBe('1.15');expect(css['--accent-ink']).toBe('#ffffff');
 });
 it('rejects unsafe component settings instead of emitting arbitrary styles',()=>{
  const base=JSON.parse(encodeTheme(normalizeAppearance({})));
  for(const extra of [{opacity:{sidebar:'url(x)'}},{opacity:{unknown:50}},{opacity:{surface:-1}},{opacity:{popover:101}},{glass:'true'},{textScale:121},{sidebarWidth:10},{panelRadius:100},{borderWidth:4},{colors:{dark:{sidebar:'red;display:none'}}}])expect(()=>decodeTheme(JSON.stringify({...base,...extra}))).toThrow();
  expect(normalizeAppearance({opacity:{sidebar:Infinity,surface:NaN},textScale:Infinity}).opacity).toBeUndefined();
 });
 it('round trips preferences without credentials or arbitrary properties',()=>{const value=normalizeAppearance({preset:'ocean',accent:'#52aa98',density:'compact',corners:'square',apiKey:'secret'});expect(decodeTheme(encodeTheme(value))).toEqual(value);expect(encodeTheme(value)).not.toContain('secret')});
 it('rejects executable colors and unknown theme versions',()=>{expect(()=>decodeTheme('{"format":"loaderly-theme","version":9}')).toThrow();expect(normalizeAppearance({accent:'url(https://evil.test)'}).accent).toBe('');expect(()=>decodeTheme('x'.repeat(5000))).toThrow()});
 it('chooses readable button text for dark and light accents',()=>{expect(appearanceVariables(normalizeAppearance({accent:'#000000'}),true)['--accent-ink']).toBe('#ffffff');expect(appearanceVariables(normalizeAppearance({accent:'#ffffff'}),false)['--accent-ink']).toBe('#10191e')});
 it('defaults to Graphite while preserving an existing selected palette',()=>{expect(normalizeAppearance(undefined).preset).toBe('graphite');expect(normalizeAppearance({preset:'forest'}).preset).toBe('forest')});
 it('round trips separate mode palettes and clears overrides when removed',()=>{const v=normalizeAppearance({colors:{dark:{background:'#123456',text:'#ffffff'},light:{background:'#eeeeee'}},radius:12});expect(decodeTheme(encodeTheme(v))).toEqual(v);expect(appearanceVariables(v,true)['--background']).toBe('#123456');expect(appearanceVariables(v,false)['--background']).toBe('#eeeeee');expect(appearanceVariables(normalizeAppearance({}),true)['--background']).toBe('#151515');expect(appearanceVariables(v,true)['--radius']).toBe('12px')});
 it('loads version 1 files and rejects malformed custom palettes',()=>{const old={format:'loaderly-theme',version:1,preset:'ocean',accent:'',density:'compact',corners:'square'};expect(decodeTheme(JSON.stringify(old)).preset).toBe('ocean');for(const extra of [{colors:{dark:{text:'url(x)'}}},{colors:{other:{text:'#ffffff'}}},{radius:100},{colors:[]},{colors:{dark:{script:'#ffffff'}}}])expect(()=>decodeTheme(JSON.stringify({...old,version:2,...extra}))).toThrow()});
});
