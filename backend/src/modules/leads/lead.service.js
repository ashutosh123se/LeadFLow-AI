const { prisma } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const callQueue = require('../../queues/callQueue');
const { emitToOrg } = require('../../config/socket');
const logger = require('../../utils/logger');

// Utility to check if current time in IST is within calling hours
const isWithinCallingHours = (startStr, endStr) => {
  try {
    // Get current date/time in IST
    const nowUtc = new Date();
    // Offset for IST (UTC + 5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const nowIst = new Date(nowUtc.getTime() + istOffset);

    const currentHour = nowIst.getUTCHours();
    const currentMin = nowIst.getUTCMinutes();
    const currentTimeInMins = currentHour * 60 + currentMin;

    const [startHour, startMin] = startStr.split(':').map(Number);
    const [endHour, endMin] = endStr.split(':').map(Number);

    const startTimeInMins = startHour * 60 + startMin;
    const endTimeInMins = endHour * 60 + endMin;

    return currentTimeInMins >= startTimeInMins && currentTimeInMins <= endTimeInMins;
  } catch (error) {
    logger.error('Error parsing calling hours:', error);
    return true; // default safe fallback if parsing fails
  }
};

class LeadService {
  static async getAll(orgId, filters = {}, pagination = {}) {
    const { page = 1, limit = 10, skip = 0 } = pagination;
    const {
      status,
      source,
      scoreLabel,
      assignedToId,
      stageId,
      search,
      dateFrom,
      dateTo,
    } = filters;

    // Build Prisma query clauses
    const where = {
      organizationId: orgId,
    };

    if (status) where.status = status;
    if (source) where.source = source;
    if (scoreLabel) where.scoreLabel = scoreLabel;
    if (assignedToId) where.assignedToId = assignedToId === 'unassigned' ? null : assignedToId;
    if (stageId) where.stageId = stageId;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [total, data] = await prisma.$transaction([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          assignedTo: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          stage: {
            select: { id: true, name: true, color: true },
          },
        },
      }),
    ]);

    return { total, data };
  }

  static async getById(orgId, leadId) {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId: orgId },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        stage: {
          select: { id: true, name: true, color: true },
        },
        calls: {
          orderBy: { createdAt: 'desc' },
        },
        whatsappMessages: {
          orderBy: { sentAt: 'desc' },
        },
        notes: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!lead) {
      throw new ApiError(404, 'Lead not found.');
    }

    return lead;
  }

  static async create(orgId, data) {
    const { name, phone, email, whatsapp, company, source, sourceDetail, budget, timeline, requirement, location, decisionMaker, additionalNotes, priority, consentGiven } = data;

    // Check if phone already exists in organization
    const existing = await prisma.lead.findFirst({
      where: { phone, organizationId: orgId },
    });

    if (existing) {
      throw new ApiError(400, `Lead with phone number ${phone} already exists in your organization.`);
    }

    // Find default stage
    const defaultPipeline = await prisma.pipeline.findFirst({
      where: { organizationId: orgId, isDefault: true },
      include: { stages: { orderBy: { order: 'asc' } } },
    });

    const stageId = defaultPipeline?.stages?.[0]?.id || null;

    const lead = await prisma.lead.create({
      data: {
        organizationId: orgId,
        stageId,
        name,
        phone,
        email,
        whatsapp: whatsapp || phone,
        company,
        source: source || 'MANUAL',
        sourceDetail,
        budget,
        timeline,
        requirement,
        location,
        decisionMaker,
        additionalNotes,
        priority: priority || 'MEDIUM',
        consentGiven: consentGiven ?? true,
        consentAt: consentGiven ? new Date() : null,
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        organizationId: orgId,
        leadId: lead.id,
        type: 'system',
        description: `Lead created from source: ${lead.source}`,
      },
    });

    // Speed-to-Lead Call Trigger Flow Check
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (org && org.aiCallerEnabled && lead.consentGiven) {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const isIndianNumber = /^[6-9]\d{9}$/.test(cleanPhone.slice(-10));

      if (isIndianNumber) {
        if (org.aiCallsUsed < org.aiCallsLimit) {
          if (isWithinCallingHours(org.callingHoursStart, org.callingHoursEnd)) {
            // Queue outbound call with 10 second delay
            await callQueue.add(
              { leadId: lead.id, organizationId: orgId },
              { delay: 10000 } // 10 seconds
            );
            logger.info(`Speed-to-lead calling job enqueued for lead ${lead.id} in org ${orgId}`);

            await prisma.activity.create({
              data: {
                organizationId: orgId,
                leadId: lead.id,
                type: 'system',
                description: '90-Second AI speed-to-lead outbound call scheduled.',
              },
            });
          } else {
            logger.info(`Lead arrived outside calling hours (${org.callingHoursStart}-${org.callingHoursEnd}). Skipping call queue.`);
          }
        } else {
          logger.warn(`AI calls limit exceeded for organization ${org.name}. Call skipped.`);
        }
      }
    }

    emitToOrg(orgId, 'lead:created', { lead });
    return lead;
  }

  static async update(orgId, leadId, data) {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId: orgId },
    });

    if (!lead) {
      throw new ApiError(404, 'Lead not found.');
    }

    const updated = await prisma.lead.update({
      where: { id: leadId },
      data,
    });

    // Log update activity
    await prisma.activity.create({
      data: {
        organizationId: orgId,
        leadId,
        type: 'system',
        description: 'Lead information updated.',
        metadata: { changes: Object.keys(data) },
      },
    });

    emitToOrg(orgId, 'lead:updated', { leadId, changes: data });
    return updated;
  }

  static async delete(orgId, leadId) {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId: orgId },
    });

    if (!lead) {
      throw new ApiError(404, 'Lead not found.');
    }

    await prisma.lead.delete({
      where: { id: leadId },
    });

    return true;
  }

  static async importCSV(orgId, leadList) {
    let successCount = 0;
    const defaultPipeline = await prisma.pipeline.findFirst({
      where: { organizationId: orgId, isDefault: true },
      include: { stages: { orderBy: { order: 'asc' } } },
    });

    const stageId = defaultPipeline?.stages?.[0]?.id || null;

    for (const leadData of leadList) {
      try {
        const { name, phone, email, company, requirement, budget, location } = leadData;

        // Skip existing phones
        const existing = await prisma.lead.findFirst({
          where: { phone, organizationId: orgId },
        });

        if (existing) continue;

        await prisma.lead.create({
          data: {
            organizationId: orgId,
            stageId,
            name,
            phone,
            email,
            company,
            requirement,
            budget,
            location,
            source: 'CSV_IMPORT',
            consentGiven: true,
          },
        });
        successCount++;
      } catch (error) {
        logger.error(`Error importing CSV lead: ${error.message}`);
      }
    }

    return { imported: successCount };
  }

  static async assign(orgId, leadId, userId) {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId: orgId },
    });

    if (!lead) {
      throw new ApiError(404, 'Lead not found.');
    }

    let userName = 'Unassigned';
    if (userId) {
      const user = await prisma.user.findFirst({
        where: { id: userId, organizationId: orgId },
      });
      if (!user) throw new ApiError(404, 'Agent not found.');
      userName = user.name;
    }

    await prisma.lead.update({
      where: { id: leadId },
      data: { assignedToId: userId },
    });

    await prisma.activity.create({
      data: {
        organizationId: orgId,
        leadId,
        type: 'system',
        description: `Lead assigned to: ${userName}`,
      },
    });

    emitToOrg(orgId, 'notification:new', {
      title: 'Lead Assigned',
      message: `Lead "${lead.name}" has been assigned to you.`,
      type: 'assignment',
      leadId,
    });

    return true;
  }

  static async triggerCallManual(orgId, leadId) {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId: orgId },
    });

    if (!lead) {
      throw new ApiError(404, 'Lead not found.');
    }

    const org = await prisma.organization.findUnique({ where: { id: orgId } });

    if (org.aiCallsUsed >= org.aiCallsLimit) {
      throw new ApiError(402, `AI Call limit reached (${org.aiCallsUsed}/${org.aiCallsLimit}). Please upgrade your plan.`);
    }

    // Force call queue immediately, bypassing calling hours restriction due to manual trigger
    await callQueue.add({
      leadId,
      organizationId: orgId,
    });

    await prisma.activity.create({
      data: {
        organizationId: orgId,
        leadId,
        type: 'system',
        description: 'Manual outbound AI call triggered by agent.',
      },
    });

    return true;
  }

  static async addNote(orgId, leadId, content) {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId: orgId },
    });

    if (!lead) {
      throw new ApiError(404, 'Lead not found.');
    }

    const note = await prisma.note.create({
      data: {
        leadId,
        content,
      },
    });

    await prisma.activity.create({
      data: {
        organizationId: orgId,
        leadId,
        type: 'note',
        description: `Note added: "${content.substring(0, 30)}..."`,
      },
    });

    return note;
  }

  static async getTimeline(orgId, leadId) {
    const activities = await prisma.activity.findMany({
      where: { leadId, organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });

    return activities;
  }
}

module.exports = LeadService;
