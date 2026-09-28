import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";

import SnackbarProvider from "./SnackbarProvider";
import type { SnackbarApi } from "./snackbarContext";
import { EMPTY_SNACKBAR_QUEUE, snackbarQueue, type QueuedSnackbar } from "./snackbarQueue";
import { useSnackbar } from "./useSnackbar";

const entry = (key: number): QueuedSnackbar => ({ key, message: `m${key}` });

describe("snackbarQueue", () => {
  it("shows a message at once when nothing is on screen", () => {
    const state = snackbarQueue(EMPTY_SNACKBAR_QUEUE, { type: "show", message: entry(0) });
    expect(state).toMatchObject({ active: entry(0), open: true, pending: [] });
  });

  it("cuts the one on screen short for a newer one, which waits for it to leave", () => {
    let state = snackbarQueue(EMPTY_SNACKBAR_QUEUE, { type: "show", message: entry(0) });
    state = snackbarQueue(state, { type: "entered" });
    state = snackbarQueue(state, { type: "show", message: entry(1) });
    expect(state).toMatchObject({ active: entry(0), open: false, pending: [entry(1)] });
    state = snackbarQueue(state, { type: "show", message: entry(2) });
    expect(state.pending).toEqual([entry(1), entry(2)]);
    state = snackbarQueue(state, { type: "exited" });
    expect(state).toMatchObject({ active: entry(1), open: true, entered: false, pending: [entry(2)] });
  });

  it("lets a message that has not come in yet come in before it is cut short, so its exit runs", () => {
    let state = snackbarQueue(EMPTY_SNACKBAR_QUEUE, { type: "show", message: entry(0) });
    state = snackbarQueue(state, { type: "show", message: entry(1) });
    expect(state).toMatchObject({ active: entry(0), open: true, cut: true });
    state = snackbarQueue(state, { type: "entered" });
    expect(state.open).toBe(false);
  });

  it("closes, and empties once the last has left", () => {
    let state = snackbarQueue(EMPTY_SNACKBAR_QUEUE, { type: "show", message: entry(0) });
    state = snackbarQueue(state, { type: "close" });
    expect(state.open).toBe(false);
    expect(snackbarQueue(state, { type: "close" })).toBe(state);
    expect(snackbarQueue(state, { type: "exited" })).toEqual(EMPTY_SNACKBAR_QUEUE);
  });
});

/** The provider, and the api a child took from it. */
const mountProvider = () => {
  let api!: SnackbarApi;
  function Child() {
    api = useSnackbar();
    return null;
  }
  render(
    <SnackbarProvider testId="probe">
      <Child />
    </SnackbarProvider>,
  );
  return () => api;
};

describe("SnackbarProvider", () => {
  it("shows a plain message", () => {
    const api = mountProvider();
    act(() => api().show({ message: "Copied." }));
    expect(screen.getByTestId("probe-message")).toHaveTextContent("Copied.");
    expect(screen.getByTestId("probe").querySelector(".MuiAlert-root")).toBeNull();
    // Announced politely (CTA-111): a status, not MUI's alert.
    expect(screen.getByRole("status")).toHaveTextContent("Copied.");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows a message with a severity as a filled alert, under the message's own test id", () => {
    const api = mountProvider();
    act(() => api().show({ message: "Saved.", severity: "success", testId: "saved-notice" }));
    expect(screen.getByRole("status")).toHaveClass("MuiAlert-filled");
    expect(screen.getByTestId("saved-notice-message")).toHaveTextContent("Saved.");
  });

  it.each([
    ["error", "alert"],
    ["warning", "alert"],
    ["success", "status"],
    ["info", "status"],
  ] as const)("announces a %s message as %s (CTA-111)", (severity, role) => {
    const api = mountProvider();
    act(() => api().show({ message: "Words.", severity }));
    expect(screen.getByRole(role)).toHaveTextContent("Words.");
  });

  it("runs its action and closes", async () => {
    const api = mountProvider();
    const onClick = vi.fn();
    act(() => api().show({ message: "12 saved.", severity: "success", action: { label: "Open", onClick } }));
    fireEvent.click(screen.getByTestId("probe-action"));
    expect(onClick).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByTestId("probe")).toBeNull());
  });

  it("shows queued messages one after the other, in order", async () => {
    const api = mountProvider();
    act(() => {
      api().show({ message: "First" });
      api().show({ message: "Second" });
    });
    expect(screen.getByTestId("probe-message")).toHaveTextContent("First");
    await waitFor(() => expect(screen.getByTestId("probe-message")).toHaveTextContent("Second"));
  });

  it("hides a message after its duration", async () => {
    const api = mountProvider();
    act(() => api().show({ message: "Brief.", duration: 30 }));
    expect(screen.getByTestId("probe")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId("probe")).toBeNull());
  });

  it("is not dismissed by a click elsewhere", async () => {
    const api = mountProvider();
    act(() => api().show({ message: "Stay.", duration: null }));
    fireEvent.click(document.body);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.getByTestId("probe-message")).toHaveTextContent("Stay.");
  });
});

describe("useSnackbar", () => {
  it("refuses to work outside a provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useSnackbar())).toThrow(/SnackbarProvider/);
    spy.mockRestore();
  });
});
