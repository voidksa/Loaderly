// Text is shaped by the browser, then saved as editable outlines. Shared looks
// need neither the font nor the audio file on the receiving computer.
const families={modern:'Inter, NotoArabic, sans-serif',classic:'Georgia, Amiri, serif',mono:'Consolas, NotoArabic, monospace',custom:'LoaderlyUserFont, NotoArabic, sans-serif'};
function simplify(points,tolerance){
 const keep=new Set([0,points.length-1]),stack=[[0,points.length-1]],square=tolerance*tolerance;
 while(stack.length){const [start,end]=stack.pop(),a=points[start],b=points[end],dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy;let best=square,index=-1;
  for(let i=start+1;i<end;i++){const p=points[i],t=length?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length)):0,d=(p[0]-a[0]-t*dx)**2+(p[1]-a[1]-t*dy)**2;if(d>best){best=d;index=i;}}
  if(index>=0){keep.add(index);stack.push([start,index],[index,end]);}
 }return [...keep].sort((a,b)=>a-b).map(i=>points[i]);
}
export function traceMask(data,width,height){
 const edges=new Map(),filled=(x,y)=>x>=0&&y>=0&&x<width&&y<height&&data[(y*width+x)*4+3]>=128;
 const key=(x,y)=>y*(width+1)+x,edge=(x,y,xx,yy)=>{const k=key(x,y);if(!edges.has(k))edges.set(k,[]);edges.get(k).push(key(xx,yy));};
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(filled(x,y)){
  if(!filled(x,y-1))edge(x,y,x+1,y);if(!filled(x+1,y))edge(x+1,y,x+1,y+1);
  if(!filled(x,y+1))edge(x+1,y+1,x,y+1);if(!filled(x-1,y))edge(x,y+1,x,y);
 }
 const paths=[];
 while(edges.size){const start=edges.keys().next().value;let current=start;const points=[];
  do{points.push([current%(width+1),Math.floor(current/(width+1))]);const options=edges.get(current);if(!options?.length)break;const next=options.pop();if(!options.length)edges.delete(current);current=next;}while(current!==start&&points.length<width*height);
  if(current===start&&points.length>=8){points.push(points[0]);const simple=simplify(points,1.15).slice(0,-1);if(simple.length>=3)paths.push(simple);}
 }return paths;
}
export async function textShape(options,previous){
 const text=options.text.trim();if(!text)return undefined;
 const font=families[options.font]||families.modern;
 await document.fonts.load(`${options.weight} 160px ${font}`,text);await document.fonts.ready;
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
 const rtl=/[\u0590-\u08ff]/u.test(text),configure=()=>{ctx.font=`${options.weight} 160px ${font}`;ctx.direction=rtl?'rtl':'ltr';ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.letterSpacing=options.spacing+'px';};
 configure();const metrics=ctx.measureText(text),w=Math.ceil(metrics.width+160),h=Math.ceil((metrics.actualBoundingBoxAscent||160)+(metrics.actualBoundingBoxDescent||40)+80);
 canvas.width=Math.min(5000,w);canvas.height=h;configure();ctx.fillStyle='#fff';ctx.fillText(text,60,40+(metrics.actualBoundingBoxAscent||160),canvas.width-120);
 const paths=traceMask(ctx.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height);
 if(!paths.length)return undefined;
 const tilt=Math.tan(options.slant*Math.PI/180),stretch=options.stretch/100;
 paths.forEach(p=>p.forEach(pt=>{pt[0]=(pt[0]-pt[1]*tilt)*stretch;}));
 const points=paths.flat(),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),width=maxX-minX,height=maxY-minY;
 // Refuse an over-complex result instead of silently dropping letters or holes.
 if(paths.length>96||points.length>4096||paths.some(p=>p.length>256)||width/height>24)throw Error('complex');
 const contours=paths.map(p=>({points:p.map(([x,y])=>[.05+(x-minX)/width*.9,.05+(y-minY)/height*.9]),closed:true,smooth:false}));
 return {...previous,points:contours[0].points.slice(0,64),closed:true,smooth:false,paths:contours,aspect:Math.min(24,Math.max(.05,width/height)),amplitude:previous.paths?previous.amplitude:.12,stroke:previous.paths?previous.stroke:'line',thickness:previous.thickness??2,typography:{...options,text}};
}
