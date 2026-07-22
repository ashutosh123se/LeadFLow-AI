const { prisma } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const callQueue = require('../../queues/callQueue');

class CallService {
  static async getAll(orgId, pagination = {}) {
    const { limit = 10, skip = 0 } = pagination;

    const [total, data] = await prisma.$transaction([
      prisma.call.count({ where: { organizationId: orgId } }),
      prisma.call.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          lead: {
            select: { id: true, name: true, phone: true, email: true },
          },
        },
      }),
    ]);

    return { total, data };
  }

  static async getById(orgId, callId) {
    const call = await prisma.call.findFirst({
      where: { id: callId, organizationId: orgId },
      include: {
        lead: {
          select: { id: true, name: true, phone: true, email: true },
        },
      },
    });

    if (!call) {
      throw new ApiError(404, 'Call log not found.');
    }

    return call;
  }

  static async triggerCall(orgId, leadId) {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId: orgId },
    });

    if (!lead) {
      throw new ApiError(404, 'Lead not found.');
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (org.aiCallsUsed >= org.aiCallsLimit) {
      throw new ApiError(402, `AI Call limit reached (${org.aiCallsUsed}/${org.aiCallsLimit}). Please upgrade your plan.`);
    }

    // Add immediate call job to Bull queue
    await callQueue.add({
      leadId,
      organizationId: orgId,
    });

    return true;
  }

  static async getStats(orgId) {
    const totalCalls = await prisma.call.count({
      where: { organizationId: orgId },
    });

    const answeredCalls = await prisma.call.count({
      where: {
        organizationId: orgId,
        status: 'COMPLETED',
        answeredAt: { not: null },
      },
    });

    const durationAggregate = await prisma.call.aggregate({
      where: { organizationId: orgId, status: 'COMPLETED' },
      _avg: {
        duration: true,
      },
    });

    const hotCount = await prisma.lead.count({
      where: { organizationId: orgId, scoreLabel: 'HOT' },
    });

    const qualifyRate = totalCalls > 0 ? (answeredCalls / totalCalls) * 100 : 0;
    const avgDuration = durationAggregate._avg.duration || 0;

    return {
      totalCalls,
      answeredCalls,
      qualifyRate: Math.round(qualifyRate * 10) / 10,
      avgDuration: Math.round(avgDuration),
      hotCount,
    };
  }
}

module.exports = CallService;
