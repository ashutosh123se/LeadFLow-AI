const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const hpp = require('hpp');
const xss = require('xss-clean');

const ApiError = require('./utils/ApiError');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

// Router imports
const authRoutes = require('./modules/auth/auth.routes');
const orgRoutes = require('./modules/organizations/org.routes');
const userRoutes = require('./modules/users/user.routes');
const leadRoutes = require('./modules/leads/lead.routes');
const pipelineRoutes = require('./modules/pipeline/pipeline.routes');
const callRoutes = require('./modules/calls/call.routes');
const whatsappRoutes = require('./modules/whatsapp/whatsapp.routes');
const automationRoutes = require('./modules/automation/automation.routes');
const analyticsRoutes = require('./modules/analytics/analytics.routes');
const billingRoutes = require('./modules/billing/billing.routes');
const integrationRoutes = require('./modules/integrations/integration.routes');

// Webhooks
const exotelWebhook = require('./modules/webhooks/exotel.webhook');
const whatsappWebhook = require('./modules/webhooks/whatsapp.webhook');
const razorpayWebhook = require('./modules/webhooks/razorpay.webhook');

// Public lead capture
const resolveTenant = require('./middleware/tenantResolver');
const LeadService = require('./modules/leads/lead.service');
const ApiResponse = require('./utils/ApiResponse');
const { captureLimiter } = require('./middleware/rateLimiter');

const app = express();

// Security Headers
app.use(helmet());
app.use(hpp());
app.use(xss());

// CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'https://app.leadflowai.com',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
);

// Save raw body for webhook verification checks
app.use(
  express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Healthcheck
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// 1. PUBLIC WEBHOOKS (Bypass auth, handle signature verification inside routers)
app.use('/api/v1/webhooks/exotel', exotelWebhook);
app.use('/api/v1/webhooks/whatsapp', whatsappWebhook);
app.use('/api/v1/webhooks/razorpay', razorpayWebhook);

// 2. EMBEDDABLE PUBLIC LEAD CAPTURE
app.post('/api/v1/capture/:orgToken', captureLimiter, resolveTenant, async (req, res, next) => {
  try {
    const { name, phone, email, requirement, budget, consentGiven } = req.body;

    if (!name || !phone) {
      throw new ApiError(400, 'Name and phone number are required.');
    }

    if (!consentGiven) {
      throw new ApiError(400, 'Consent must be given to receive calls.');
    }

    const lead = await LeadService.create(req.organizationId, {
      name,
      phone,
      email,
      requirement,
      budget,
      source: 'WEBSITE_FORM',
      consentGiven: true,
    });

    res.status(201).json(
      new ApiResponse(201, { leadId: lead.id }, 'Lead captured successfully. You will receive a call shortly.')
    );
  } catch (error) {
    next(error);
  }
});

// 3. SECURED PRIVATE MODULE ROUTES
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/organizations', orgRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/leads', leadRoutes);
app.use('/api/v1/pipeline', pipelineRoutes);
app.use('/api/v1/calls', callRoutes);
app.use('/api/v1/whatsapp', whatsappRoutes);
app.use('/api/v1/automation', automationRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/billing', billingRoutes);
app.use('/api/v1/integrations', integrationRoutes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
