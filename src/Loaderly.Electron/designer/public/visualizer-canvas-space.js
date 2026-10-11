// Drawing coordinates stay normalized for existing visualizer files. The editor
// expands that coordinate space to the canvas instead of clamping to the old fit.
export function canvasSpace(width,height,aspect=width/height,padding=4){
 const scale=Math.max(1,Math.min((width-padding*2)/aspect,height-padding*2));
 return {x:(width-scale*aspect)/2,y:(height-scale)/2,sx:scale*aspect,sy:scale};
}
export function reframeShape(shape,from,to){
 const map=points=>points.map(([x,y])=>[(from.x+x*from.sx-to.x)/to.sx,(from.y+y*from.sy-to.y)/to.sy]);
 return {...shape,aspect:to.sx/to.sy,points:map(shape.points),...(shape.paths?{paths:shape.paths.map(path=>({...path,points:map(path.points)}))}:{})};
}
export function boundedGroupDelta(points,delta){
 return delta.map((value,axis)=>Math.max(-Math.min(...points.map(point=>point[axis])),Math.min(1-Math.max(...points.map(point=>point[axis])),value)));
}
