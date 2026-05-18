const { z } = require('zod');

const createLeadSchema = {
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number (10 digits starting with 6-9)'),
    email: z.string().email('Invalid email address').optional().nullable(),
    whatsapp: z.string().optional().nullable(),
    company: z.string().optional().nullable(),
    source: z.enum([
      'MANUAL',
      'WHATSAPP',
      'WEBSITE_FORM',
      'FACEBOOK_AD',
      'INDIAMART',
      'JUSTDIAL',
      'GOOGLE_AD',
      'REFERRAL',
      'CSV_IMPORT',
      'API',
    ]).optional(),
    sourceDetail: z.string().optional().nullable(),
    budget: z.string().optional().nullable(),
    timeline: z.string().optional().nullable(),
    requirement: z.string().optional().nullable(),
    location: z.string().optional().nullable(),
    decisionMaker: z.boolean().optional().nullable(),
    additionalNotes: z.string().optional().nullable(),
    priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
    consentGiven: z.boolean().default(true),
  }),
};

const updateLeadSchema = {
  body: createLeadSchema.body.partial(),
};

const assignLeadSchema = {
  body: z.object({
    userId: z.string().uuid('Invalid user ID').nullable(),
  }),
};

const createNoteSchema = {
  body: z.object({
    content: z.string().min(1, 'Note content cannot be empty'),
  }),
};

module.exports = {
  createLeadSchema,
  updateLeadSchema,
  assignLeadSchema,
  createNoteSchema,
};
