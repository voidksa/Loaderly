// Editable single-stroke letter templates. Coordinates use a 10-by-10 drawing grid.
const letters = {
 A:[[1,9],[5,1],[9,9],[7,5],[3,5]],
 B:[[1,9],[1,1],[6,1],[8,2],[8,4],[6,5],[1,5],[6,5],[9,6],[9,8],[7,9],[1,9]],
 C:[[9,2],[7,1],[3,1],[1,3],[1,7],[3,9],[7,9],[9,8]],
 D:[[1,9],[1,1],[5,1],[8,2],[9,4],[9,6],[8,8],[5,9],[1,9]],
 E:[[9,1],[1,1],[1,5],[7,5],[1,5],[1,9],[9,9]],
 F:[[1,9],[1,1],[9,1],[1,1],[1,5],[7,5]],
 G:[[9,2],[7,1],[3,1],[1,3],[1,7],[3,9],[7,9],[9,7],[9,5],[5,5]],
 H:[[1,9],[1,1],[1,5],[9,5],[9,1],[9,9]],
 I:[[2,1],[8,1],[5,1],[5,9],[2,9],[8,9]],
 J:[[3,1],[9,1],[9,7],[8,9],[4,9],[2,7]],
 K:[[1,1],[1,9],[1,5],[9,1],[1,5],[9,9]],
 L:[[1,1],[1,9],[9,9]],
 M:[[1,9],[1,1],[5,6],[9,1],[9,9]],
 N:[[1,9],[1,1],[9,9],[9,1]],
 O:[[5,1],[8,2],[9,4],[9,6],[8,8],[5,9],[2,8],[1,6],[1,4],[2,2],[5,1]],
 P:[[1,9],[1,1],[6,1],[8,2],[9,3],[8,4],[6,5],[1,5]],
 Q:[[5,1],[8,2],[9,4],[9,6],[8,8],[5,9],[2,8],[1,6],[1,4],[2,2],[5,1],[8,2],[9,4],[9,6],[8,8],[6,6],[10,10]],
 R:[[1,9],[1,1],[6,1],[8,1.5],[9,2.5],[9,3.5],[8,4.5],[6,5],[1,5],[5,5],[9,9]],
 S:[[9,2],[7,1],[3,1],[1,2],[1,4],[3,5],[7,5],[9,6],[9,8],[7,9],[3,9],[1,8]],
 T:[[1,1],[9,1],[5,1],[5,9]],
 U:[[1,1],[1,7],[2,8.5],[4,9],[6,9],[8,8.5],[9,7],[9,1]],
 V:[[1,1],[5,9],[9,1]],
 W:[[1,1],[3,9],[5,4],[7,9],[9,1]],
 X:[[1,1],[9,9],[5,5],[1,9],[9,1]],
 Y:[[1,1],[5,5],[9,1],[5,5],[5,9]],
 Z:[[1,1],[9,1],[1,9],[9,9]]
};
export function letterShape(letter, previous) {
 const points=letters[letter.trim().toUpperCase()];
 if(!points)return;
 return {...previous,paths:undefined,typography:undefined,points:points.map(p=>p.map(n=>.08+n*.084)),closed:false,smooth:false,aspect:.8,amplitude:.22};
}
export function straightShape(vertical, previous) {
 return {...previous,paths:undefined,typography:undefined,points:vertical?[[.5,.1],[.5,.9]]:[[.1,.5],[.9,.5]],closed:false,smooth:false,aspect:1};
}
export function rotateShape(shape, clockwise) {
 const rotate=points=>points.map(([x,y])=>clockwise?[1-y,x]:[y,1-x]);return {...shape,aspect:1/(shape.aspect??1),points:rotate(shape.points),...(shape.paths?{paths:shape.paths.map(p=>({...p,points:rotate(p.points)}))}:{})};
}
export function constrainedPoint(point, snap, anchor, shift, aspect=1) {
 const next=point.map(n=>snap?Math.round(n*10)/10:n);
 if(shift&&anchor){
  if(Math.abs(next[0]-anchor[0])*aspect>=Math.abs(next[1]-anchor[1]))next[1]=anchor[1];else next[0]=anchor[0];
 }
 return next.map(n=>Math.max(0,Math.min(1,n)));
}
export function historyCommand(event) {
 if(!(event.ctrlKey||event.metaKey)||event.altKey)return;
 const key=event.code||('Key'+event.key?.toUpperCase());
 if(key==='KeyZ')return event.shiftKey?'redo':'undo';
 if(key==='KeyY')return 'redo';
}
