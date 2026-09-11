import type { ChangeAnalysis } from "@dev-interview-challenge/shared";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiClientError, analyseChange } from "./api-client";

const ANALYSIS: ChangeAnalysis = {
  riskLevel: "High",
  riskScore: 11,
  summary: "High risk: 3 concerns detected.",
  impactedAreas: ["Authentication"],
  recommendedTests: [{ category: "Unit", description: "Cover the new logic." }],
  rationale: [{ id: "authentication", description: "Touches authentication", weight: 4, evidence: ["mfa"] }],
  analyserId: "rule-based-v1"
};

function mockFetch(response: Partial<Response> & { json: () => Promise<unknown> }) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, ...response });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("analyseChange", () => {
  it("posts the description and returns the parsed analysis", async () => {
    const fetchMock = mockFetch({ json: async () => ({ analysis: ANALYSIS }) });

    await expect(analyseChange("Reset a user's MFA configuration.")).resolves.toEqual(ANALYSIS);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/analyse-change");
    expect(init).toMatchObject({ method: "POST", headers: { "content-type": "application/json" } });
    expect(JSON.parse(init.body)).toEqual({ description: "Reset a user's MFA configuration." });
  });

  it("reports an unreachable API rather than surfacing the network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const error = await analyseChange("A description long enough.").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiClientError);
    expect((error as ApiClientError).message).toMatch(/Could not reach the analysis API/);
  });

  it("surfaces the message and details from a structured API error", async () => {
    mockFetch({
      ok: false,
      status: 400,
      json: async () => ({
        error: { code: "VALIDATION_FAILED", message: "The change description is not valid.", details: ["description: too short"] }
      })
    });

    const error = await analyseChange("short").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiClientError);
    expect((error as ApiClientError).message).toBe("The change description is not valid.");
    expect((error as ApiClientError).details).toEqual(["description: too short"]);
  });

  it("falls back to the status code when an error response is not contract-shaped", async () => {
    mockFetch({ ok: false, status: 503, json: async () => ({ oops: true }) });

    const error = await analyseChange("A description long enough.").catch((caught: unknown) => caught);

    expect((error as ApiClientError).message).toMatch(/HTTP 503/);
  });

  it("rejects a success response that does not match the contract", async () => {
    mockFetch({ json: async () => ({ analysis: { riskLevel: "Catastrophic" } }) });

    const error = await analyseChange("A description long enough.").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiClientError);
    expect((error as ApiClientError).message).toMatch(/unexpected response/);
  });

  it("propagates an abort so a superseded request is not treated as a failure", async () => {
    const abortError = new DOMException("Aborted", "AbortError");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError));

    await expect(analyseChange("A description long enough.")).rejects.toBe(abortError);
  });
});
