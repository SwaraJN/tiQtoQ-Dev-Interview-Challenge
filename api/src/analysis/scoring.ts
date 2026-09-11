import type { RiskLevel } from "@dev-interview-challenge/shared";

/**
 * Inclusive lower bounds for each risk level.
 *
 * Kept separate from the signal catalogue so the thresholds can be tuned (or
 * later made configurable per team) without touching the matching rules.
 */
export const RISK_THRESHOLDS = {
  high: 8,
  medium: 4
} as const;

export function toRiskLevel(score: number): RiskLevel {
  if (score >= RISK_THRESHOLDS.high) {
    return "High";
  }

  if (score >= RISK_THRESHOLDS.medium) {
    return "Medium";
  }

  return "Low";
}
