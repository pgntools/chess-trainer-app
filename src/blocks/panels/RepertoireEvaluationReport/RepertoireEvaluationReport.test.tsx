import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import type { RepertoireEvaluationReport as Report, RepertoireReportMove } from "../../../lib/jobs/kinds/repertoireEvaluation/core";
import { expectNoAxeViolations } from "../../../test/axe";
import RepertoireEvaluationReport from "./RepertoireEvaluationReport";
import { ALL_GOOD, BLACK, EMPTY, FINISHED, IN_PROGRESS, LARGE } from "./fixtures";

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

/** The report over its own filter and page, as a screen holds them. */
function Harness({
  report,
  moveLink = (move) => ({ href: `/repertoires/rep1?at=${move.path.join(",")}` }),
  paged = false,
  initialFlaggedOnly = false,
  onFilter,
}: {
  report: Report;
  moveLink?: ((move: RepertoireReportMove) => { href: string } | undefined) | null;
  paged?: boolean;
  initialFlaggedOnly?: boolean;
  onFilter?: (on: boolean) => void;
}) {
  const [flaggedOnly, setFlaggedOnly] = useState(initialFlaggedOnly);
  const [page, setPage] = useState(0);
  return (
    <RepertoireEvaluationReport
      report={report}
      flaggedOnly={flaggedOnly}
      onFlaggedOnlyChange={(on) => {
        setFlaggedOnly(on);
        onFilter?.(on);
      }}
      {...(moveLink === null ? {} : { moveLink })}
      {...(paged
        ? { paging: { page, rowsPerPage: 25, onPageChange: setPage, onRowsPerPageChange: () => {}, labelRowsPerPage: "Moves per page" } }
        : {})}
      testId="report"
    />
  );
}

const table = () => within(screen.getByRole("table", { name: "The repertoire's moves" }));
const bodyRows = () => table().getAllByRole("row").slice(1);

describe("RepertoireEvaluationReport (CTA-219)", () => {
  it("counts the moves per verdict and says how many positions were evaluated, from the repertoire's side", () => {
    render(<Harness report={FINISHED} />);
    expect(within(screen.getByTestId("report-summary")).getByText("Blunder")).toBeInTheDocument();
    expect(screen.getByTestId("report-summary-blunder")).toHaveTextContent("1");
    expect(screen.getByTestId("report-summary-missedMate")).toHaveTextContent("1");
    expect(screen.getByTestId("report-summary-mistake")).toHaveTextContent("1");
    expect(screen.getByTestId("report-summary-inaccuracy")).toHaveTextContent("1");
    expect(screen.getByTestId("report-summary-good")).toHaveTextContent("4");
    // Nothing pending, so no pending row.
    expect(screen.queryByTestId("report-summary-pending")).not.toBeInTheDocument();
    expect(screen.getByTestId("report-progress")).toHaveTextContent("24 of 24 positions evaluated. Evaluations from White's side.");
  });

  it("lists the moves as the report orders them — flagged first, worst first — each with its line, evals, verdict and best move", () => {
    render(<Harness report={FINISHED} />);
    expect(table().getAllByRole("columnheader").map((head) => head.textContent)).toEqual(["Line", "Move", "Before", "After", "Verdict", "Best move"]);
    const rows = bodyRows();
    expect(rows).toHaveLength(8);
    expect(within(rows[0]).getAllByRole("cell").map((cell) => cell.textContent)).toEqual([
      "1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Be7 5. e3 O-O 6. Nf3 h6 7. Bxf6 Bxf6",
      "8. Qc2",
      "+0.35",
      "−3.20",
      "Blunder",
      "Rc1",
    ]);
    expect(within(rows[1]).getByText("Missed mate in 4")).toBeInTheDocument();
    expect(within(rows[1]).getAllByRole("cell")[2]).toHaveTextContent("M4");
    // A first move's line is the start position; a position reached three ways says so.
    expect(within(rows[4]).getAllByRole("cell")[0]).toHaveTextContent("Start position");
    expect(within(rows[6]).getAllByRole("cell")[0]).toHaveTextContent("1. d4 d5 2. c4 e6and 2 more lines");
  });

  it("makes each move a link to the repertoire at it, named with its line", async () => {
    render(<Harness report={FINISHED} />);
    const link = screen.getByRole("link", { name: "3. e3, after 1. d4 d5 2. c4 dxc4 — open it in the repertoire" });
    expect(link).toHaveAttribute("href", "/repertoires/rep1?at=d4,d5,c4,dxc4,e3");
    expect(screen.getByRole("link", { name: "1. d4 — open it in the repertoire" })).toHaveAttribute("href", "/repertoires/rep1?at=d4");
  });

  it("draws the moves as text without links", () => {
    render(<Harness report={FINISHED} moveLink={null} />);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(table().getByText("8. Qc2")).toBeInTheDocument();
  });

  it("keeps the flagged moves alone under the switch", async () => {
    const user = userEvent.setup();
    const onFilter = vi.fn();
    render(<Harness report={FINISHED} onFilter={onFilter} />);
    await user.click(screen.getByRole("switch", { name: "Flagged moves only" }));
    expect(onFilter).toHaveBeenLastCalledWith(true);
    expect(bodyRows()).toHaveLength(4);
    expect(table().queryByText("Good")).not.toBeInTheDocument();
    await user.click(screen.getByRole("switch", { name: "Flagged moves only" }));
    expect(bodyRows()).toHaveLength(8);
  });

  it("says no move is flagged when the filter leaves none, and when the side has no move at all", () => {
    const { unmount } = render(<Harness report={ALL_GOOD} initialFlaggedOnly />);
    expect(screen.getByText("No move is flagged.")).toBeInTheDocument();
    unmount();
    render(<Harness report={EMPTY} />);
    expect(screen.getByText("The repertoire plays no move of its side within the ply limit.")).toBeInTheDocument();
  });

  it("shows a move not evaluated yet in words, with no evals", () => {
    render(<Harness report={IN_PROGRESS} />);
    expect(screen.getByTestId("report-summary-pending")).toHaveTextContent("2");
    expect(screen.getByTestId("report-progress")).toHaveTextContent("14 of 24 positions evaluated.");
    const pending = bodyRows().at(-1)!;
    expect(within(pending).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["1. d4 Nf6", "2. Bg5", "—", "—", "Not evaluated yet", ""]);
  });

  it("turns the evaluations to Black's side for a Black repertoire", () => {
    render(<Harness report={BLACK} />);
    expect(screen.getByTestId("report-progress")).toHaveTextContent("Evaluations from Black's side.");
    const cells = within(bodyRows()[0]).getAllByRole("cell");
    expect(cells[1]).toHaveTextContent("6... Qc7");
    expect(cells[2]).toHaveTextContent("−0.30");
    expect(cells[3]).toHaveTextContent("−1.45");
  });

  it("pages a large report", async () => {
    const user = userEvent.setup();
    render(<Harness report={LARGE} paged />);
    expect(bodyRows()).toHaveLength(25);
    await user.click(screen.getByRole("button", { name: /next page/i }));
    expect(bodyRows()).toHaveLength(25);
    expect(bodyRows()[0]).not.toHaveTextContent("line 1 ");
  });

  it("passes axe", async () => {
    render(<Harness report={FINISHED} />);
    await expectNoAxeViolations();
  });

  it("passes axe in Hebrew", async () => {
    await i18n.changeLanguage("he");
    render(<Harness report={IN_PROGRESS} />);
    expect(screen.getByRole("switch", { name: "רק מסעים מסומנים" })).toBeInTheDocument();
    await expectNoAxeViolations();
  });
});
