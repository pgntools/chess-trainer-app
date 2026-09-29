import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import KeyValueList from "./KeyValueList";

describe("KeyValueList", () => {
  it("is a description list: each name a term, each value its definition, pinned as asked", () => {
    render(
      <KeyValueList
        rows={[
          { id: "date", label: "Date", value: "2021.12.03", dir: "ltr" },
          { id: "note", label: "Note", value: "Sharp" },
        ]}
        testId="probe"
      />,
    );
    const list = screen.getByTestId("probe");
    expect(list.tagName).toBe("DL");
    expect(within(list).getAllByRole("term").map((term) => term.textContent)).toEqual(["Date", "Note"]);
    expect(within(list).getAllByRole("definition").map((value) => value.textContent)).toEqual(["2021.12.03", "Sharp"]);
    expect(screen.getByTestId("probe-date")).toHaveAttribute("dir", "ltr");
    expect(screen.getByTestId("probe-note")).not.toHaveAttribute("dir");
  });
});
