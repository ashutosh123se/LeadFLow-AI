/**
 * Post-call analysis resolution — no fabricated transcripts or default WARM scores.
 */

const buildUnscoredAnalysis = (reason) => ({
  budget: null,
  timeline: null,
  requirement: null,
  location: null,
  decisionMaker: null,
  score: null,
  scoreLabel: 'NEEDS_REVIEW',
  scoreReason: reason,
  summary: 'Call completed but could not be scored automatically.',
  needsManualReview: true,
});

const parseGptAnalysis = (rawContent) => {
  const parsed = JSON.parse(rawContent || '{}');
  if (!parsed.scoreLabel || parsed.score == null) {
    return buildUnscoredAnalysis('AI response did not include a valid score.');
  }
  if (!['HOT', 'WARM', 'COLD'].includes(parsed.scoreLabel)) {
    return buildUnscoredAnalysis(`AI returned invalid score label: ${parsed.scoreLabel}`);
  }
  return {
    budget: parsed.budget ?? null,
    timeline: parsed.timeline ?? null,
    requirement: parsed.requirement ?? null,
    location: parsed.location ?? null,
    decisionMaker: parsed.decisionMaker ?? null,
    score: parsed.score,
    scoreLabel: parsed.scoreLabel,
    scoreReason: parsed.scoreReason || 'Scored by GPT-4o qualification analysis.',
    summary: parsed.summary || 'Voice qualifier call completed.',
    needsManualReview: false,
  };
};

const resolvePostCallAnalysis = async ({ rawTranscript, openaiApiKey, callOpenAi }) => {
  if (!rawTranscript || !rawTranscript.trim()) {
    return buildUnscoredAnalysis('No transcript available for scoring.');
  }

  if (!openaiApiKey) {
    return buildUnscoredAnalysis('OpenAI API key is not configured.');
  }

  try {
    const content = await callOpenAi(rawTranscript);
    return parseGptAnalysis(content);
  } catch (error) {
    return buildUnscoredAnalysis(`OpenAI scoring failed: ${error.message}`);
  }
};

module.exports = {
  buildUnscoredAnalysis,
  parseGptAnalysis,
  resolvePostCallAnalysis,
};
