import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import i18n from "../../../i18n";
import type { EngineOption } from "../../../lib/engineTypes";
import { expectNoAxeViolations } from "../../../test/axe";
import EngineOptionsTable from "./EngineOptionsTable";
import { NO_OPTIONS, PINNED_AND_COMBO, STOCKFISH_19_NATIVE } from "./fixtures";

const mount = (options: readonly EngineOption[]) =>
  render(<EngineOptionsTable options={options} ariaLabel="UCI defaults — Stockfish 19" testId="options" />);

const cells = () =>
  within(screen.getByRole("table", { name: "UCI defaults — Stockfish 19" }))
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell").map((cell) => cell.textContent));

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("EngineOptionsTable", () => {
  it("is a named table, a row per option the engine declared, in its order", () => {
    mount(STOCKFISH_19_NATIVE);

    const table = screen.getByRole("table", { name: "UCI defaults — Stockfish 19" });
    expect(within(table).getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "Option",
      "Type",
      "Default",
      "Range",
    ]);
    expect(cells().map(([name]) => name)).toEqual(STOCKFISH_19_NATIVE.map((option) => option.name));
  });

  it("gives each type its range — a spin's bounds, a check's two, a string's and a button's none", () => {
    mount(STOCKFISH_19_NATIVE);

    const row = (name: string) => cells().find(([cell]) => cell === name);
    expect(row("Threads")).toEqual(["Threads", "spin", "1", "1 – 19"]);
    expect(row("UCI_Elo")).toEqual(["UCI_Elo", "spin", "1320", "1320 – 3190"]);
    expect(row("Ponder")).toEqual(["Ponder", "check", "false", "true / false"]);
    expect(row("Clear Hash")).toEqual(["Clear Hash", "button", "—", "—"]);
    expect(row("SyzygyPath")).toEqual(["SyzygyPath", "string", "<empty>", "—"]);
  });

  it("shows a pinned spin's one value, and a combo's values", () => {
    mount(PINNED_AND_COMBO);

    expect(cells()).toEqual([
      ["Threads", "spin", "1", "1"],
      ["Style", "combo", "Normal", "Solid / Normal / Risky"],
      ["Clear Hash", "button", "—", "—"],
    ]);
  });

  it("says so when the engine declared nothing", () => {
    mount(NO_OPTIONS);
    expect(screen.getByRole("table")).toHaveTextContent("The engine declared no options.");
  });

  it("sets the engine's words left to right, in Hebrew too", async () => {
    await i18n.changeLanguage("he");
    mount(PINNED_AND_COMBO);

    expect(screen.getByRole("columnheader", { name: "אפשרות" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Solid / Normal / Risky" })).toHaveAttribute("dir", "ltr");
  });

  it("passes axe", async () => {
    mount(STOCKFISH_19_NATIVE);
    await expectNoAxeViolations();
  });
});
