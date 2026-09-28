import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import FileInputButton from "./FileInputButton";

describe("FileInputButton", () => {
  it("offers the accepted types through a hidden input inside the button", () => {
    render(<FileInputButton label="Choose" accept={[".pgn", ".zip"]} onFiles={() => {}} testId="probe" />);
    const input = screen.getByTestId("probe-input") as HTMLInputElement;
    expect(input.type).toBe("file");
    expect(input.accept).toBe(".pgn,.zip");
    expect(input.hidden).toBe(true);
    expect(screen.getByTestId("probe")).toContainElement(input);
  });

  it("hands over the files picked, then empties the input so the same file reads again", () => {
    const onFiles = vi.fn();
    render(<FileInputButton label="Choose" accept=".pgn" onFiles={onFiles} testId="probe" />);
    const input = screen.getByTestId("probe-input") as HTMLInputElement;
    const file = new File(["1. e4 *"], "game.pgn");
    fireEvent.change(input, { target: { files: [file] } });
    expect(onFiles).toHaveBeenCalledWith([file]);
    expect(input.value).toBe("");
  });

  it("does nothing when the pick is cancelled", () => {
    const onFiles = vi.fn();
    render(<FileInputButton label="Choose" accept=".pgn" onFiles={onFiles} testId="probe" />);
    fireEvent.change(screen.getByTestId("probe-input"), { target: { files: [] } });
    expect(onFiles).not.toHaveBeenCalled();
  });
});
