const Queue = require('bull');
const logger = require('../utils/logger');

const whatsappQueue = new Queue('whatsapp-queue', process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
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

whatsappQueue.on('failed', (job, err) => {
  logger.error(`Bull whatsappQueue job failed: ID=${job.id}, error=${err.message}`);
});

whatsappQueue.on('completed', (job) => {
  logger.info(`Bull whatsappQueue job completed: ID=${job.id}`);
});

module.exports = whatsappQueue;
