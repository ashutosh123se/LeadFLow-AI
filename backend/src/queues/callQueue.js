const Queue = require('bull');
const logger = require('../utils/logger');

const callQueue = new Queue('call-queue', process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
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

callQueue.on('failed', (job, err) => {
  logger.error(`Bull callQueue job failed: ID=${job.id}, error=${err.message}`);
});

callQueue.on('completed', (job) => {
  logger.info(`Bull callQueue job completed: ID=${job.id}`);
});

module.exports = callQueue;
