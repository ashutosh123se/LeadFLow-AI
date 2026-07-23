const { getEnv } = require('./env');

const openaiConfig = {
  get apiKey() {
    if (process.env.NODE_ENV === 'production') {
      return getEnv('OPENAI_API_KEY', { required: true });
    }
    return process.env.OPENAI_API_KEY;
  },
};

module.exports = openaiConfig;
