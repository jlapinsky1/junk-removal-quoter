import React, { useState } from 'react';
import { ChevronDown, Target, TrendingUp } from 'lucide-react';
import { DECISION_LABELS } from '../utils/decisionEngine';
import { RATING_LABELS } from '../utils/jobRating';
import { PACE_STATUS_LABELS } from '../utils/goalDefaults';

const DECISION_STYLES = {
  take: 'bg-green-500/15 border-green-500/40 text-green-300',
  review: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
  pass: 'bg-red-500/15 border-red-500/40 text-red-300',
};

const RATING_STYLES = {
  excellent: 'bg-green-500/12 border-green-500/30 text-green-200',
  good: 'bg-blue-500/12 border-blue-500/30 text-blue-200',
  marginal: 'bg-yellow-500/12 border-yellow-500/30 text-yellow-200',
  poor: 'bg-red-500/12 border-red-500/30 text-red-200',
};

const PACE_STYLES = {
  achieved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  ahead: 'bg-green-500/15 text-green-300 border-green-500/30',
  on_pace: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  at_risk: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  behind: 'bg-red-500/15 text-red-300 border-red-500/30',
};

const CONFIDENCE_STYLES = {
  high: 'text-green-300 bg-green-500/15',
  medium: 'text-amber-300 bg-amber-500/15',
  low: 'text-red-300 bg-red-500/15',
};

const SEVERITY_STYLES = {
  blocker: 'bg-red-500/10 border-red-500/25 text-red-300',
  warning: 'bg-amber-500/10 border-amber-500/25 text-amber-300',
  info: 'bg-white/5 border-white/10 text-white/60',
};

function fmtCurrency(n) {
  return '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function MetricRow({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-white/50">{label}</span>
      <span className="text-white/85 font-medium">{value}</span>
    </div>
  );
}

function GoalContextBar({ goal, goalProgress, weekProgress, dynamicTargets }) {
  if (!goalProgress) return null;

  return (
    <div className="bg-white/4 border border-white/8 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-[#22c55e]" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Sales Targets</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${PACE_STYLES[goalProgress.paceStatus] || PACE_STYLES.on_pace}`}>
          {PACE_STATUS_LABELS[goalProgress.paceStatus] || goalProgress.paceStatus}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-white/40 mb-0.5">Period target</p>
          <p className="text-white font-semibold">{fmtCurrency(goal?.target_amount)}</p>
          <p className="text-white/35 mt-0.5">{goalProgress.pctAchieved?.toFixed(0)}% achieved</p>
        </div>
        <div>
          <p className="text-white/40 mb-0.5">Need today</p>
          <p className="text-white font-semibold">{fmtCurrency(goalProgress.requiredDailyProfit)}</p>
          {dynamicTargets && (
            <p className="text-white/35 mt-0.5">
              {dynamicTargets.openSlots} open slot{dynamicTargets.openSlots !== 1 ? 's' : ''} · {fmtCurrency(dynamicTargets.suggestedPerSlot)}/slot
            </p>
          )}
        </div>
        {weekProgress && (
          <>
            <div>
              <p className="text-white/40 mb-0.5">This week</p>
              <p className="text-white font-semibold">
                {fmtCurrency(weekProgress.completedThisWeek + weekProgress.bookedThisWeek)}
                <span className="text-white/40 font-normal"> / {fmtCurrency(weekProgress.weeklyTarget)}</span>
              </p>
            </div>
            <div>
              <p className="text-white/40 mb-0.5">Remaining this week</p>
              <p className="text-white font-semibold">{fmtCurrency(weekProgress.remainingWeekly)}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function CommercialQuoteIntelligence({
  analysis,
  quotePrice,
  priceFlags = [],
}) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showDecisionRules, setShowDecisionRules] = useState(false);

  const {
    estimate,
    decision,
    riskFlags,
    confidence,
    rating,
    goal,
    goalProgress,
    weekProgress,
    dynamicTargets,
    blockerOverrides,
    setBlockerOverrides,
    bookingShape,
  } = analysis;

  if (!estimate) return null;

  const allFlags = [...riskFlags, ...priceFlags];

  return (
    <div className="space-y-4">
      <GoalContextBar
        goal={goal}
        goalProgress={goalProgress}
        weekProgress={weekProgress}
        dynamicTargets={dynamicTargets}
      />

      {decision && (
        <div className={`rounded-xl border-2 p-4 space-y-2 ${DECISION_STYLES[decision.recommendation]}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black">{DECISION_LABELS[decision.recommendation]}</span>
              <span className="text-sm opacity-70">({decision.score}/100)</span>
            </div>
            {goalProgress && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${PACE_STYLES[goalProgress.paceStatus]}`}>
                {PACE_STATUS_LABELS[goalProgress.paceStatus]}
              </span>
            )}
          </div>
          <p className="text-sm font-medium">{decision.headline}</p>
          {decision.explanation && (
            <p className="text-sm opacity-90 leading-relaxed">{decision.explanation}</p>
          )}
          {decision.suggestedMinPrice && (
            <p className="text-xs mt-1">
              Min acceptable price: <span className="font-semibold">${decision.suggestedMinPrice}</span>
              {decision.goalContribution?.dailyPct != null && (
                <span className="ml-3 opacity-70">
                  Covers {decision.goalContribution.dailyPct}% of daily target
                </span>
              )}
            </p>
          )}
          <button
            type="button"
            onClick={() => setShowDecisionRules(!showDecisionRules)}
            className="text-xs underline opacity-60 hover:opacity-100"
          >
            {showDecisionRules ? 'Hide details' : 'Why this recommendation?'}
          </button>
          {showDecisionRules && (
            <div className="space-y-1 pt-1 border-t border-current/10">
              {decision.ruleResults.map((r) => (
                <div key={r.ruleId} className="flex justify-between gap-3 text-xs">
                  <span className="opacity-70">{r.ruleName}</span>
                  <span className="font-medium text-right">{r.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className={`rounded-xl border-2 p-4 space-y-3 ${RATING_STYLES[rating?.rating] || RATING_STYLES.marginal}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-black">${estimate.recommendedPrice}</div>
            <div className="text-xs opacity-70">Recommended price</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">{RATING_LABELS[rating?.rating]}</div>
            <div className="text-xs opacity-70">Job rating ({rating?.score}/100)</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <MetricRow label="Expected profit" value={`$${estimate.estimatedProfit}`} />
          <MetricRow label="Expected margin" value={`${(estimate.estimatedMargin * 100).toFixed(0)}%`} />
          <MetricRow label="Est. travel" value={`${estimate.estimatedTravelMinutes} min`} />
          <MetricRow label="Est. on-site" value={`${estimate.estimatedOnSiteHours.toFixed(1)} hrs`} />
          <MetricRow
            label="Truck volume"
            value={estimate.estimatedVolumePct != null ? `${estimate.estimatedVolumePct}%` : 'Unknown'}
          />
          <div className="flex justify-between col-span-2">
            <span className="text-white/50 text-sm">Confidence</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CONFIDENCE_STYLES[confidence?.level]}`}>
              {confidence?.level?.charAt(0).toUpperCase()}{confidence?.level?.slice(1)} ({confidence?.score}/100)
            </span>
          </div>
        </div>

        {bookingShape && (
          <p className="text-xs opacity-60 border-t border-current/10 pt-2">
            Inferred scope: {bookingShape.quantity?.replace('A ', '')} · {bookingShape.accessType?.replace(/_/g, ' ')}
            {bookingShape.stairs !== 'none' ? ` · ${bookingShape.stairs.replace(/_/g, ' ')}` : ''}
          </p>
        )}

        {estimate.weightRisk && (
          <p className="text-xs font-medium opacity-80">Weight risk: {estimate.weightRiskReason}</p>
        )}

        {rating?.reasons?.length > 0 && (
          <p className="text-xs opacity-70">{rating.reasons.join(' · ')}</p>
        )}
      </div>

      {allFlags.length > 0 && (
        <div className="bg-white/4 border border-white/8 rounded-xl p-4 space-y-2">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#22c55e]" />
            Risk Flags
          </h3>
          {allFlags.map((f, i) => (
            <div key={`${f.flag}-${i}`} className={`flex items-start gap-2 p-2 rounded-lg border text-sm ${SEVERITY_STYLES[f.severity]}`}>
              <span className="font-bold text-xs w-5 h-5 flex items-center justify-center rounded-full bg-current/10 flex-shrink-0 mt-0.5">
                {f.severity === 'blocker' ? 'X' : f.severity === 'warning' ? '!' : 'i'}
              </span>
              <span className="flex-1">{f.message}</span>
              {f.severity === 'blocker' && setBlockerOverrides && (
                <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={!!blockerOverrides[f.flag]}
                    onChange={(e) => setBlockerOverrides((prev) => ({
                      ...prev,
                      [f.flag]: e.target.checked ? `Overridden at ${new Date().toISOString()}` : undefined,
                    }))}
                    className="rounded"
                  />
                  Override
                </label>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="bg-white/4 border border-white/8 rounded-xl p-4">
        <button
          type="button"
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="w-full flex items-center justify-between"
        >
          <h3 className="font-bold text-white text-sm">Why this price?</h3>
          <ChevronDown className={`w-5 h-5 text-white/40 transition-transform ${showBreakdown ? 'rotate-180' : ''}`} />
        </button>
        {showBreakdown && (
          <div className="mt-3 space-y-1">
            {estimate.breakdown.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className={`text-white/60 ${item.unverified ? 'italic' : ''}`}>
                  {item.label}
                  {item.unverified && <span className="text-amber-400 text-xs ml-1">(est.)</span>}
                </span>
                <span className={`font-medium ${item.type === 'cost' ? 'text-white/40' : item.type === 'adjustment' ? 'text-amber-300' : 'text-white/85'}`}>
                  ${item.value}
                </span>
              </div>
            ))}
            <div className="border-t border-white/10 pt-2 mt-2 flex justify-between text-sm font-bold text-white">
              <span>Recommended total</span>
              <span>${estimate.recommendedPrice}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/40">Est. direct cost</span>
              <span className="text-white/40">${estimate.estimatedDirectCost}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/40">Target margin</span>
              <span className="text-white/40">{(estimate.targetMargin * 100).toFixed(0)}%</span>
            </div>
            {quotePrice && Number(quotePrice) !== estimate.recommendedPrice && (
              <div className="flex justify-between text-sm text-amber-300">
                <span>Your quote vs recommended</span>
                <span>
                  {Number(quotePrice) > estimate.recommendedPrice ? '+' : ''}
                  ${Number(quotePrice) - estimate.recommendedPrice}
                </span>
              </div>
            )}
            {estimate.missingInputs.length > 0 && (
              <div className="mt-2 bg-amber-500/10 rounded-lg p-2 text-xs text-amber-300">
                <div className="font-medium mb-1">Missing inputs:</div>
                {estimate.missingInputs.map((m, i) => (
                  <div key={i}>· {m.message}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
