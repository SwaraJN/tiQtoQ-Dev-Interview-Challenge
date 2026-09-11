import type { ApiErrorResponse } from "@dev-interview-challenge/shared";
import type { FastifyInstance } from "fastify";

import { AppError } from "../errors.js";

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      request.log.warn({ err: error, code: error.code }, "Request rejected");

      const body: ApiErrorResponse = {
        error: { code: error.code, message: error.message, ...(error.details && { details: [...error.details] }) }
      };

      return reply.status(error.statusCode).send(body);
    }

    // Malformed JSON and similar transport-level faults arrive here already
    // carrying a 4xx status; anything else is a genuine fault on our side.
    const statusCode = error.statusCode ?? 500;

    if (statusCode < 500) {
      const body: ApiErrorResponse = { error: { code: "VALIDATION_FAILED", message: "The request could not be read." } };
      return reply.status(statusCode).send(body);
    }

    request.log.error({ err: error }, "Unhandled error");

    const body: ApiErrorResponse = {
      error: { code: "INTERNAL_ERROR", message: "The request could not be completed." }
    };

    return reply.status(500).send(body);
  });

  app.setNotFoundHandler((_request, reply) => {
    const body: ApiErrorResponse = { error: { code: "INTERNAL_ERROR", message: "Route not found." } };
    return reply.status(404).send(body);
  });
}
