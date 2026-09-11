import type { ApiErrorCode } from "@dev-interview-challenge/shared";

/**
 * Errors the API knows how to present to a client. Anything that is not an
 * `AppError` is treated as an unexpected fault and reported as a generic 500,
 * so internal detail is never leaked in a response.
 */
export abstract class AppError extends Error {
  abstract readonly code: ApiErrorCode;
  abstract readonly statusCode: number;
  readonly details?: readonly string[];

  protected constructor(message: string, details?: readonly string[], options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
    this.details = details;
  }
}

/** The caller sent something the API cannot accept. */
export class ValidationError extends AppError {
  readonly code = "VALIDATION_FAILED" as const;
  readonly statusCode = 400;

  constructor(message: string, details?: readonly string[]) {
    super(message, details);
  }
}

/** The request was valid but the analyser could not produce a usable result. */
export class AnalysisError extends AppError {
  readonly code = "ANALYSIS_FAILED" as const;
  readonly statusCode = 502;

  constructor(message: string, options?: ErrorOptions) {
    super(message, undefined, options);
  }
}
