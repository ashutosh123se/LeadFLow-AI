const Queue = require('bull');
const logger = require('../utils/logger');

const emailQueue = new Queue('email-queue', process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
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

emailQueue.on('failed', (job, err) => {
  logger.error(`Bull emailQueue job failed: ID=${job.id}, error=${err.message}`);
});

emailQueue.on('completed', (job) => {
  logger.info(`Bull emailQueue job completed: ID=${job.id}`);
});

module.exports = emailQueue;
