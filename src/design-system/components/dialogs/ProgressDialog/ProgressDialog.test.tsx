import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";

import ProgressDialog from "./ProgressDialog";
import { useCancellableJob, type JobProgress } from "./useCancellableJob";

/** A promise resolved (or rejected) from outside. */
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};

describe("ProgressDialog", () => {
  it("draws a determinate bar from the progress, with its caption", () => {
    render(
      <ProgressDialog
        open
        title="Importing"
        progress={{ done: 1, total: 4 }}
        caption="1 of 4"
        cancelLabel="Cancel"
        onCancel={() => {}}
        testId="probe"
      />,
    );
    expect(screen.getByTestId("probe-progress")).toHaveAttribute("aria-valuenow", "25");
    expect(screen.getByTestId("probe-caption")).toHaveTextContent("1 of 4");
  });

  it("draws an indeterminate bar before the first report", () => {
    render(<ProgressDialog open title="Importing" cancelLabel="Cancel" onCancel={() => {}} testId="probe" />);
    expect(screen.getByTestId("probe-progress")).not.toHaveAttribute("aria-valuenow");
  });

  it("cancels from the button and Escape, and from neither while writing", () => {
    const onCancel = vi.fn();
    const { rerender } = render(
      <ProgressDialog open title="Importing" cancelLabel="Cancel" onCancel={onCancel} testId="probe" />,
    );
    fireEvent.click(screen.getByTestId("probe-cancel"));
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(2);

    rerender(<ProgressDialog open title="Importing" cancelLabel="Cancel" onCancel={onCancel} cancelDisabled testId="probe" />);
    expect(screen.getByTestId("probe-cancel")).toBeDisabled();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(2);
  });
});

describe("useCancellableJob", () => {
  it("works, reports progress, writes, and answers done", async () => {
    const { result } = renderHook(() => useCancellableJob());
    const work = deferred<number>();
    const write = deferred<string>();
    let report!: (progress: JobProgress) => void;

    let outcome!: Promise<unknown>;
    act(() => {
      outcome = result.current.run({
        work: (_signal, onProgress) => {
          report = onProgress;
          return work.promise;
        },
        write: (value) => write.promise.then((suffix) => `${value}${suffix}`),
      });
    });
    expect(result.current.phase).toBe("working");
    act(() => report({ done: 2, total: 5 }));
    expect(result.current.progress).toEqual({ done: 2, total: 5 });

    await act(async () => work.resolve(7));
    expect(result.current.phase).toBe("writing");
    expect(result.current.cancel()).toBe(false);

    await act(async () => write.resolve("!"));
    await expect(outcome).resolves.toEqual({ status: "done", value: "7!" });
    expect(result.current.phase).toBe("idle");
    expect(result.current.progress).toBeNull();
  });

  it("cancels the work: the signal aborts and the run answers cancelled, whatever the work throws", async () => {
    const { result } = renderHook(() => useCancellableJob());
    const work = deferred<number>();
    const write = vi.fn(async () => "never");
    let signal!: AbortSignal;
    let outcome!: Promise<unknown>;
    act(() => {
      outcome = result.current.run({
        work: (given) => {
          signal = given;
          return work.promise;
        },
        write,
      });
    });
    act(() => {
      expect(result.current.cancel()).toBe(true);
    });
    expect(signal.aborted).toBe(true);
    expect(result.current.phase).toBe("idle");
    await act(async () => work.reject(new Error("aborted")));
    await expect(outcome).resolves.toEqual({ status: "cancelled" });
    expect(write).not.toHaveBeenCalled();
  });

  it("answers failed when the work throws on its own", async () => {
    const { result } = renderHook(() => useCancellableJob());
    const failure = new Error("bad file");
    let outcome!: Promise<unknown>;
    act(() => {
      outcome = result.current.run({ work: async () => Promise.reject(failure) });
    });
    await act(async () => {
      await expect(outcome).resolves.toEqual({ status: "failed", error: failure });
    });
    expect(result.current.phase).toBe("idle");
  });

  it("stops the work when the component goes away", () => {
    const { result, unmount } = renderHook(() => useCancellableJob());
    let signal!: AbortSignal;
    act(() => {
      void result.current.run({
        work: (given) => {
          signal = given;
          return new Promise(() => {});
        },
      });
    });
    unmount();
    expect(signal.aborted).toBe(true);
  });
});
