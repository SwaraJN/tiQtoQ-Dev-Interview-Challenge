# Change Risk Analyser — solution notes

A description of a proposed software change is submitted from the Next.js UI to a standalone
Fastify API, which returns a risk level, the areas potentially impacted, recommended testing
activities, and the reasoning behind the rating.

## Running it

Requires Node.js 22 LTS or later.

```bash
corepack enable
pnpm install
pnpm dev          # UI on http://localhost:3000, API on http://localhost:3001
```

Ports 3000 and 3001 must both be free. The UI port is pinned rather than left to Next's
default, because Next silently falls forward to the next free port when 3000 is taken — which
then fails CORS against the API's allowed origin, producing a confusing "cannot reach the API"
error instead of an obvious one. Pinned, a port clash fails immediately and says so.

Other commands:

```bash
pnpm dev:api      # API only
pnpm dev:ui       # UI only
pnpm test         # API unit and HTTP tests (37 tests)
pnpm typecheck    # type-check all three workspaces
pnpm lint         # lint the UI
pnpm build        # production UI build
```

### Configuration

All variables have working local defaults, so nothing needs to be set to run the app.

| Variable                   | Workspace | Default                 | Purpose                              |
| -------------------------- | --------- | ----------------------- | ------------------------------------ |
| `API_HOST`                 | api       | `127.0.0.1`             | Bind address                         |
| `API_PORT`                 | api       | `3001`                  | Bind port                            |
| `API_CORS_ORIGINS`         | api       | `http://localhost:3000` | Comma-separated allowed origins      |
| `API_LOG_LEVEL`            | api       | `info`                  | Fastify log level                    |
| `NEXT_PUBLIC_API_BASE_URL` | ui        | `http://localhost:3001` | Where the browser calls the API      |

Configuration is parsed and validated at startup, so a bad value fails immediately with a
readable message rather than at the first request.

## Architecture

```
shared/   Contracts: zod schemas and the types inferred from them
api/      Fastify API — the analysis lives here
ui/       Next.js UI — presentation only
```

The dependency direction is one-way: `ui` and `api` both depend on `shared`, and never on each
other. `shared` owns the wire format, so a contract change breaks the build on both sides at once
instead of failing silently at runtime.

Inside the API there are three layers:

| Layer       | Files                                          | Responsibility                              |
| ----------- | ---------------------------------------------- | ------------------------------------------- |
| HTTP        | `http/server.ts`, `http/*-route.ts`, `http/error-handler.ts` | Transport only: bind requests to the service, map errors to status codes |
| Application | `analysis/change-analysis-service.ts`          | Validates input and analyser output, translates failures into domain errors |
| Domain      | `analysis/rule-based-change-analyser.ts`, `risk-signals.ts`, `scoring.ts` | The actual analysis. No I/O, no framework types |

The domain layer has no dependency on Fastify or HTTP, which is what makes it cheap to test.
`main.ts` is the composition root and the only place that decides which analyser is used.

## How the analysis works

`risk-signals.ts` is a catalogue of heuristics. Each signal is pure data: patterns that indicate a
concern, a weight, the areas it affects, and the tests it implies. Scoring sums the weights of the
matched signals and maps the total onto a level (`>= 8` High, `>= 4` Medium, otherwise Low).

Adding coverage for a new concern means adding an entry to that array — no changes to the scoring,
the service, the route, or the UI. The thresholds live in a separate module so they can be tuned,
or later made per-team, without touching the matching rules.

Every result carries a `rationale`: which signals matched, what they contributed, and the exact
phrases in the description that triggered them. A risk rating a team cannot interrogate is a risk
rating they will ignore, so "why" is part of the contract rather than a nice-to-have.

## Error handling

- Invalid input never reaches the domain: the service validates against the shared schema first and
  raises a `ValidationError` (HTTP 400) listing which field failed and why.
- An analyser that throws is wrapped in an `AnalysisError` (HTTP 502). The underlying cause is
  attached for the logs but deliberately kept out of the response body — there is a test asserting
  internal detail does not leak.
- Anything that is not an `AppError` becomes a generic 500. Unrecognised faults are never echoed.
- Every error response uses the same `{ error: { code, message, details? } }` shape, so the UI has a
  machine-readable code to branch on rather than a string to parse.
- The UI treats a failure to reach the API differently from an error returned by the API, and
  supersedes an in-flight request when the form is resubmitted.

## Testing

37 tests, all against behaviour rather than implementation detail:

- **Scoring** — every threshold boundary, including both sides of each edge.
- **Analyser** — determinism, contract conformance, the three risk levels, evidence capture,
  deduplication and ordering of recommendations, and a regression test for a false positive
  (`"MFA configuration"` must not be read as an infrastructure change).
- **Service** — six shapes of invalid input, description trimming, analyser failure, a malformed
  analyser result, and async analyser support.
- **HTTP** — the success path, a 400, a malformed JSON body, a 502 that does not leak internals,
  CORS, and health.

HTTP tests use Fastify's `inject`, so they exercise the real routing, serialisation and error
handler without binding a port or needing a running server.

## On AI

The shipped analyser is deterministic. `ChangeAnalyser` is the seam an AI-backed implementation
would sit behind:

```ts
export interface ChangeAnalyser {
  readonly id: string;
  analyse(request: AnalyseChangeRequest): Promise<ChangeAnalysis> | ChangeAnalysis;
}
```

Switching to one is a single line in `main.ts`. The guard rails are already in place and already
tested: the service validates whatever an analyser returns against `changeAnalysisSchema` before it
leaves the API, and treats a throw as a 502. Those tests pass today using stub analysers that return
malformed output or fail — the same paths an AI provider would exercise.

I chose not to ship a provider integration I could not demonstrate running end to end. A rule engine
also gives something an LLM does not: the same description always produces the same rating, which
matters if a team is going to build process around the output.

## Assumptions

- One analysis at a time, no persistence. There is no user, project or history concept, so nothing
  needs a database yet.
- English-language descriptions, one change per submission.
- Keyword matching is a heuristic, and the UI says so. It is a prompt for a testing conversation,
  not a gate.
- The weights and thresholds are a starting point calibrated against the brief's example. They are
  the first thing a real team would tune.

## Note on a pre-existing issue

`pnpm lint` did not run on a clean checkout — the `FlatCompat` bridge in `ui/eslint.config.mjs`
crashed against `eslint-config-next` 16, which ships native flat configs. I replaced the bridge with
direct imports and removed the now-unused `@eslint/eslintrc` dependency. This is unrelated to the
feature, but the alternative was submitting work I could not lint.

## What I would improve with more time

- **Component tests for the UI.** The API is well covered; the React layer is verified manually.
  React Testing Library over `ChangeRiskAnalyser` with a stubbed client would cover the loading,
  error and success states.
- **Move the signal catalogue out of code.** Weights and phrasing are the part a team will want to
  edit weekly. As configuration, with the schema validating it at startup, tuning would stop being a
  deploy.
- **Better matching.** Word-list matching cannot tell "remove the delete button" from "delete the
  user's data". Stemming, negation handling, and phrase-level rules would all reduce noise — and are
  the point at which an LLM starts earning its non-determinism.
- **Observability.** Request IDs through to the analyser, and timing per analysis. Necessary before
  a non-deterministic provider is added, because "why did it say that yesterday" becomes a real
  question.
- **A confidence signal.** A change matching one weak keyword and one matching six strong ones both
  return a level today; the second deserves more trust and the UI should say so.
- **Deployment.** Both workspaces containerise cleanly; the API is stateless and horizontally
  scalable. Aspire would tidy up the two-process local setup.
