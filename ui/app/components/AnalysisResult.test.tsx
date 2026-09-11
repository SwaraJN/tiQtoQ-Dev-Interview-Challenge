import type { ChangeAnalysis } from "@dev-interview-challenge/shared";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AnalysisResult } from "./AnalysisResult";

function analysis(overrides: Partial<ChangeAnalysis> = {}): ChangeAnalysis {
  return {
    riskLevel: "High",
    riskScore: 11,
    summary: "High risk: 3 concerns detected.",
    impactedAreas: ["Authentication", "Audit logging"],
    recommendedTests: [
      { category: "Unit", description: "Cover the new logic." },
      { category: "Security", description: "Verify only administrators can reset MFA." },
      { category: "Unit", description: "Verify configuration is required." }
    ],
    rationale: [{ id: "authentication", description: "Touches authentication", weight: 4, evidence: ["mfa", "password"] }],
    analyserId: "rule-based-v1",
    ...overrides
  };
}

describe("AnalysisResult", () => {
  it("shows the risk level, the score and which analyser produced it", () => {
    render(<AnalysisResult analysis={analysis()} />);

    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("High risk: 3 concerns detected.")).toBeInTheDocument();
    expect(screen.getByText(/Total score 11/)).toBeInTheDocument();
    expect(screen.getByText("rule-based-v1")).toBeInTheDocument();
  });

  it.each([
    ["Low", "risk-badge--low"],
    ["Medium", "risk-badge--medium"],
    ["High", "risk-badge--high"]
  ] as const)("styles the %s badge distinctly", (riskLevel, expectedClass) => {
    render(<AnalysisResult analysis={analysis({ riskLevel })} />);

    expect(screen.getByText(riskLevel)).toHaveClass(expectedClass);
  });

  it("lists every impacted area", () => {
    render(<AnalysisResult analysis={analysis()} />);

    expect(screen.getByText("Authentication")).toBeInTheDocument();
    expect(screen.getByText("Audit logging")).toBeInTheDocument();
  });

  it("explains when no impacted areas were identified", () => {
    render(<AnalysisResult analysis={analysis({ impactedAreas: [] })} />);

    expect(screen.getByText(/No specific areas were identified/)).toBeInTheDocument();
  });

  it("groups recommended tests under one heading per category", () => {
    render(<AnalysisResult analysis={analysis()} />);

    const unitHeadings = screen.getAllByRole("heading", { name: "Unit" });
    expect(unitHeadings).toHaveLength(1);

    const unitGroup = unitHeadings[0].closest(".test-group");
    expect(within(unitGroup as HTMLElement).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "Security" })).toBeInTheDocument();
  });

  it("shows the evidence and weight behind each risk factor", () => {
    render(<AnalysisResult analysis={analysis()} />);

    expect(screen.getByText("Touches authentication")).toBeInTheDocument();
    expect(screen.getByText("+4")).toBeInTheDocument();
    expect(screen.getByText(/matched: mfa, password/)).toBeInTheDocument();
  });

  it("explains a Low rating with no matched factors", () => {
    render(<AnalysisResult analysis={analysis({ riskLevel: "Low", riskScore: 0, rationale: [] })} />);

    expect(screen.getByText(/Nothing in the description matched a known risk area/)).toBeInTheDocument();
  });
});
