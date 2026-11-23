export const PERIOD_LABEL: Record<string, string> = {
  YEAR: " / year",
  MONTH: " / month",
  DAY: " / day",
  ONE_OFF: "",
};

export const TX_LABEL: Record<string, string> = {
  FOR_SALE: "For sale",
  FOR_RENT: "For rent",
  SHORT_TERM: "Short-term",
  LEASE: "Lease",
};

export const formatNaira = (n: number) => "₦" + n.toLocaleString("en-NG");

export type CardItem = {
  id: string;
  title: string;
  priceNaira: number;
  pricePeriod: string;
  negotiable: boolean;
  transactionType: string;
  categoryName: string;
  city: string;
  state: string;
  neighbourhood: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sizeSqm: number | null;
  cover: string | null;
  idChecked: boolean;
  addressVerified: boolean;
};