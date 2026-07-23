/** Marketing copy for pricing page — mirrors server-side plan tiers. */
export const ANNUAL_DISCOUNT = 0.15;

export const TELECALLER_COMPARISON = {
  humanCostMin: 30000,
  humanCostMax: 70000,
  humanConnectsMin: 550,
  humanConnectsMax: 880,
  responseTimeHuman: 'hours',
  responseTimeLeadFlow: '90 seconds',
};

export const PRICING_PLANS = [
  {
    slug: 'STARTER',
    name: 'Starter',
    priceMonthly: 13500,
    leads: '500 leads/mo',
    overage: '₹20/lead',
    seats: '2 users',
    segment: 'Solo agents & single-location SMBs',
    cta: 'Start 14-day trial',
    ctaHref: '/register',
    features: [
      '1 language (Hindi, Hinglish, or English)',
      'Website form lead capture',
      'Basic WhatsApp templates',
      'Lead scoring & kanban pipeline',
      'Basic analytics · 30-day recordings',
      'Email support',
    ],
  },
  {
    slug: 'GROWTH',
    name: 'Growth',
    priceMonthly: 37500,
    leads: '1,500 leads/mo',
    overage: '₹18/lead',
    seats: '5 users',
    segment: 'Growing SMEs — sweet-spot tier',
    featured: true,
    cta: 'Get Growth',
    ctaHref: '/register?plan=GROWTH',
    features: [
      'Hindi + English + Hinglish per lead',
      'Facebook, IndiaMART, JustDial',
      'Custom WhatsApp templates',
      'Up to 3 automation workflows',
      'Full analytics · 90-day recordings',
      'Email + chat support',
    ],
  },
  {
    slug: 'SCALE',
    name: 'Scale',
    priceMonthly: 110000,
    leads: '5,000 leads/mo',
    overage: '₹15/lead',
    seats: '15 users',
    segment: 'Franchise chains & high-volume teams',
    cta: 'Get Scale',
    ctaHref: '/register?plan=SCALE',
    features: [
      'All languages',
      'Zapier + every lead source',
      'Bulk WhatsApp messaging',
      'Unlimited automation workflows',
      'Exportable reports · 1-year recordings',
      'Priority chat support',
    ],
  },
  {
    slug: 'ENTERPRISE',
    name: 'Enterprise',
    priceMonthly: null,
    leads: '5,000+ leads/mo',
    overage: 'Negotiated',
    seats: 'Unlimited users',
    segment: 'Custom volume & dedicated support',
    cta: 'Talk to sales',
    ctaHref: 'mailto:sales@leadflow.ai',
    features: [
      'Custom voice & script tuning',
      'Custom API/CRM integration build',
      'Dedicated WhatsApp number',
      'Custom scoring & dashboards',
      'Dedicated account manager',
    ],
  },
];

export const formatInr = (amount) =>
  amount == null ? 'Custom' : amount.toLocaleString('en-IN');

export const monthlyDisplayPrice = (plan, billingInterval) => {
  if (plan.priceMonthly == null) return null;
  if (billingInterval === 'annual') {
    return Math.round(plan.priceMonthly * (1 - ANNUAL_DISCOUNT));
  }
  return plan.priceMonthly;
};
