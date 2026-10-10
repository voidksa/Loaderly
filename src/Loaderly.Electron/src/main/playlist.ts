import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {PLAYLIST_LIMIT,parsePlaylist,youtubePlaylistUrl,type PlaylistResult} from '../shared/download-url/playlist';

export async function inspectPlaylist(value:unknown,toolPath:string|undefined,signal:AbortSignal):Promise<PlaylistResult> {
  const url=youtubePlaylistUrl(value);
  if(!url)return {ok:false,message:'Enter a YouTube playlist link.'};
  if(!toolPath)return {ok:false,message:'Install yt-dlp in Tools before opening a playlist.'};
  try {
    const {stdout}=await promisify(execFile)(toolPath,[
      '--ignore-config','--no-plugin-dirs','--no-exec','--flat-playlist','--yes-playlist',
      '--skip-download','--dump-single-json','--no-warnings','--ignore-errors',
      '--socket-timeout','15','--retries','1','--extractor-retries','1',
      '--playlist-end',String(PLAYLIST_LIMIT+1),'--',url
    ],{windowsHide:true,timeout:90000,maxBuffer:16*1024*1024,signal});
    const playlist=parsePlaylist(JSON.parse(stdout));
    if(!playlist.entries.length)return {ok:false,message:'No accessible videos were found. Check that the playlist is public or unlisted.'};
    return {ok:true,playlist};
  } catch {
    return {ok:false,message:signal.aborted?'Playlist loading canceled.':'Could not load this playlist. Check the link and your connection, then try again.'};
  }
}
