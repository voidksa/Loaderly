import {describe,expect,it} from 'vitest';
import {createDownloadProgressReader,runDownloadProcess} from './downloadProgress';
import type {TransferProgress} from '../shared/downloadProgress';

const line=(value:object)=>'__LOADERLY_TRANSFER__'+JSON.stringify(value);
describe('download progress',()=>{
  it('tracks both media streams by bytes without claiming completion after the first',()=>{
    const events:TransferProgress[]=[],read=createDownloadProgressReader(p=>events.push(p));
    read('__LOADERLY_TRANSFER_PLAN__'+JSON.stringify({formats:[{format_id:'v',filesize:900},{format_id:'a',filesize:100}]}));
    read(line({id:'v',status:'downloading',downloaded:450,total:900,speed:50}));
    read(line({id:'v',status:'finished',downloaded:900,total:900}));
    read(line({id:'a',status:'downloading',downloaded:50,total:100,speed:10}));
    expect(events.map(e=>e.percent)).toEqual([45,90,95]);
    expect(events[2]).toMatchObject({downloadedBytes:950,totalBytes:1000,etaSeconds:5});
    read('__LOADERLY_PROCESSING__');expect(events.at(-1)).toEqual({phase:'processing'});
  });
  it('leaves unknown totals indeterminate and labels current stream; accepts estimates honestly',()=>{
    const events:TransferProgress[]=[],read=createDownloadProgressReader(p=>events.push(p));
    read(line({id:'a',status:'downloading',downloaded:50,total:'NA',estimate:'NA',video:'none',speed:'NA'}));
    expect(events[0]).toMatchObject({downloadedBytes:50,stream:'audio'});expect(events[0].percent).toBeUndefined();
    read(line({id:'a',status:'downloading',downloaded:60,estimate:120,video:'none'}));
    expect(events[1]).toMatchObject({percent:50,estimated:true});
    read(line({id:'a',status:'finished',downloaded:100}));
    expect(events[2]).toMatchObject({percent:100,totalBytes:100,estimated:false});
  });
  it('resets plans on a retry and ignores malformed/unrelated records',()=>{
    const events:TransferProgress[]=[],read=createDownloadProgressReader(p=>events.push(p));
    expect(read('[download] 90%')).toBe(false);read('__LOADERLY_TRANSFER__{');read(line({downloaded:-1,status:'downloading'}));
    expect(events).toHaveLength(0);
    const plan='__LOADERLY_TRANSFER_PLAN__'+JSON.stringify({id:'a',total:100});
    read(plan);read(line({id:'a',status:'downloading',downloaded:90}));
    read(plan);read(line({id:'a',status:'downloading',downloaded:10}));
    expect(events.map(e=>e.percent)).toEqual([90,10]);
  });
  it('delivers progress from a running child before it completes, including split records',async()=>{
    const events:TransferProgress[]=[];let finished=false;
    const record=line({id:'a',status:'downloading',downloaded:20,total:100});
    const script=`process.stderr.write(${JSON.stringify(record.slice(0,20))});setTimeout(()=>process.stderr.write(${JSON.stringify(record.slice(20)+'\n')}),30);setTimeout(()=>process.stdout.write('finished.mp3\\n'),80);`;
    const result=await runDownloadProcess(process.execPath,['-e',script],p=>{expect(finished).toBe(false);events.push(p);});finished=true;
    expect(events).toHaveLength(1);expect(events[0].percent).toBe(20);expect(result.stdout.trim()).toBe('finished.mp3');
  });
});
