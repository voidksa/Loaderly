import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {build} from 'esbuild';
const project=resolve(dirname(fileURLToPath(import.meta.url)),'..'),site=resolve(project,'designer');
const out=resolve(project,'public/studio');await mkdir(out,{recursive:true});
const {visualizerLab}=await import(pathToFileURL(resolve(site,'visualizer-lab.mjs')));
const engineBuild=await build({entryPoints:[resolve(site,'visualizer-engine-entry.ts')],bundle:true,format:'esm',platform:'browser',write:false});
const engine=await import('data:text/javascript;base64,'+Buffer.from(engineBuild.outputFiles[0].text).toString('base64'));
let source=await readFile(resolve(site,'public/visualizer-editor.js'),'utf8');
source=`import {installTooltips} from 'loaderly-tooltips';installTooltips(document);\n`+source;
source=source.replace('code.textContent=encodeVisualizer(settings);',`code.textContent=encodeVisualizer(settings);parent.postMessage({type:'loaderly-designer-change',code:code.textContent},'*');`);
source=source.replace('  function announce(message)', `  window.addEventListener('message',event=>{
    if(event.source!==parent)return;
    if(event.data?.type==='loaderly-designer-tooltip-theme'){
      const mapping={background:'--bg',foreground:'--text',border:'--line',popover:'--popover',surface:'--surface',raised:'--soft',accent:'--green',muted:'--muted'};
      for(const key of Object.keys(mapping)){const color=event.data.colors?.[key];if(typeof color==='string'&&/^#[a-f0-9]{6}$/i.test(color)){document.documentElement.style.setProperty(mapping[key],color);document.documentElement.style.setProperty('--tooltip-'+(key==='popover'?'background':key),color);}}
      if(event.data.mode==='light'||event.data.mode==='dark')document.documentElement.dataset.theme=event.data.mode;
      if(typeof event.data.radius==='string'&&/^(?:[0-9]|1[0-9]|20)px$/.test(event.data.radius)){document.documentElement.style.setProperty('--tooltip-radius',event.data.radius);document.documentElement.style.setProperty('--radius',event.data.radius);}
    }
    if(event.data?.type==='loaderly-designer-init'&&typeof event.data.code==='string')apply(event.data.code);
  });
  code.addEventListener('code-update',()=>parent.postMessage({type:'loaderly-designer-change',code:code.textContent},'*'));
  parent.postMessage({type:'loaderly-designer-ready'},'*');
  function announce(message)`);
const script=await build({stdin:{contents:source,resolveDir:resolve(site,'public'),sourcefile:'visualizer-editor.js'},bundle:true,format:'iife',platform:'browser',write:false,minify:true,plugins:[{name:'local-studio-imports',setup(b){b.onResolve({filter:/^loaderly-tooltips$/},()=>({path:resolve(project,'src/shared/ui/tooltips.ts')}));b.onResolve({filter:/^\//},args=>({path:args.path==='/visualizer-engine.js'?resolve(site,'visualizer-engine-entry.ts'):resolve(site,'public',args.path.slice(1))}));}}]});
let css=(await Promise.all(['loaderly.css','documentation.css','visualizer-editor.css'].map(file=>readFile(resolve(site,'public',file),'utf8')))).join('\n');
css+='\n'+await readFile(resolve(project,'src/shared/ui/tooltips.css'),'utf8');
for(const match of [...css.matchAll(/url\(['"]?(\/fonts\/[^)'" ]+)['"]?\)/g)]){
 try{const bytes=await readFile(resolve(site,'public',match[1].slice(1)));css=css.replaceAll(match[0],`url(data:font/${match[1].endsWith('woff2')?'woff2':'ttf'};base64,${bytes.toString('base64')})`);}catch{/* Optional fonts fall back to system fonts. */}
}
css+='button,input,select,textarea,.v-style-trigger,.v-style-list,.v-style-list button{border-radius:var(--radius,8px)}body{margin:0;padding:0;min-width:0}.visualizer-lab{margin:0;border:0;border-radius:0;padding:16px}.v-intro,.v-share,.v-expand{display:none!important}.v-workbench{height:calc(100vh - 32px)!important;max-height:none!important}.v-preview-pane{min-width:0}';
css+=`input[type=checkbox]{appearance:none;flex:0 0 16px;width:16px;height:16px;margin:0;border:1px solid var(--line);border-radius:4px;background:var(--surface);display:inline-grid;place-content:center;vertical-align:middle;cursor:pointer}input[type=checkbox]:checked{background:var(--text);border-color:var(--text)}input[type=checkbox]:checked::after{content:"";width:8px;height:5px;border-left:2px solid var(--bg);border-bottom:2px solid var(--bg);transform:translateY(-1px) rotate(-45deg)}input[type=checkbox]:focus-visible{outline:2px solid var(--text);outline-offset:3px}input[type=checkbox]:disabled{opacity:.5;cursor:default}`;
const documents={};for(const locale of ['en','ar'])documents[locale]=`<!doctype html><html lang="${locale}" dir="${locale==='ar'?'rtl':'ltr'}" data-theme="dark"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; font-src data: blob:; img-src data: blob:; media-src blob: data:; connect-src 'none'"><style>${css.replaceAll('</style','<\\/style')}</style></head><body>${visualizerLab(locale==='ar',engine)}<script>${script.outputFiles[0].text.replaceAll('</script','<\\/script')}</script></body></html>`;
for(const locale of ['en','ar'])await writeFile(resolve(out,`visualizer-${locale}.html`),documents[locale].replaceAll('title="Ctrl','data-tooltip="Ctrl'));
console.log('Built offline, sandboxed visualizer designer (EN/AR).');
