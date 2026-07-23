const { getEnv } = require('./env');

const deepgramConfig = {
  get apiKey() {
    if (process.env.NODE_ENV === 'production') {
      return getEnv('DEEPGRAM_API_KEY', { required: true });
    }
    return process.env.DEEPGRAM_API_KEY;
  },
};

module.exports = deepgramConfig;
