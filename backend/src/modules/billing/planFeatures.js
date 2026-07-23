/**
 * Server-side plan feature gating — single source of truth for tier capabilities.
 */

const INTEGRATION_BY_SOURCE = {
  WEBSITE_FORM: null,
  MANUAL: null,
  WHATSAPP: 'whatsapp',
  FACEBOOK_AD: 'facebook',
  INDIAMART: 'indiamart',
  JUSTDIAL: 'justdial',
  API: 'zapier',
};

const DEFAULT_FLAGS = {
  leadSources: ['WEBSITE_FORM', 'MANUAL'],
  integrations: [],
  languages: 'single',
  maxAutomations: 0,
  whatsappPresetOnly: true,
  whatsappCustomTemplates: false,
  whatsappBulk: false,
  analyticsBasic: true,
  analyticsExport: false,
  customScoring: false,
  callRecordingDays: 30,
  supportLevel: 'email',
};

const PLAN_OVERRIDES = {
  STARTER: {
    maxEmployees: 2,
    trialDays: 14,
    trialLeadCap: 25,
  },
  GROWTH: {
    leadSources: ['WEBSITE_FORM', 'MANUAL', 'FACEBOOK_AD', 'INDIAMART', 'JUSTDIAL'],
    integrations: ['facebook', 'indiamart', 'justdial'],
    languages: 'standard',
    maxAutomations: 3,
    whatsappCustomTemplates: true,
    analyticsBasic: false,
    callRecordingDays: 90,
    supportLevel: 'email_chat',
    maxEmployees: 5,
  },
  SCALE: {
    leadSources: ['WEBSITE_FORM', 'MANUAL', 'FACEBOOK_AD', 'INDIAMART', 'JUSTDIAL', 'API'],
    integrations: ['facebook', 'indiamart', 'justdial', 'zapier'],
    languages: 'all',
    maxAutomations: null,
    whatsappBulk: true,
    whatsappCustomTemplates: true,
    analyticsExport: true,
    callRecordingDays: 365,
    supportLevel: 'priority_chat',
    maxEmployees: 15,
  },
  ENTERPRISE: {
    leadSources: ['*'],
    integrations: ['*'],
    languages: 'all_custom',
    maxAutomations: null,
    whatsappBulk: true,
    whatsappCustomTemplates: true,
    analyticsExport: true,
    customScoring: true,
    callRecordingDays: null,
    supportLevel: 'dedicated_am',
    maxEmployees: null,
  },
};

const resolveFlags = (org) => {
  const slug = org?.planDefinition?.slug || org?.plan || 'STARTER';
  const dbFlags = org?.planDefinition?.featureFlags || {};
  const overrides = PLAN_OVERRIDES[slug] || {};
  return { ...DEFAULT_FLAGS, ...overrides, ...dbFlags, planSlug: slug };
};

const canUseLeadSource = (org, source) => {
  const flags = resolveFlags(org);
  if (flags.leadSources.includes('*')) return true;
  return flags.leadSources.includes(source);
};

const canConnectIntegration = (org, integrationType) => {
  const flags = resolveFlags(org);
  if (flags.integrations.includes('*')) return true;
  return flags.integrations.includes(integrationType);
};

const canCreateAutomation = (org, currentCount) => {
  const flags = resolveFlags(org);
  const max = org?.planDefinition?.maxAutomations ?? flags.maxAutomations;
  if (max === null || max === undefined) return true;
  if (max === 0) return false;
  return currentCount < max;
};

const getLanguagePolicy = (org) => resolveFlags(org).languages;

const getUpgradeSuggestion = (org, reason) => {
  const slug = org?.planDefinition?.slug || org?.plan || 'STARTER';
  const map = {
    STARTER: { next: 'GROWTH', message: 'Upgrade to Growth for Facebook, IndiaMART, JustDial, and automation workflows.' },
    GROWTH: { next: 'SCALE', message: 'Upgrade to Scale for Zapier, unlimited automations, and bulk WhatsApp.' },
    SCALE: { next: 'ENTERPRISE', message: 'Contact sales for Enterprise — custom volume, dedicated support, and API builds.' },
    ENTERPRISE: null,
  };
  return map[slug] ? { ...map[slug], reason } : null;
};

module.exports = {
  INTEGRATION_BY_SOURCE,
  resolveFlags,
  canUseLeadSource,
  canConnectIntegration,
  canCreateAutomation,
  getLanguagePolicy,
  getUpgradeSuggestion,
};
