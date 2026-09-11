import { ANALYSE_CHANGE_PATH, HEALTH_PATH, analyseChangeResponseSchema, apiErrorResponseSchema } from "@dev-interview-challenge/shared";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ChangeAnalysisService } from "../analysis/change-analysis-service.js";
import { RuleBasedChangeAnalyser } from "../analysis/rule-based-change-analyser.js";
import { createServer } from "./server.js";

let app: FastifyInstance;

beforeAll(async () => {
  app = await createServer({
    service: new ChangeAnalysisService(new RuleBasedChangeAnalyser()),
    corsOrigins: ["http://localhost:3000"],
    logLevel: "silent"
  });
});

afterAll(async () => {
  await app.close();
});

describe(`POST ${ANALYSE_CHANGE_PATH}`, () => {
  it("returns 200 and a contract-shaped analysis", async () => {
    const response = await app.inject({
      method: "POST",
      url: ANALYSE_CHANGE_PATH,
      payload: { description: "Allow administrators to reset another user's MFA configuration." }
    });

    expect(response.statusCode).toBe(200);
    expect(() => analyseChangeResponseSchema.parse(response.json())).not.toThrow();
  });

  it("returns 400 with a machine-readable code for an invalid description", async () => {
    const response = await app.inject({ method: "POST", url: ANALYSE_CHANGE_PATH, payload: { description: "" } });

    expect(response.statusCode).toBe(400);
    expect(apiErrorResponseSchema.parse(response.json()).error.code).toBe("VALIDATION_FAILED");
  });

  it("returns a 4xx error response for a malformed JSON body", async () => {
    const response = await app.inject({
      method: "POST",
      url: ANALYSE_CHANGE_PATH,
      headers: { "content-type": "application/json" },
      payload: "{ not json"
    });

    expect(response.statusCode).toBeGreaterThanOrEqual(400);
    expect(response.statusCode).toBeLessThan(500);
    expect(() => apiErrorResponseSchema.parse(response.json())).not.toThrow();
  });

  it("returns 502 without internal detail when the analyser fails", async () => {
    const failing = await createServer({
      service: new ChangeAnalysisService({
        id: "failing",
        analyse: () => {
          throw new Error("secret internal detail");
        }
      }),
      corsOrigins: ["http://localhost:3000"],
      logLevel: "silent"
    });

    const response = await failing.inject({
      method: "POST",
      url: ANALYSE_CHANGE_PATH,
      payload: { description: "Allow administrators to reset another user's MFA configuration." }
    });

    expect(response.statusCode).toBe(502);
    expect(response.body).not.toContain("secret internal detail");
    expect(apiErrorResponseSchema.parse(response.json()).error.code).toBe("ANALYSIS_FAILED");

    await failing.close();
  });

  it("allows the configured browser origin", async () => {
    const response = await app.inject({
      method: "OPTIONS",
      url: ANALYSE_CHANGE_PATH,
      headers: { origin: "http://localhost:3000", "access-control-request-method": "POST" }
    });

    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
  });
});

describe(`GET ${HEALTH_PATH}`, () => {
  it("reports the API is up", async () => {
    const response = await app.inject({ method: "GET", url: HEALTH_PATH });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });
});
