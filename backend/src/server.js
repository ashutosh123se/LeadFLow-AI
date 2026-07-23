const http = require('http');
require('dotenv').config();

const { validateStartup } = require('./config/env');
validateStartup();

const app = require('./app');
const { connectDB } = require('./config/db');
const { initSocket } = require('./config/socket');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 1. Establish Database Connection
    await connectDB();

    // 2. Initialize HTTP Server
    const server = http.createServer(app);

    // 3. Initialize Socket.io Singleton
    initSocket(server);

    // 4. Start HTTP Server listening on port
    server.listen(PORT, () => {
      logger.info(`===================================================`);
      logger.info(`  LeadFlow-AI Master Server is running on port ${PORT}`);
      logger.info(`  Client URL: ${process.env.CLIENT_URL || 'https://app.leadflowai.com'}`);
      logger.info(`  API Prefix: ${process.env.API_PREFIX || '/api/v1'}`);
      logger.info(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`===================================================`);
    });

    // Handle process termination gracefully
    const shutdown = () => {
      logger.info('Received shutdown signal, shutting down gracefully...');
      server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    logger.error('Fatal crash on server start:', error);
    process.exit(1);
  }
};

startServer();
