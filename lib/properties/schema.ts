import { z } from "zod";

export const MAX_PHOTOS_HARD = 12;
export const LISTING_DAYS = 60;

export const TRANSACTION_OPTIONS = [
  { value: "FOR_SALE", label: "For sale" },
  { value: "FOR_RENT", label: "For rent" },
  { value: "SHORT_TERM", label: "Short-term rental" },
  { value: "LEASE", label: "Lease" },
] as const;

// How many photos may be uploaded for a plan (Infinity = no plan limit)
export function uploadCap(planMax: number) {
  return Math.min(Number.isFinite(planMax) ? planMax : MAX_PHOTOS_HARD, MAX_PHOTOS_HARD);
}

const count = z.number().int().min(0).max(50).nullable();

export const propertySchema = z.object({
  title: z.string().trim().min(8, "The title is too short").max(120, "The title is too long"),
  description: z.string().trim().min(30, "Describe the property in at least 30 characters").max(5000),
  categoryId: z.string().min(1, "Choose a property category"),
  transactionType: z.enum(["FOR_SALE", "FOR_RENT", "SHORT_TERM", "LEASE"]),
  state: z.string().trim().min(1, "Choose the state").max(50),
  lga: z.string().trim().max(80).optional(),
  city: z.string().trim().min(1, "Enter the city or town").max(80),
  neighbourhood: z.string().trim().max(100).optional(),
  streetAddress: z.string().trim().max(200).optional(),
  hideExactAddress: z.boolean(),
  bedrooms: count,
  bathrooms: count,
  toilets: count,
  parkingSpaces: count,
  sizeSqm: z.number().positive().max(100_000_000).nullable(),
  furnishing: z.enum(["UNFURNISHED", "SEMI_FURNISHED", "FURNISHED"]).nullable(),
  yearBuilt: z.number().int().min(1900, "Check the year built").max(2100).nullable(),
  priceNaira: z.number().int().positive("Enter the price").max(10_000_000_000_000),
  pricePeriod: z.enum(["YEAR", "MONTH", "DAY", "ONE_OFF"]),
  negotiable: z.boolean(),
  additionalCharges: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(60),
        amount: z.number().int().min(0).max(1_000_000_000_000),
      })
    )
    .max(8),
  amenityIds: z.array(z.string()).max(30),
});

export type PropertyInput = z.infer<typeof propertySchema>;