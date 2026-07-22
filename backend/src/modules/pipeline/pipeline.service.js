const { prisma } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { emitToOrg } = require('../../config/socket');

class PipelineService {
  static async getPipelines(orgId) {
    const pipelines = await prisma.pipeline.findMany({
      where: { organizationId: orgId },
      include: {
        stages: { orderBy: { order: 'asc' } },
      },
    });
    return pipelines;
  }

  static async getKanbanBoard(orgId) {
    // Get the default pipeline for the organization
    const pipeline = await prisma.pipeline.findFirst({
      where: { organizationId: orgId, isDefault: true },
      include: {
        stages: {
          orderBy: { order: 'asc' },
          include: {
            leads: {
              where: { organizationId: orgId }, // CRITICAL tenant isolation
              include: {
                assignedTo: {
                  select: { id: true, name: true, avatar: true },
                },
              },
              orderBy: { updatedAt: 'desc' },
            },
          },
        },
      },
    });

    if (!pipeline) {
      throw new ApiError(404, 'Default pipeline not found.');
    }

    return pipeline.stages;
  }

  static async createStage(orgId, pipelineId, data) {
    const { name, color, order } = data;

    // Verify pipeline belongs to organization
    const pipeline = await prisma.pipeline.findFirst({
      where: { id: pipelineId, organizationId: orgId },
    });

    if (!pipeline) {
      throw new ApiError(404, 'Pipeline not found.');
    }

    const stage = await prisma.stage.create({
      data: {
        pipelineId,
        name,
        color: color || '#6366f1',
        order,
      },
    });

    return stage;
  }

  static async updateStage(orgId, stageId, data) {
    const { name, color, order } = data;

    // Find stage and verify ownership
    const stage = await prisma.stage.findUnique({
      where: { id: stageId },
      include: { pipeline: true },
    });

    if (!stage || stage.pipeline.organizationId !== orgId) {
      throw new ApiError(404, 'Stage not found.');
    }

    const updated = await prisma.stage.update({
      where: { id: stageId },
      data: {
        name,
        color,
        order,
      },
    });

    return updated;
  }

  static async deleteStage(orgId, stageId) {
    const stage = await prisma.stage.findUnique({
      where: { id: stageId },
      include: { pipeline: true },
    });

    if (!stage || stage.pipeline.organizationId !== orgId) {
      throw new ApiError(404, 'Stage not found.');
    }

    // Move any existing leads in this stage to the first stage of the pipeline
    const fallbackStage = await prisma.stage.findFirst({
      where: {
        pipelineId: stage.pipelineId,
        id: { not: stageId },
      },
      orderBy: { order: 'asc' },
    });

    if (fallbackStage) {
      await prisma.lead.updateMany({
        where: { stageId, organizationId: orgId },
        data: { stageId: fallbackStage.id },
      });
    }

    await prisma.stage.delete({
      where: { id: stageId },
    });

    return true;
  }

  static async moveLead(orgId, leadId, newStageId) {
    // Verify lead belongs to organization
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId: orgId },
    });

    if (!lead) {
      throw new ApiError(404, 'Lead not found.');
    }

    // Verify stage belongs to this organization
    const newStage = await prisma.stage.findUnique({
      where: { id: newStageId },
      include: { pipeline: true },
    });

    if (!newStage || newStage.pipeline.organizationId !== orgId) {
      throw new ApiError(400, 'Invalid pipeline stage.');
    }

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: { stageId: newStageId },
    });

    // Create activity log
    await prisma.activity.create({
      data: {
        organizationId: orgId,
        leadId,
        type: 'system',
        description: `Lead moved to stage: ${newStage.name}`,
      },
    });

    // Emit event
    emitToOrg(orgId, 'lead:updated', { leadId, changes: { stageId: newStageId } });

    return updatedLead;
  }
}

module.exports = PipelineService;
