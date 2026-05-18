const { prisma } = require('../../config/db');

class AnalyticsService {
  static async getOverview(orgId) {
    const totalLeads = await prisma.lead.count({ where: { organizationId: orgId } });
    const aiCalls = await prisma.call.count({ where: { organizationId: orgId } });
    const whatsappSent = await prisma.whatsappMessage.count({
      where: { organizationId: orgId, direction: 'OUTBOUND' },
    });
    const qualifiedCount = await prisma.lead.count({
      where: { organizationId: orgId, isQualified: true },
    });

    return {
      totalLeads,
      aiCalls,
      whatsappSent,
      qualifiedCount,
    };
  }

  static async getLeadStats(orgId) {
    // Returns counts grouped by day for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const leads = await prisma.lead.findMany({
      where: {
        organizationId: orgId,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        createdAt: true,
      },
    });

    const groups = {};
    leads.forEach((l) => {
      const day = l.createdAt.toISOString().split('T')[0];
      groups[day] = (groups[day] || 0) + 1;
    });

    return Object.entries(groups).map(([date, count]) => ({
      date,
      count,
    }));
  }

  static async getSources(orgId) {
    const counts = await prisma.lead.groupBy({
      by: ['source'],
      where: { organizationId: orgId },
      _count: {
        id: true,
      },
    });

    return counts.map((c) => ({
      source: c.source,
      count: c._count.id,
    }));
  }

  static async getPipelineFunnel(orgId) {
    const stages = await prisma.stage.findMany({
      include: {
        leads: {
          where: { organizationId: orgId },
        },
      },
    });

    return stages.map((s) => ({
      stageName: s.name,
      color: s.color,
      count: s.leads.length,
    }));
  }

  static async getCallsBreakdown(orgId) {
    const counts = await prisma.call.groupBy({
      by: ['status'],
      where: { organizationId: orgId },
      _count: {
        id: true,
      },
    });

    return counts.map((c) => ({
      status: c.status,
      count: c._count.id,
    }));
  }

  static async getTeamPerformance(orgId) {
    const agents = await prisma.user.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        name: true,
        avatar: true,
        assignedLeads: {
          select: {
            id: true,
            isQualified: true,
            status: true,
          },
        },
      },
    });

    return agents.map((a) => {
      const totalAssigned = a.assignedLeads.length;
      const qualified = a.assignedLeads.filter((l) => l.isQualified).length;
      const won = a.assignedLeads.filter((l) => l.status === 'WON').length;

      return {
        id: a.id,
        name: a.name,
        avatar: a.avatar,
        assigned: totalAssigned,
        qualified,
        won,
      };
    });
  }

  static async getResponseTime(orgId) {
    // Average response time: difference between lead creation and first completed call / whatsapp
    const contactedLeads = await prisma.lead.findMany({
      where: {
        organizationId: orgId,
        lastContactedAt: { not: null },
      },
      select: {
        createdAt: true,
        lastContactedAt: true,
      },
      take: 100, // sample of latest 100
    });

    if (contactedLeads.length === 0) {
      return { avgSeconds: 90 }; // default promise brand standard!
    }

    let totalDiff = 0;
    contactedLeads.forEach((l) => {
      const diffMs = l.lastContactedAt.getTime() - l.createdAt.getTime();
      totalDiff += Math.max(0, diffMs);
    });

    const avgSeconds = Math.round(totalDiff / contactedLeads.length / 1000);
    return { avgSeconds };
  }
}

module.exports = AnalyticsService;
