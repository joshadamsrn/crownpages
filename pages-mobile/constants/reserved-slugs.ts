/**
 * Reserved business slugs that conflict with default page URLs
 * These slugs cannot be used for business names to prevent routing conflicts
 */
export const RESERVED_BUSINESS_SLUGS = [
  'api',
  'auth',
  'business',
  'mobile',
  'organization',
  'payment',
  'privacy-policy',
  'protected',
  'share',
  't',
  'terms-of-service',
] as const;

/**
 * Check if a slug is reserved
 */
export function isReservedSlug(slug: string): boolean {
  return RESERVED_BUSINESS_SLUGS.includes(slug as any);
}

/**
 * Get error message for reserved slug
 */
export function getReservedSlugError(slug: string): string {
  return `The URL "${slug}" is reserved and cannot be used. Please choose a different business URL.`;
}

