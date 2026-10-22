import { beforeEach, describe, expect, it } from "vitest";
import { render, renderHook, screen } from "@testing-library/react";

import i18n from "../../../i18n";
import { expectNoAxeViolations } from "../../../test/axe";
import { HELD_EMPTY, HELD_QUEUED, JOBS_AFTER, JOBS_BEFORE, JOBS_PROGRESSED, LIVE_WORDS, RUNNING } from "./fixtures";
import { useJobStatusAnnouncement, type AnnouncedJob } from "./jobStatusAnnouncement";
import JobsIndicatorView, { type JobsIndicatorViewProps } from "./JobsIndicatorView";

const mount = (props: Partial<JobsIndicatorViewProps> = {}) =>
  render(<JobsIndicatorView queuedCount={0} link={{ href: "/jobs" }} compact={false} announcement="" testId="indicator" {...props} />);

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("JobsIndicatorView (CTA-217)", () => {
  it("links to the Jobs screen with the running job's progress, its title out of sight", async () => {
    mount({ running: RUNNING, queuedCount: 2 });
    const link = screen.getByRole("link", { name: "Jobs 12/80, Carlsen – Nepomniachtchi" });
    expect(link).toHaveAttribute("href", "/jobs");
    expect(screen.getByTestId("indicator-heartbeat")).toHaveAttribute("data-live", "false");
    await expectNoAxeViolations();
  });

  it("is an icon alone when compact, named in full with the live words", () => {
    mount({ running: RUNNING, compact: true, liveWords: LIVE_WORDS });
    expect(screen.getByRole("link", { name: `Jobs: Carlsen – Nepomniachtchi, 12 of 80, ${LIVE_WORDS}` })).toHaveAttribute("href", "/jobs");
  });

  it("counts the queue when none runs, and shows nothing when none waits", () => {
    const { unmount } = mount({ queuedCount: 3 });
    expect(screen.getByRole("link", { name: "Jobs: 3 queued" })).toBeInTheDocument();
    unmount();
    mount();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("says its announcement in its status region", () => {
    mount({ announcement: "Job finished: Carlsen – Nepomniachtchi." });
    expect(screen.getByRole("status")).toHaveTextContent("Job finished: Carlsen – Nepomniachtchi.");
  });

  it("beats its spinner each time the engine is heard", () => {
    const { rerender } = mount({ running: RUNNING, heardAt: 1_000 });
    expect(screen.getByTestId("indicator-heartbeat")).toHaveAttribute("data-pulse", "0");
    rerender(<JobsIndicatorView running={RUNNING} heardAt={5_000} queuedCount={0} link={{ href: "/jobs" }} compact={false} announcement="" testId="indicator" />);
    expect(screen.getByTestId("indicator-heartbeat")).toHaveAttribute("data-pulse", "1");
    expect(screen.getByTestId("indicator-heartbeat")).toHaveAttribute("data-live", "true");
  });

  it("takes the reader's words in Hebrew", async () => {
    await i18n.changeLanguage("he");
    mount({ queuedCount: 2 });
    expect(screen.getByRole("link", { name: "משימות: 2 בתור" })).toBeInTheDocument();
  });
});

describe("JobsIndicatorView — the queue held (CTA-258)", () => {
  it("says the queue is paused, with the count queued — a pause icon for the spinner, no progress", async () => {
    mount({ ...HELD_QUEUED, running: RUNNING, heardAt: 1_000 });
    const link = screen.getByRole("link", { name: "Jobs paused: 3 queued" });
    expect(link).toHaveAttribute("href", "/jobs");
    expect(link).toHaveAttribute("data-held", "true");
    expect(screen.getByTestId("indicator-held")).toBeInTheDocument();
    expect(screen.queryByTestId("indicator-heartbeat")).toBeNull();
    await expectNoAxeViolations();
  });

  it("is shown with nothing waiting — a job queued now would not start", () => {
    mount(HELD_EMPTY);
    expect(screen.getByRole("link", { name: "Jobs paused" })).toBeInTheDocument();
  });

  it("is an icon alone when compact, named in full — in Hebrew too", async () => {
    const { unmount } = mount({ ...HELD_QUEUED, compact: true });
    expect(screen.getByRole("link", { name: "Jobs paused: 3 queued" })).toBeInTheDocument();
    unmount();
    await i18n.changeLanguage("he");
    mount({ ...HELD_QUEUED, compact: true });
    expect(screen.getByRole("link", { name: "משימות מושהות: 3 בתור" })).toBeInTheDocument();
  });
});

describe("useJobStatusAnnouncement (CTA-217)", () => {
  it("says a status reached — not the first read, not a job that only moved on", () => {
    const { result, rerender } = renderHook(({ jobs }: { jobs: readonly AnnouncedJob[] | undefined }) => useJobStatusAnnouncement(jobs), {
      initialProps: { jobs: undefined as readonly AnnouncedJob[] | undefined },
    });
    expect(result.current).toBe("");
    rerender({ jobs: JOBS_BEFORE });
    expect(result.current).toBe("");
    rerender({ jobs: JOBS_PROGRESSED });
    expect(result.current).toBe("");
    rerender({ jobs: JOBS_AFTER });
    expect(result.current).toBe("Job finished: Carlsen – Nepomniachtchi.");
  });

  it("says a job started, but never one queued", () => {
    const { result, rerender } = renderHook(({ jobs }: { jobs: readonly AnnouncedJob[] }) => useJobStatusAnnouncement(jobs), {
      initialProps: { jobs: [] as readonly AnnouncedJob[] },
    });
    rerender({ jobs: [{ id: "c", title: "Anand – Kramnik", status: "queued" }] });
    expect(result.current).toBe("");
    rerender({ jobs: [{ id: "c", title: "Anand – Kramnik", status: "running" }] });
    expect(result.current).toBe("Job started: Anand – Kramnik.");
  });

  it("says the queue held and resumed (CTA-258) — not on its first read, nor for the job it hands back to the queue", () => {
    type Props = { jobs: readonly AnnouncedJob[]; held: boolean | undefined };
    const running: readonly AnnouncedJob[] = [{ id: "c", title: "Anand – Kramnik", status: "running" }];
    const { result, rerender } = renderHook(({ jobs, held }: Props) => useJobStatusAnnouncement(jobs, held), {
      initialProps: { jobs: running, held: undefined } as Props,
    });
    rerender({ jobs: running, held: false });
    expect(result.current).toBe("");
    rerender({ jobs: running, held: true });
    expect(result.current).toBe("Job queue paused.");
    rerender({ jobs: [{ ...running[0], status: "queued" }], held: true });
    expect(result.current).toBe("Job queue paused.");
    rerender({ jobs: [{ ...running[0], status: "queued" }], held: false });
    expect(result.current).toBe("Job queue resumed.");
    rerender({ jobs: running, held: false });
    expect(result.current).toBe("Job started: Anand – Kramnik.");
  });
});
