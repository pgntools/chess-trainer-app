import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import type { Job } from "../../../lib/jobs";
import { expectNoAxeViolations } from "../../../test/axe";
import { DONE, FAILED, RUNNING, UNSAVED } from "./fixtures";
import JobSummary from "./JobSummary";

const mount = (job: Job) => {
  const handlers = { onCancel: vi.fn(), onPause: vi.fn(), onResume: vi.fn(), onDelete: vi.fn() };
  render(
    <JobSummary
      job={job}
      sourceLink={job.source.analysisId === null ? undefined : { href: `/tools/analysis?analysis=${job.source.analysisId}` }}
      outputLink={(output) => ({ href: `/tools/analysis?analysis=${output.analysisId}` })}
      {...handlers}
      testId="job"
    >
      <p>the report</p>
    </JobSummary>,
  );
  return handlers;
};

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("JobSummary (CTA-173)", () => {
  it("names the game, its status and its progress with the move searched", () => {
    mount(RUNNING);
    expect(screen.getByRole("heading", { level: 2, name: "Carlsen – Nepomniachtchi" })).toBeInTheDocument();
    expect(screen.getByTestId("job-status")).toHaveTextContent("Running");
    expect(screen.getByTestId("job-progress")).toHaveTextContent("2 of 7 positions · 2. Nf3");
  });

  it("opens on Results, what goes under it; Parameters lists the engine and every option it was given (CTA-178)", async () => {
    const user = userEvent.setup();
    mount(DONE);
    const tabs = screen.getByRole("tablist", { name: "Job details" });
    expect(screen.getByRole("tab", { name: "Results", selected: true })).toBeInTheDocument();
    expect(screen.getByRole("tabpanel", { name: "Results" })).toHaveTextContent("the report");
    expect(screen.queryByTestId("job-facts")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Parameters" }));
    expect(tabs).toBeInTheDocument();
    expect(screen.getByRole("tabpanel", { name: "Parameters" })).not.toHaveTextContent("the report");
    expect(screen.getByTestId("job-facts-engine")).toHaveTextContent("Stockfish 19 Lite (multi-thread)");
    expect(screen.getByTestId("job-facts-depth")).toHaveTextContent("22");
    expect(screen.getByTestId("job-facts-time")).toHaveTextContent("15 s");
    expect(screen.getByTestId("job-facts-lines")).toHaveTextContent("3");
    expect(screen.getByTestId("job-facts-threads")).toHaveTextContent("4");
    expect(screen.getByTestId("job-facts-hash")).toHaveTextContent("256 MB");
    expect(screen.getByTestId("job-facts-side")).toHaveTextContent("Both sides");
    expect(screen.getByTestId("job-facts-moves")).toHaveTextContent("From move 1 to the end");
    expect(screen.getByTestId("job-facts-variants")).toHaveTextContent("Light, Medium");
  });

  it("links to the source and to each output, and shows what goes under it", () => {
    mount(DONE);
    expect(screen.getByRole("link", { name: "Open the analysed game" })).toHaveAttribute("href", "/tools/analysis?analysis=analysis-1");
    expect(screen.getByRole("link", { name: "Open the Light analysis" })).toHaveAttribute("href", "/tools/analysis?analysis=out-light");
    expect(screen.getByRole("link", { name: "Open the Medium analysis" })).toHaveAttribute("href", "/tools/analysis?analysis=out-medium");
    expect(screen.getByText("the report")).toBeInTheDocument();
  });

  it("has no source link for a board never saved, and calls the game untitled", () => {
    mount(UNSAVED);
    expect(screen.queryByRole("link", { name: "Open the analysed game" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Untitled game" })).toBeInTheDocument();
  });

  it("says why a job failed, and offers Resume and Delete but no Cancel", async () => {
    const user = userEvent.setup();
    const handlers = mount(FAILED);
    expect(screen.getByRole("alert")).toHaveTextContent("The engine stopped answering");
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Resume" }));
    expect(handlers.onResume).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(handlers.onDelete).toHaveBeenCalled();
  });

  it("offers Pause and Cancel on a running job", async () => {
    const user = userEvent.setup();
    const handlers = mount(RUNNING);
    await user.click(screen.getByRole("button", { name: "Pause" }));
    expect(handlers.onPause).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(handlers.onCancel).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Resume" })).not.toBeInTheDocument();
  });

  it("offers Resume and Cancel on a paused job, but no Pause (CTA-178)", async () => {
    const user = userEvent.setup();
    const handlers = mount({ ...RUNNING, status: "paused" });
    expect(screen.getByText("Paused")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pause" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Resume" }));
    expect(handlers.onResume).toHaveBeenCalled();
  });

  it("passes axe", async () => {
    mount(DONE);
    await expectNoAxeViolations();
  });
});
