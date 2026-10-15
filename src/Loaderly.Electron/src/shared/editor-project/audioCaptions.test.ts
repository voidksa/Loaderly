import {describe,it,expect} from 'vitest';
import {audioCaptionsForOutput} from './audioCaptions';

describe('audio captions in exported video',()=>{
  it('cuts and retimes text on the same clock as audio, including speed boundaries',()=>{
    const result=audioCaptionsForOutput([
      {text:'Before',startSeconds:0,endSeconds:1},
      {text:'عربي English',startSeconds:2,endSeconds:9},
      {text:'Removed',startSeconds:4,endSeconds:6},
      {text:'After',startSeconds:10,endSeconds:12}
    ],{ranges:[{startSeconds:2,endSeconds:4},{startSeconds:6,endSeconds:10}],speeds:[{startTime:3,endTime:8,rate:2}]});
    expect(result).toEqual([
      {text:'عربي English',startSeconds:0,endSeconds:1.5},
      {text:'عربي English',startSeconds:1.5,endSeconds:3.5}
    ]);
  });
  it('handles a selected range and ignores empty or invalid text intervals',()=>{
    expect(audioCaptionsForOutput([
      {text:'Selected',startSeconds:8,endSeconds:14},
      {text:' ',startSeconds:9,endSeconds:12},
      {text:'Invalid',startSeconds:NaN,endSeconds:12}
    ],{ranges:[{startSeconds:10,endSeconds:12}]})).toEqual([{text:'Selected',startSeconds:0,endSeconds:2}]);
  });
});
