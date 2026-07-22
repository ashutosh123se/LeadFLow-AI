const { createClient } = require('redis');
const logger = require('../utils/logger');

const client = createClient({
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
});

client.on('error', (err) => logger.error('Redis Client Error:', err));

client.on('connect', () => logger.info('Redis Client connecting...'));
client.on('ready', () => logger.info('Redis Client ready and connected.'));

// Asynchronously connect
(async () => {
  try {
    await client.connect();
  } catch (err) {
    logger.error('Could not connect to Redis:', err);
  }
})();

module.exports = client;
