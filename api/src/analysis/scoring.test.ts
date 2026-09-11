import { describe, expect, it } from "vitest";

import { RISK_THRESHOLDS, toRiskLevel } from "./scoring.js";

describe("toRiskLevel", () => {
  it.each([
    [0, "Low"],
    [RISK_THRESHOLDS.medium - 1, "Low"],
    [RISK_THRESHOLDS.medium, "Medium"],
    [RISK_THRESHOLDS.high - 1, "Medium"],
    [RISK_THRESHOLDS.high, "High"],
    [100, "High"]
  ])("maps a score of %i to %s", (score, expected) => {
    expect(toRiskLevel(score)).toBe(expected);
  });
});
