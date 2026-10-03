import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import type { ReactNode } from "react";

import { expectNoAxeViolations } from "../../../../test/axe";
import ResultMark from "./ResultMark";
import { RESULT_GLYPHS, type ResultOutcome } from "./resultGlyphs";

const inCell = (marks: ReactNode) =>
  render(
    <Table aria-label="Results">
      <TableBody>
        <TableRow>
          <TableCell>{marks}</TableCell>
        </TableRow>
      </TableBody>
    </Table>,
  );

const OUTCOMES: [ResultOutcome, string][] = [
  ["win", "1"],
  ["draw", "½"],
  ["loss", "0"],
  ["unfinished", "*"],
  ["none", "–"],
];

describe("ResultMark", () => {
  it.each(OUTCOMES)("writes a %s as %s, pinned left to right", (outcome, glyph) => {
    inCell(<ResultMark outcome={outcome} label="Round 1" testId="probe" />);
    const mark = screen.getByTestId("probe");
    expect(mark).toHaveAttribute("data-outcome", outcome);
    expect(mark.querySelector("[aria-hidden]")).toHaveTextContent(glyph);
    expect(mark.querySelector("[aria-hidden]")).toHaveAttribute("dir", "ltr");
    expect(RESULT_GLYPHS[outcome]).toBe(glyph);
  });

  it("is read by its words, the glyph left out — the cell is named by them", () => {
    inCell(<ResultMark outcome="win" label="Round 3, against Ada Lovelace: win" testId="probe" />);
    expect(screen.getByRole("cell", { name: "Round 3, against Ada Lovelace: win" })).toBeInTheDocument();
    // In the glyph's place and out of sight: positioned against the mark, so it scrolls with its table.
    expect(screen.getByText("Round 3, against Ada Lovelace: win")).toHaveStyle({ position: "absolute" });
    expect(screen.getByTestId("probe")).toHaveStyle({ position: "relative" });
  });

  it("names a cell of several marks by each of them, in order — a space between keeps their words apart", () => {
    inCell(
      <>
        <ResultMark outcome="draw" label="Round 2: draw" /> <ResultMark outcome="win" label="Round 9: win" />
      </>,
    );
    expect(screen.getByRole("cell", { name: "Round 2: draw Round 9: win" })).toBeInTheDocument();
  });

  it("tells an unfinished game from no game by the glyph and by the words", () => {
    inCell(
      <>
        <ResultMark outcome="unfinished" label="Round 4: unfinished" testId="open" />
        <ResultMark outcome="none" label="Round 5: no game" testId="none" />
      </>,
    );
    expect(screen.getByTestId("open")).toHaveTextContent("*");
    expect(screen.getByTestId("none")).toHaveTextContent("–");
    expect(screen.getByText("Round 4: unfinished")).toBeInTheDocument();
    expect(screen.getByText("Round 5: no game")).toBeInTheDocument();
  });

  it("sets a win in bold — the tone is not the only signal", () => {
    inCell(
      <>
        <ResultMark outcome="win" label="win" testId="win" />
        <ResultMark outcome="loss" label="loss" testId="loss" />
      </>,
    );
    expect(screen.getByTestId("win").querySelector("[aria-hidden]")).toHaveStyle({ fontWeight: 700 });
    expect(screen.getByTestId("loss").querySelector("[aria-hidden]")).not.toHaveStyle({ fontWeight: 700 });
  });

  it("shows a caller's own glyph in the outcome's tone, read by its words all the same (CTA-128)", () => {
    inCell(<ResultMark outcome="win" glyph="4½" label="Round 1, against Turing Club: 4½–1½, won" testId="probe" />);
    const glyph = screen.getByTestId("probe").querySelector("[aria-hidden]");
    expect(glyph).toHaveTextContent("4½");
    expect(glyph).toHaveStyle({ fontWeight: 700 });
    expect(screen.getByRole("cell", { name: "Round 1, against Turing Club: 4½–1½, won" })).toBeInTheDocument();
  });

  it("shows its words as a legend's entry", () => {
    render(<ResultMark legend outcome="unfinished" label="unfinished game" testId="probe" />);
    expect(screen.getByTestId("probe")).toHaveTextContent("* = unfinished game");
    expect(screen.getByText("unfinished game")).not.toHaveStyle({ position: "absolute" });
  });

  it("cannot be wordless — the types refuse a mark with no label", () => {
    // @ts-expect-error — the glyph is decoration: the label is what is read.
    const wordless = <ResultMark outcome="win" />;
    expect(wordless).toBeTruthy();
  });

  it("passes axe", async () => {
    inCell(
      <>
        {OUTCOMES.map(([outcome]) => (
          <ResultMark key={outcome} outcome={outcome} label={`Round 1: ${outcome}`} />
        ))}
        <ResultMark legend outcome="none" label="no game" />
      </>,
    );
    await expectNoAxeViolations();
  });
});
