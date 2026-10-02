import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";

import i18n from "../../../i18n";
import { readRepertoireText, savedRepertoireOf } from "../../../lib/savedRepertoires";
import { saveRepertoire } from "../../../lib/savedRepertoireStore";
import { boardOptions } from "../../board/boardTestHarness";
import { RepertoireBoardEmbed } from "./RepertoireBoardEmbed";

vi.mock("react-chessboard", async () => {
  const { reactChessboardMock } = await import("../../board/boardTestHarness");
  return reactChessboardMock();
});

const CARO = ['[Event "My Caro"]', "", "1. e4 c6 2. d4 (2. Nc3 d5) 2... d5 3. e5 Bf5 *"].join("\n");

/** A repertoire saved as the upload screen saves one, played from Black. */
const storeCaro = async (id: string) => {
  const reading = readRepertoireText(CARO);
  if (!reading.ok) throw new Error("fixture does not read");
  const record = savedRepertoireOf(id, reading.games[0], "", reading.name);
  await saveRepertoire({ ...record, settings: { ...record.settings, color: "black" } });
};

const renderBoard = (props: Parameters<typeof RepertoireBoardEmbed>[0]) =>
  render(
    <MemoryRouter>
      <RepertoireBoardEmbed {...props} />
    </MemoryRouter>,
  );

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("<RepertoireBoard> (CTA-126)", () => {
  it("shows the reader's repertoire at its address, facing its side, opened at startMove, with a link to it", async () => {
    await storeCaro("caro1");
    renderBoard({ _id: "/repertoires/caro1", startMove: "1...", fallback: "e4-white" });

    expect(await screen.findByTestId("home-repertoire-caro1-name")).toHaveTextContent("My Caro");
    expect(screen.getByText("A repertoire for Black")).toBeInTheDocument();
    expect(screen.getByTestId("home-repertoire-caro1-board-line")).toHaveTextContent("1. e4 c6");
    expect(boardOptions().boardOrientation).toBe("black");
    expect(boardOptions().id).toBe("front-page-repertoire-caro1");
    // White's two tries, each with its play chance.
    expect(screen.getByRole("list", { name: "Moves from here" })).toHaveTextContent("d4");
    expect(screen.getByRole("button", { name: "Nc3" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open the repertoire" })).toHaveAttribute("href", "/repertoires/caro1");
  });

  it("shows its fallback sample, marked as one, where the reader has no such repertoire", async () => {
    renderBoard({ _id: "/repertoires/not-on-this-device", startMove: "1...", fallback: "caro-kann-black" });

    expect(await screen.findByTestId("home-repertoire-sample-caro-kann-black-name")).toHaveTextContent(
      "The Caro-Kann for Black",
    );
    expect(screen.getByText("A sample repertoire that comes with the app")).toBeInTheDocument();
    expect(boardOptions().boardOrientation).toBe("black");
    expect(screen.getByTestId("home-repertoire-sample-caro-kann-black-board-line")).toHaveTextContent("1. e4 c6");
    expect(screen.getByRole("link", { name: "Add your own repertoire" })).toHaveAttribute("href", "/repertoires/new");
  });

  it("says the repertoire is not here when it has no fallback", async () => {
    renderBoard({ _id: "/repertoires/not-on-this-device" });
    expect(await screen.findByText("The repertoire this page embeds is not on this device.")).toBeInTheDocument();
    expect(screen.queryByTestId("board")).not.toBeInTheDocument();
  });
});
