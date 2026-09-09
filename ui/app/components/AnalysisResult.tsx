import type { ChangeAnalysis, RecommendedTest, TestCategory } from "@dev-interview-challenge/shared";

/** Presentational only: it renders an analysis and knows nothing about fetching one. */
export function AnalysisResult({ analysis }: { analysis: ChangeAnalysis }) {
  return (
    <div className="result-list">
      <article className="result-card">
        <h3>Risk level</h3>
        <p className={`risk-badge risk-badge--${analysis.riskLevel.toLowerCase()}`}>{analysis.riskLevel}</p>
        <p>{analysis.summary}</p>
      </article>

      <article className="result-card">
        <h3>Impacted areas</h3>
        {analysis.impactedAreas.length > 0 ? (
          <ul className="tag-list">
            {analysis.impactedAreas.map((area) => (
              <li key={area}>{area}</li>
            ))}
          </ul>
        ) : (
          <p>No specific areas were identified from this description.</p>
        )}
      </article>

      <article className="result-card">
        <h3>Recommended testing</h3>
        {groupByCategory(analysis.recommendedTests).map(([category, tests]) => (
          <div key={category} className="test-group">
            <h4>{category}</h4>
            <ul>
              {tests.map((test) => (
                <li key={test.description}>{test.description}</li>
              ))}
            </ul>
          </div>
        ))}
      </article>

      <article className="result-card">
        <h3>Why this rating</h3>
        {analysis.rationale.length > 0 ? (
          <ul className="rationale">
            {analysis.rationale.map((factor) => (
              <li key={factor.id}>
                {factor.description} <span className="weight">+{factor.weight}</span>
                <span className="evidence">matched: {factor.evidence.join(", ")}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>Nothing in the description matched a known risk area.</p>
        )}
        <p className="score-note">
          Total score {analysis.riskScore}, produced by <code>{analysis.analyserId}</code>.
        </p>
      </article>
    </div>
  );
}

function groupByCategory(tests: readonly RecommendedTest[]): [TestCategory, RecommendedTest[]][] {
  const groups = new Map<TestCategory, RecommendedTest[]>();

  for (const test of tests) {
    const existing = groups.get(test.category);
    if (existing) {
      existing.push(test);
    } else {
      groups.set(test.category, [test]);
    }
  }

  return [...groups.entries()];
}
