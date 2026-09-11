import { z } from "zod";

/**
 * Contracts shared by the API and the UI.
 *
 * This package is deliberately transport-agnostic: it describes *what* a change
 * analysis looks like, not how it is produced or delivered. Both sides validate
 * against these schemas so a change to the contract breaks at the boundary
 * rather than somewhere deep inside a component.
 */

export const ANALYSE_CHANGE_PATH = "/api/analyse-change";
export const HEALTH_PATH = "/health";

export const DESCRIPTION_MIN_LENGTH = 10;
export const DESCRIPTION_MAX_LENGTH = 2000;

/** Risk levels, ordered from least to most severe. */
export const RISK_LEVELS = ["Low", "Medium", "High"] as const;
export const riskLevelSchema = z.enum(RISK_LEVELS);
export type RiskLevel = z.infer<typeof riskLevelSchema>;

/** The kind of test a recommendation belongs to, used to group the output. */
export const TEST_CATEGORIES = ["Unit", "Integration", "API", "UI", "Security"] as const;
export const testCategorySchema = z.enum(TEST_CATEGORIES);
export type TestCategory = z.infer<typeof testCategorySchema>;

export const analyseChangeRequestSchema = z.object({
  description: z
    .string()
    .trim()
    .min(DESCRIPTION_MIN_LENGTH, `Describe the change in at least ${DESCRIPTION_MIN_LENGTH} characters.`)
    .max(DESCRIPTION_MAX_LENGTH, `Keep the description under ${DESCRIPTION_MAX_LENGTH} characters.`)
});
export type AnalyseChangeRequest = z.infer<typeof analyseChangeRequestSchema>;

/** A single reason the change was scored the way it was. */
export const riskFactorSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  weight: z.number().int().nonnegative(),
  /** The phrases in the description that triggered this factor. */
  evidence: z.array(z.string().min(1)).min(1)
});
export type RiskFactor = z.infer<typeof riskFactorSchema>;

export const recommendedTestSchema = z.object({
  category: testCategorySchema,
  description: z.string().min(1)
});
export type RecommendedTest = z.infer<typeof recommendedTestSchema>;

export const changeAnalysisSchema = z.object({
  riskLevel: riskLevelSchema,
  riskScore: z.number().int().nonnegative(),
  summary: z.string().min(1),
  impactedAreas: z.array(z.string().min(1)),
  recommendedTests: z.array(recommendedTestSchema).min(1),
  /** Why the change received its risk level. Empty when nothing notable matched. */
  rationale: z.array(riskFactorSchema),
  /** Identifies which analyser produced the result, so output can be traced. */
  analyserId: z.string().min(1)
});
export type ChangeAnalysis = z.infer<typeof changeAnalysisSchema>;

export const analyseChangeResponseSchema = z.object({
  analysis: changeAnalysisSchema
});
export type AnalyseChangeResponse = z.infer<typeof analyseChangeResponseSchema>;

export const API_ERROR_CODES = ["VALIDATION_FAILED", "ANALYSIS_FAILED", "INTERNAL_ERROR"] as const;
export const apiErrorCodeSchema = z.enum(API_ERROR_CODES);
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;

export const apiErrorResponseSchema = z.object({
  error: z.object({
    code: apiErrorCodeSchema,
    message: z.string().min(1),
    details: z.array(z.string()).optional()
  })
});
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
