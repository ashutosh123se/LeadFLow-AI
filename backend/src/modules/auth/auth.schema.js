const { z } = require('zod');

const registerSchema = {
  body: z.object({
    companyName: z.string().min(2, 'Company name must be at least 2 characters'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number (10 digits starting with 6-9)'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    industry: z.string().optional(),
    aiCallerLanguage: z.string().optional(),
    aiCallerVoice: z.string().optional(),
  }),
};

const loginSchema = {
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
    deviceName: z.string().optional(),
  }),
};

const verifyEmailSchema = {
  body: z.object({
    email: z.string().email('Invalid email address'),
    token: z.string().min(1, 'Verification token is required'),
  }),
};

const resendVerificationSchema = {
  body: z.object({
    email: z.string().email('Invalid email address'),
  }),
};

const forgotPasswordSchema = {
  body: z.object({
    email: z.string().email('Invalid email address'),
  }),
};

const resetPasswordSchema = {
  body: z.object({
    email: z.string().email('Invalid email address'),
    otp: z.string().length(6, 'OTP must be exactly 6 digits'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  }),
};

const inviteSchema = {
  body: z.object({
    email: z.string().email('Invalid email address'),
    role: z.enum(['ADMIN', 'MANAGER', 'AGENT', 'VIEWER']),
  }),
};

const acceptInviteSchema = {
  body: z.object({
    token: z.string().min(1, 'Invite token is required'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    phone: z.string().optional(),
  }),
};

module.exports = {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  inviteSchema,
  acceptInviteSchema,
};
