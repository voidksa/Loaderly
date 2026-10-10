// Reads public discussions only. Approval and website deployment are separate steps.
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {normalizedLookCode,type CommunityLook} from '../src/shared/community';
const root=resolve(import.meta.dirname,'../../..'),scratch=resolve(root,'output/release-2.1');mkdirSync(scratch,{recursive:true});
const args=process.argv.slice(2),option=(key:string)=>args[args.indexOf(key)+1];
const nodes:any[]=[];
if(args.includes('--input'))nodes.push(...JSON.parse(readFileSync(resolve(root,option('--input')),'utf8').replace(/^\uFEFF/,'')).data.repository.discussions.nodes);
else {let cursor:string|null=null;do{
  const query=`query($cursor:String){repository(owner:"voidksa",name:"Loaderly"){discussions(first:100,after:$cursor,orderBy:{field:UPDATED_AT,direction:DESC}){nodes{number title body url updatedAt author{login} category{slug}}pageInfo{hasNextPage endCursor}}}}`;
  const call=['api','graphql','-f',`query=${query}`];if(cursor)call.push('-f',`cursor=${cursor}`);
  const data=JSON.parse(execFileSync('gh',call,{encoding:'utf8',maxBuffer:32_000_000})).data.repository.discussions;nodes.push(...data.nodes);cursor=data.pageInfo.hasNextPage?data.pageInfo.endCursor:null;
  if(nodes.length>2000)throw Error('Review pagination limit before continuing');
}while(cursor);}
const candidates:CommunityLook[]=[];
for(const n of nodes){const kind=n.category?.slug==='app-themes'?'theme':n.category?.slug==='audio-visualizers'?'visualizer':n.category?.slug==='sound-presets'?'sound':undefined;if(!kind||!n.author)continue;
  const codes=[...String(n.body).matchAll(/```(?:json)?\s*\n([\s\S]*?)```/g)].map(m=>normalizedLookCode(m[1],kind)).filter(Boolean);
  if(codes.length!==1)continue;
  candidates.push({id:String(n.number),kind,name:String(n.title).replace(/^\[[^\]]+\]\s*/, '').split(' · ')[0].slice(0,100),author:n.author.login,url:n.url,updatedAt:n.updatedAt,code:codes[0]!,featured:n.author.login==='voidksa'});
}
const approvalFile=resolve(scratch,'community-approvals.json');let approvals:Record<string,string>={};try{approvals=JSON.parse(readFileSync(approvalFile,'utf8'));}catch{}
const digest=(l:CommunityLook)=>createHash('sha256').update(JSON.stringify(l)).digest('hex');
writeFileSync(resolve(scratch,'community-review.json'),JSON.stringify(candidates,null,2));
if(args.includes('--approve')){const ids=option('--approve').split(',');for(const id of ids){const look=candidates.find(l=>l.id===id);if(!look)throw Error('No valid candidate '+id);approvals[id]=digest(look);}writeFileSync(approvalFile,JSON.stringify(approvals,null,2));}
const looks=candidates.filter(l=>approvals[l.id]===digest(l));
const catalog={schema:1,updatedAt:new Date().toISOString(),looks};
writeFileSync(resolve(root,'website/public/community-catalog.json'),JSON.stringify(catalog,null,2));
console.log(`${candidates.length} valid candidates; ${looks.length} approved designs. Website deployment is still required. Edited designs require review again.`);
