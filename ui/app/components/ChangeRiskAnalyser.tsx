"use client";

import { DESCRIPTION_MAX_LENGTH, DESCRIPTION_MIN_LENGTH, type ChangeAnalysis } from "@dev-interview-challenge/shared";
import { useEffect, useRef, useState } from "react";

import { ApiClientError, analyseChange } from "../../lib/api-client";
import { AnalysisResult } from "./AnalysisResult";

const EXAMPLE = "Add the ability for administrators to reset another user's MFA configuration.";

type Status = "idle" | "loading" | "loaded" | "error";

/** Owns the interaction state for the feature; the rendering of a result lives in `AnalysisResult`. */
export function ChangeRiskAnalyser() {
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [analysis, setAnalysis] = useState<ChangeAnalysis | null>(null);
  const [error, setError] = useState<{ message: string; details: readonly string[] } | null>(null);
  const inFlight = useRef<AbortController | null>(null);

  const trimmed = description.trim();
  const canSubmit = trimmed.length >= DESCRIPTION_MIN_LENGTH && status !== "loading";

  // Drop any in-flight request if the feature unmounts, so a late response
  // cannot resolve against a component that is no longer on the page.
  useEffect(() => () => inFlight.current?.abort(), []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Submitting is blocked while a request is in flight, but abort defensively
    // so a superseded response can never overwrite a newer one.
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;

    setStatus("loading");
    setError(null);

    try {
      setAnalysis(await analyseChange(trimmed, controller.signal));
      setStatus("loaded");
    } catch (caught) {
      if (controller.signal.aborted) {
        return;
      }

      setError(
        caught instanceof ApiClientError
          ? { message: caught.message, details: caught.details }
          : { message: "Something went wrong while analysing the change.", details: [] }
      );
      setStatus("error");
    }
  }

  return (
    <div className="workspace">
      <form className="change-form" onSubmit={handleSubmit}>
        <label htmlFor="change-description">Describe the proposed change</label>
        <textarea
          id="change-description"
          name="description"
          rows={8}
          value={description}
          maxLength={DESCRIPTION_MAX_LENGTH}
          aria-describedby="change-description-hint"
          placeholder={EXAMPLE}
          onChange={(event) => setDescription(event.target.value)}
        />
        <p className="field-hint" id="change-description-hint">
          At least {DESCRIPTION_MIN_LENGTH} characters. The more specific the description, the more useful the analysis.
        </p>
        <button type="submit" disabled={!canSubmit}>
          {status === "loading" ? "Analysing…" : "Analyse change"}
        </button>
        <p className="integration-note">
          Analysis runs in the standalone API. Results are deterministic, so the same description always scores the same.
        </p>
      </form>

      <section className="results" aria-labelledby="results-title">
        <div className="results-heading">
          <h2 id="results-title">Assessment</h2>
        </div>

        <div aria-live="polite" aria-busy={status === "loading"}>
          {status === "idle" && (
            <div className="result-list">
              <article className="result-card">
                <h3>No analysis yet</h3>
                <p>Describe a change and run the analyser to see its risk level, impacted areas and recommended testing.</p>
              </article>
            </div>
          )}

          {status === "loading" && (
            <div className="result-list">
              <article className="result-card">
                <p>Analysing the change…</p>
              </article>
            </div>
          )}

          {status === "error" && error && (
            <div className="result-list">
              <article className="result-card error-card" role="alert">
                <h3>Analysis failed</h3>
                <p>{error.message}</p>
                {error.details.length > 0 && (
                  <ul>
                    {error.details.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                )}
              </article>
            </div>
          )}

          {status === "loaded" && analysis && <AnalysisResult analysis={analysis} />}
        </div>
      </section>
    </div>
  );
}
