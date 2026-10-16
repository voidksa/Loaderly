import {describe,it,expect} from 'vitest';
import {appearanceOpacity,appearanceVariables,decodeTheme,encodeTheme,normalizeAppearance,opacityKeys,themePresets,isBuiltinAppearance,selectBuiltinAppearance} from './appearance';
const tintPercent=(fill:string)=>Number(fill.match(/ ([\d.]+)%/)![1]);
describe('portable themes',()=>{
 it('replaces a community theme completely while preserving reading size and workspace spacing',()=>{
  const community=normalizeAppearance({preset:'graphite',colors:{dark:{background:'#19161f',accent:'#d8acff'},light:{background:'#f6f1fa'}},radius:10,glass:true,opacity:{background:10},panelRadius:20,borderWidth:2,textScale:110,sidebarWidth:240,density:'spacious'});
  expect(isBuiltinAppearance(community)).toBe(false);
  for(const preset of themePresets){const next=selectBuiltinAppearance(community,preset.id);expect(isBuiltinAppearance(next)).toBe(true);expect(next).toMatchObject({textScale:110,sidebarWidth:240,density:'spacious',glass:false});for(const dark of [true,false])expect(appearanceVariables(next,dark)['--background']).toBe((dark?preset.dark:preset.light)[0]);expect(next.colors).toBeUndefined();expect(next.opacity).toBeUndefined();expect(next.radius).toBeUndefined();}
 });
 it('uses lighter option menus with readable primary labels over either desktop extreme',()=>{
  const channels=(hex:string)=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
  const lum=(rgb:number[])=>rgb.reduce((sum,n,i)=>{n/=255;return sum+(n<=.04045?n/12.92:((n+.055)/1.055)**2.4)*[.2126,.7152,.0722][i]},0);
  for(const preset of themePresets)for(const dark of [true,false]){
   const css=appearanceVariables(normalizeAppearance({preset:preset.id,glass:true,opacity:{popover:0}}),dark);
   const [,hex,percent]=css['--menu-fill'].match(/(#[a-f\d]{6}) ([\d.]+)%/i)!;
   const alpha=Number(percent)/100;
   expect(alpha).toBeLessThan(tintPercent(css['--popover-fill'])/100);
   for(const backdrop of [0,255]){
    const ink=lum(channels(css['--foreground'])),base=channels(hex).map(n=>n*alpha+backdrop*(1-alpha));
    for(const state of ['fill','hover','selected','pressed']){
     const [,color,opacity]=css['--control-'+state].match(/(#[a-f\d]{6}) ([\d.]+)%/i)!;
     const amount=Number(opacity)/100,bg=lum(channels(color).map((n,i)=>n*amount+base[i]*(1-amount)));
     expect((Math.max(ink,bg)+.05)/(Math.min(ink,bg)+.05),`${preset.id}/${dark}/${state}/${backdrop}`).toBeGreaterThanOrEqual(4.5);
    }
   }
   const opaque=appearanceVariables(normalizeAppearance({preset:preset.id,glass:true,opacity:{popover:100}}),dark);
   expect(tintPercent(opaque['--menu-fill'])).toBe(100);
   const plain=appearanceVariables(normalizeAppearance({preset:preset.id}),dark);
   expect(plain['--menu-fill']).toBe(plain['--popover-fill']);
  }
 });
 it('keeps glass control labels readable across presets, states and extreme desktop backgrounds',()=>{
  const rgb=(hex:string)=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
  const lum=(channels:number[])=>channels.reduce((sum,v,i)=>{v/=255;return sum+(v<=.04045?v/12.92:((v+.055)/1.055)**2.4)*[.2126,.7152,.0722][i];},0);
  const over=(fill:string,background:number[])=>{const match=fill.match(/(#[a-f\d]{6}) ([\d.]+)%/i);if(!match)return rgb(fill);const alpha=Number(match[2])/100;return rgb(match[1]).map((v,i)=>v*alpha+background[i]*(1-alpha));};
  for(const preset of themePresets)for(const dark of [true,false])for(const opacity of [0,50,100]){
   const css=appearanceVariables(normalizeAppearance({preset:preset.id,glass:true,opacity:{background:opacity,surface:opacity}}),dark);
   for(const backdrop of [0,255])for(const state of ['fill','hover','selected','pressed']){
    const surface=over(css['--background-glass-fill'],[backdrop,backdrop,backdrop]);
    const ink=lum(rgb(css['--foreground'])),background=lum(over(css['--control-'+state],surface));
    expect((Math.max(ink,background)+.05)/(Math.min(ink,background)+.05),`${preset.id}/${dark}/${opacity}/${state}/${backdrop}`).toBeGreaterThanOrEqual(4.5);
   }
  }
 });
 it('keeps default glass text readable over bright and dark desktops across every preset',()=>{
  const lum=(rgb:number[])=>rgb.reduce((sum,n,i)=>{n/=255;return sum+(n<=.04045?n/12.92:((n+.055)/1.055)**2.4)*[.2126,.7152,.0722][i]},0);
  const channels=(hex:string)=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
  for(const preset of themePresets)for(const dark of [true,false]){
   const css=appearanceVariables(normalizeAppearance({preset:preset.id,glass:true,opacity:{background:0,sidebar:0,titlebar:0,editor:0,popover:0}}),dark);
   for(const key of ['background','sidebar','titlebar','editor','popover']){
    const fill=css[`--${key}-${key==='popover'?'fill':'glass-fill'}`];
    const [,hex,percent]=fill.match(/(#[a-f\d]{6}) ([\d.]+)%/i)!;
    const alpha=Number(percent)/100;
    if(key==='popover')expect(alpha).toBeGreaterThanOrEqual(.84);
    // Readability must not be achieved by making default light glass opaque.
    if(!dark)expect(alpha).toBeLessThanOrEqual(key==='popover'?.84:.8);
    for(const ink of [css['--foreground'],css['--muted']])for(const backdrop of [0,64,128,192,255]){
     const text=lum(channels(ink)),background=lum(channels(hex).map(n=>n*alpha+backdrop*(1-alpha)));
     expect((Math.max(text,background)+.05)/(Math.min(text,background)+.05),`${preset.id}/${dark}/${key}/${backdrop}`).toBeGreaterThanOrEqual(4.5);
    }
   }
  }
 });
 it('keeps raw blending portable and scales popup tint continuously without rewriting saved opacity',()=>{
  const opacities=[0,25,50,75,100];
  const alphas=opacities.map(popover=>{
   const value=normalizeAppearance({opacity:{popover,background:popover}}),css=appearanceVariables(value,true);
   expect(decodeTheme(encodeTheme(value)).opacity?.popover).toBe(popover);
   expect(css['--background-fill']).toContain(` ${popover}%`);
   return Number(css['--popover-fill'].match(/ ([\d.]+)%/)![1]);
  });
  expect(alphas).toEqual([84,88,92,96,100]);
 });
 it('gives every glass surface effective defaults without adding saved overrides',()=>{
  const plain=normalizeAppearance({}),glass=normalizeAppearance({...plain,glass:true});
  const before=encodeTheme(glass);
  const defaults={background:15,sidebar:15,titlebar:15,surface:0,editor:15,popover:0};
  for(const key of opacityKeys){
   expect(appearanceOpacity(plain,key)).toBe(100);
   expect(appearanceOpacity(glass,key)).toBe(defaults[key]);
  }
  const light=appearanceVariables(glass,false),dark=appearanceVariables(glass,true);
  expect(tintPercent(light['--background-glass-fill'])).toBe(79.6);
  expect(tintPercent(light['--sidebar-glass-fill'])).toBe(77.05);
  expect(tintPercent(light['--editor-glass-fill'])).toBe(79.6);
  expect(tintPercent(light['--popover-fill'])).toBe(84);
  expect(tintPercent(dark['--background-glass-fill'])).toBe(83);
  expect(tintPercent(dark['--popover-fill'])).toBe(84);
  expect(tintPercent(light['--surface-fill'])).toBe(0);
  expect(encodeTheme(glass)).toBe(before);
  expect(decodeTheme(before)).toEqual(glass);
  expect(glass.opacity).toBeUndefined();
 });
 it('keeps explicit transparent and opaque choices when toggling glass',()=>{
  for(const opacity of [0,100]){
   const choices=Object.fromEntries(opacityKeys.map(key=>[key,opacity]));
   const value=normalizeAppearance({opacity:choices});
   for(const glass of [true,false,true]){
    const next={...value,glass};
    for(const key of opacityKeys)expect(appearanceOpacity(next,key)).toBe(opacity);
    for(const dark of [true,false]){
     const css=appearanceVariables(next,dark);
     for(const key of opacityKeys){
      expect(tintPercent(css[`--${key}-fill`])).toBe(key==='popover'&&opacity===0?(dark||glass?84:93):opacity);
      if(opacity===100&&key!=='surface'&&key!=='popover')expect(tintPercent(css[`--${key}-glass-fill`])).toBe(100);
     }
    }
    expect(decodeTheme(encodeTheme(next)).opacity).toEqual(choices);
   }
  }
 });
 it('keeps a useful continuous transparency range across every light palette',()=>{
  for(const preset of themePresets)for(const key of ['background','sidebar','titlebar','editor','popover'] as const){
   const amounts=[0,25,50,75,100].map(opacity=>{
    const css=appearanceVariables(normalizeAppearance({preset:preset.id,glass:true,opacity:{[key]:opacity}}),false);
    return tintPercent(css[`--${key}-${key==='popover'?'fill':'glass-fill'}`]);
   });
   expect(amounts[0]).toBeLessThanOrEqual(key==='popover'?84:80);
   expect(amounts[4]).toBe(100);
   expect(amounts[4]-amounts[0]).toBeGreaterThanOrEqual(key==='popover'?16:20);
   for(let i=1;i<amounts.length;i++)expect(amounts[i]-amounts[i-1]).toBeCloseTo((100-amounts[0])/4,2);
  }
 });
 it('uses darker default light secondary text only for glass and preserves custom ink',()=>{
  const plain=appearanceVariables(normalizeAppearance({}),false);
  const glass=appearanceVariables(normalizeAppearance({glass:true}),false);
  expect(plain['--muted']).toBe('#646b76');
  expect(glass['--muted']).toBe('#434a55');
  for(const key of ['--foreground','--titlebar-ink','--accent','--accent-ink','--ui-font-scale'])expect(glass[key]).toBe(plain[key]);
  const custom=normalizeAppearance({glass:true,colors:{light:{text:'#25272c',muted:'#646b76'}},opacity:{background:0,popover:0}});
  const css=appearanceVariables(custom,false);
  expect(css['--foreground']).toBe('#25272c');
  expect(css['--muted']).toBe('#646b76');
  // An explicitly lighter ink retains the stronger tint it needs for contrast.
  expect(tintPercent(css['--background-glass-fill'])).toBe(97);
  expect(tintPercent(css['--popover-fill'])).toBe(93);
  expect(decodeTheme(encodeTheme(custom))).toEqual(custom);
 });
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
