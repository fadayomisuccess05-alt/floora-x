import type { Role } from "@/lib/auth/session";

export const roleSlug: Record<Role, string> = {
  CLIENT: "client",
  LANDLORD: "landlord",
  AGENT: "agent",
  AGENCY: "agency",
  ADMIN: "admin",
};

export const roleLabel: Record<Role, string> = {
  CLIENT: "Property seeker",
  LANDLORD: "Landlord",
  AGENT: "Agent",
  AGENCY: "Agency",
  ADMIN: "Administrator",
};

const items: Record<Role, string[]> = {
  CLIENT: [
    "Browse Properties", "Saved Properties", "Following", "My Subscriptions", "Enquiries",
    "Inspections", "Messages", "My Transactions", "Floora-Trust", "Notifications", "Reviews", "Settings",
  ],
  LANDLORD: [
    "My Properties", "Add Property", "Enquiries", "Inspection Requests", "Messages",
    "Agent Collaboration", "Agreements", "Transactions", "Floora-Trust", "Notifications", "Settings",
  ],
  AGENT: [
    "My Listings", "Add Property", "Collaborative Listings", "Collaboration Requests", "My Network",
    "Messages", "Commission Agreements", "Enquiries", "Inspections", "Transactions", "Floora-Trust",
    "Analytics", "Followers", "Subscription", "Notifications", "Settings",
  ],
  AGENCY: [
    "Company Profile", "Properties", "Add Property", "Collaborative Listings", "Manage Agents",
    "Assign Properties", "Messages", "Enquiries", "Inspections", "Agreements", "Transactions",
    "Floora-Trust", "Analytics", "Subscription", "Notifications", "Settings",
  ],
  ADMIN: [
    "User Management", "Verification", "Property Management", "Listing Approvals", "Collaboration",
    "Subscriptions", "Monetization", "Payments", "Floora-Trust", "Disputes", "Reviews",
    "Notifications", "Locations", "Reports", "Audit Logs", "System Settings",
  ],
};

export type NavItem = { label: string; href?: string };

const itemLinks: Partial<Record<Role, Record<string, string>>> = {
    ADMIN: {
    Verification: "/dashboard/admin/verification",
    "Listing Approvals": "/dashboard/admin/listings",
  },
  LANDLORD: { "My Properties": "/dashboard/properties", "Add Property": "/dashboard/properties/new" },
  AGENT: { "My Listings": "/dashboard/properties", "Add Property": "/dashboard/properties/new" },
  AGENCY: { Properties: "/dashboard/properties", "Add Property": "/dashboard/properties/new" },
};

export function getNav(role: Role): NavItem[] {
  return [
    { label: "Overview", href: `/dashboard/${roleSlug[role]}` },
    ...(role !== "ADMIN" ? [{ label: "Verification", href: "/dashboard/verification" }] : []),
    ...items[role].map((label) => ({ label, href: itemLinks[role]?.[label] })),
  ];
}