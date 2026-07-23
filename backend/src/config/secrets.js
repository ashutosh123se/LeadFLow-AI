const { getEnv } = require('./env');

const jwtAccessSecret = () => getEnv('JWT_ACCESS_SECRET', { required: true });
const jwtRefreshSecret = () => getEnv('JWT_REFRESH_SECRET', { required: true });

module.exports = {
  jwtAccessSecret,
  jwtRefreshSecret,
  jwtAccessExpiresIn: () => process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: () => process.env.JWT_REFRESH_EXPIRES_IN || '7d',
};
