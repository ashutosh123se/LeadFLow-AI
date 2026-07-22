const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const plans = [
  {
    slug: 'STARTER',
    name: 'Starter Plan',
    description: 'Perfect for small businesses getting started with AI-powered lead qualification.',
    priceMonthly: 1999,
    priceAnnual: 19990,
    maxEmployees: 5,
    maxAiCalls: 20,
    maxWhatsappMsg: 100,
    maxLeads: 500,
    trialDays: 14,
    displayOrder: 1,
    isPopular: false,
    featureFlags: {
      metaAds: false,
      googleAds: false,
      customScoring: false,
      automations: false,
      csvImport: true,
      apiAccess: false,
      whatsappTemplates: true,
      prioritySupport: false,
    },
    features: [
      '20 AI speed-to-lead calls/month',
      'Up to 5 team members',
      'Standard English & Hindi voices',
      'CRM contact database (500 leads)',
      'WhatsApp manual templates',
      'Basic analytics dashboard',
      'Email support',
      '14-day free trial',
    ],
  },
  {
    slug: 'GROWTH',
    name: 'Growth Plan',
    description: 'For growing businesses that need more calls, integrations, and team management.',
    priceMonthly: 3499,
    priceAnnual: 34990,
    maxEmployees: 15,
    maxAiCalls: 75,
    maxWhatsappMsg: 500,
    maxLeads: 5000,
    trialDays: 14,
    displayOrder: 2,
    isPopular: true,
    featureFlags: {
      metaAds: true,
      googleAds: false,
      customScoring: false,
      automations: true,
      csvImport: true,
      apiAccess: true,
      whatsappTemplates: true,
      prioritySupport: false,
    },
    features: [
      '75 AI speed-to-lead calls/month',
      'Up to 15 team members',
      'Sarvam AI ultra-natural Hindi & English voice',
      '90-second automated call queue',
      'WhatsApp outbound follow-up templates',
      'Facebook/Instagram Lead Ads integration',
      'Team performance leaderboard',
      'CSV import & API access',
      'Advanced analytics & reporting',
      '14-day free trial',
    ],
  },
  {
    slug: 'PRO',
    name: 'Pro Plan',
    description: 'For high-volume businesses needing unlimited team access, custom AI scoring, and all integrations.',
    priceMonthly: 5999,
    priceAnnual: 59990,
    maxEmployees: 9999,
    maxAiCalls: 200,
    maxWhatsappMsg: 2000,
    maxLeads: 999999,
    trialDays: 14,
    displayOrder: 3,
    isPopular: false,
    featureFlags: {
      metaAds: true,
      googleAds: true,
      customScoring: true,
      automations: true,
      csvImport: true,
      apiAccess: true,
      whatsappTemplates: true,
      prioritySupport: true,
    },
    features: [
      '200 AI speed-to-lead calls/month',
      'Unlimited team members',
      'Custom qualifying questions & AI scoring prompts',
      'Google Ads Lead Form integration',
      'Advanced multi-step automations',
      'All integrations (IndiaMart, Justdial, Zapier)',
      'Dedicated support manager',
      'Priority email & WhatsApp support',
      'Full API access & webhooks',
      '14-day free trial',
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

  // Bootstrap platform super admin
  const starterPlan = await prisma.planDefinition.findUnique({ where: { slug: 'STARTER' } });
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD || 'LeadFlow@Admin123';
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const platformOrg = await prisma.organization.upsert({
    where: { slug: 'leadflow-platform' },
    update: { isActive: true, suspendedAt: null, deletedAt: null },
    create: {
      name: 'LeadFlow Platform',
      slug: 'leadflow-platform',
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
