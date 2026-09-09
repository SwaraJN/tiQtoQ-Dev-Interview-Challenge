import { TEST_CATEGORIES, changeAnalysisSchema } from "@dev-interview-challenge/shared";
import { describe, expect, it } from "vitest";

import { RuleBasedChangeAnalyser } from "./rule-based-change-analyser.js";
import type { RiskSignal } from "./risk-signals.js";

const analyser = new RuleBasedChangeAnalyser();

const MFA_CHANGE = "Add the ability for administrators to reset another user's MFA configuration.";

describe("RuleBasedChangeAnalyser", () => {
  it("always returns a result matching the shared contract", () => {
    expect(() => changeAnalysisSchema.parse(analyser.analyse({ description: MFA_CHANGE }))).not.toThrow();
  });

  it("is deterministic for the same description", () => {
    expect(analyser.analyse({ description: MFA_CHANGE })).toEqual(analyser.analyse({ description: MFA_CHANGE }));
  });

  it("rates a security-sensitive administrative change as High", () => {
    const analysis = analyser.analyse({ description: MFA_CHANGE });

    expect(analysis.riskLevel).toBe("High");
    expect(analysis.impactedAreas).toEqual(expect.arrayContaining(["Authentication", "User permissions", "Audit logging"]));
  });

  it("rates a cosmetic change as Low", () => {
    const analysis = analyser.analyse({ description: "Correct the spelling of the word 'recieve' in the welcome banner." });

    expect(analysis.riskLevel).toBe("Low");
    expect(analysis.riskScore).toBe(0);
    expect(analysis.rationale).toEqual([]);
  });

  it("rates a change with a single moderate concern as Medium", () => {
    const analysis = analyser.analyse({ description: "Add a database index to the orders table to speed up reporting." });

    expect(analysis.riskLevel).toBe("Medium");
  });

  it("explains the rating with the phrases that triggered each factor", () => {
    const analysis = analyser.analyse({ description: MFA_CHANGE });
    const authentication = analysis.rationale.find((factor) => factor.id === "authentication");

    expect(authentication).toBeDefined();
    expect(authentication?.evidence).toContain("mfa");
    expect(analysis.summary).toContain("High risk");
  });

  it("does not treat product wording such as 'MFA configuration' as an infrastructure change", () => {
    const analysis = analyser.analyse({ description: MFA_CHANGE });

    expect(analysis.rationale.map((factor) => factor.id)).not.toContain("infrastructure");
  });

  it("always recommends at least the baseline tests", () => {
    const analysis = analyser.analyse({ description: "Rename an internal helper function for clarity." });

    expect(analysis.recommendedTests).toEqual([
      { category: "Unit", description: "Cover the new logic with unit tests for both the success and failure paths." },
      { category: "Integration", description: "Run the existing regression suite to confirm unrelated behaviour is unaffected." }
    ]);
  });

  it("deduplicates recommendations shared by several matched signals", () => {
    const duplicated: RiskSignal = {
      id: "duplicate",
      description: "Duplicate signal",
      weight: 1,
      patterns: [/\bwidget\b/gi],
      impactedAreas: ["Data integrity"],
      recommendedTests: [
        { category: "Unit", description: "Cover the new logic with unit tests for both the success and failure paths." }
      ]
    };

    const analysis = new RuleBasedChangeAnalyser([duplicated]).analyse({ description: "Update the widget." });

    expect(analysis.recommendedTests.filter((test) => test.category === "Unit")).toHaveLength(1);
    expect(analysis.impactedAreas).toEqual(["Data integrity"]);
  });

  it("orders recommendations by the shared category order", () => {
    const analysis = analyser.analyse({ description: MFA_CHANGE });
    const positions = analysis.recommendedTests.map((test) => TEST_CATEGORIES.indexOf(test.category));

    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(new Set(positions).size).toBeGreaterThan(1);
  });
});
