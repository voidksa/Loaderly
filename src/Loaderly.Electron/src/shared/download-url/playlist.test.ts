import {describe,it,expect} from 'vitest';
import {parsePlaylist,selectedPlaylistEntries,youtubePlaylistUrl,PLAYLIST_LIMIT} from './playlist';

describe('YouTube playlist selection',()=>{
  it('recognizes playlist, music, mobile and watch links without passing arbitrary input to the extractor',()=>{
    for(const url of ['https://www.youtube.com/watch?v=abcdefghijk&list=PL_123','https://music.youtube.com/playlist?list=PL_123','https://youtu.be/abcdefghijk?list=PL_123'])expect(youtubePlaylistUrl(url)).toBe('https://www.youtube.com/playlist?list=PL_123');
    for(const url of ['--exec=test','https://youtube.com.evil.test/?list=PL_123','https://user:pass@youtube.com/?list=PL_123','https://youtube.com/watch?v=abcdefghijk','https://youtube.com/playlist?list=%0Abad'])expect(youtubePlaylistUrl(url)).toBeUndefined();
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
