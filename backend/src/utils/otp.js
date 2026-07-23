const crypto = require('crypto');

/** Generate a cryptographically secure 6-digit OTP (same range as auth password reset). */
const generateOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

module.exports = { generateOtp };
