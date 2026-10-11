import { describe, expect, it } from 'vitest';
import { appearanceVariables, defaultAppearance } from '../shared/app-preferences/appearance';
import { buildTrayPopupHtml, fitTrayPopupContentSize, supportsNativeTrayCorners, trayPopupColors, trayPopupRadius, trayPopupShape } from './trayPopup';

describe('tray popup glass surfaces', () => {
  it.each([true, false])('uses one menu surface with transparent header and footer, dark=%s', dark => {
    const appearance = {...defaultAppearance,glass:true,opacity:{popover:0}};
    const options = {appearance,dark,desktopGlass:true,reduceTransparency:false};
    const colors = trayPopupColors(options);
    expect(colors.surface).toBe(`color-mix(in srgb, ${appearanceVariables(appearance,dark)['--popover']} 0%, transparent)`);
    const html = buildTrayPopupHtml({...options,locale:'en',version:'2.2.0-preview.1',logo:'',fontCss:''});
    for (const selector of ['tray-head','tray-actions','exit']) {
      const declarations = html.match(new RegExp(`\\.${selector} \\{([^}]+)\\}`))?.[1];
      expect(declarations).toContain('background:transparent');
      expect(declarations).not.toContain('border-top:');
      expect(declarations).not.toContain('border-bottom:');
    }
    expect(html).toContain(`background:${colors.surface}`);
    expect(html).toContain('data-desktop-glass="true"');
  });

  it.each([true, false])('lets the native material show through and follows the saved menu opacity, dark=%s', dark => {
    for (const opacity of [0, 25, 50, 75, 100]) {
      const appearance = {...defaultAppearance,glass:true,opacity:{popover:opacity},colors:{dark:{popover:'#314159'},light:{popover:'#dbe5ed'}}};
      const colors = trayPopupColors({appearance,dark,desktopGlass:true,reduceTransparency:false});
      expect(colors.surface).toBe(`color-mix(in srgb, ${dark?'#314159':'#dbe5ed'} ${opacity}%, transparent)`);
    }
    const defaultGlass = {...defaultAppearance,glass:true};
    expect(trayPopupColors({appearance:defaultGlass,dark,desktopGlass:true,reduceTransparency:false}).surface).toContain(' 0%, transparent)');
  });

  it('preserves readable custom text palettes instead of exposing opposite native glass behind them', () => {
    for (const dark of [true,false]) {
      const palette = dark ? {popover:'#ffffff',text:'#111111',muted:'#333333'} : {popover:'#111111',text:'#ffffff',muted:'#eeeeee'};
      const appearance = {...defaultAppearance,glass:true,opacity:{popover:0},colors:{dark:palette,light:palette}};
      expect(trayPopupColors({appearance,dark,desktopGlass:true,reduceTransparency:false}).surface).toBe(appearanceVariables(appearance,dark)['--popover-fill']);
    }
    const appearance = {...defaultAppearance,glass:true,colors:{dark:{text:'#EEF1F5',muted:'#AAB1BC',popover:'#314159'}}};
    expect(trayPopupColors({appearance,dark:true,desktopGlass:true,reduceTransparency:false}).surface).toBe('color-mix(in srgb, #314159 0%, transparent)');
  });

  it.each([
    {desktopGlass:false,reduceTransparency:false},
    {desktopGlass:true,reduceTransparency:true},
    {desktopGlass:false,reduceTransparency:true}
  ])('uses an opaque surface when the compositor cannot supply glass or accessibility disables it: %o', state => {
    const appearance = {...defaultAppearance,glass:true,opacity:{popover:0}};
    const colors = trayPopupColors({appearance,dark:true,...state});
    expect(colors.glass).toBe(false);
    expect(colors.surface).toBe(appearanceVariables(appearance,true)['--popover']);
    expect(colors.surface).not.toContain('transparent');
  });

  it.each(['en','ar'] as const)('keeps installed version, language, commands and keyboard navigation in %s', locale => {
    const html = buildTrayPopupHtml({appearance:defaultAppearance,dark:true,desktopGlass:false,reduceTransparency:false,locale,version:'2.2.0-preview.1',logo:'data:image/png;base64,AA==',fontCss:''});
    expect(html).toContain(`lang="${locale}" dir="${locale==='ar'?'rtl':'ltr'}"`);
    expect(html).toContain('2.2.0-preview.1');
    expect(html).toContain('<bdi class="version" dir="ltr"');
    expect(html).toContain('direction:ltr;unicode-bidi:isolate;');
    expect(html).not.toContain('Loaderly 2.0');
    for (const command of ['open','downloads','settings','exit']) expect(html).toContain(`href="loaderly-tray://${command}"`);
    expect(html).toContain("['ArrowDown','ArrowUp','Home','End']");
    expect(html).toContain(locale==='ar'?'الإجراءات السريعة':'Quick actions');
  });

  it('uses the app popup and control corner preferences instead of fixed radii', () => {
    for (const appearance of [defaultAppearance,{...defaultAppearance,radius:0},{...defaultAppearance,panelRadius:24,radius:16},{...defaultAppearance,corners:'square' as const}]) {
      const theme=appearanceVariables(appearance,true);
      const html=buildTrayPopupHtml({appearance,dark:true,desktopGlass:false,reduceTransparency:false,locale:'en',version:'2.2.0',logo:'',fontCss:''});
      expect(html.match(/\.tray-panel \{([^}]+)\}/)?.[1]).toContain(`border-radius:${theme['--radius-large']}`);
      expect(html.match(/\na \{([^}]+)\}/)?.[1]).toContain(`border-radius:${theme['--radius']}`);
      expect(trayPopupRadius(appearance)).toBe(Number.parseFloat(theme['--radius-large']));
    }
  });

  it('clips all four native corners while preserving the complete center and edge midpoints', () => {
    const width=232,height=216;
    for (const panelRadius of [3,7,12,16,24]) {
      const shape=trayPopupShape({...defaultAppearance,panelRadius},width,height);
      const contains=(x:number,y:number)=>shape.some(rect=>x>=rect.x&&x<rect.x+rect.width&&y>=rect.y&&y<rect.y+rect.height);
      for (const [x,y] of [[0,0],[width-1,0],[0,height-1],[width-1,height-1]]) expect(contains(x,y)).toBe(false);
      for (const [x,y] of [[width/2,0],[0,height/2],[width-1,height/2],[width/2,height-1],[width/2,height/2]]) expect(contains(x,y)).toBe(true);
      // Preserve every-pixel coverage without constructing half a million
      // matcher objects during a parallel full-suite run.
      const failures={center:0,horizontal:0,vertical:0};
      for(let y=0;y<height;y++) {
        if(!contains(width/2,y))failures.center++;
        for(let x=0;x<width;x++) {
          const included=contains(x,y);
          if(included!==contains(width-x-1,y))failures.horizontal++;
          if(included!==contains(x,height-y-1))failures.vertical++;
        }
      }
      expect({panelRadius,...failures}).toEqual({panelRadius,center:0,horizontal:0,vertical:0});
      for(const rect of shape){expect(rect.x).toBeGreaterThanOrEqual(0);expect(rect.y).toBeGreaterThanOrEqual(0);expect(rect.x+rect.width).toBeLessThanOrEqual(width);expect(rect.y+rect.height).toBeLessThanOrEqual(height);}
    }
  });

  it('matches Windows native backdrop corners while keeping Linux custom curves and explicit square corners', () => {
    for (const panelRadius of [0,3,7,12,24]) {
      const appearance={...defaultAppearance,panelRadius};
      expect(trayPopupRadius(appearance,'win32','10.0.22621')).toBe(panelRadius ? 8 : 0);
      expect(trayPopupRadius(appearance,'win32','10.0.19041')).toBe(panelRadius);
      expect(trayPopupRadius(appearance,'linux')).toBe(panelRadius);
      const html=buildTrayPopupHtml({appearance,platform:'win32',osRelease:'10.0.22621',dark:true,desktopGlass:true,reduceTransparency:false,locale:'en',version:'2.2.0',logo:'',fontCss:''});
      expect(html.match(/\.tray-panel \{([^}]+)\}/)?.[1]).toContain(`border-radius:${panelRadius?8:0}px`);
    }
  });

  it('uses native DWM corners only on Windows 11 and preserves older Windows opaque region fallback', () => {
    for (const release of ['10.0.19041','10.0.19045','6.3.9600','unknown','']) expect(supportsNativeTrayCorners('win32',release)).toBe(false);
    for (const release of ['10.0.22000','10.0.22621','10.0.26100']) expect(supportsNativeTrayCorners('win32',release)).toBe(true);
    for (const platform of ['linux','darwin']) expect(supportsNativeTrayCorners(platform,'10.0.26100')).toBe(false);
  });

  it.each([[0,0],[16,8],[24,12]])('normalizes actual native popup client size with frame offsets %s,%s', (insetWidth,insetHeight) => {
    let content=[0,0];
    const requests:number[][]=[];
    const window={
      setContentSize(width:number,height:number){requests.push([width,height]);content=[width-insetWidth,height-insetHeight];},
      getContentSize(){return content;}
    };
    fitTrayPopupContentSize(window,232,216);
    expect(content).toEqual([232,216]);
    expect(requests).toHaveLength(insetWidth||insetHeight?2:1);
    // Reopening does not accumulate the native frame correction.
    fitTrayPopupContentSize(window,232,216);
    expect(content).toEqual([232,216]);
  });

  it('resets a rounded native window to rectangular when zero panel radius is selected', () => {
    expect(trayPopupShape({...defaultAppearance,panelRadius:0},232,216)).toEqual([{x:0,y:0,width:232,height:216}]);
    expect(trayPopupShape({...defaultAppearance,radius:0},232,216)).toEqual([{x:0,y:0,width:232,height:216}]);
    expect(trayPopupShape({...defaultAppearance,panelRadius:24},20,16).every(rect=>rect.width>0&&rect.x>=0&&rect.x+rect.width<=20&&rect.y+rect.height<=16)).toBe(true);
  });

  it('escapes values inserted into the document and attributes', () => {
    const html = buildTrayPopupHtml({appearance:defaultAppearance,dark:false,desktopGlass:false,reduceTransparency:false,locale:'en',version:'2.2.0<test>',logo:'image" onerror="bad',fontCss:''});
    expect(html).toContain('2.2.0&lt;test&gt;');
    expect(html).toContain('image&quot; onerror=&quot;bad');
    expect(html).not.toContain('src="image" onerror="bad');
  });
});
