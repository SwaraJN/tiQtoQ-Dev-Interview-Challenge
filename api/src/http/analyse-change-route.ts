import { ANALYSE_CHANGE_PATH, type AnalyseChangeResponse } from "@dev-interview-challenge/shared";
import type { FastifyInstance } from "fastify";

import type { ChangeAnalysisService } from "../analysis/change-analysis-service.js";

/**
 * The route is intentionally thin: it maps HTTP to the service and back. All
 * validation and error semantics live in the service and the error handler.
 */
export function registerAnalyseChangeRoute(app: FastifyInstance, service: ChangeAnalysisService): void {
  app.post(ANALYSE_CHANGE_PATH, async (request, reply) => {
    const analysis = await service.analyse(request.body);
    const body: AnalyseChangeResponse = { analysis };

    return reply.status(200).send(body);
  });
}
