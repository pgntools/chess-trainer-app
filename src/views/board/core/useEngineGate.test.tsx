import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import AppThemeWithLang from "../../../theme/AppThemeWithLang";
import { expectNoAxeViolations } from "../../../test/axe";
import EngineGateHost from "./EngineGateHost";
import { useEngineGate, type EngineGateStart } from "./useEngineGate";

/*
  The jobs as the gate reads them — a store the test writes, in place of the
  page's runtime (`engineGateJobs.ts`, the one seam).
*/
const jobs = vi.hoisted(() => {
  type Record = { id: string; lane: string; status: string; control?: "pause" | "cancel"; title: string };
  let records: readonly Record[] | undefined;
  const listeners = new Set<() => void>();
  return {
    set: (next: readonly Record[] | undefined) => {
      records = next;
      listeners.forEach((listener) => listener());
    },
    read: () => records,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    pause: vi.fn<(id: string) => Promise<undefined>>(async () => undefined),
  };
});

vi.mock("./engineGateJobs", async () => {
  const { useSyncExternalStore } = await import("react");
  return {
    useEngineGateJobs: () => useSyncExternalStore(jobs.subscribe, jobs.read, jobs.read),
    pauseEngineJob: (id: string) => jobs.pause(id),
  };
});

const ANALYSIS = { id: "job-1", lane: "engine", status: "running", title: "Computer analysis — game 6" };

/** A board's switch, as a session holds it: what it says, and its on / off. */
function Board({ name, start }: { name: string; start?: EngineGateStart }) {
  const gate = useEngineGate(start);
  return (
    <div>
      <span data-testid={`${name}-state`}>{`${gate.engineOn ? "on" : "off"} ${gate.engineRuns ? "runs" : "idle"}`}</span>
      <button type="button" onClick={() => gate.setEngineOn(!gate.engineOn)}>
        {`${name} engine`}
      </button>
    </div>
  );
}

const mount = (...boards: { name: string; start?: EngineGateStart }[]) =>
  render(
    <AppThemeWithLang>
      {boards.map((board) => (
        <Board key={board.name} {...board} />
      ))}
      <EngineGateHost />
    </AppThemeWithLang>,
  );

const state = (name: string) => screen.getByTestId(`${name}-state`).textContent;

afterEach(() => {
  jobs.set(undefined);
  jobs.pause.mockClear();
});

describe("useEngineGate", () => {
  it("turns the engine on and off while no job runs", async () => {
    const user = userEvent.setup();
    jobs.set([]);
    mount({ name: "case" });
    expect(state("case")).toBe("off idle");
    await user.click(screen.getByRole("button", { name: "case engine" }));
    expect(state("case")).toBe("on runs");
    await user.click(screen.getByRole("button", { name: "case engine" }));
    expect(state("case")).toBe("off idle");
  });

  it("asks before the engine goes on while an engine job runs — Wait leaves it off, and asks again", async () => {
    const user = userEvent.setup();
    jobs.set([ANALYSIS]);
    mount({ name: "case" });
    await user.click(screen.getByRole("button", { name: "case engine" }));
    const dialog = await screen.findByRole("dialog", { name: "An engine job is running" });
    expect(dialog).toHaveTextContent("“Computer analysis — game 6” is running its engine.");
    // Asked for, not started: the switch reads on through the question, the engine does not run.
    expect(state("case")).toBe("on idle");
    await expectNoAxeViolations(dialog);

    await user.click(screen.getByRole("button", { name: "Wait for it to finish" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(state("case")).toBe("off idle");
    expect(jobs.pause).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "case engine" }));
    expect(await screen.findByRole("dialog", { name: "An engine job is running" })).toBeInTheDocument();
  });

  it("pauses the job on Pause the job, and runs the engine once the job has stopped", async () => {
    const user = userEvent.setup();
    jobs.set([ANALYSIS]);
    mount({ name: "case" });
    await user.click(screen.getByRole("button", { name: "case engine" }));
    await user.click(await screen.findByRole("button", { name: "Pause the job" }));
    expect(jobs.pause).toHaveBeenCalledExactlyOnceWith("job-1");
    // Asked to pause, it runs out its step: the switch is on, the engine waits — and is not switched off.
    act(() => jobs.set([{ ...ANALYSIS, control: "pause" }]));
    expect(state("case")).toBe("on idle");
    act(() => jobs.set([{ ...ANALYSIS, status: "paused", control: undefined }]));
    expect(state("case")).toBe("on runs");
    expect(screen.queryByTestId("engine-gate-switched-off")).not.toBeInTheDocument();
  });

  it("switches the engine off, said in a snackbar, when a job starts", async () => {
    const user = userEvent.setup();
    jobs.set([{ ...ANALYSIS, status: "queued" }]);
    mount({ name: "case" });
    await user.click(screen.getByRole("button", { name: "case engine" }));
    expect(state("case")).toBe("on runs");
    act(() => jobs.set([ANALYSIS]));
    expect(state("case")).toBe("off idle");
    expect(await screen.findByTestId("engine-gate-switched-off")).toHaveTextContent(
      "The board's engine is off: “Computer analysis — game 6” is running its engine.",
    );
  });

  it("switches the engine off when the job it paused is resumed later", async () => {
    const user = userEvent.setup();
    jobs.set([ANALYSIS]);
    mount({ name: "case" });
    await user.click(screen.getByRole("button", { name: "case engine" }));
    await user.click(await screen.findByRole("button", { name: "Pause the job" }));
    act(() => jobs.set([{ ...ANALYSIS, status: "paused" }]));
    expect(state("case")).toBe("on runs");
    act(() => jobs.set([ANALYSIS]));
    expect(state("case")).toBe("off idle");
  });

  it("goes on when the job stops while the dialog asks", async () => {
    const user = userEvent.setup();
    jobs.set([ANALYSIS]);
    mount({ name: "case" });
    await user.click(screen.getByRole("button", { name: "case engine" }));
    await screen.findByRole("dialog");
    act(() => jobs.set([{ ...ANALYSIS, status: "done" }]));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(state("case")).toBe("on runs");
  });

  it("holds a board starting on until the jobs are read, then asks while a job runs", async () => {
    mount({ name: "play", start: { initialOn: true } });
    expect(state("play")).toBe("on idle");
    act(() => jobs.set([ANALYSIS]));
    expect(await screen.findByRole("dialog", { name: "An engine job is running" })).toBeInTheDocument();
    expect(state("play")).toBe("on idle");
    await userEvent.setup().click(screen.getByRole("button", { name: "Wait for it to finish" }));
    expect(state("play")).toBe("off idle");
  });

  it("starts a board starting on once the jobs are read and none runs", () => {
    mount({ name: "play", start: { initialOn: true } });
    act(() => jobs.set([]));
    expect(state("play")).toBe("on runs");
  });

  it("keeps one board engine on: turning one on switches the other off", async () => {
    const user = userEvent.setup();
    jobs.set([]);
    mount({ name: "first" }, { name: "second" });
    await user.click(screen.getByRole("button", { name: "first engine" }));
    expect(state("first")).toBe("on runs");
    await user.click(screen.getByRole("button", { name: "second engine" }));
    expect(state("second")).toBe("on runs");
    expect(state("first")).toBe("off idle");
  });
});
