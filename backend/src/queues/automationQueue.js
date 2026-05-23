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

const automationQueue = new Queue('automation-queue', redisUrl, {
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

automationQueue.on('failed', (job, err) => {
  logger.error(`Bull automationQueue job failed: ID=${job.id}, error=${err.message}`);
});

automationQueue.on('completed', (job) => {
  logger.info(`Bull automationQueue job completed: ID=${job.id}`);
});

module.exports = automationQueue;
