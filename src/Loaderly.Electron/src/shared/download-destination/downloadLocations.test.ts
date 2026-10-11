import {expect,it} from 'vitest';
import {downloadLocationFor,normalizeDownloadLocations,type DownloadLocations} from './downloadLocations';
const base:DownloadLocations={downloadDirectory:'D:\\Videos',groupDownloadsByPlatform:true,downloadLocations:[],audioLocationId:'',videoLocationId:''};
it('keeps the existing destination for migrated preferences',()=>{
 expect(downloadLocationFor(base,'audio')).toEqual({path:'D:\\Videos',groupByPlatform:true,name:''});
});
it.each(['F:\\','/media/void/Music','/Volumes/Music'])('routes audio to %s and preserves separate video defaults',path=>{
 const p={...base,downloadLocations:[{id:'songs',name:'Songs',kind:'audio' as const,path,groupByPlatform:false}],audioLocationId:'songs'};
 expect(downloadLocationFor(p,'audio').path).toBe(path);
 expect(downloadLocationFor(p,'1080p','songs').path).toBe(base.downloadDirectory);
 expect(downloadLocationFor(p,'audio').groupByPlatform).toBe(false);
 // The resolver does not silently redirect disconnected removable paths.
 expect(downloadLocationFor(p,'audio').path).toBe(path);
});
it('honors a per-download choice and rejects malformed persisted locations',()=>{
 const locations=normalizeDownloadLocations([null,{id:'a',name:' USB ',path:'F:\\',kind:'all'},{id:'a',name:'duplicate',path:'X:'},{id:'bad',name:'',path:'Y:'}]);
 expect(locations).toEqual([{id:'a',name:'USB',path:'F:\\',kind:'all',groupByPlatform:false}]);
 expect(downloadLocationFor({...base,downloadLocations:locations},'audio','a').path).toBe('F:\\');
});
