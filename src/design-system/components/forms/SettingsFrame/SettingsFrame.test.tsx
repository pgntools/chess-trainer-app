import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";

import SettingsFrame from "./SettingsFrame";
import { useDraft } from "./useDraft";

describe("SettingsFrame", () => {
  const renderFrame = (props: { saveDisabled?: boolean; busy?: boolean } = {}) => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(
      <SettingsFrame onSave={onSave} onCancel={onCancel} saveLabel="Save" cancelLabel="Cancel" testId="probe" {...props}>
        <input data-testid="name" />
      </SettingsFrame>,
    );
    return { onSave, onCancel };
  };

  it("saves from its button and from Enter in a field (a form), and cancels", () => {
    const { onSave, onCancel } = renderFrame();
    fireEvent.click(screen.getByTestId("probe-save"));
    fireEvent.submit(screen.getByTestId("probe"));
    expect(onSave).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByTestId("probe-cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("probe-body")).toContainElement(screen.getByTestId("name"));
  });

  it("does not save while there is nothing to keep, nor while busy", () => {
    const { onSave } = renderFrame({ saveDisabled: true });
    fireEvent.submit(screen.getByTestId("probe"));
    expect(screen.getByTestId("probe-save")).toBeDisabled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("holds both buttons while busy", () => {
    renderFrame({ busy: true });
    expect(screen.getByTestId("probe-save")).toBeDisabled();
    expect(screen.getByTestId("probe-cancel")).toBeDisabled();
  });
});

describe("useDraft", () => {
  it("is dirty once changed, clean again when reset, and commits a new baseline", () => {
    const { result } = renderHook(() => useDraft({ name: "a", on: true }));
    expect(result.current.dirty).toBe(false);
    act(() => result.current.update({ name: "b" }));
    expect(result.current.draft).toEqual({ name: "b", on: true });
    expect(result.current.dirty).toBe(true);
    act(() => result.current.reset());
    expect(result.current.draft.name).toBe("a");
    expect(result.current.dirty).toBe(false);

    act(() => result.current.update({ on: false }));
    act(() => result.current.commit());
    expect(result.current.dirty).toBe(false);
    act(() => result.current.reset());
    expect(result.current.draft.on).toBe(false);
  });

  it("is clean again when an edit is undone by hand", () => {
    const { result } = renderHook(() => useDraft({ name: "a" }));
    act(() => result.current.update({ name: "b" }));
    act(() => result.current.update({ name: "a" }));
    expect(result.current.dirty).toBe(false);
  });
});
