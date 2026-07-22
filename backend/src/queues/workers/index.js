const logger = require('../../utils/logger');
const { connectDB } = require('../../config/db');

// Start connection to DB first
connectDB().then(() => {
  logger.info('Database connected, starting queue workers...');

  // Import workers to register their handlers
  require('./callWorker');
  require('./whatsappWorker');
  require('./emailWorker');
  require('./automationWorker');

  logger.info('All Bull queue workers started and listening for jobs.');
}).catch((error) => {
  logger.error('Failed to start queue workers due to database connection error:', error);
  process.exit(1);
});
