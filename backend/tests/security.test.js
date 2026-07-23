const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildUnscoredAnalysis,
  parseGptAnalysis,
  resolvePostCallAnalysis,
} = require('../src/utils/callScoring');
const { computeHmacSha256Hex, verifyHmacSha256 } = require('../src/utils/webhookSignature');

test('buildUnscoredAnalysis never fabricates HOT/WARM/COLD', () => {
  const result = buildUnscoredAnalysis('No transcript');
  assert.equal(result.scoreLabel, 'NEEDS_REVIEW');
  assert.equal(result.score, null);
  assert.equal(result.needsManualReview, true);
});

test('parseGptAnalysis accepts valid HOT score', () => {
  const result = parseGptAnalysis(JSON.stringify({
    score: 88,
    scoreLabel: 'HOT',
    scoreReason: 'Strong intent',
    summary: 'Ready to buy',
  }));
  assert.equal(result.scoreLabel, 'HOT');
  assert.equal(result.needsManualReview, false);
});

test('parseGptAnalysis rejects invalid AI payload', () => {
  const result = parseGptAnalysis('{}');
  assert.equal(result.scoreLabel, 'NEEDS_REVIEW');
});

test('resolvePostCallAnalysis skips OpenAI without transcript', async () => {
  const result = await resolvePostCallAnalysis({
    rawTranscript: '',
    openaiApiKey: 'sk-test',
    callOpenAi: async () => '{}',
  });
  assert.equal(result.scoreLabel, 'NEEDS_REVIEW');
});

test('webhook HMAC verification accepts valid signature', () => {
  const secret = 'test-secret-key-32-characters-min';
  const body = Buffer.from(JSON.stringify({ hello: 'world' }));
  const signature = computeHmacSha256Hex(body, secret);
  const req = {
    rawBody: body,
    headers: { 'x-leadflow-signature': signature },
    body: JSON.parse(body.toString()),
  };
  const result = verifyHmacSha256(req, secret);
  assert.equal(result.ok, true);
});

test('webhook HMAC verification rejects invalid signature', () => {
  const req = {
    rawBody: Buffer.from('{}'),
    headers: { 'x-leadflow-signature': 'deadbeef' },
    body: {},
  };
  const result = verifyHmacSha256(req, 'another-secret-key-value-here');
  assert.equal(result.ok, false);
});
