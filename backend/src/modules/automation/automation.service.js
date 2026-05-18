const { prisma } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const callQueue = require('../../queues/callQueue');
const whatsappQueue = require('../../queues/whatsappQueue');
const emailQueue = require('../../queues/emailQueue');
const logger = require('../../utils/logger');

class AutomationService {
  static async getAll(orgId) {
    const automations = await prisma.automation.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });
    return automations;
  }

  static async getById(orgId, autoId) {
    const auto = await prisma.automation.findFirst({
      where: { id: autoId, organizationId: orgId },
    });

    if (!auto) {
      throw new ApiError(404, 'Automation workflow not found.');
    }

    return auto;
  }

  static async create(orgId, data) {
    const { name, description, trigger, steps } = data;

    const auto = await prisma.automation.create({
      data: {
        organizationId: orgId,
        name,
        description,
        trigger,
        steps,
        isActive: true,
      },
    });

    return auto;
  }

  static async update(orgId, autoId, data) {
    const { name, description, trigger, steps } = data;

    // Verify ownership
    const auto = await prisma.automation.findFirst({
      where: { id: autoId, organizationId: orgId },
    });

    if (!auto) {
      throw new ApiError(404, 'Automation workflow not found.');
    }

    const updated = await prisma.automation.update({
      where: { id: autoId },
      data: {
        name,
        description,
        trigger,
        steps,
      },
    });

    return updated;
  }

  static async delete(orgId, autoId) {
    // Verify ownership
    const auto = await prisma.automation.findFirst({
      where: { id: autoId, organizationId: orgId },
    });

    if (!auto) {
      throw new ApiError(404, 'Automation workflow not found.');
    }

    await prisma.automation.delete({
      where: { id: autoId },
    });

    return true;
  }

  static async toggleActive(orgId, autoId) {
    const auto = await prisma.automation.findFirst({
      where: { id: autoId, organizationId: orgId },
    });

    if (!auto) {
      throw new ApiError(404, 'Automation workflow not found.');
    }

    const updated = await prisma.automation.update({
      where: { id: autoId },
      data: {
        isActive: !auto.isActive,
      },
    });

    return updated;
  }

  // Automation Execution Engine
  static async triggerWorkflows(orgId, triggerType, leadId, triggerData = {}) {
    try {
      logger.info(`Triggering automation workflows: orgId=${orgId}, triggerType=${triggerType}, leadId=${leadId}`);

      const automations = await prisma.automation.findMany({
        where: {
          organizationId: orgId,
          isActive: true,
        },
      });

      for (const auto of automations) {
        // Simple JSON trigger matching
        const triggerConfig = auto.trigger;
        if (triggerConfig.type !== triggerType) continue;

        // Custom conditions matching (e.g. min score)
        if (triggerType === 'score_updated' && triggerConfig.minScore) {
          if ((triggerData.score || 0) < triggerConfig.minScore) continue;
        }

        logger.info(`Executing automation workflow matches: "${auto.name}"`);
        
        // Execute steps
        await this.executeWorkflowSteps(orgId, leadId, auto.steps);

        // Increment execution counter
        await prisma.automation.update({
          where: { id: auto.id },
          data: {
            executionCount: { increment: 1 },
          },
        });
      }
    } catch (error) {
      logger.error('Automation Engine failed to execute workflows:', error);
    }
  }

  static async executeWorkflowSteps(orgId, leadId, steps) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return;

    // Iterate and execute each step async or sequentially
    for (const step of steps) {
      try {
        const delayMs = (step.delay || 0) * 1000;

        switch (step.type) {
          case 'make_ai_call':
            await callQueue.add(
              { leadId, organizationId: orgId },
              { delay: delayMs }
            );
            logger.info(`Automation step: Scheduled outbound AI Call for lead ${leadId} in ${step.delay || 0}s`);
            break;

          case 'send_whatsapp':
            await whatsappQueue.add(
              {
                organizationId: orgId,
                leadId,
                phone: lead.phone,
                templateName: step.templateName || 'welcome_lead',
                variables: [lead.name],
              },
              { delay: delayMs }
            );
            logger.info(`Automation step: Scheduled WhatsApp template message to ${lead.phone}`);
            break;

          case 'assign_lead':
            // Assign to senior agent or manager
            const targetAgent = await prisma.user.findFirst({
              where: { organizationId: orgId, role: step.role || 'AGENT', isActive: true },
            });
            if (targetAgent) {
              await prisma.lead.update({
                where: { id: leadId },
                data: { assignedToId: targetAgent.id },
              });
              logger.info(`Automation step: Assigned lead ${leadId} to ${targetAgent.name}`);
            }
            break;

          case 'change_stage':
            if (step.stageId) {
              await prisma.lead.update({
                where: { id: leadId },
                data: { stageId: step.stageId },
              });
              logger.info(`Automation step: Moved lead ${leadId} to stage ${step.stageId}`);
            }
            break;

          default:
            logger.warn(`Automation step: Unknown action type "${step.type}"`);
        }
      } catch (stepErr) {
        logger.error(`Failed to process automation step: ${JSON.stringify(step)}`, stepErr);
      }
    }
  }
}

module.exports = AutomationService;
