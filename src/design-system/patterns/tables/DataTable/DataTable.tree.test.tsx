import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { expectNoAxeViolations } from "../../../../test/axe";
import type { DataTableColumn } from "./columns";
import DataTable from "./DataTable";

/* A DataTable whose rows are a tree (CTA-113): the depth indent, the chevrons, the test-id overrides. */

type Row = {
  id: string;
  name: string;
  depth: number;
  open?: boolean;
  games: number;
};

const ROWS: Row[] = [
  { id: "openings", name: "Openings", depth: 0, open: true, games: 12 },
  { id: "sicilian", name: "Sicilian", depth: 1, open: false, games: 8 },
  { id: "najdorf", name: "Najdorf games", depth: 1, games: 4 },
  { id: "loose", name: "Loose games", depth: 0, games: 3 },
];

const COLUMNS: DataTableColumn<Row, "name" | "games">[] = [
  { id: "name", header: "Name", render: (row) => row.name },
  { id: "games", header: "Games", align: "end", render: (row) => row.games },
];

const mount = (onToggle = vi.fn(), onRowClick = vi.fn()) => {
  render(
    <DataTable<Row, "name" | "games">
      columns={COLUMNS}
      rows={ROWS}
      rowId={(row) => row.id}
      sorted
      emptyLabel="Nothing"
      ariaLabel="Folders"
      tree={{
        depth: (row) => row.depth,
        open: (row) => row.open,
        onToggle,
        toggleLabel: (row, open) => `${open ? "Close" : "Open"} ${row.name}`,
      }}
      onRowClick={onRowClick}
      rowLink={(row) => ({ href: `/c/${row.id}` })}
      rowTestId={(row) =>
        row.open === undefined ? `item-${row.id}` : `folder-${row.id}`
      }
      linkTestId={(row) => `link-${row.id}`}
      testId="probe"
    />,
  );
  return { onToggle, onRowClick };
};

describe("DataTable — tree rows (CTA-113)", () => {
  it("gives each branch a named chevron saying whether it is open, and each row its own test ids", async () => {
    mount();
    expect(screen.getByTestId("folder-openings-toggle")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(
      screen.getByRole("button", { name: "Open Sicilian" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(
      within(screen.getByTestId("item-najdorf")).queryByRole("button"),
    ).toBeNull();
    expect(screen.getByTestId("link-najdorf")).toHaveAttribute(
      "href",
      "/c/najdorf",
    );
    await expectNoAxeViolations(screen.getByTestId("probe"));
  });

  it("toggles a branch from its chevron — from the keyboard too — without the row's click", async () => {
    const user = userEvent.setup();
    const { onToggle, onRowClick } = mount();
    screen.getByRole("button", { name: "Open Sicilian" }).focus();
    await user.keyboard("{Enter}");
    expect(onToggle).toHaveBeenCalledWith(ROWS[1]);
    expect(onRowClick).not.toHaveBeenCalled();
    await user.click(screen.getByTestId("folder-openings"));
    expect(onRowClick).toHaveBeenCalledWith(ROWS[0]);
  });
});

describe("DataTable — the picks' and the link's own ids and name (CTA-113)", () => {
  it("puts the caller's test ids on select-all and each pick, and names a row's link by the caller's words", async () => {
    const onChange = vi.fn();
    render(
      <DataTable<Row, "name" | "games">
        columns={COLUMNS}
        rows={ROWS}
        rowId={(row) => row.id}
        emptyLabel="Nothing"
        ariaLabel="Games"
        picks={{
          picked: new Set(["loose"]),
          onChange,
          selectAllLabel: "Select all",
          pickLabel: (row) => `Pick ${row.name}`,
          selectAllTestId: "mine-select-all",
          pickTestId: (row) => `mine-row-${row.id}`,
        }}
        hint="Tick a row to pick it"
        rowLink={(row) => ({ href: `/g/${row.id}` })}
        rowLinkLabel={(row) => `${row.name}, ${row.games} games`}
        testId="probe"
      />,
    );
    expect(within(screen.getByTestId("mine-row-loose")).getByRole("checkbox")).toBeChecked();
    expect(screen.getByRole("link", { name: "Sicilian, 8 games" })).toHaveAttribute("href", "/g/sicilian");
    await expectNoAxeViolations(screen.getByTestId("probe"));
    await userEvent.setup().click(within(screen.getByTestId("mine-select-all")).getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledWith(new Set(ROWS.map((row) => row.id)));
  });
});
