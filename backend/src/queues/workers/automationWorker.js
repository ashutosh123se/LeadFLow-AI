const automationQueue = require('../automationQueue');
const logger = require('../../utils/logger');

automationQueue.process(async (job) => {
  const { automationId, leadId, triggerData, orgId, stepIndex } = job.data;
  logger.info(`Processing delayed automation step: workflow=${automationId}, lead=${leadId}, stepIndex=${stepIndex}`);

  try {
    // Dynamically require service to prevent circular dependencies at startup
    const AutomationService = require('../../modules/automation/automation.service');
    await AutomationService.processWorkflow(automationId, leadId, triggerData, orgId, stepIndex);
  } catch (error) {
    logger.error(`Error in automationWorker executing job ${job.id}:`, error.message);
    throw error;
  }
});
