const { getEnv } = require('./env');

const razorpayConfig = {
  get keyId() {
    if (process.env.BILLING_MOCK_MODE === 'true') {
      return process.env.RAZORPAY_KEY_ID;
    }
    return getEnv('RAZORPAY_KEY_ID', { required: process.env.NODE_ENV === 'production' });
  },
  get keySecret() {
    if (process.env.BILLING_MOCK_MODE === 'true') {
      return process.env.RAZORPAY_KEY_SECRET;
    }
    return getEnv('RAZORPAY_KEY_SECRET', { required: process.env.NODE_ENV === 'production' });
  },
  get webhookSecret() {
    if (process.env.BILLING_MOCK_MODE === 'true') {
      return process.env.RAZORPAY_WEBHOOK_SECRET;
    }
    return getEnv('RAZORPAY_WEBHOOK_SECRET', { required: process.env.NODE_ENV === 'production' });
  },
  isConfigured() {
    try {
      return Boolean(this.keyId && this.keySecret);
    } catch {
      return false;
    }
  },
  isMockMode() {
    return process.env.BILLING_MOCK_MODE === 'true';
  },
};

module.exports = razorpayConfig;
