import type { RecommendedTest } from "@dev-interview-challenge/shared";

/**
 * A heuristic indicator that a change touches a risky part of the system.
 *
 * Signals are pure data. Adding coverage for a new domain concern means adding
 * an entry here, not editing the scoring or presentation code.
 */
export interface RiskSignal {
  readonly id: string;
  /** Shown to the team as the reason this signal contributed to the score. */
  readonly description: string;
  /** Contribution to the overall risk score. Higher means more dangerous. */
  readonly weight: number;
  /**
   * Case-insensitive, global patterns. Global is required by `matchAll`, which
   * does not mutate the source regex, so these constants stay safe to share.
   */
  readonly patterns: readonly RegExp[];
  readonly impactedAreas: readonly string[];
  readonly recommendedTests: readonly RecommendedTest[];
}

export const RISK_SIGNALS: readonly RiskSignal[] = [
  {
    id: "authentication",
    description: "Touches authentication or session handling",
    weight: 4,
    patterns: [
      /\b(authentication|authenticate|login|log in|sign[- ]?in|sso|oauth|saml|mfa|2fa|multi[- ]?factor|password|passwordless|credential|session|refresh token)\b/gi
    ],
    impactedAreas: ["Authentication", "Security"],
    recommendedTests: [
      { category: "Security", description: "Verify existing users can still authenticate successfully after the change." },
      { category: "Integration", description: "Verify session and token lifetimes are unchanged for users not affected by the change." }
    ]
  },
  {
    id: "authorisation",
    description: "Touches authorisation, roles or permissions",
    weight: 4,
    patterns: [
      /\b(authoris\w*|authoriz\w*|permission|permissions|role|roles|rbac|access control|privilege|privileges|admin|administrator|administrators|tenant|scope)\b/gi
    ],
    impactedAreas: ["User permissions", "Security"],
    recommendedTests: [
      { category: "Security", description: "Verify only users holding the required permission can perform the action." },
      { category: "API", description: "Verify the action is rejected at the API layer when called without permission, not only hidden in the UI." }
    ]
  },
  {
    id: "secrets-and-crypto",
    description: "Touches secrets, keys or cryptography",
    weight: 4,
    patterns: [/\b(encrypt\w*|decrypt\w*|secret|secrets|api key|private key|certificate|hashing|hashed|salt|cryptograph\w*)\b/gi],
    impactedAreas: ["Security", "Secrets management"],
    recommendedTests: [
      { category: "Security", description: "Verify secrets are never returned in API responses, logs or error messages." },
      { category: "Unit", description: "Verify values are stored using the expected algorithm and are not recoverable in plain text." }
    ]
  },
  {
    id: "payments",
    description: "Touches payments or billing",
    weight: 4,
    patterns: [/\b(payment|payments|billing|invoice|invoicing|refund|refunds|checkout|card|stripe|subscription|pricing|charge)\b/gi],
    impactedAreas: ["Payments", "Financial reporting"],
    recommendedTests: [
      { category: "Integration", description: "Verify amounts, currency and rounding against the payment provider sandbox." },
      { category: "Integration", description: "Verify the operation is idempotent when the same request is retried." }
    ]
  },
  {
    id: "data-migration",
    description: "Requires a data or schema migration",
    weight: 4,
    patterns: [/\b(migration|migrations|migrate|schema|backfill|alter table|drop column|drop table|reindex|re[- ]?index|database)\b/gi],
    impactedAreas: ["Data storage", "Deployment"],
    recommendedTests: [
      { category: "Integration", description: "Run the migration against a copy of production-shaped data and record the duration." },
      { category: "Integration", description: "Verify the previous application version still works against the migrated schema, so a rollback is safe." }
    ]
  },
  {
    id: "destructive-action",
    description: "Removes, resets or revokes existing state",
    weight: 3,
    patterns: [/\b(delete|deletes|deleted|remove|removes|purge|wipe|reset|resets|revoke|revokes|disable|disables|deactivate|archive)\b/gi],
    impactedAreas: ["Data integrity", "Audit logging"],
    recommendedTests: [
      { category: "Integration", description: "Verify the destructive action is recorded in the audit log with the acting user and target." },
      { category: "Integration", description: "Verify unrelated records are untouched and the action cannot be triggered accidentally or repeatedly." }
    ]
  },
  {
    id: "public-contract",
    description: "Changes a public API or integration contract",
    weight: 3,
    patterns: [/\b(api|apis|endpoint|endpoints|contract|webhook|webhooks|public interface|breaking change|response shape|payload)\b/gi],
    impactedAreas: ["API contract", "Integrations"],
    recommendedTests: [
      { category: "API", description: "Verify existing clients still work against the current contract, including optional and omitted fields." },
      { category: "API", description: "Verify invalid and malformed requests return the documented error shape." }
    ]
  },
  {
    id: "external-dependency",
    description: "Depends on an external or third-party system",
    weight: 2,
    patterns: [/\b(third[- ]?party|external|vendor|provider|integration|upstream|downstream|sdk)\b/gi],
    impactedAreas: ["Integrations", "Resilience"],
    recommendedTests: [
      { category: "Integration", description: "Verify behaviour when the external system is slow, unavailable or returns an unexpected response." }
    ]
  },
  {
    id: "infrastructure",
    description: "Changes deployment, infrastructure or configuration",
    weight: 3,
    // Deliberately excludes a bare "config"/"configuration": those words appear
    // in unrelated product wording (an "MFA configuration") far too often.
    patterns: [
      /\b(infrastructure|deployment|deploy|pipeline|ci\/cd|terraform|bicep|helm|kubernetes|docker|environment variable|feature flag|configuration file|app settings)\b/gi
    ],
    impactedAreas: ["Deployment", "Configuration"],
    recommendedTests: [
      { category: "Integration", description: "Verify the change deploys cleanly to a non-production environment and can be rolled back." },
      { category: "Unit", description: "Verify the application fails fast with a clear error when required configuration is missing." }
    ]
  },
  {
    id: "personal-data",
    description: "Handles personal or regulated data",
    weight: 3,
    patterns: [/\b(pii|personal data|personal information|gdpr|customer data|email address|phone number|date of birth|postal address)\b/gi],
    impactedAreas: ["Data privacy", "Compliance"],
    recommendedTests: [
      { category: "Security", description: "Verify personal data is not exposed to users who should not see it, including in logs." }
    ]
  },
  {
    id: "performance",
    description: "Affects performance, caching or concurrency",
    weight: 2,
    patterns: [/\b(cache|caching|cached|async|asynchronous|queue|queues|concurren\w*|performance|latency|scal\w*|rate limit|throttl\w*|batch|bulk)\b/gi],
    impactedAreas: ["Performance", "Reliability"],
    recommendedTests: [
      { category: "Integration", description: "Verify behaviour under concurrent requests and confirm stale cached values are invalidated." }
    ]
  },
  {
    id: "broad-scope",
    description: "Applies broadly across users or the platform",
    weight: 2,
    patterns: [/\b(all users|every user|all customers|all tenants|global|globally|platform[- ]wide|system[- ]wide|entire|everyone)\b/gi],
    impactedAreas: ["Blast radius"],
    recommendedTests: [
      { category: "Integration", description: "Verify the change behaves correctly for each affected user type, not just the primary case." }
    ]
  },
  {
    id: "user-interface",
    description: "Changes the user interface",
    weight: 1,
    patterns: [/\b(ui|screen|screens|page|pages|form|forms|button|buttons|component|components|dialog|modal|accessibility|a11y|layout|styling)\b/gi],
    impactedAreas: ["User interface", "Accessibility"],
    recommendedTests: [
      { category: "UI", description: "Verify the flow is operable by keyboard and announced correctly by a screen reader." },
      { category: "UI", description: "Verify loading, empty and error states render correctly." }
    ]
  },
  {
    id: "observability",
    description: "Touches auditing, logging or monitoring",
    weight: 1,
    patterns: [/\b(audit|auditing|audit log|logging|logs|telemetry|monitoring|metrics|tracing|alerting)\b/gi],
    impactedAreas: ["Audit logging", "Observability"],
    recommendedTests: [
      { category: "Integration", description: "Verify the expected events are emitted with enough context to investigate an incident." }
    ]
  }
];
