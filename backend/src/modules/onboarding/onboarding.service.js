const { prisma } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const AuditService = require('../audit/audit.service');
const logger = require('../../utils/logger');

/**
 * Onboarding wizard — guided setup for new organizations.
 * Steps: 0=not started, 1=business info, 2=phone/calling setup, 3=lead sources, 4=invite team
 */
class OnboardingService {
  static async getStatus(orgId) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        onboardingStep: true,
        onboardingComplete: true,
        name: true,
        industry: true,
        timezone: true,
        exotelApiKey: true,
        exotelSubdomain: true,
        aiCallerEnabled: true,
        whatsappPhoneId: true,
        whatsappToken: true,
      },
    });

    if (!org) {
      throw new ApiError(404, 'Organization not found.');
    }

    const employeeCount = await prisma.user.count({
      where: { organizationId: orgId },
    });

    const integrationCount = await prisma.integration.count({
      where: { organizationId: orgId, isActive: true },
    });

    return {
      currentStep: org.onboardingStep,
      isComplete: org.onboardingComplete,
      steps: [
        {
          step: 1,
          name: 'Business Information',
          description: 'Set up your company profile',
          completed: !!(org.name && org.industry),
          data: { name: org.name, industry: org.industry, timezone: org.timezone },
        },
        {
          step: 2,
          name: 'Phone & Calling Setup',
          description: 'Connect your Exotel phone number for AI calls',
          completed: !!(org.exotelApiKey || org.aiCallerEnabled),
          data: {
            exotelConnected: !!org.exotelApiKey,
            aiCallerEnabled: org.aiCallerEnabled,
          },
        },
        {
          step: 3,
          name: 'Lead Sources',
          description: 'Connect your lead sources (website form, Meta Ads, etc.)',
          completed: integrationCount > 0,
          data: { connectedSources: integrationCount },
        },
        {
          step: 4,
          name: 'Invite Your Team',
          description: 'Add team members to your workspace',
          completed: employeeCount > 1, // At least owner + 1 more
          data: { teamSize: employeeCount },
        },
      ],
    };
  }

  static async completeStep(orgId, stepNumber, data = {}, reqContext = {}) {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) {
      throw new ApiError(404, 'Organization not found.');
    }

    switch (stepNumber) {
      case 1: {
        // Business information
        const { name, industry, timezone, logo } = data;
        const updateData = {};
        if (name) updateData.name = name;
        if (industry) updateData.industry = industry;
        if (timezone) updateData.timezone = timezone;
        if (logo) updateData.logo = logo;
        updateData.onboardingStep = Math.max(org.onboardingStep, 1);

        await prisma.organization.update({
          where: { id: orgId },
          data: updateData,
        });
        break;
      }

      case 2: {
        // Phone & calling setup
        const { exotelApiKey, exotelApiToken, exotelSubdomain, exotelCallerId, aiCallerLanguage, aiCallerVoice } = data;
        const updateData = { onboardingStep: Math.max(org.onboardingStep, 2) };

        if (exotelApiKey) updateData.exotelApiKey = exotelApiKey;
        if (exotelApiToken) updateData.exotelApiToken = exotelApiToken;
        if (exotelSubdomain) updateData.exotelSubdomain = exotelSubdomain;
        if (exotelCallerId) updateData.exotelCallerId = exotelCallerId;
        if (aiCallerLanguage) updateData.aiCallerLanguage = aiCallerLanguage;
        if (aiCallerVoice) updateData.aiCallerVoice = aiCallerVoice;

        // If Exotel credentials provided, enable AI caller
        if (exotelApiKey && exotelSubdomain) {
          updateData.aiCallerEnabled = true;
        }

        await prisma.organization.update({
          where: { id: orgId },
          data: updateData,
        });
        break;
      }

      case 3: {
        // Lead sources — just advance the step (actual connection happens in integrations module)
        await prisma.organization.update({
          where: { id: orgId },
          data: { onboardingStep: Math.max(org.onboardingStep, 3) },
        });
        break;
      }

      case 4: {
        // Invite team — just advance the step (actual invites happen via auth module)
        await prisma.organization.update({
          where: { id: orgId },
          data: { onboardingStep: Math.max(org.onboardingStep, 4) },
        });
        break;
      }

      default:
        throw new ApiError(400, `Invalid onboarding step: ${stepNumber}`);
    }

    // Check if all steps are complete
    const updatedOrg = await prisma.organization.findUnique({ where: { id: orgId } });
    if (updatedOrg.onboardingStep >= 4) {
      await prisma.organization.update({
        where: { id: orgId },
        data: { onboardingComplete: true },
      });
    }

    await AuditService.log({
      organizationId: orgId,
      action: `onboarding.step_${stepNumber}_completed`,
      entityType: 'Organization',
      entityId: orgId,
      details: data,
      ...reqContext,
    });

    return this.getStatus(orgId);
  }

  static async skipOnboarding(orgId) {
    await prisma.organization.update({
      where: { id: orgId },
      data: {
        onboardingStep: 4,
        onboardingComplete: true,
      },
    });

    return { skipped: true };
  }
}

module.exports = OnboardingService;
