const razorpayConfig = {
  keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  keySecret: process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_placeholder',
  webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_webhook_secret_placeholder',
};

module.exports = razorpayConfig;
