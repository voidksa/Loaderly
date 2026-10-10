import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {PLAYLIST_LIMIT,parsePlaylist,youtubePlaylistUrl,playlistErrorMessage,type PlaylistErrorCode,type PlaylistResult} from '../shared/download-url/playlist';

const failure=(code:PlaylistErrorCode):PlaylistResult=>({ok:false,code,message:playlistErrorMessage(code)});

export async function inspectPlaylist(value:unknown,toolPath:string|undefined,signal:AbortSignal):Promise<PlaylistResult> {
  const url=youtubePlaylistUrl(value);
  if(!url)return failure('invalid_link');
  if(!toolPath)return failure('missing_tool');
  try {
    const {stdout}=await promisify(execFile)(toolPath,[
      '--ignore-config','--no-plugin-dirs','--no-exec','--flat-playlist','--yes-playlist',
      '--skip-download','--dump-single-json','--no-warnings','--ignore-errors',
      '--socket-timeout','15','--retries','1','--extractor-retries','1',
      '--playlist-end',String(PLAYLIST_LIMIT+1),'--',url
    ],{windowsHide:true,timeout:90000,maxBuffer:16*1024*1024,signal});
    const playlist=parsePlaylist(JSON.parse(stdout));
    if(!playlist.entries.some(entry=>entry.available))return failure('empty');
    return {ok:true,playlist};
  } catch {
    return failure(signal.aborted?'canceled':new URL(url).searchParams.get('list')?.startsWith('RD')?'mix_unavailable':'unavailable');
  }
}
