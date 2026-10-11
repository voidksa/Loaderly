const arabicPlurals = new Intl.PluralRules('ar');

export function communityRatingCount(count: number, ar: boolean): string {
  if (!ar) return `${count} ${count === 1 ? 'rating' : 'ratings'}`;
  switch (arabicPlurals.select(count)) {
    case 'zero': return 'لا توجد تقييمات';
    case 'one': return 'تقييم واحد';
    case 'two': return 'تقييمان';
    case 'few': return `${count} تقييمات`;
    case 'many': return `${count} تقييمًا`;
    default: return `${count} تقييم`;
  }
}

export function communityStarLabel(stars: number, ar: boolean): string {
  if (!ar) return `${stars} ${stars === 1 ? 'star' : 'stars'}`;
  return stars === 1 ? 'نجمة واحدة' : stars === 2 ? 'نجمتان' : `${stars} نجوم`;
}
