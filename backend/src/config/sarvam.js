const { getEnv } = require('./env');

const sarvamConfig = {
  get apiKey() {
    if (process.env.NODE_ENV === 'production') {
      return getEnv('SARVAM_API_KEY', { required: true });
    }
    return process.env.SARVAM_API_KEY;
  },
  apiUrl: process.env.SARVAM_API_URL || 'https://api.sarvam.ai',
};

module.exports = sarvamConfig;
