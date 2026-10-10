export type CommunityRating = {id:string;average:number;count:number;mine?:number|null};
export type CommunityAccount = {login?:string;userCode?:string;interval?:number;pending?:boolean;error?:string};
export type CommunityRatingsResult = {available:boolean;ratings:CommunityRating[];account?:CommunityAccount};
export function validRating(value:unknown):value is CommunityRating {
  const r=value as CommunityRating;
  return !!r&&typeof r.id==='string'&&r.id.length<=80&&Number.isFinite(r.average)&&r.average>=1&&r.average<=5&&Number.isSafeInteger(r.count)&&r.count>0&&(r.mine==null||(Number.isInteger(r.mine)&&r.mine>=1&&r.mine<=5));
}
