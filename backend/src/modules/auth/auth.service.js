const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { prisma } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { generateAccessToken, generateRefreshToken } = require('../../utils/jwt');
const emailQueue = require('../../queues/emailQueue');
const logger = require('../../utils/logger');

// Lightweight in-memory cache fallback for OTPs/Invites if Redis is not populated in local dev
const tokenStore = new Map();

class AuthService {
  static async register(data) {
    const { companyName, name, email, phone, password, industry } = data;

    // Check if email already registered in organization context
    const existingUser = await prisma.user.findFirst({
      where: { email },
    });

    if (existingUser) {
      throw new ApiError(400, 'User with this email already exists.');
    }

    const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const existingOrg = await prisma.organization.findUnique({ where: { slug } });
    const finalSlug = existingOrg ? `${slug}-${crypto.randomBytes(2).toString('hex')}` : slug;

    // Create Organization, Owner User, Default Pipeline & Stages in transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Organization
      const organization = await tx.organization.create({
        data: {
          name: companyName,
          slug: finalSlug,
          industry,
          plan: 'STARTER',
          aiCallsLimit: 20,
          aiCallsUsed: 0,
        },
      });

      // 2. Hash Password
      const passwordHash = await bcrypt.hash(password, 12);

      // 3. Create User
      const user = await tx.user.create({
        data: {
          organizationId: organization.id,
          name,
          email,
          phone,
          passwordHash,
          role: 'OWNER',
        },
      });

      // 4. Create Default Pipeline
      const pipeline = await tx.pipeline.create({
        data: {
          organizationId: organization.id,
          name: 'Sales Funnel',
          isDefault: true,
        },
      });

      // 5. Create Default Stages
      const stages = [
        { name: 'New Lead', color: '#6366f1', order: 1 },
        { name: 'Contacted', color: '#3b82f6', order: 2 },
        { name: 'Qualified', color: '#10b981', order: 3 },
        { name: 'Closed', color: '#f59e0b', order: 4 },
      ];

      await Promise.all(
        stages.map((stage) =>
          tx.stage.create({
            data: {
              pipelineId: pipeline.id,
              name: stage.name,
              color: stage.color,
              order: stage.order,
            },
          })
        )
      );

      // 6. Create default Automations
      const automations = [
        {
          name: 'New Lead Speed-to-Lead Call',
          isActive: true,
          trigger: { type: 'new_lead_created' },
          steps: [
            { type: 'make_ai_call', delay: 10 },
            { type: 'wait', duration: 300 }, // 5 min
            { type: 'send_whatsapp', templateName: 'welcome_lead', fallback: true }
          ]
        },
        {
          name: 'Hot Lead Escalation',
          isActive: true,
          trigger: { type: 'score_updated', minScore: 80 },
          steps: [
            { type: 'assign_lead', role: 'MANAGER' },
            { type: 'notify_team', template: 'Urgent hot lead score reached!' }
          ]
        }
      ];

      await Promise.all(
        automations.map((auto) =>
          tx.automation.create({
            data: {
              organizationId: organization.id,
              name: auto.name,
              trigger: auto.trigger,
              steps: auto.steps,
              isActive: auto.isActive,
            },
          })
        )
      );

      return { organization, user };
    });

    // 7. Add Onboarding Welcome Email to queue
    await emailQueue.add({
      to: email,
      subject: `Welcome to LeadLFlowAI, ${name}!`,
      text: `Hello ${name},\n\nThank you for choosing LeadLFlowAI! Your account for ${companyName} has been created.\n\nEnjoy qualifying leads in 90 seconds!`,
      html: `<h3>Welcome to LeadLFlowAI!</h3><p>Hello ${name},</p><p>Thank you for choosing LeadLFlowAI! Your account for <strong>${companyName}</strong> has been successfully created.</p><p>Explore your dashboard, activate your AI caller, and start qualifying leads in 90 seconds!</p><p>Best regards,<br/>The LeadLFlowAI Team</p>`,
    });

    // 8. Generate Tokens
    const payload = { userId: result.user.id, organizationId: result.organization.id, role: result.user.role, name: result.user.name };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Save refresh token hash
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await prisma.user.update({
      where: { id: result.user.id },
      data: { refreshTokenHash, lastLoginAt: new Date() },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        organizationId: result.organization.id,
      },
    };
  }

  static async login(email, password) {
    const user = await prisma.user.findFirst({
      where: { email, isActive: true },
      include: { organization: true },
    });

    if (!user) {
      throw new ApiError(400, 'Invalid email or password.');
    }

    if (!user.organization || !user.organization.isActive) {
      throw new ApiError(403, 'Your organization is currently inactive.');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new ApiError(400, 'Invalid email or password.');
    }

    const payload = { userId: user.id, organizationId: user.organizationId, role: user.role, name: user.name };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash, lastLoginAt: new Date() },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      },
    };
  }

  static async logout(userId) {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
    return true;
  }

  static async refreshToken(token) {
    try {
      const decoded = verifyRefreshToken(token);
      if (!decoded) {
        throw new ApiError(401, 'Invalid refresh token.');
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user || !user.refreshTokenHash) {
        throw new ApiError(401, 'User or token not found.');
      }

      const isMatch = await bcrypt.compare(token, user.refreshTokenHash);
      if (!isMatch) {
        throw new ApiError(401, 'Invalid refresh token.');
      }

      const payload = { userId: user.id, organizationId: user.organizationId, role: user.role, name: user.name };
      const accessToken = generateAccessToken(payload);

      return { accessToken };
    } catch (error) {
      throw new ApiError(401, 'Token refresh failed.');
    }
  }

  static async forgotPassword(email) {
    const user = await prisma.user.findFirst({
      where: { email },
    });

    if (!user) {
      // Return true even if user does not exist to prevent enumeration attacks
      return true;
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 15 * 60 * 1000; // 15 mins

    tokenStore.set(`otp:${email}`, { otp, expiry });

    // Enqueue email
    await emailQueue.add({
      to: email,
      subject: 'Reset your LeadLFlowAI Password',
      text: `Your OTP for password reset is: ${otp}. It will expire in 15 minutes.`,
      html: `<h3>Password Reset Requested</h3><p>Your OTP for resetting password is: <strong>${otp}</strong>.</p><p>This OTP will expire in 15 minutes.</p>`,
    });

    logger.info(`OTP generated for ${email}: ${otp}`);
    return true;
  }

  static async resetPassword(email, otp, newPassword) {
    const cached = tokenStore.get(`otp:${email}`);

    if (!cached || cached.otp !== otp || cached.expiry < Date.now()) {
      throw new ApiError(400, 'Invalid or expired OTP.');
    }

    const user = await prisma.user.findFirst({
      where: { email },
    });

    if (!user) {
      throw new ApiError(404, 'User not found.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, refreshTokenHash: null }, // force logout on reset
    });

    tokenStore.delete(`otp:${email}`);
    return true;
  }

  static async inviteUser(orgId, inviterId, email, role) {
    // Check invite limit or if user already exists
    const existing = await prisma.user.findFirst({
      where: { email },
    });

    if (existing) {
      throw new ApiError(400, 'User is already registered in the system.');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    tokenStore.set(`invite:${token}`, { orgId, email, role, expiry });

    // Send email invitation
    const inviteUrl = `https://app.leadflowai.com/accept-invite?token=${token}`;
    await emailQueue.add({
      to: email,
      subject: 'Invitation to join LeadLFlowAI team',
      text: `You have been invited to join your team on LeadLFlowAI as a ${role}. Accept invitation: ${inviteUrl}`,
      html: `<h3>You're Invited!</h3><p>You have been invited to join your team on <strong>LeadLFlowAI</strong> as an <strong>${role}</strong>.</p><p><a href="${inviteUrl}" style="padding: 10px 15px; background: #6366f1; color: white; text-decoration: none; border-radius: 5px;">Accept Invitation</a></p>`,
    });

    logger.info(`Invitation generated for ${email} in org ${orgId}`);
    return true;
  }

  static async acceptInvite(token, name, password, phone) {
    const cached = tokenStore.get(`invite:${token}`);

    if (!cached || cached.expiry < Date.now()) {
      throw new ApiError(400, 'Invalid or expired invitation token.');
    }

    const { orgId, email, role } = cached;

    // Check once more
    const existing = await prisma.user.findFirst({
      where: { email },
    });

    if (existing) {
      throw new ApiError(400, 'User already exists.');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        organizationId: orgId,
        name,
        email,
        phone,
        passwordHash,
        role,
      },
    });

    tokenStore.delete(`invite:${token}`);
    return user;
  }
}

module.exports = AuthService;
