import "server-only";
import { isEnabled } from "@/lib/flags";

export type Limits = {
  maxActiveListings: number;
  maxPhotosPerListing: number;
  maxVideosPerListing: number;
};

const UNLIMITED: Limits = {
  maxActiveListings: Infinity,
  maxPhotosPerListing: Infinity,
  maxVideosPerListing: Infinity,
};
const FREE_PLAN: Limits = { maxActiveListings: 1, maxPhotosPerListing: 3, maxVideosPerListing: 0 };

export async function getLimits(_userId: string): Promise<Limits> {
  if (!(await isEnabled("premium_enabled"))) return UNLIMITED;
  // Subscriptions arrive in a later stage. Until then everyone is on the free plan.
  return FREE_PLAN;
}


// Shows only the first N photos when the owner's plan has a photo limit
export function visiblePhotos<T>(items: T[], limit: number): T[] {
  return Number.isFinite(limit) ? items.slice(0, limit) : items;
}