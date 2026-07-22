const logger = require('../utils/logger');

const redisConfig = {
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
};

// Check env for connection options
const getRedisOptions = () => {
  return {
    redis: {
      port: 6379,
      host: '127.0.0.1',
    }
  };
};

logger.info(`Redis configured at: ${redisConfig.url}`);

module.exports = {
  redisConfig,
  getRedisOptions,
};
