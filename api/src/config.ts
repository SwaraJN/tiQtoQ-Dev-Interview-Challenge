import { z } from "zod";

const configSchema = z.object({
  host: z.string().min(1).default("127.0.0.1"),
  port: z.coerce.number().int().min(1).max(65_535).default(3001),
  /** Origins allowed to call the API from a browser. */
  corsOrigins: z
    .string()
    .default("http://localhost:3000")
    .transform((value) => value.split(",").map((origin) => origin.trim()).filter(Boolean)),
  logLevel: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info")
});

export type ApiConfig = z.infer<typeof configSchema>;

/** Fails fast with a readable message rather than starting in a broken state. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const result = configSchema.safeParse({
    host: env.API_HOST,
    port: env.API_PORT,
    corsOrigins: env.API_CORS_ORIGINS,
    logLevel: env.API_LOG_LEVEL
  });

  if (!result.success) {
    const details = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    throw new Error(`Invalid API configuration:\n  ${details.join("\n  ")}`);
  }

  return result.data;
}
