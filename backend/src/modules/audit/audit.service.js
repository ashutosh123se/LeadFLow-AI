const { prisma } = require('../../config/db');
const logger = require('../../utils/logger');

class AuditService {
  /**
   * Log a significant action for audit trail
   * @param {Object} params
   * @param {string} [params.organizationId] - Organization context
   * @param {string} [params.userId] - User who performed the action
   * @param {string} [params.userEmail] - Denormalized email for display
   * @param {string} params.action - Action identifier, e.g., "auth.login", "lead.status_changed"
   * @param {string} [params.entityType] - Entity type, e.g., "Lead", "User"
   * @param {string} [params.entityId] - Entity ID
   * @param {Object} [params.details] - Additional context/metadata
   * @param {string} [params.ipAddress] - Request IP
   * @param {string} [params.userAgent] - Request user agent
   */
  static async log({
    organizationId = null,
    userId = null,
    userEmail = null,
    action,
    entityType = null,
    entityId = null,
    details = null,
    ipAddress = null,
    userAgent = null,
  }) {
    try {
      await prisma.auditLog.create({
        data: {
          organizationId,
          userId,
          userEmail,
          action,
          entityType,
          entityId,
          details,
          ipAddress,
          userAgent,
        },
      });
    } catch (error) {
      // Audit logging should never block the main operation
      logger.error('Audit log write failed:', error.message);
    }
  }

  /**
   * Helper to extract audit context from an Express request
   */
  static contextFromRequest(req) {
    return {
      organizationId: req.organizationId || req.user?.organizationId || null,
      userId: req.user?.id || null,
      userEmail: req.user?.email || null,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || null,
      userAgent: req.headers['user-agent'] || null,
    };
  }

  /**
   * Query audit logs with filters
   */
  static async getAuditLogs(filters = {}, pagination = {}) {
    const { organizationId, userId, action, entityType, dateFrom, dateTo } = filters;
    const { limit = 50, skip = 0 } = pagination;

    const where = {};

    if (organizationId) where.organizationId = organizationId;
    if (userId) where.userId = userId;
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (entityType) where.entityType = entityType;

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [total, data] = await prisma.$transaction([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return { total, data };
  }
}

module.exports = AuditService;
