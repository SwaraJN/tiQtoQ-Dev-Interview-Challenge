import type { ChangeAnalysis } from "@dev-interview-challenge/shared";
import { analyseChangeRequestSchema, changeAnalysisSchema } from "@dev-interview-challenge/shared";
import { z } from "zod";

import { AnalysisError, ValidationError } from "../errors.js";
import type { ChangeAnalyser } from "./change-analyser.js";

/**
 * Application entry point for the feature. It owns the boundary rules — validate
 * what comes in, validate what the analyser gives back — and stays unaware of
 * both HTTP and the analysis strategy in use.
 */
export class ChangeAnalysisService {
  constructor(private readonly analyser: ChangeAnalyser) {}

  async analyse(input: unknown): Promise<ChangeAnalysis> {
    const request = analyseChangeRequestSchema.safeParse(input);

    if (!request.success) {
      throw new ValidationError("The change description is not valid.", toMessages(request.error));
    }

    let result: unknown;

    try {
      result = await this.analyser.analyse(request.data);
    } catch (cause) {
      throw new AnalysisError(`Analyser "${this.analyser.id}" failed to analyse the change.`, { cause });
    }

    // An analyser is an untrusted dependency: a non-deterministic one can return
    // a malformed or partial result, and that must not reach the UI.
    const analysis = changeAnalysisSchema.safeParse(result);

    if (!analysis.success) {
      throw new AnalysisError(
        `Analyser "${this.analyser.id}" returned a result that does not match the contract.`,
        { cause: analysis.error }
      );
    }

    return analysis.data;
  }
}

function toMessages(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });
}
