import { describe, expect, it } from "vitest";

import { loadConfig } from "./config.js";

describe("loadConfig", () => {
  it("applies local development defaults", () => {
    expect(loadConfig({})).toEqual({
      host: "127.0.0.1",
      port: 3001,
      corsOrigins: ["http://localhost:3000"],
      logLevel: "info"
    });
  });

  it("reads a comma-separated list of allowed origins", () => {
    const config = loadConfig({ API_CORS_ORIGINS: "https://a.example, https://b.example" });

    expect(config.corsOrigins).toEqual(["https://a.example", "https://b.example"]);
  });

  it("rejects a port outside the valid range instead of starting", () => {
    expect(() => loadConfig({ API_PORT: "70000" })).toThrow(/Invalid API configuration/);
  });
});
