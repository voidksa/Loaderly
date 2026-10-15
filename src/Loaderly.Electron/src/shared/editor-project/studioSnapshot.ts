const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const numbers=(v:Record<string,unknown>,keys:string[])=>keys.every(k=>typeof v[k]==='number'&&Number.isFinite(v[k]));
const rect=(v:unknown)=>object(v)&&numbers(v,['x','y','width','height']);

// Portable editor files are external input. Reject malformed layers before they
// reach the timeline; do not silently remove an edit from an imported project.
export function validStudioSnapshot(value:unknown):value is Record<string,unknown>{
 if(!object(value))return false;
 for(const key of ['playheadSeconds','trimStartSeconds','trimEndSeconds','blurStrength','zoomScale','speedRate','reframeTargetWidth','reframeTargetHeight','reframePositionX','reframePositionY'])if(key in value&&!numbers(value,[key]))return false;
 for(const key of ['blurWindow','zoomWindow','speedWindow','reframeWindow'])if(key in value&&(!object(value[key])||!numbers(value[key],['startSeconds','endSeconds'])))return false;
 for(const key of ['blurMask','zoomRegion'])if(key in value&&!rect(value[key]))return false;
 for(const key of ['textOverlays','cutOutRanges','blurItems','zoomItems','speedItems','reframeItems']){
  if(!(key in value))continue;const list=value[key];if(!Array.isArray(list)||list.length>5000)return false;
  for(const item of list){
   if(!object(item))return false;
   if(key==='textOverlays'||key==='cutOutRanges'){
    if(!numbers(item,['id','startSeconds','endSeconds']))return false;
    if(key==='textOverlays'&&(typeof item.text!=='string'||!numbers(item,['x','y','fontSize'])))return false;
   }else{
    if(typeof item.id!=='string'||typeof item.name!=='string'||!numbers(item,['startTime','endTime']))return false;
    if(key==='blurItems'||key==='zoomItems'){
     if(!rect(item.region)||!numbers(item,[key==='blurItems'?'strength':'scale']))return false;
     if(item.keyframes!==undefined&&(!Array.isArray(item.keyframes)||item.keyframes.length>20000||!item.keyframes.every(k=>object(k)&&numbers(k,['timeSeconds'])&&rect(k.region))))return false;
    }
    if(key==='speedItems'&&!numbers(item,['rate']))return false;
    if(key==='reframeItems'&&(!numbers(item,['targetWidth','targetHeight','positionX','positionY'])||!object(item.background)))return false;
   }
  }
 }
 if(value.subtitleFile!==undefined){const file=value.subtitleFile;if(!object(file)||typeof file.path!=='string'||typeof file.name!=='string')return false;for(const key of ['cues','originalCues'])if(key in file&&(!Array.isArray(file[key])||!file[key].every(c=>object(c)&&typeof c.text==='string'&&numbers(c,['startSeconds','endSeconds']))))return false;}
 return true;
}
