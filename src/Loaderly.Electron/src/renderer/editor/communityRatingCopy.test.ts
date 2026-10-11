import {describe, expect, it} from 'vitest';
import {communityRatingCount, communityStarLabel} from './communityRatingCopy';

describe('community rating copy', () => {
  it.each([[0,'لا توجد تقييمات'],[1,'تقييم واحد'],[2,'تقييمان'],[3,'3 تقييمات'],[10,'10 تقييمات'],[11,'11 تقييمًا'],[99,'99 تقييمًا'],[100,'100 تقييم'],[103,'103 تقييمات']] as const)('uses the Arabic plural form for %s ratings', (count, text) => {
    expect(communityRatingCount(count, true)).toBe(text);
  });
  it.each([[0,'0 ratings'],[1,'1 rating'],[2,'2 ratings']] as const)('uses the English plural form for %s ratings', (count, text) => {
    expect(communityRatingCount(count, false)).toBe(text);
  });
  it('labels individual star choices naturally in both languages', () => {
    expect([1,2,3,4,5].map(stars => communityStarLabel(stars,true))).toEqual(['نجمة واحدة','نجمتان','3 نجوم','4 نجوم','5 نجوم']);
    expect([1,2,3,4,5].map(stars => communityStarLabel(stars,false))).toEqual(['1 star','2 stars','3 stars','4 stars','5 stars']);
  });
});
