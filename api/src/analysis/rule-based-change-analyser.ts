import type {
  AnalyseChangeRequest,
  ChangeAnalysis,
  RecommendedTest,
  RiskFactor
} from "@dev-interview-challenge/shared";
import { TEST_CATEGORIES } from "@dev-interview-challenge/shared";

import type { ChangeAnalyser } from "./change-analyser.js";
import { RISK_SIGNALS, type RiskSignal } from "./risk-signals.js";
import { toRiskLevel } from "./scoring.js";

/** Applied to every change, whatever the description says. */
const BASELINE_TESTS: readonly RecommendedTest[] = [
  { category: "Unit", description: "Cover the new logic with unit tests for both the success and failure paths." },
  { category: "Integration", description: "Run the existing regression suite to confirm unrelated behaviour is unaffected." }
];

/**
 * Deterministic analyser. The same description always produces the same result,
 * which keeps the output explainable and the behaviour cheap to test.
 */
export class RuleBasedChangeAnalyser implements ChangeAnalyser {
  readonly id = "rule-based-v1";

  constructor(private readonly signals: readonly RiskSignal[] = RISK_SIGNALS) {}

  analyse({ description }: AnalyseChangeRequest): ChangeAnalysis {
    const matched = this.signals
      .map((signal) => ({ signal, evidence: findEvidence(description, signal) }))
      .filter((candidate) => candidate.evidence.length > 0);

    const rationale: RiskFactor[] = matched.map(({ signal, evidence }) => ({
      id: signal.id,
      description: signal.description,
      weight: signal.weight,
      evidence
    }));

    const riskScore = rationale.reduce((total, factor) => total + factor.weight, 0);
    const riskLevel = toRiskLevel(riskScore);

    return {
      riskLevel,
      riskScore,
      summary: buildSummary(riskLevel, rationale),
      impactedAreas: unique(matched.flatMap(({ signal }) => signal.impactedAreas)),
      recommendedTests: orderByCategory([
        ...matched.flatMap(({ signal }) => signal.recommendedTests),
        ...BASELINE_TESTS
      ]),
      rationale,
      analyserId: this.id
    };
  }
}

/** The distinct phrases in the description that triggered a signal. */
function findEvidence(description: string, signal: RiskSignal): string[] {
  const matches = signal.patterns.flatMap((pattern) =>
    [...description.matchAll(pattern)].map((match) => match[0])
  );

  return unique(matches.map((match) => match.toLowerCase()));
}

function buildSummary(riskLevel: string, rationale: readonly RiskFactor[]): string {
  if (rationale.length === 0) {
    return "No known high-risk areas were detected in this description. Apply the team's standard review and regression testing, and add detail to the description if the change is larger than it reads.";
  }

  const [highest] = [...rationale].sort((a, b) => b.weight - a.weight);
  const concerns = rationale.length === 1 ? "concern" : "concerns";

  return `${riskLevel} risk: ${rationale.length} ${concerns} detected, the most significant being "${highest.description.toLowerCase()}".`;
}

/**
 * Deduplicates recommendations and groups them by category, so the UI can render
 * the list directly without re-sorting it.
 */
function orderByCategory(tests: readonly RecommendedTest[]): RecommendedTest[] {
  const seen = new Set<string>();
  const deduplicated = tests.filter((test) => {
    const key = `${test.category}:${test.description}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  return deduplicated.sort(
    (a, b) => TEST_CATEGORIES.indexOf(a.category) - TEST_CATEGORIES.indexOf(b.category)
  );
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}
