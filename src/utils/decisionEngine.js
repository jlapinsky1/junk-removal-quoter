import { DECISION_RULES } from './decisionRules.js';

/**
 * Evaluate a quote/booking against all decision rules and produce
 * a Take / Review / Pass recommendation.
 *
 * @param {Object} context
 * @param {Object} context.estimate      - from buildEstimate()
 * @param {Object} context.confidence    - from calculateConfidence()
 * @param {Object} context.jobRating     - from rateJob()
 * @param {Array}  context.riskFlags     - from detectRiskFlags()
 * @param {Object} context.blockerOverrides - admin-overridden blockers
 * @param {Object|null} context.goalProgress  - from calculateGoalProgress()
 * @param {Object|null} context.goal          - active business_goals row
 * @param {Object|null} context.scheduleContext - { jobsToday, capacityLimit, nearbyJobs }
 * @returns {Decision}
 */
export function evaluateDecision(context) {
  const ruleResults = [];
  let hardFail = false;
  let hasGateReview = false;
  let compositeScore = 0.50; // neutral baseline

  for (const rule of DECISION_RULES) {
    const raw = rule.evaluate(context);
    const result = {
      ruleId: rule.id,
      ruleName: rule.name,
      type: rule.type,
      weight: rule.weight || 0,
      ...raw,
    };
    ruleResults.push(result);

    if (rule.type === 'hard' && result.result === 'fail') {
      hardFail = true;
    }

    if (rule.type === 'gate' && result.result === 'review') {
      hasGateReview = true;
    }

    if (rule.type === 'soft' && result.result !== 'skip') {
      const bonus = result.data?.bonus || 0;
      compositeScore += bonus;
    }
  }

  compositeScore = Math.max(0, Math.min(1, compositeScore));
  const score = Math.round(compositeScore * 100);

  // Determine recommendation
  let recommendation;
  let headline;

  if (hardFail) {
    recommendation = 'pass';
    const failedHard = ruleResults.filter(r => r.type === 'hard' && r.result === 'fail');
    headline = failedHard.map(r => r.message).join('; ');
  } else if (hasGateReview) {
    // Gate rules force Review regardless of score
    recommendation = 'review';
    const gateIssues = ruleResults.filter(r => r.type === 'gate' && r.result === 'review');
    headline = gateIssues.map(r => r.message).join('; ');
  } else if (score >= 65) {
    recommendation = 'take';
    headline = 'Strong job — fits goals and schedule';
  } else if (score >= 40) {
    recommendation = 'review';
    headline = 'Review carefully — mixed signals';
  } else {
    recommendation = 'pass';
    headline = 'Weak job — consider passing unless schedule is light';
  }

  // Contextual headline adjustments
  if (context.goalProgress?.paceStatus === 'behind' && recommendation === 'review' && !hardFail) {
    headline = 'Behind pace — review carefully, consider taking if profitable';
  }

  // Collect reasons by category
  const blockers = ruleResults
    .filter(r => r.result === 'fail')
    .map(r => r.message);
  const negativeFactors = ruleResults
    .filter(r => r.result === 'review' || (r.data?.bonus < 0 && r.result !== 'skip'))
    .map(r => r.message);
  const positiveFactors = ruleResults
    .filter(r => r.result === 'pass' && r.data?.bonus > 0)
    .map(r => r.message);
  const reasons = [...blockers, ...negativeFactors, ...positiveFactors].slice(0, 6);

  // Goal contribution
  let goalContribution = null;
  if (context.goalProgress && context.estimate) {
    const daily = context.goalProgress.requiredDailyProfit;
    const weekly = daily * 5;
    const profit = context.estimate.estimatedProfit || 0;
    goalContribution = {
      dailyPct: daily > 0 ? Math.round((profit / daily) * 100) : null,
      weeklyPct: weekly > 0 ? Math.round((profit / weekly) * 100) : null,
    };
  }

  // Suggested minimum acceptable price
  let suggestedMinPrice = null;
  let priceForTargetMargin = null;
  if (context.estimate) {
    const est = context.estimate;
    const directCosts = (est.disposalAllowance || 0)
      + (est.estimatedFuelCost || 0)
      + (est.laborAllowance || 0);
    const minMargin = context.goal?.minimum_margin ?? 0.55;
    if (minMargin < 1) {
      priceForTargetMargin = Math.round(directCosts / (1 - minMargin));
    }
    const minProfit = context.goal?.minimum_job_profit ?? 75;
    suggestedMinPrice = Math.max(
      directCosts + minProfit,
      priceForTargetMargin || 0
    );
    // Round to nearest $5
    suggestedMinPrice = Math.ceil(suggestedMinPrice / 5) * 5;
    if (priceForTargetMargin) priceForTargetMargin = Math.ceil(priceForTargetMargin / 5) * 5;
  }

  return {
    recommendation,
    score,
    headline,
    reasons,
    positiveFactors,
    negativeFactors,
    blockers,
    goalContribution,
    suggestedMinPrice,
    priceForTargetMargin,
    confidence: context.confidence?.score ?? null,
    ruleResults,
    goalContext: context.goalProgress ? {
      paceStatus: context.goalProgress.paceStatus,
      pctAchieved: context.goalProgress.pctAchieved,
      requiredDailyProfit: context.goalProgress.requiredDailyProfit,
    } : null,
    scheduleContext: context.scheduleContext || null,
    evaluatedAt: new Date().toISOString(),
  };
}

export const DECISION_COLORS = {
  take: 'bg-green-50 border-green-400 text-green-800',
  review: 'bg-amber-50 border-amber-400 text-amber-800',
  pass: 'bg-red-50 border-red-400 text-red-800',
};

export const DECISION_LABELS = {
  take: 'Take',
  review: 'Review',
  pass: 'Pass',
};
