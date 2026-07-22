const { prisma } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const OrgService = require('../organizations/org.service');

class PlatformService {
  static async getStats() {
    const orgs = await prisma.organization.findMany({
      where: { deletedAt: null, slug: { not: 'leadflow-platform' } },
      select: {
        id: true,
        isActive: true,
        suspendedAt: true,
        aiCallsUsed: true,
        _count: { select: { users: true, leads: true } },
      },
    });

    return {
      totalOrgs: orgs.length,
      activeOrgs: orgs.filter((o) => o.isActive && !o.suspendedAt).length,
      trialOrgs: 0,
      suspendedOrgs: orgs.filter((o) => o.suspendedAt).length,
      totalUsers: orgs.reduce((sum, o) => sum + o._count.users, 0),
      totalLeads: orgs.reduce((sum, o) => sum + o._count.leads, 0),
      totalAiCalls: orgs.reduce((sum, o) => sum + o.aiCallsUsed, 0),
    };
  }

  static async listOrganizations() {
    const orgs = await prisma.organization.findMany({
      where: { deletedAt: null, slug: { not: 'leadflow-platform' } },
      include: {
        planDefinition: { select: { slug: true, name: true } },
        users: {
          where: { role: 'OWNER' },
          select: { email: true },
          take: 1,
        },
        _count: { select: { users: true, leads: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orgs.map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.planDefinition?.slug || org.plan,
      users: org._count.users,
      leads: org._count.leads,
      aiCallsUsed: org.aiCallsUsed,
      aiCallsLimit: org.aiCallsLimit,
      status: org.suspendedAt ? 'suspended' : org.isActive ? 'active' : 'inactive',
      suspendedReason: org.suspendedReason,
      createdAt: org.createdAt,
      ownerEmail: org.users[0]?.email || null,
    }));
  }

  static async suspendOrganization(orgId, reason, reqContext) {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new ApiError(404, 'Organization not found.');
    if (org.slug === 'leadflow-platform') {
      throw new ApiError(403, 'Cannot suspend the platform organization.');
    }
    return OrgService.suspendOrg(orgId, reason, reqContext);
  }

  static async reactivateOrganization(orgId, reqContext) {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new ApiError(404, 'Organization not found.');
    return OrgService.reactivateOrg(orgId, reqContext);
  }
}

module.exports = PlatformService;
