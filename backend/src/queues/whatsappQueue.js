const Queue = require('bull');
const logger = require('../utils/logger');

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const redisOpts = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

if (redisUrl.startsWith('rediss:')) {
  redisOpts.tls = {
    rejectUnauthorized: false
  };
}

const whatsappQueue = new Queue('whatsapp-queue', redisUrl, {
  redis: redisOpts,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

whatsappQueue.on('failed', async (job, err) => {
  logger.error(`Bull whatsappQueue job failed: ID=${job.id}, error=${err.message}`);
  
  if (job.attemptsMade >= (job.opts.attempts || 3)) {
    const { organizationId, leadId, phone, templateName, variables } = job.data;
    try {
      const { prisma } = require('../config/db');
      const { emitToOrg } = require('../config/socket');
      
      const content = `Template: ${templateName} | Variables: ${JSON.stringify(variables)} | Error: ${err.message}`;
      const message = await prisma.whatsappMessage.create({
        data: {
          organizationId,
          leadId,
          waMessageId: `failed-job-${job.id}-${Date.now()}`,
          direction: 'OUTBOUND',
          type: 'template',
          content,
          templateName,
          status: 'failed',
        },
      });

      emitToOrg(organizationId, 'whatsapp:failed', {
        messageId: message.id,
        leadId,
        templateName,
        status: 'failed',
        error: err.message,
      });
    } catch (dbErr) {
      logger.error('Failed to write failed whatsapp message status to DB:', dbErr.message);
    }
  }
});

whatsappQueue.on('completed', (job) => {
  logger.info(`Bull whatsappQueue job completed: ID=${job.id}`);
});

module.exports = whatsappQueue;
