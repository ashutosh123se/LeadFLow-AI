const { z } = require('zod');

const updateProfileSchema = {
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    phone: z.string().optional(),
    avatar: z.string().url('Invalid avatar URL').optional().nullable(),
    password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  }),
};

const updateRoleSchema = {
  body: z.object({
    role: z.enum(['ADMIN', 'MANAGER', 'AGENT']),
  }),
};

module.exports = {
  updateProfileSchema,
  updateRoleSchema,
};
