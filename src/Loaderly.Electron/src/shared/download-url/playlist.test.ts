import {describe,it,expect} from 'vitest';
import {parsePlaylist,selectedPlaylistEntries,youtubePlaylistUrl,PLAYLIST_LIMIT,playlistErrorMessage} from './playlist';

describe('YouTube playlist selection',()=>{
  it('recognizes playlist, music, mobile and watch links without passing arbitrary input to the extractor',()=>{
    for(const url of ['https://www.youtube.com/watch?v=abcdefghijk&list=PL_123','https://music.youtube.com/playlist?list=PL_123','https://youtu.be/abcdefghijk?list=PL_123'])expect(youtubePlaylistUrl(url)).toBe('https://www.youtube.com/playlist?list=PL_123');
    for(const url of ['--exec=test','https://youtube.com.evil.test/?list=PL_123','https://user:pass@youtube.com/?list=PL_123','https://youtube.com/watch?v=abcdefghijk','https://youtube.com/playlist?list=%0Abad'])expect(youtubePlaylistUrl(url)).toBeUndefined();
  });
  it('keeps the seed video for YouTube mixes across repeated renderer and main normalization',()=>{
    const expected='https://www.youtube.com/watch?v=IiBWzcJ0puk&list=RDEMTxhjXbr9N_yBzv0dJSY3Hg';
    for(const url of [expected+'&start_radio=1&rv=GjQk1650DZU','https://music.youtube.com/watch?v=IiBWzcJ0puk&list=RDEMTxhjXbr9N_yBzv0dJSY3Hg','https://youtu.be/IiBWzcJ0puk?list=RDEMTxhjXbr9N_yBzv0dJSY3Hg']) {
      expect(youtubePlaylistUrl(url)).toBe(expected);
      expect(youtubePlaylistUrl(youtubePlaylistUrl(url))).toBe(expected);
    }
    expect(youtubePlaylistUrl('https://youtube.com/watch?v=bad%26exec&list=RDtest')).toBe('https://www.youtube.com/playlist?list=RDtest');
  });
  it('gives localized recovery instructions without technical process details',()=>{
    expect(playlistErrorMessage('mix_unavailable')).toMatch(/full link/);
    expect(playlistErrorMessage('mix_unavailable',true)).toMatch(/رابطه كاملًا/);
    expect(playlistErrorMessage('missing_tool',true)).toMatch(/الأدوات/);
  });
  it('builds individual video URLs, deduplicates IDs and excludes unavailable entries from any selection',()=>{
    const result=parsePlaylist({title:'Test',entries:[{id:'abcdefghijk',title:'One',url:'file:///malicious',duration:20},{id:'abcdefghijk',title:'Duplicate'},{id:'12345678901',title:'[Private video]'},{id:'12345678902',title:'Three'},{id:'bad',title:'Bad'}]});
    expect(result.entries).toHaveLength(3);
    expect(result.entries[0].url).toBe('https://www.youtube.com/watch?v=abcdefghijk');
    expect(selectedPlaylistEntries(result.entries,['12345678901','12345678902','unknown']).map(e=>e.title)).toEqual(['Three']);
    expect(selectedPlaylistEntries(result.entries,[])).toEqual([]);
  });
  it('reports truncation and bounds external titles and duration',()=>{
    const result=parsePlaylist({title:'x'.repeat(600),playlist_count:PLAYLIST_LIMIT+1,entries:[null,{id:'abcdefghijk',title:'x'.repeat(700),duration:-5}]});
    expect(result.truncated).toBe(true);expect(result.title).toHaveLength(300);expect(result.entries[0].title).toHaveLength(500);expect(result.entries[0].duration).toBeUndefined();
    expect(()=>parsePlaylist({})).toThrow();
  });
});
