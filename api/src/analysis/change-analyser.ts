import type { AnalyseChangeRequest, ChangeAnalysis } from "@dev-interview-challenge/shared";

/**
 * The seam between the application and whatever produces an analysis.
 *
 * A deterministic rule engine ships today. An AI-backed implementation is an
 * additional class behind this interface: the rest of the application, and the
 * validation applied to its output, stay unchanged.
 */
export interface ChangeAnalyser {
  /** Stable identifier recorded on the result so output can be traced. */
  readonly id: string;
  analyse(request: AnalyseChangeRequest): Promise<ChangeAnalysis> | ChangeAnalysis;
}
