import {beforeEach,expect,it,vi} from 'vitest';
const run=vi.hoisted(()=>vi.fn());
vi.mock('node:child_process',()=>({execFile:(...args:unknown[])=>run(...args)}));
import {inspectPlaylist} from './playlist';

beforeEach(()=>{run.mockReset();});
const url='https://www.youtube.com/watch?v=IiBWzcJ0puk&list=RDEMTxhjXbr9N_yBzv0dJSY3Hg&start_radio=1';
it('passes a seeded Mix URL to the metadata-only extractor without extra query parameters',async()=>{
  run.mockImplementation((_tool,_args,_options,callback)=>callback(null,{stdout:JSON.stringify({title:'Mix',entries:[{id:'IiBWzcJ0puk',title:'Video'}]}),stderr:''}));
  const result=await inspectPlaylist(url,'yt-dlp',new AbortController().signal);
  expect(result.ok).toBe(true);
  const args=run.mock.calls[0][1];
  expect(args).toContain('--skip-download');
  expect(args.slice(-2)).toEqual(['--','https://www.youtube.com/watch?v=IiBWzcJ0puk&list=RDEMTxhjXbr9N_yBzv0dJSY3Hg']);
});
it('does not leak extractor details and distinguishes mix recovery from ordinary playlists',async()=>{
  run.mockImplementation((_tool,_args,_options,callback)=>callback(new Error('spawn /private/yt-dlp HTTP 403'),'', 'secret process detail'));
  expect(await inspectPlaylist(url,'yt-dlp',new AbortController().signal)).toMatchObject({ok:false,code:'mix_unavailable'});
  const regular=await inspectPlaylist('https://youtube.com/playlist?list=PL123','yt-dlp',new AbortController().signal);
  expect(regular).toMatchObject({ok:false,code:'unavailable'});
  expect(JSON.stringify(regular)).not.toMatch(/private|403|secret|spawn/);
  const controller=new AbortController();controller.abort();
  expect(await inspectPlaylist(url,'yt-dlp',controller.signal)).toMatchObject({ok:false,code:'canceled'});
});
it('reports unavailable entries and missing tools before offering a download',async()=>{
  expect(await inspectPlaylist(url,undefined,new AbortController().signal)).toMatchObject({ok:false,code:'missing_tool'});
  expect(run).not.toHaveBeenCalled();
  run.mockImplementation((_tool,_args,_options,callback)=>callback(null,{stdout:JSON.stringify({entries:[{id:'IiBWzcJ0puk',title:'[Private video]'}]}),stderr:''}));
  expect(await inspectPlaylist(url,'yt-dlp',new AbortController().signal)).toMatchObject({ok:false,code:'empty'});
});
