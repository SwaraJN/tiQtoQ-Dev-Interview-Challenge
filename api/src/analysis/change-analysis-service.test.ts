import type { ChangeAnalysis } from "@dev-interview-challenge/shared";
import { describe, expect, it } from "vitest";

import { AnalysisError, ValidationError } from "../errors.js";
import type { ChangeAnalyser } from "./change-analyser.js";
import { ChangeAnalysisService } from "./change-analysis-service.js";
import { RuleBasedChangeAnalyser } from "./rule-based-change-analyser.js";

const VALID_DESCRIPTION = "Allow administrators to reset another user's MFA configuration.";

function serviceWith(analyse: ChangeAnalyser["analyse"]): ChangeAnalysisService {
  return new ChangeAnalysisService({ id: "stub", analyse });
}

describe("ChangeAnalysisService", () => {
  it("returns the analysis for a valid request", async () => {
    const service = new ChangeAnalysisService(new RuleBasedChangeAnalyser());

    await expect(service.analyse({ description: VALID_DESCRIPTION })).resolves.toMatchObject({
      riskLevel: "High",
      analyserId: "rule-based-v1"
    });
  });

  it.each([
    ["a missing body", undefined],
    ["a missing description", {}],
    ["a non-string description", { description: 42 }],
    ["a description that is too short", { description: "too short" }],
    ["a whitespace-only description", { description: "                    " }],
    ["a description that is too long", { description: "a".repeat(2001) }]
  ])("rejects %s with a ValidationError", async (_label, input) => {
    await expect(serviceWith(() => unreachable()).analyse(input)).rejects.toBeInstanceOf(ValidationError);
  });

  it("reports which field failed validation", async () => {
    const error = await serviceWith(() => unreachable())
      .analyse({ description: "short" })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).details).toEqual([expect.stringContaining("description")]);
  });

  it("trims the description before handing it to the analyser", async () => {
    let received: string | undefined;
    const service = serviceWith((request) => {
      received = request.description;
      return new RuleBasedChangeAnalyser().analyse(request);
    });

    await service.analyse({ description: `  ${VALID_DESCRIPTION}  ` });

    expect(received).toBe(VALID_DESCRIPTION);
  });

  it("wraps an analyser failure in an AnalysisError without leaking the cause", async () => {
    const service = serviceWith(() => {
      throw new Error("upstream model timed out");
    });

    const error = await service.analyse({ description: VALID_DESCRIPTION }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AnalysisError);
    expect((error as AnalysisError).message).not.toContain("upstream model timed out");
    expect((error as AnalysisError).cause).toBeInstanceOf(Error);
  });

  it("rejects an analyser result that does not match the contract", async () => {
    const malformed = { riskLevel: "Catastrophic", summary: "" } as unknown as ChangeAnalysis;

    await expect(serviceWith(() => malformed).analyse({ description: VALID_DESCRIPTION })).rejects.toBeInstanceOf(
      AnalysisError
    );
  });

  it("supports an asynchronous analyser", async () => {
    const analysis = new RuleBasedChangeAnalyser().analyse({ description: VALID_DESCRIPTION });

    await expect(serviceWith(() => Promise.resolve(analysis)).analyse({ description: VALID_DESCRIPTION })).resolves.toEqual(
      analysis
    );
  });
});

function unreachable(): never {
  throw new Error("The analyser should not be called for an invalid request.");
}
