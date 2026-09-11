import {
  ANALYSE_CHANGE_PATH,
  analyseChangeResponseSchema,
  apiErrorResponseSchema,
  type ChangeAnalysis
} from "@dev-interview-challenge/shared";

/**
 * The API base URL is configuration, not a constant: the UI and the API are
 * deployed separately, so this must be settable per environment.
 */
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001").replace(/\/+$/, "");

/** An error that is safe to show to the user. */
export class ApiClientError extends Error {
  constructor(message: string, readonly details: readonly string[] = []) {
    super(message);
    this.name = "ApiClientError";
  }
}

export async function analyseChange(description: string, signal?: AbortSignal): Promise<ChangeAnalysis> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${ANALYSE_CHANGE_PATH}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ description }),
      signal
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") {
      throw cause;
    }

    throw new ApiClientError(`Could not reach the analysis API at ${API_BASE_URL}. Is it running?`);
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw toApiClientError(payload, response.status);
  }

  const parsed = analyseChangeResponseSchema.safeParse(payload);

  if (!parsed.success) {
    throw new ApiClientError("The analysis API returned an unexpected response.");
  }

  return parsed.data.analysis;
}

function toApiClientError(payload: unknown, status: number): ApiClientError {
  const parsed = apiErrorResponseSchema.safeParse(payload);

  if (!parsed.success) {
    return new ApiClientError(`The analysis API responded with an error (HTTP ${status}).`);
  }

  return new ApiClientError(parsed.data.error.message, parsed.data.error.details ?? []);
}
