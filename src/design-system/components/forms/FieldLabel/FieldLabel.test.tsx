import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import FieldLabel from "./FieldLabel";

describe("FieldLabel", () => {
  it("labels its control", () => {
    render(
      <>
        <FieldLabel htmlFor="fen">FEN</FieldLabel>
        <input id="fen" />
      </>,
    );
    expect(screen.getByLabelText("FEN")).toBe(document.getElementById("fen"));
  });

  it("heads a fieldset as its legend", () => {
    render(
      <fieldset>
        <FieldLabel component="legend" testId="probe">
          Castling
        </FieldLabel>
        <input type="checkbox" />
      </fieldset>,
    );
    expect(screen.getByTestId("probe").tagName).toBe("LEGEND");
    expect(screen.getByRole("group", { name: "Castling" })).toBeInTheDocument();
  });
});
