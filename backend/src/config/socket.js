const socketIo = require('socket.io');
const logger = require('../utils/logger');
const { verifyAccessToken } = require('../utils/jwt');

let io = null;

const initSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'https://app.leadflowai.com',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
  });

  // Socket middleware for authentication
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication error: Token required'));
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return next(new Error('Authentication error: Invalid or expired token'));
    }

    socket.user = decoded;
    next();
  });

  io.on('connection', (socket) => {
    const { organizationId, userId, name } = socket.user;
    logger.info(`User ${name} (${userId}) connected via WebSocket to org ${organizationId}`);

    // Join organization-specific room
    socket.join(organizationId);

    socket.on('disconnect', () => {
      logger.info(`User ${name} (${userId}) disconnected from WebSocket`);
      socket.leave(organizationId);
    });
  });

  return io;
};

const getIO = () => {
  return io;
};

// Emits an event to all clients in a specific organization room
const emitToOrg = (orgId, event, data) => {
  if (io) {
    io.to(orgId).emit(event, data);
    logger.debug(`Socket event '${event}' emitted to org room ${orgId}`);
  } else {
    logger.warn('Socket.io not initialized, failed to emit event');
  }
};

module.exports = {
  initSocket,
  getIO,
  emitToOrg,
};
