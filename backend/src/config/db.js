const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

const connectDB = async () => {
  try {
    await prisma.$connect();
    logger.info('Database connection established successfully.');
  } catch (error) {
    logger.error('Failed to connect to the database:', error);
    process.exit(1);
  }
};

module.exports = {
  prisma,
  connectDB,
};
