export type SubscriptionTier = "free" | "pro" | "agency";

export interface TierLimits {
  tier: SubscriptionTier;
  maxProjects: number;
  maxAuditsPerDay: number;
  canExportWhiteLabel: boolean;
  canRunSiteWideCrawl: boolean;
  canTrackCompetitors: boolean;
}

export const TIER_CONFIGS: Record<SubscriptionTier, TierLimits> = {
  free: {
    tier: "free",
    maxProjects: 1,
    maxAuditsPerDay: 3,
    canExportWhiteLabel: false,
    canRunSiteWideCrawl: false,
    canTrackCompetitors: true,
  },
  pro: {
    tier: "pro",
    maxProjects: 5,
    maxAuditsPerDay: 100,
    canExportWhiteLabel: true,
    canRunSiteWideCrawl: true,
    canTrackCompetitors: true,
  },
  agency: {
    tier: "agency",
    maxProjects: 25,
    maxAuditsPerDay: 500,
    canExportWhiteLabel: true,
    canRunSiteWideCrawl: true,
    canTrackCompetitors: true,
  },
};

export function getTierLimits(tier?: string | null): TierLimits {
  const normalized = (tier?.toLowerCase() as SubscriptionTier) || "free";
  return TIER_CONFIGS[normalized] || TIER_CONFIGS.free;
}

export function openStripeCheckout(plan: "pro" | "agency", userId?: string | null) {
  // Stripe Checkout Payment Link trigger
  const proLink = import.meta.env.VITE_STRIPE_PRO_PAYMENT_LINK || "https://buy.stripe.com/test_pro_plan";
  const agencyLink = import.meta.env.VITE_STRIPE_AGENCY_PAYMENT_LINK || "https://buy.stripe.com/test_agency_plan";
  
  const targetLink = plan === "agency" ? agencyLink : proLink;
  const checkoutUrl = userId
    ? `${targetLink}?client_reference_id=${userId}`
    : targetLink;

  window.open(checkoutUrl, "_blank");
}
