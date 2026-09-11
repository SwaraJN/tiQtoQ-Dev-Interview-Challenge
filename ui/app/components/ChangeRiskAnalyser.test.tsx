import type { ChangeAnalysis } from "@dev-interview-challenge/shared";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiClientError } from "../../lib/api-client";
import { ChangeRiskAnalyser } from "./ChangeRiskAnalyser";

const { analyseChange } = vi.hoisted(() => ({ analyseChange: vi.fn() }));

vi.mock("../../lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/api-client")>()),
  analyseChange
}));

const DESCRIPTION = "Add the ability for administrators to reset another user's MFA configuration.";

const ANALYSIS: ChangeAnalysis = {
  riskLevel: "High",
  riskScore: 11,
  summary: "High risk: 3 concerns detected.",
  impactedAreas: ["Authentication", "Audit logging"],
  recommendedTests: [{ category: "Security", description: "Verify only administrators can reset MFA." }],
  rationale: [{ id: "authentication", description: "Touches authentication", weight: 4, evidence: ["mfa"] }],
  analyserId: "rule-based-v1"
};

const textbox = () => screen.getByRole("textbox", { name: /describe the proposed change/i });
const submit = () => screen.getByRole("button", { name: /analyse change/i });

beforeEach(() => {
  analyseChange.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ChangeRiskAnalyser", () => {
  it("starts with an empty assessment and nothing to submit", () => {
    render(<ChangeRiskAnalyser />);

    expect(screen.getByText(/No analysis yet/)).toBeInTheDocument();
    expect(submit()).toBeDisabled();
  });

  it("keeps submission disabled until the description is long enough", async () => {
    const user = userEvent.setup();
    render(<ChangeRiskAnalyser />);

    await user.type(textbox(), "too short");
    expect(submit()).toBeDisabled();

    await user.type(textbox(), " but now it is long enough");
    expect(submit()).toBeEnabled();

    expect(analyseChange).not.toHaveBeenCalled();
  });

  it("renders the analysis returned by the API", async () => {
    const user = userEvent.setup();
    analyseChange.mockResolvedValue(ANALYSIS);
    render(<ChangeRiskAnalyser />);

    await user.type(textbox(), DESCRIPTION);
    await user.click(submit());

    expect(await screen.findByText("High")).toBeInTheDocument();
    expect(screen.getByText("Authentication")).toBeInTheDocument();
    expect(screen.getByText("Verify only administrators can reset MFA.")).toBeInTheDocument();
    expect(screen.queryByText(/No analysis yet/)).not.toBeInTheDocument();
  });

  it("sends the trimmed description to the API", async () => {
    const user = userEvent.setup();
    analyseChange.mockResolvedValue(ANALYSIS);
    render(<ChangeRiskAnalyser />);

    await user.type(textbox(), `   ${DESCRIPTION}   `);
    await user.click(submit());

    await waitFor(() => expect(analyseChange).toHaveBeenCalled());
    expect(analyseChange.mock.calls[0][0]).toBe(DESCRIPTION);
  });

  it("shows a busy state while the request is in flight", async () => {
    const user = userEvent.setup();
    let resolve: (value: ChangeAnalysis) => void = () => {};
    analyseChange.mockReturnValue(new Promise<ChangeAnalysis>((r) => { resolve = r; }));
    render(<ChangeRiskAnalyser />);

    await user.type(textbox(), DESCRIPTION);
    await user.click(submit());

    expect(await screen.findByText("Analysing the change…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /analysing/i })).toBeDisabled();

    resolve(ANALYSIS);
    expect(await screen.findByText("High")).toBeInTheDocument();
  });

  it("shows the API's message and details when analysis is rejected", async () => {
    const user = userEvent.setup();
    analyseChange.mockRejectedValue(
      new ApiClientError("The change description is not valid.", ["description: too short"])
    );
    render(<ChangeRiskAnalyser />);

    await user.type(textbox(), DESCRIPTION);
    await user.click(submit());

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("The change description is not valid.");
    expect(alert).toHaveTextContent("description: too short");
  });

  it("shows a generic message when the failure is not an API error", async () => {
    const user = userEvent.setup();
    analyseChange.mockRejectedValue(new Error("boom"));
    render(<ChangeRiskAnalyser />);

    await user.type(textbox(), DESCRIPTION);
    await user.click(submit());

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/Something went wrong/);
    expect(alert).not.toHaveTextContent("boom");
  });

  it("clears a previous error once a later attempt succeeds", async () => {
    const user = userEvent.setup();
    analyseChange.mockRejectedValueOnce(new ApiClientError("API unreachable."));
    render(<ChangeRiskAnalyser />);

    await user.type(textbox(), DESCRIPTION);
    await user.click(submit());
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    analyseChange.mockResolvedValue(ANALYSIS);
    await user.click(submit());

    expect(await screen.findByText("High")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("aborts an in-flight request when the feature unmounts", async () => {
    const user = userEvent.setup();
    analyseChange.mockReturnValue(new Promise<ChangeAnalysis>(() => {}));
    const { unmount } = render(<ChangeRiskAnalyser />);

    await user.type(textbox(), DESCRIPTION);
    await user.click(submit());

    const signal = analyseChange.mock.calls[0][1] as AbortSignal;
    expect(signal.aborted).toBe(false);

    unmount();

    expect(signal.aborted).toBe(true);
  });
});
