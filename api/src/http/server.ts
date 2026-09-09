import { HEALTH_PATH } from "@dev-interview-challenge/shared";
import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";

import type { ChangeAnalysisService } from "../analysis/change-analysis-service.js";
import { registerAnalyseChangeRoute } from "./analyse-change-route.js";
import { registerErrorHandler } from "./error-handler.js";

export interface ServerOptions {
  service: ChangeAnalysisService;
  corsOrigins: readonly string[];
  logLevel?: string;
}

/**
 * Builds a fully wired server without binding a port, so tests can drive it
 * through `app.inject` instead of over the network.
 */
export async function createServer({ service, corsOrigins, logLevel = "info" }: ServerOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: logLevel } });

  await app.register(cors, { origin: [...corsOrigins], methods: ["GET", "POST"] });

  app.get(HEALTH_PATH, async () => ({ status: "ok" }));
  registerAnalyseChangeRoute(app, service);
  registerErrorHandler(app);

  return app;
}
