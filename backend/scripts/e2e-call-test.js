#!/usr/bin/env node
/**
 * End-to-end AI call pipeline smoke test.
 * Requires all real credentials in backend/.env and a reachable test lead phone.
 *
 * Usage:
 *   cd backend
 *   node scripts/e2e-call-test.js --lead-id=<uuid> --org-id=<uuid>
 */
require('dotenv').config();

const axios = require('axios');
const { validateStartup } = require('../src/config/env');

const args = Object.fromEntries(
  process.argv.slice(2)
    .filter((arg) => arg.startsWith('--'))
    .map((arg) => {
      const [key, value] = arg.replace(/^--/, '').split('=');
      return [key, value];
    })
);

async function main() {
  console.log('LeadFlow-AI — E2E call pipeline smoke test');
  console.log('==========================================');

  try {
    validateStartup();
    console.log('✓ Environment validation passed');
  } catch (error) {
    console.error('✗ Environment validation failed:', error.message);
    process.exit(1);
  }

  const required = [
    'EXOTEL_API_KEY',
    'EXOTEL_API_TOKEN',
    'EXOTEL_SUBDOMAIN',
    'EXOTEL_CALLER_ID',
    'EXOTEL_WEBHOOK_SECRET',
    'SARVAM_API_KEY',
    'DEEPGRAM_API_KEY',
    'OPENAI_API_KEY',
    'API_DOMAIN',
  ];

  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length) {
    console.error('✗ Missing credentials:', missing.join(', '));
    console.error('  Add them to backend/.env before running this test.');
    process.exit(1);
  }

  console.log('✓ All required call pipeline credentials are present');
  console.log('');
  console.log('Manual verification checklist:');
  console.log('  1. Ensure backend + Redis + workers are running (npm run dev + npm run worker)');
  console.log('  2. Exotel app callback URLs point to', process.env.API_DOMAIN);
  console.log('  3. Create a lead with consent + AI caller enabled');
  console.log('  4. Trigger POST /api/v1/leads/:id/call or website capture');
  console.log('  5. Confirm call status transitions and post-call score in dashboard');
  console.log('');
  console.log('Optional automated ping to OpenAI:');

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Reply with JSON: {"ok":true}' }],
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );
    const content = response.data?.choices?.[0]?.message?.content;
    console.log('✓ OpenAI API reachable:', content);
  } catch (error) {
    console.error('✗ OpenAI API check failed:', error.response?.data || error.message);
    process.exit(1);
  }

  if (args['lead-id']) {
    console.log('');
    console.log(`Lead ID provided: ${args['lead-id']}`);
    console.log('Queue a manual call via authenticated API or POST /api/v1/leads/:id/call');
  }

  console.log('');
  console.log('E2E smoke test completed — run a real call to validate Exotel → Sarvam → Deepgram → GPT-4o.');
}

main();
