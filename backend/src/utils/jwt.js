const jwt = require('jsonwebtoken');
const {
  jwtAccessSecret,
  jwtRefreshSecret,
  jwtAccessExpiresIn,
  jwtRefreshExpiresIn,
} = require('../config/secrets');

const generateAccessToken = (payload) =>
  jwt.sign(payload, jwtAccessSecret(), { expiresIn: jwtAccessExpiresIn() });

const generateRefreshToken = (payload) =>
  jwt.sign(payload, jwtRefreshSecret(), { expiresIn: jwtRefreshExpiresIn() });

const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, jwtAccessSecret());
  } catch {
    return null;
  }
};

const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, jwtRefreshSecret());
  } catch {
    return null;
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
