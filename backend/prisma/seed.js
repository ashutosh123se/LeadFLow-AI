const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = new PrismaClient();

const annualFromMonthly = (monthly) => Math.round(monthly * 12 * 0.85);

const plans = [
  {
    slug: 'STARTER',
    name: 'Starter',
    description: 'For individual agents and single-location businesses testing AI speed-to-lead.',
    priceMonthly: 13500,
    priceAnnual: annualFromMonthly(13500),
    maxEmployees: 2,
    maxAiCalls: 500,
    maxWhatsappMsg: 200,
    maxLeads: 2000,
    overageRatePerLead: 20,
    trialLeadCap: 25,
    maxAutomations: 0,
    trialDays: 14,
    displayOrder: 1,
    isPopular: false,
    featureFlags: {
      leadSources: ['WEBSITE_FORM', 'MANUAL'],
      integrations: [],
      languages: 'single',
      automations: false,
      whatsappPresetOnly: true,
      analyticsBasic: true,
      callRecordingDays: 30,
      supportLevel: 'email',
    },
    features: [
      '500 AI leads/calls per month',
      '2 team members',
      '1 language (Hindi, Hinglish, or English)',
      'Website form lead capture',
      'Basic WhatsApp templates',
      'Lead scoring (HOT/WARM/COLD)',
      'Sales pipeline (kanban)',
      'Basic analytics',
      '30-day call recording storage',
      'Email support',
      '14-day trial · up to 25 leads',
      'Overage: ₹20/lead beyond cap',
    ],
  },
  {
    slug: 'GROWTH',
    name: 'Growth',
    description: 'Core tier for growing SMEs — multiple branches, integrations, and automations.',
    priceMonthly: 37500,
    priceAnnual: annualFromMonthly(37500),
    maxEmployees: 5,
    maxAiCalls: 1500,
    maxWhatsappMsg: 1000,
    maxLeads: 10000,
    overageRatePerLead: 18,
    trialLeadCap: 0,
    maxAutomations: 3,
    trialDays: 0,
    displayOrder: 2,
    isPopular: true,
    featureFlags: {
      leadSources: ['WEBSITE_FORM', 'MANUAL', 'FACEBOOK_AD', 'INDIAMART', 'JUSTDIAL'],
      integrations: ['facebook', 'indiamart', 'justdial'],
      languages: 'standard',
      automations: true,
      whatsappCustomTemplates: true,
      analyticsBasic: false,
      callRecordingDays: 90,
      supportLevel: 'email_chat',
    },
    features: [
      '1,500 AI leads/calls per month',
      '5 team members',
      'Hindi + English + Hinglish (per lead)',
      'Facebook Lead Ads, IndiaMART, JustDial',
      'Customizable WhatsApp templates',
      'Up to 3 automation workflows',
      'Full analytics dashboard',
      '90-day call recording storage',
      'Email + chat support',
      'Overage: ₹18/lead beyond cap',
    ],
  },
  {
    slug: 'SCALE',
    name: 'Scale',
    description: 'For franchise chains and high-volume teams replacing large telecaller rosters.',
    priceMonthly: 110000,
    priceAnnual: annualFromMonthly(110000),
    maxEmployees: 15,
    maxAiCalls: 5000,
    maxWhatsappMsg: 5000,
    maxLeads: 999999,
    overageRatePerLead: 15,
    trialLeadCap: 0,
    maxAutomations: null,
    trialDays: 0,
    displayOrder: 3,
    isPopular: false,
    featureFlags: {
      leadSources: ['WEBSITE_FORM', 'MANUAL', 'FACEBOOK_AD', 'INDIAMART', 'JUSTDIAL', 'API'],
      integrations: ['facebook', 'indiamart', 'justdial', 'zapier'],
      languages: 'all',
      automations: true,
      whatsappBulk: true,
      whatsappCustomTemplates: true,
      analyticsExport: true,
      callRecordingDays: 365,
      supportLevel: 'priority_chat',
    },
    features: [
      '5,000 AI leads/calls per month',
      '15 team members',
      'All languages',
      'Zapier + all lead sources',
      'Bulk WhatsApp messaging',
      'Unlimited automation workflows',
      'Exportable reports',
      '1-year call recording storage',
      'Priority chat support',
      'Overage: ₹15/lead beyond cap',
    ],
  },
  {
    slug: 'ENTERPRISE',
    name: 'Enterprise',
    description: 'Custom volume, dedicated support, and bespoke CRM/API integrations.',
    priceMonthly: 0,
    priceAnnual: null,
    maxEmployees: 9999,
    maxAiCalls: 5000,
    maxWhatsappMsg: 99999,
    maxLeads: 999999,
    overageRatePerLead: 0,
    trialLeadCap: 0,
    maxAutomations: null,
    trialDays: 0,
    displayOrder: 4,
    isPopular: false,
    featureFlags: {
      isCustomQuote: true,
      leadSources: ['*'],
      integrations: ['*'],
      languages: 'all_custom',
      automations: true,
      whatsappBulk: true,
      customScoring: true,
      analyticsExport: true,
      callRecordingDays: null,
      supportLevel: 'dedicated_am',
    },
    features: [
      '5,000+ leads/month (negotiated)',
      'Unlimited team members',
      'Custom voice & script tuning',
      'Custom API/CRM integration build',
      'Dedicated WhatsApp number',
      'Custom scoring criteria',
      'Custom dashboards & retention',
      'Dedicated account manager',
      'Negotiated overage rates',
    ],
  },
];

async function main() {
  console.log('🌱 Seeding PlanDefinition records...');

  for (const plan of plans) {
    await prisma.planDefinition.upsert({
      where: { slug: plan.slug },
      update: {
        name: plan.name,
        description: plan.description,
        priceMonthly: plan.priceMonthly,
        priceAnnual: plan.priceAnnual,
        maxEmployees: plan.maxEmployees,
        maxAiCalls: plan.maxAiCalls,
        maxWhatsappMsg: plan.maxWhatsappMsg,
        maxLeads: plan.maxLeads,
        overageRatePerLead: plan.overageRatePerLead,
        trialLeadCap: plan.trialLeadCap,
        maxAutomations: plan.maxAutomations,
        trialDays: plan.trialDays,
        displayOrder: plan.displayOrder,
        isPopular: plan.isPopular,
        featureFlags: plan.featureFlags,
        features: plan.features,
      },
      create: plan,
    });

    console.log(`  ✅ Upserted plan: ${plan.name} (${plan.slug})`);
  }

  console.log('🌱 Seed complete.');

  const starterPlan = await prisma.planDefinition.findUnique({ where: { slug: 'STARTER' } });
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD || 'LeadFlow@Admin123';
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const platformOrg = await prisma.organization.upsert({
    where: { slug: 'leadflow-platform' },
    update: {
      isActive: true,
      suspendedAt: null,
      deletedAt: null,
    },
    create: {
      name: 'LeadFlow Platform',
      slug: 'leadflow-platform',
      captureToken: crypto.randomBytes(32).toString('hex'),
      industry: 'Technology',
      planDefinitionId: starterPlan?.id,
      aiCallsLimit: 9999,
      whatsappMsgLimit: 9999,
      onboardingComplete: true,
    },
  });

  const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@leadflow.ai';
  const existingAdmin = await prisma.user.findFirst({
    where: { email: adminEmail, organizationId: platformOrg.id },
  });

  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        organizationId: platformOrg.id,
        name: 'System Administrator',
        email: adminEmail,
        passwordHash,
        role: 'SUPER_ADMIN',
        emailVerified: true,
        isActive: true,
      },
    });
    console.log(`  ✅ Created SUPER_ADMIN: ${adminEmail}`);
  } else {
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: { role: 'SUPER_ADMIN', isActive: true, emailVerified: true },
    });
    console.log(`  ✅ Updated SUPER_ADMIN: ${adminEmail}`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
