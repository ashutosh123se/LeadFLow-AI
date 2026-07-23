const crypto = require('crypto');

const getRawBody = (req) => {
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody;
  if (typeof req.rawBody === 'string') return Buffer.from(req.rawBody);
  return Buffer.from(JSON.stringify(req.body || {}));
};

const computeHmacSha256Hex = (payload, secret) =>
  crypto.createHmac('sha256', secret).update(payload).digest('hex');

const verifyHmacSha256 = (req, secret, signatureHeaderName = 'x-leadflow-signature') => {
  if (!secret) {
    return { ok: false, status: 500, message: 'Webhook secret is not configured on the server.' };
  }

  const headerValue =
    req.headers[signatureHeaderName] ||
    req.headers[signatureHeaderName.toLowerCase()] ||
    req.query.signature;

  if (!headerValue) {
    return { ok: false, status: 401, message: 'Webhook signature header is missing.' };
  }

  const provided = String(headerValue).replace(/^sha256=/i, '').trim();
  const expected = computeHmacSha256Hex(getRawBody(req), secret);

  try {
    const providedBuf = Buffer.from(provided, 'hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    if (providedBuf.length !== expectedBuf.length) {
      return { ok: false, status: 401, message: 'Webhook signature verification failed.' };
    }
    const ok = crypto.timingSafeEqual(providedBuf, expectedBuf);
    return ok
      ? { ok: true }
      : { ok: false, status: 401, message: 'Webhook signature verification failed.' };
  } catch {
    return { ok: false, status: 401, message: 'Webhook signature verification failed.' };
  }
};

const signPayload = (payload, secret) => computeHmacSha256Hex(payload, secret);

module.exports = {
  getRawBody,
  computeHmacSha256Hex,
  verifyHmacSha256,
  signPayload,
};
