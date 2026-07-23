/**
 * Central environment validation — no placeholder fallbacks.
 * Production refuses to start if required secrets are missing.
 * Set BILLING_MOCK_MODE=true only for explicit local billing sandbox tests.
 */

const PLACEHOLDER_FRAGMENTS = [
  'placeholder',
  'your-sarvam-key',
  'your-custom-verify-token',
  'your-default-whatsapp-phone-id',
  'jwt-access-secret-default',
  'jwt-refresh-secret-default',
  'rzp_test_placeholder',
  'rzp_secret_placeholder',
  'rzp_webhook_secret_placeholder',
  'change-me',
  'changeme',
];

const isPlaceholder = (value) => {
  if (!value || typeof value !== 'string') return true;
  const lower = value.trim().toLowerCase();
  if (lower.length < 16 && (lower.includes('secret') || lower.includes('token'))) return true;
  return PLACEHOLDER_FRAGMENTS.some((frag) => lower.includes(frag));
};

const getEnv = (name, { required = false, allowPlaceholder = false } = {}) => {
  const value = process.env[name]?.trim();
  if (!value) {
    if (required) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return undefined;
  }
  if (!allowPlaceholder && isPlaceholder(value)) {
    throw new Error(`Environment variable ${name} appears to be a placeholder. Set a real value.`);
  }
  return value;
};

const validateStartup = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const billingMock = process.env.BILLING_MOCK_MODE === 'true';

  const alwaysRequired = [
    'DATABASE_URL',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
  ];

  alwaysRequired.forEach((key) => getEnv(key, { required: true }));

  if (isProduction) {
    const productionRequired = [
      'CLIENT_URL',
      'API_DOMAIN',
      'WHATSAPP_TOKEN',
      'WHATSAPP_PHONE_NUMBER_ID',
      'WHATSAPP_APP_SECRET',
      'WHATSAPP_VERIFY_TOKEN',
      'EXOTEL_API_KEY',
      'EXOTEL_API_TOKEN',
      'EXOTEL_SUBDOMAIN',
      'EXOTEL_CALLER_ID',
      'EXOTEL_WEBHOOK_SECRET',
      'SARVAM_API_KEY',
      'DEEPGRAM_API_KEY',
      'OPENAI_API_KEY',
      'SENDGRID_API_KEY',
      'FROM_EMAIL',
      'REDIS_URL',
    ];

    if (!billingMock) {
      productionRequired.push(
        'RAZORPAY_KEY_ID',
        'RAZORPAY_KEY_SECRET',
        'RAZORPAY_WEBHOOK_SECRET'
      );
    }

    productionRequired.forEach((key) => getEnv(key, { required: true }));
  }

  if (isProduction && billingMock) {
    // eslint-disable-next-line no-console
    console.warn('[env] BILLING_MOCK_MODE=true in production — Razorpay billing is disabled.');
  }

  return {
    isProduction,
    billingMock,
  };
};

module.exports = {
  getEnv,
  validateStartup,
  isPlaceholder,
};
