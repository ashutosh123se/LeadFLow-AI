const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { prisma } = require('../../config/db');
const redisClient = require('../../config/redisClient');
const ApiError = require('../../utils/ApiError');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../../utils/jwt');
const emailQueue = require('../../queues/emailQueue');
const AuditService = require('../audit/audit.service');
const logger = require('../../utils/logger');

class AuthService {
  // ─────────────────────────────────────────────────────────────────────────
  // REGISTER — Creates org + owner + default pipeline + email verification
  // ─────────────────────────────────────────────────────────────────────────
  static async register(data, reqContext = {}) {
    const { companyName, name, email, phone, password, industry, aiCallerLanguage, aiCallerVoice } = data;

    // Check if email already registered
    const existingUser = await prisma.user.findFirst({
      where: { email },
    });

    if (existingUser) {
      throw new ApiError(400, 'User with this email already exists.');
    }

    const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const existingOrg = await prisma.organization.findUnique({ where: { slug } });
    const finalSlug = existingOrg ? `${slug}-${crypto.randomBytes(2).toString('hex')}` : slug;

    // Generate email verification token
    const emailVerifyToken = crypto.randomBytes(32).toString('hex');
    const emailVerifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Find the STARTER plan definition
    const starterPlan = await prisma.planDefinition.findUnique({ where: { slug: 'STARTER' } });

    // Create Organization, Owner User, Default Pipeline & Stages in transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Organization
      const organization = await tx.organization.create({
        data: {
          name: companyName,
          slug: finalSlug,
          industry,
          plan: 'STARTER',
          planDefinitionId: starterPlan?.id || null,
          aiCallsLimit: starterPlan?.maxAiCalls || 20,
          whatsappMsgLimit: starterPlan?.maxWhatsappMsg || 100,
          aiCallsUsed: 0,
          whatsappMsgUsed: 0,
          aiCallerLanguage: aiCallerLanguage || 'hindi',
          aiCallerVoice: aiCallerVoice || 'meera',
          onboardingStep: 0,
          onboardingComplete: false,
        },
      });

      // 2. Hash Password
      const passwordHash = await bcrypt.hash(password, 12);

      // 3. Create User (not verified yet)
      const user = await tx.user.create({
        data: {
          organizationId: organization.id,
          name,
          email,
          phone,
          passwordHash,
          role: 'OWNER',
          emailVerified: false,
          emailVerifyToken,
          emailVerifyExpiry,
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
            { type: 'wait', duration: 300 },
            { type: 'send_whatsapp', templateName: 'welcome_lead', fallback: true },
          ],
        },
        {
          name: 'Hot Lead Escalation',
          isActive: true,
          trigger: { type: 'score_updated', minScore: 80 },
          steps: [
            { type: 'assign_lead', role: 'MANAGER' },
            { type: 'notify_team', template: 'Urgent hot lead score reached!' },
          ],
        },
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

      // 7. Create default notification preferences for owner
      const defaultEvents = [
        'new_lead_assigned',
        'hot_lead_alert',
        'payment_failed',
        'subscription_renewing',
        'usage_limit_near',
        'employee_invited',
      ];

      await Promise.all(
        defaultEvents.map((event) =>
          tx.notificationPreference.create({
            data: {
              userId: user.id,
              event,
              emailEnabled: true,
              whatsappEnabled: false,
              inAppEnabled: true,
            },
          })
        )
      );

      return { organization, user };
    });

    // 8. Send verification email
    const verifyUrl = `${process.env.CLIENT_URL || 'https://app.leadflowai.com'}/verify-email?token=${emailVerifyToken}&email=${encodeURIComponent(email)}`;
    await emailQueue.add({
      to: email,
      subject: `Verify your email — LeadFlow-AI`,
      text: `Hello ${name},\n\nPlease verify your email address by clicking this link: ${verifyUrl}\n\nThis link expires in 24 hours.\n\nBest regards,\nThe LeadFlow-AI Team`,
      html: `<h3>Welcome to LeadFlow-AI!</h3>
        <p>Hello ${name},</p>
        <p>Thank you for signing up! Please verify your email address to activate your account:</p>
        <p><a href="${verifyUrl}" style="padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Verify Email Address</a></p>
        <p style="color: #666; font-size: 14px;">This link expires in 24 hours.</p>
        <p>Best regards,<br/>The LeadFlow-AI Team</p>`,
    });

    // 9. Generate tokens (user can login but will see "verify email" prompt)
    const payload = {
      userId: result.user.id,
      organizationId: result.organization.id,
      role: result.user.role,
      name: result.user.name,
    };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Save refresh token hash
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await prisma.user.update({
      where: { id: result.user.id },
      data: { refreshTokenHash, lastLoginAt: new Date() },
    });

    // 10. Audit log
    await AuditService.log({
      organizationId: result.organization.id,
      userId: result.user.id,
      userEmail: email,
      action: 'auth.register',
      entityType: 'Organization',
      entityId: result.organization.id,
      details: { companyName, plan: 'STARTER' },
      ...reqContext,
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
        emailVerified: false,
      },
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug,
        onboardingComplete: false,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VERIFY EMAIL
  // ─────────────────────────────────────────────────────────────────────────
  static async verifyEmail(email, token) {
    const user = await prisma.user.findFirst({
      where: { email, emailVerifyToken: token },
    });

    if (!user) {
      throw new ApiError(400, 'Invalid verification token.');
    }

    if (user.emailVerified) {
      return { alreadyVerified: true };
    }

    if (user.emailVerifyExpiry && new Date() > user.emailVerifyExpiry) {
      throw new ApiError(400, 'Verification link has expired. Please request a new one.');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpiry: null,
      },
    });

    await AuditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      userEmail: email,
      action: 'auth.email_verified',
      entityType: 'User',
      entityId: user.id,
    });

    return { alreadyVerified: false };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RESEND VERIFICATION EMAIL
  // ─────────────────────────────────────────────────────────────────────────
  static async resendVerification(email) {
    const user = await prisma.user.findFirst({ where: { email } });

    if (!user) {
      return true; // Don't reveal whether email exists
    }

    if (user.emailVerified) {
      throw new ApiError(400, 'Email is already verified.');
    }

    const emailVerifyToken = crypto.randomBytes(32).toString('hex');
    const emailVerifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifyToken, emailVerifyExpiry },
    });

    const verifyUrl = `${process.env.CLIENT_URL || 'https://app.leadflowai.com'}/verify-email?token=${emailVerifyToken}&email=${encodeURIComponent(email)}`;
    await emailQueue.add({
      to: email,
      subject: `Verify your email — LeadFlow-AI`,
      text: `Hello ${user.name},\n\nPlease verify your email: ${verifyUrl}\n\nThis link expires in 24 hours.`,
      html: `<h3>Email Verification</h3>
        <p>Hello ${user.name},</p>
        <p><a href="${verifyUrl}" style="padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Verify Email Address</a></p>
        <p style="color: #666; font-size: 14px;">This link expires in 24 hours.</p>`,
    });

    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LOGIN — with email verification check + session creation
  // ─────────────────────────────────────────────────────────────────────────
  static async login(email, password, reqContext = {}) {
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

    // Check if organization is suspended
    if (user.organization.suspendedAt) {
      throw new ApiError(403, `Your organization has been suspended. Reason: ${user.organization.suspendedReason || 'Contact support.'}`);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new ApiError(400, 'Invalid email or password.');
    }

    // Check email verification (allow login but flag it)
    const emailVerified = user.emailVerified;

    const payload = {
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
      name: user.name,
    };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    // Create session record
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        deviceName: reqContext.deviceName || parseDeviceName(reqContext.userAgent),
        ipAddress: reqContext.ipAddress || null,
        userAgent: reqContext.userAgent || null,
        isActive: true,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash, lastLoginAt: new Date() },
    });

    // Audit
    await AuditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      userEmail: email,
      action: 'auth.login',
      entityType: 'User',
      entityId: user.id,
      details: { sessionId: session.id },
      ipAddress: reqContext.ipAddress,
      userAgent: reqContext.userAgent,
    });

    return {
      accessToken,
      refreshToken,
      sessionId: session.id,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        emailVerified,
        is2FAEnabled: user.is2FAEnabled,
      },
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        slug: user.organization.slug,
        plan: user.organization.plan,
        onboardingComplete: user.organization.onboardingComplete,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LOGOUT — invalidate session + refresh token
  // ─────────────────────────────────────────────────────────────────────────
  static async logout(userId, sessionId = null) {
    // Invalidate the specific session if provided
    if (sessionId) {
      await prisma.session.updateMany({
        where: { id: sessionId, userId },
        data: { isActive: false },
      });
    }

    // Clear refresh token
    await prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });

    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // REFRESH TOKEN — with rotation (issue new refresh token each time)
  // ─────────────────────────────────────────────────────────────────────────
  static async refreshToken(token) {
    const decoded = verifyRefreshToken(token);
    if (!decoded) {
      throw new ApiError(401, 'Invalid refresh token.');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || !user.refreshTokenHash || !user.isActive) {
      throw new ApiError(401, 'User or token not found.');
    }

    const isMatch = await bcrypt.compare(token, user.refreshTokenHash);
    if (!isMatch) {
      // Possible token reuse attack — invalidate all sessions
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshTokenHash: null },
      });
      await prisma.session.updateMany({
        where: { userId: user.id },
        data: { isActive: false },
      });
      logger.warn(`Potential token reuse detected for user ${user.id}. All sessions invalidated.`);
      throw new ApiError(401, 'Invalid refresh token. All sessions have been invalidated for security.');
    }

    const payload = {
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
      name: user.name,
    };

    // Rotate: issue new access + refresh tokens
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);
    const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: newRefreshTokenHash },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SESSION MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────
  static async getSessions(userId) {
    const sessions = await prisma.session.findMany({
      where: { userId, isActive: true, expiresAt: { gt: new Date() } },
      orderBy: { lastActive: 'desc' },
      select: {
        id: true,
        deviceName: true,
        ipAddress: true,
        lastActive: true,
        createdAt: true,
        expiresAt: true,
      },
    });
    return sessions;
  }

  static async revokeSession(userId, sessionId) {
    const session = await prisma.session.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new ApiError(404, 'Session not found.');
    }

    await prisma.session.update({
      where: { id: sessionId },
      data: { isActive: false },
    });

    return true;
  }

  static async revokeAllSessions(userId, exceptSessionId = null) {
    const where = { userId, isActive: true };
    if (exceptSessionId) {
      where.id = { not: exceptSessionId };
    }

    await prisma.session.updateMany({
      where,
      data: { isActive: false },
    });

    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FORGOT PASSWORD — OTP via Redis (no more in-memory Map)
  // ─────────────────────────────────────────────────────────────────────────
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

    // Store in Redis with 15 minute TTL
    try {
      await redisClient.set(`otp:${email}`, JSON.stringify({ otp }), { EX: 900 });
    } catch (err) {
      logger.error('Redis set failed for OTP, falling back to short-lived approach:', err.message);
      // If Redis is down, we can't securely store the OTP — throw error
      throw new ApiError(500, 'Unable to process password reset at this time. Please try again.');
    }

    // Enqueue email
    await emailQueue.add({
      to: email,
      subject: 'Reset your LeadFlow-AI Password',
      text: `Your OTP for password reset is: ${otp}. It will expire in 15 minutes.`,
      html: `<h3>Password Reset Requested</h3>
        <p>Your OTP for resetting your password is: <strong style="font-size: 24px; letter-spacing: 4px;">${otp}</strong></p>
        <p style="color: #666;">This OTP will expire in 15 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>`,
    });

    logger.info(`Password reset OTP sent for ${email}`);
    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RESET PASSWORD — verify OTP from Redis
  // ─────────────────────────────────────────────────────────────────────────
  static async resetPassword(email, otp, newPassword) {
    let cached;
    try {
      const raw = await redisClient.get(`otp:${email}`);
      cached = raw ? JSON.parse(raw) : null;
    } catch (err) {
      logger.error('Redis get failed for OTP verification:', err.message);
      throw new ApiError(500, 'Unable to verify OTP at this time.');
    }

    if (!cached || cached.otp !== otp) {
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
      data: { passwordHash, refreshTokenHash: null },
    });

    // Invalidate all sessions on password reset
    await prisma.session.updateMany({
      where: { userId: user.id },
      data: { isActive: false },
    });

    // Clean up OTP from Redis
    try {
      await redisClient.del(`otp:${email}`);
    } catch (err) {
      // Non-critical
    }

    await AuditService.log({
      organizationId: user.organizationId,
      userId: user.id,
      userEmail: email,
      action: 'auth.password_reset',
      entityType: 'User',
      entityId: user.id,
    });

    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INVITE USER — token stored in Redis (24hr TTL)
  // ─────────────────────────────────────────────────────────────────────────
  static async inviteUser(orgId, inviterId, email, role, reqContext = {}) {
    // Check if user already exists in this organization
    const existing = await prisma.user.findFirst({
      where: { email, organizationId: orgId },
    });

    if (existing) {
      throw new ApiError(400, 'User is already a member of this organization.');
    }

    // Check employee seat limit against plan
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { planDefinition: true },
    });

    if (org?.planDefinition) {
      const currentUserCount = await prisma.user.count({
        where: { organizationId: orgId, isActive: true },
      });
      if (currentUserCount >= org.planDefinition.maxEmployees) {
        throw new ApiError(402, `Your ${org.planDefinition.name} allows up to ${org.planDefinition.maxEmployees} team members. Please upgrade to add more.`);
      }
    }

    const token = crypto.randomBytes(32).toString('hex');

    // Store in Redis with 24-hour TTL
    try {
      await redisClient.set(
        `invite:${token}`,
        JSON.stringify({ orgId, email, role, inviterId }),
        { EX: 86400 } // 24 hours
      );
    } catch (err) {
      logger.error('Redis set failed for invite token:', err.message);
      throw new ApiError(500, 'Unable to send invitation at this time.');
    }

    // Send email invitation
    const inviteUrl = `${process.env.CLIENT_URL || 'https://app.leadflowai.com'}/accept-invite?token=${token}`;
    await emailQueue.add({
      to: email,
      subject: `You're invited to join ${org?.name || 'a team'} on LeadFlow-AI`,
      text: `You have been invited to join your team on LeadFlow-AI as a ${role}. Accept invitation: ${inviteUrl}`,
      html: `<h3>You're Invited!</h3>
        <p>You have been invited to join <strong>${org?.name || 'your team'}</strong> on LeadFlow-AI as a <strong>${role}</strong>.</p>
        <p><a href="${inviteUrl}" style="padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Accept Invitation</a></p>
        <p style="color: #666; font-size: 14px;">This invitation expires in 24 hours.</p>`,
    });

    await AuditService.log({
      organizationId: orgId,
      userId: inviterId,
      action: 'auth.invite_sent',
      entityType: 'User',
      details: { invitedEmail: email, role },
      ...reqContext,
    });

    logger.info(`Invitation sent for ${email} in org ${orgId}`);
    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ACCEPT INVITE — token from Redis
  // ─────────────────────────────────────────────────────────────────────────
  static async acceptInvite(token, name, password, phone) {
    let cached;
    try {
      const raw = await redisClient.get(`invite:${token}`);
      cached = raw ? JSON.parse(raw) : null;
    } catch (err) {
      logger.error('Redis get failed for invite token:', err.message);
      throw new ApiError(500, 'Unable to process invitation at this time.');
    }

    if (!cached) {
      throw new ApiError(400, 'Invalid or expired invitation token.');
    }

    const { orgId, email, role } = cached;

    // Check if user already exists in this org
    const existing = await prisma.user.findFirst({
      where: { email, organizationId: orgId },
    });

    if (existing) {
      throw new ApiError(400, 'User already exists in this organization.');
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
        emailVerified: true, // Invited users have verified email by virtue of receiving the invite
      },
    });

    // Create default notification preferences
    const defaultEvents = ['new_lead_assigned', 'hot_lead_alert'];
    await Promise.all(
      defaultEvents.map((event) =>
        prisma.notificationPreference.create({
          data: { userId: user.id, event, emailEnabled: true, inAppEnabled: true },
        })
      )
    );

    // Clean up invite token from Redis
    try {
      await redisClient.del(`invite:${token}`);
    } catch (err) {
      // Non-critical
    }

    await AuditService.log({
      organizationId: orgId,
      userId: user.id,
      userEmail: email,
      action: 'auth.invite_accepted',
      entityType: 'User',
      entityId: user.id,
      details: { role },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────
function parseDeviceName(userAgent) {
  if (!userAgent) return 'Unknown Device';

  let browser = 'Unknown Browser';
  let os = 'Unknown OS';

  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
  else if (userAgent.includes('Edg')) browser = 'Edge';

  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';

  return `${browser} on ${os}`;
}

module.exports = AuthService;
