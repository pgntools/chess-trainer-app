import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import i18n from "../../../i18n";
import type { FindBestMoveSessionRow } from "../../../lib/findBestMoveSessionRows";
import { expectNoAxeViolations } from "../../../test/axe";
import { manyRows, SESSION_ROWS } from "./fixtures";
import FindBestMoveSessionsTable, { type FindBestMoveSessionsTableProps } from "./FindBestMoveSessionsTable";

const mount = (props: Partial<FindBestMoveSessionsTableProps> = {}) => {
  const handlers = { onSort: vi.fn(), onPickedChange: vi.fn(), onDownload: vi.fn(), onPageChange: vi.fn(), onRowsPerPageChange: vi.fn() };
  render(
    <FindBestMoveSessionsTable
      rows={SESSION_ROWS}
      sort={{ column: "updated", direction: "desc" }}
      onSort={handlers.onSort}
      paging={{ page: 0, rowsPerPage: 50, onPageChange: handlers.onPageChange, onRowsPerPageChange: handlers.onRowsPerPageChange }}
      picked={new Set()}
      onPickedChange={handlers.onPickedChange}
      sessionLink={(row: FindBestMoveSessionRow) => ({ href: `#session-${row.id}` })}
      caseLink={(row: FindBestMoveSessionRow) => ({ href: `#case-${row.id}` })}
      onDownload={handlers.onDownload}
      testId="sessions"
      {...props}
    />,
  );
  return handlers;
};

const listed = () => screen.getAllByTestId(/^sessions-row-/).map((row) => row.dataset.testid?.slice("sessions-row-".length));

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("FindBestMoveSessionsTable (CTA-239)", () => {
  it("lists the sessions newest first, each a link that resumes it", async () => {
    mount();
    expect(screen.getByRole("table", { name: "Find Best Move sessions" })).toBeInTheDocument();
    expect(listed()).toEqual(["fresh", "going", "done", "passes", "old"]);
    expect(screen.getByRole("link", { name: "Open the session Carlsen – Nakamura — Find Best Move" })).toHaveAttribute("href", "#session-going");
    await expectNoAxeViolations();
  });

  it("fills a session's cells: side, moves to find, progress, found, status", () => {
    mount();
    const cells = within(screen.getByTestId("sessions-row-going")).getAllByRole("cell");
    // The pick, seven columns, the actions.
    expect(cells).toHaveLength(9);
    expect(cells[2]).toHaveTextContent("White");
    expect(cells[3]).toHaveTextContent("3");
    expect(cells[4]).toHaveTextContent("9/207 answered, 2 passed");
    expect(cells[5]).toHaveTextContent("15/219 in place");
    expect(screen.getByTestId("sessions-status-going")).toHaveTextContent("Ongoing");
    expect(screen.getByTestId("sessions-status-done")).toHaveTextContent("Done");
    // Nothing found where nothing was graded.
    expect(within(screen.getByTestId("sessions-row-passes")).getAllByRole("cell")[5]).toHaveTextContent("–");
  });

  it("keeps a Case that is no session as a row that says so — opened in Analysis and downloaded, but not resumed", async () => {
    const { onDownload } = mount();
    expect(screen.getByTestId("sessions-note-old")).toHaveTextContent("Fischer – Spassky — Find Best Move holds no session this version can resume");
    expect(screen.queryByRole("link", { name: /Open the session Fischer/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Fischer – Spassky — Find Best Move in Analysis" })).toHaveAttribute("href", "#case-old");
    await userEvent.click(screen.getByRole("button", { name: "Download the PGN of Fischer – Spassky — Find Best Move" }));
    expect(onDownload).toHaveBeenCalledWith(expect.objectContaining({ id: "old" }));
  });

  it("sorts by its caller's sort — a Case that is no session last — and asks its caller to sort", async () => {
    const { onSort } = mount({ sort: { column: "progress", direction: "asc" } });
    // Two done in full: ties newest first.
    expect(listed()).toEqual(["fresh", "going", "done", "passes", "old"]);
    await userEvent.click(screen.getByTestId("sessions-sort-found"));
    expect(onSort).toHaveBeenCalledWith("found", "desc");
  });

  it("picks rows, and every row at once", async () => {
    const { onPickedChange } = mount();
    await userEvent.click(screen.getByRole("checkbox", { name: "Pick Tal – Botvinnik — Find Best Move" }));
    expect(onPickedChange).toHaveBeenLastCalledWith(new Set(["done"]));
    await userEvent.click(screen.getByRole("checkbox", { name: "Pick every session" }));
    expect(onPickedChange).toHaveBeenLastCalledWith(new Set(SESSION_ROWS.map((row) => row.id)));
  });

  it("says when it is reading, and when there is no session", () => {
    mount({ rows: [], loading: true });
    expect(screen.getByTestId("sessions-loading")).toHaveTextContent("Reading the sessions…");
  });

  it("pages a thousand sessions", () => {
    mount({ rows: manyRows(1_000), paging: { page: 0, rowsPerPage: 25, onPageChange: () => {}, onRowsPerPageChange: () => {} } });
    expect(listed()).toHaveLength(25);
    expect(screen.getByTestId("sessions-pager")).toHaveTextContent("1–25 of 1,000");
  });
});
