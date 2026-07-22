const axios = require('axios');
const { prisma } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const callQueue = require('../../queues/callQueue');
const whatsappQueue = require('../../queues/whatsappQueue');
const emailQueue = require('../../queues/emailQueue');
const logger = require('../../utils/logger');
const { emitToOrg } = require('../../config/socket');

class AutomationService {
  static async getAll(orgId) {
    return prisma.automation.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });
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

    return prisma.automation.create({
      data: {
        organizationId: orgId,
        name,
        description,
        trigger,
        steps,
        isActive: true,
      },
    });
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

    return prisma.automation.update({
      where: { id: autoId },
      data: {
        name,
        description,
        trigger,
        steps,
      },
    });
  }

  static async delete(orgId, autoId) {
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

    return prisma.automation.update({
      where: { id: autoId },
      data: {
        isActive: !auto.isActive,
      },
    });
  }

  // Backwards compatible / Webhook-facing interface
  static async triggerAutomations(triggerType, leadId, orgId, triggerData = {}) {
    return this.triggerWorkflows(orgId, triggerType, leadId, triggerData);
  }

  // Core Trigger Logic
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
        let triggerConfig = auto.trigger;
        if (typeof triggerConfig === 'string') {
          try {
            triggerConfig = JSON.parse(triggerConfig);
          } catch (e) {
            triggerConfig = {};
          }
        }

        if (triggerConfig.type !== triggerType) continue;

        // Custom condition filters (e.g. lead score threshold)
        if (triggerType === 'score_updated' && triggerConfig.minScore) {
          const score = parseInt(triggerData.score, 10) || 0;
          const minScore = parseInt(triggerConfig.minScore, 10) || 0;
          if (score < minScore) {
            logger.info(`Automation "${auto.name}" bypassed: score (${score}) < minScore (${minScore})`);
            continue;
          }
        }

        logger.info(`Executing automation workflow matches: "${auto.name}"`);

        // Start executing steps from the beginning (index 0)
        await this.processWorkflow(auto.id, leadId, triggerData, orgId, 0);

        // Increment execution counter
        await prisma.automation.update({
          where: { id: auto.id },
          data: {
            executionCount: { increment: 1 },
          },
        });
      }
    } catch (error) {
      logger.error('Automation Engine failed to trigger workflows:', error.message);
    }
  }

  // Step-by-Step execution process supporting visual "wait" steps
  static async processWorkflow(automationId, leadId, triggerData, orgId, stepIndex = 0) {
    try {
      const auto = await prisma.automation.findUnique({
        where: { id: automationId },
      });

      if (!auto || !auto.isActive) {
        logger.warn(`Automation workflow ${automationId} is either deleted or inactive. Stopping process.`);
        return;
      }

      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: { organization: true },
      });

      if (!lead) {
        logger.warn(`Lead ${leadId} not found. Cannot execute automation workflow ${auto.name}.`);
        return;
      }

      let steps = auto.steps;
      if (typeof steps === 'string') {
        try {
          steps = JSON.parse(steps);
        } catch (e) {
          steps = [];
        }
      }

      if (!Array.isArray(steps) || stepIndex >= steps.length) {
        logger.info(`Finished processing all steps in workflow "${auto.name}" for lead ${lead.name}`);
        return;
      }

      // Loop through steps sequentially starting at stepIndex
      for (let i = stepIndex; i < steps.length; i++) {
        const step = steps[i];
        logger.info(`Executing step ${i} (${step.type}) of workflow "${auto.name}" for lead ${lead.name}`);

        if (step.type === 'wait') {
          // Calculate wait duration in seconds (default to 60s if not specified)
          const duration = parseInt(step.duration, 10) || 60;
          logger.info(`Wait step encountered. Delaying remainder of workflow for ${duration}s.`);

          const automationQueue = require('../../queues/automationQueue');
          await automationQueue.add(
            {
              automationId,
              leadId,
              triggerData,
              orgId,
              stepIndex: i + 1,
            },
            {
              delay: duration * 1000,
            }
          );

          // Stop running steps synchronously; wait job will trigger the next steps
          return;
        }

        // Execute specific step action
        await this.executeStepAction(step, lead, orgId);
      }
    } catch (error) {
      logger.error(`Error processing workflow steps for autoId ${automationId}:`, error.message);
    }
  }

  // Executing single step actions
  static async executeStepAction(step, lead, orgId) {
    try {
      switch (step.type) {
        case 'make_ai_call': {
          await callQueue.add({
            leadId: lead.id,
            organizationId: orgId,
          });
          logger.info(`Automation Action: Triggered AI qualification call for lead ${lead.name}`);
          break;
        }

        case 'send_whatsapp': {
          await whatsappQueue.add({
            organizationId: orgId,
            leadId: lead.id,
            phone: lead.phone,
            templateName: step.templateName || 'welcome_lead',
            variables: [lead.name],
          });
          logger.info(`Automation Action: Triggered WhatsApp template message to ${lead.phone}`);
          break;
        }

        case 'send_email': {
          const toEmail = step.email || lead.email;
          if (!toEmail) {
            logger.warn(`Automation Action send_email skipped: no email address found for lead ${lead.name}`);
            break;
          }

          await emailQueue.add({
            to: toEmail,
            template: step.templateName || 'welcome',
            variables: {
              name: lead.name,
              companyName: lead.company || 'your company',
              otp: '123456', // dummy fallback
            },
          });
          logger.info(`Automation Action: Triggered email notification to ${toEmail}`);
          break;
        }

        case 'assign_lead': {
          const targetRole = step.role || 'AGENT';
          const targetAgent = await prisma.user.findFirst({
            where: {
              organizationId: orgId,
              role: targetRole,
              isActive: true,
            },
          });

          if (targetAgent) {
            await prisma.lead.update({
              where: { id: lead.id },
              data: { assignedToId: targetAgent.id },
            });

            await prisma.activity.create({
              data: {
                organizationId: orgId,
                leadId: lead.id,
                type: 'system',
                description: `Lead auto-assigned to ${targetAgent.name} (${targetRole}) via automation.`,
              },
            });
            logger.info(`Automation Action: Lead assigned to agent: ${targetAgent.name}`);
          }
          break;
        }

        case 'change_stage': {
          if (step.stageId) {
            await prisma.lead.update({
              where: { id: lead.id },
              data: { stageId: step.stageId },
            });

            await prisma.activity.create({
              data: {
                organizationId: orgId,
                leadId: lead.id,
                type: 'system',
                description: `Lead stage changed to stage ID ${step.stageId} via automation.`,
              },
            });
            logger.info(`Automation Action: Lead stage updated to: ${step.stageId}`);
          }
          break;
        }

        case 'notify_team': {
          const message = step.message || `Lead ${lead.name} has triggered a system notification.`;

          await prisma.activity.create({
            data: {
              organizationId: orgId,
              leadId: lead.id,
              type: 'notification',
              description: message,
            },
          });

          emitToOrg(orgId, 'notification:new', {
            leadId: lead.id,
            leadName: lead.name,
            message,
            timestamp: new Date(),
          });
          logger.info(`Automation Action: Dispatch team activity notification: ${message}`);
          break;
        }

        case 'create_task': {
          const title = step.title || 'Follow up with lead';
          const dueDays = parseInt(step.dueDays, 10) || 1;
          const taskDescription = `[Task] ${title} (Due in ${dueDays} days)`;

          await prisma.activity.create({
            data: {
              organizationId: orgId,
              leadId: lead.id,
              type: 'task',
              description: taskDescription,
            },
          });
          logger.info(`Automation Action: Created activity log task: ${taskDescription}`);
          break;
        }

        case 'webhook': {
          if (step.webhookUrl) {
            try {
              await axios.post(step.webhookUrl, {
                event: 'workflow_trigger',
                lead: {
                  id: lead.id,
                  name: lead.name,
                  phone: lead.phone,
                  email: lead.email,
                  source: lead.source,
                  budget: lead.budget,
                  timeline: lead.timeline,
                  requirement: lead.requirement,
                },
                timestamp: new Date(),
              });
              logger.info(`Automation Action: Posted outbound workflow webhook to ${step.webhookUrl}`);
            } catch (webErr) {
              logger.error(`Failed to dispatch automation outbound webhook to ${step.webhookUrl}:`, webErr.message);
            }
          }
          break;
        }

        default:
          logger.warn(`Automation Action: Unrecognized step type "${step.type}"`);
      }
    } catch (actionErr) {
      logger.error(`Error executing automation action step ${step.type}:`, actionErr.message);
    }
  }
}

module.exports = AutomationService;
