import type { ReviewItem } from './components/SeeAllReviewsModal';

/**
 * Shared dummy reviews for provider detail and provider dashboard.
 * Key = provider id (e.g. 'p1', 'p2'); value = list of reviews.
 */
export const MOCK_REVIEWS_BY_PROVIDER_ID: Record<string, ReviewItem[]> = {
  p1: [
    { id: 'r1', userName: 'Chioma O.', rating: 5, text: 'Perfect spot for a first date. Food was great and the vibe was relaxed. We had the jollof and suya platter – both amazing.', date: '2 weeks ago' },
    { id: 'r2', userName: 'Tunde M.', rating: 4, text: 'Good experience. Would come again with my partner. Service was a bit slow but the food made up for it.', date: '1 month ago' },
    { id: 'r3', userName: 'Amara K.', rating: 5, text: 'Came here for our anniversary. The staff went out of their way to make it special. Chapman is a must-try.', date: '3 weeks ago' },
    { id: 'r4', userName: 'Folake S.', rating: 4, text: 'Nice atmosphere and tasty food. Portions are generous. Will definitely be back.', date: '1 month ago' },
    { id: 'r5', userName: 'Ibrahim D.', rating: 5, text: 'Best pepper soup in Lekki. Brought my date here and we both loved it. Great for a casual but memorable evening.', date: '2 months ago' },
  ],
  p2: [
    { id: 'r6', userName: 'Amara K.', rating: 5, text: 'The Vineyard never disappoints. Wine selection and service top notch. Perfect for a special date night.', date: '3 weeks ago' },
    { id: 'r7', userName: 'David O.', rating: 4, text: 'Intimate setting and good wine pairings. A bit on the pricey side but worth it for the experience.', date: '1 month ago' },
    { id: 'r8', userName: 'Ngozi E.', rating: 5, text: 'Celebrated my birthday here. The team made it so special. Food and wine were excellent.', date: '2 weeks ago' },
  ],
};

/**
 * Fallback dummy reviews when a provider has no specific mock data.
 * Used on detail page and on provider dashboard.
 */
export const DEFAULT_MOCK_REVIEWS: ReviewItem[] = [
  { id: 'd1', userName: 'Guest User', rating: 4, text: 'Really enjoyed the experience. Great atmosphere and friendly staff. Would recommend for a date.', date: '3 weeks ago' },
  { id: 'd2', userName: 'Sarah T.', rating: 5, text: 'Lovely place. We had a great time and the service was excellent. Will visit again.', date: '1 month ago' },
  { id: 'd3', userName: 'Michael B.', rating: 4, text: 'Good food and nice vibe. Perfect for a first date or casual catch-up.', date: '2 months ago' },
];

/** Get reviews for a provider id, or default list. */
export function getMockReviewsForProvider(providerId: string | undefined): ReviewItem[] {
  if (!providerId) return [];
  return MOCK_REVIEWS_BY_PROVIDER_ID[providerId] ?? DEFAULT_MOCK_REVIEWS;
}
