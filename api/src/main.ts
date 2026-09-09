import { ChangeAnalysisService } from "./analysis/change-analysis-service.js";
import { RuleBasedChangeAnalyser } from "./analysis/rule-based-change-analyser.js";
import { loadConfig } from "./config.js";
import { createServer } from "./http/server.js";

/**
 * Composition root: the only place that decides which analyser the API runs.
 * Swapping in an AI-backed analyser is a one-line change here.
 */
async function main(): Promise<void> {
  const config = loadConfig();
  const service = new ChangeAnalysisService(new RuleBasedChangeAnalyser());
  const app = await createServer({
    service,
    corsOrigins: config.corsOrigins,
    logLevel: config.logLevel
  });

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info({ signal }, "Shutting down");
    await app.close();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  await app.listen({ host: config.host, port: config.port });
}

main().catch((error: unknown) => {
  console.error("Failed to start the API.", error);
  process.exit(1);
});
