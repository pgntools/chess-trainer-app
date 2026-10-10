import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router";
import { useEffect, type ReactNode } from "react";
import { Chess } from "chess.js";

import i18n from "../../../../i18n";
import { expectNoAxeViolations } from "../../../../test/axe";
import AppThemeWithLang from "../../../../theme/AppThemeWithLang";
import { analysisHandOffOf } from "../../../../lib/analysisHandOff";
import { DEFAULT_ANALYSIS_SETTINGS } from "../../../../lib/analysisSettings";
import {
  addMove,
  emptyTree,
  fenAtNode,
  findNode,
  nodeAtSanPath,
  treeToPgn,
  type GameTree,
} from "../../../../lib/gameTree";
import {
  loadUploadedCollections,
  resetLibraryCollectionStore,
} from "../../../../lib/libraryCollectionStore";
import { DEFAULT_COMPUTER_ANALYSIS_OPTIONS } from "../../../../lib/computerAnalysis";
import { DEFAULT_ENGINE_ID } from "../../../../lib/engines/ids";
import { MAX_JOBS } from "../../../../lib/jobs";
import { enqueueComputerAnalysis, jobsSnapshot } from "../../../../lib/jobStore";
import { savedAnalysisOf, type SavedAnalysis } from "../../../../lib/savedAnalyses";
import {
  createAnalysisFolder,
  analysisFoldersSnapshot,
} from "../../../../lib/savedAnalysisFolderStore";
import {
  addAnalyses,
  findSavedAnalysis,
  saveAnalysis,
  savedAnalysesSnapshot,
} from "../../../../lib/savedAnalysisStore";
import { cardGridColumns } from "../../../../design-system/components/cards";
import { RightPanelOutlet, RightPanelProvider } from "../../../main/rightPanel";
import SavedAnalyses, { SAVED_ANALYSES_PAGE } from "./SavedAnalyses";

/*
  The same two stand-ins the Saved games suite needs, and for the same reasons.
  `<Chessboard>` measures its own square on mount and throws where there is no
  layout engine (`.claude/rules/chessboard.md` §8), so it is stubbed and the stub
  keeps the position and the id it was handed — the preview boards pass their
  own options, and the new-analysis form's editor is the spare-piece trio with
  the provider holding them (CTA-87). The opening book is stubbed
  because the real one is ~3MB of JSON and what is under test is that the card
  prints what the book says, not the book.

  The store is *not* stubbed: it writes to the `localStorage` jsdom provides and
  `src/test/setup.ts` clears between tests, which is the behaviour under test.
*/
const OPENING = { eco: "C20", name: "King's Pawn Game", moves: "1. e4" };

vi.mock("../../../../lib/openings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../../lib/openings")>();
  return {
    ...actual,
    // Keyed on the position after 1. e4 — so an analysis that played it is named
    // and one that opened 1. d4 is not.
    loadOpeningBook: () =>
      Promise.resolve({
        "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1": OPENING,
      }),
  };
});

/*
  The stub keeps the position and the id it was handed — the preview boards
  pass their own; the form's editor renders the spare-piece trio, its provider
  holding the options (`PlayedGames.test.tsx`'s Board editor pattern) — so a
  test drags a piece by calling the provider's `onPieceDrop`.
*/
const editorBoard = vi.hoisted(() => ({ options: null as Record<string, unknown> | null }));
vi.mock("react-chessboard", () => ({
  ChessboardProvider: ({
    options,
    children,
  }: {
    options: Record<string, unknown>;
    children?: ReactNode;
  }) => {
    editorBoard.options = options;
    return <div data-testid="chessboard-provider">{children}</div>;
  },
  Chessboard: ({
    options,
  }: {
    options?: { id?: string; position?: string; boardOrientation?: string };
  }) => (
    <div
      data-testid={`board-${options?.id ?? "editor"}`}
      data-position={options?.position ?? String(editorBoard.options?.position)}
      data-orientation={options?.boardOrientation ?? String(editorBoard.options?.boardOrientation)}
    />
  ),
  SparePiece: ({ pieceType }: { pieceType: string }) => <div data-testid={`spare-${pieceType}`} />,
}));

/**
 * A tree grown by playing SAN: each entry is `[parent path, moves]`, so a second
 * entry branching off an earlier point is how a side line is made.
 */
const grow = (
  lines: readonly (readonly [readonly string[], readonly string[]])[],
): GameTree => {
  let tree = emptyTree();

  for (const [from, moves] of lines) {
    let nodeId = nodeAtSanPath(tree, from);
    for (const san of moves) {
      const move = new Chess(fenAtNode(tree, nodeId)).move(san);
      const added = addMove(tree, nodeId, {
        san: move.san,
        from: move.from,
        to: move.to,
        fen: move.after,
      });
      tree = added.tree;
      nodeId = added.nodeId;
    }
  }

  return tree;
};

const save = (
  id: string,
  lines: readonly (readonly [readonly string[], readonly string[]])[],
  path: readonly string[] = [],
  orientation: "white" | "black" = "white",
  now = new Date("2026-09-07T10:00:00.000Z"),
): SavedAnalysis =>
  savedAnalysisOf(
    id,
    grow(lines),
    path,
    DEFAULT_ANALYSIS_SETTINGS,
    orientation,
    now,
  );

/*
  Where navigation has taken the screen — the form's Load hands a whole game
  to the Analysis Board as location state (CTA-96), which the probe records,
  as `OpeningsBoard.test.tsx`'s does. The screen is mounted without routes, so
  a navigation changes the recorded location and leaves the screen mounted.
*/
const where = vi.hoisted(() => ({
  current: null as { pathname: string; search: string; state: unknown } | null,
}));
const Where = () => {
  const location = useLocation();
  useEffect(() => {
    where.current = {
      pathname: location.pathname,
      search: location.search,
      state: location.state,
    };
  }, [location]);
  return null;
};

/** Mount the screen, and wait for the store's first read — the list's first frame. */
const renderScreen = async (entry = "/tools/analysis/saved") => {
  const rendered = render(
    <AppThemeWithLang>
      <MemoryRouter initialEntries={[entry]}>
        <RightPanelProvider>
          <SavedAnalyses />
          <RightPanelOutlet />
          <Where />
        </RightPanelProvider>
      </MemoryRouter>
    </AppThemeWithLang>,
  );
  await screen.findByTestId("saved-analyses-screen");
  return rendered;
};

/** Let the opening book's promise settle, as it does a tick after mount. */
const settleBook = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("Saved analyses — the list", () => {
  it("says there is nothing yet on a browser that has analysed nothing", async () => {
    await renderScreen();

    expect(screen.getByTestId("saved-analyses-empty")).toBeInTheDocument();
    expect(screen.getByTestId("saved-analyses-count")).toHaveTextContent(
      "Analyses: 0",
    );
  });

  it("lists what has been saved, newest first", async () => {
    await saveAnalysis(save("a1", [[[], ["e4"]]]));
    await saveAnalysis(save("a2", [[[], ["d4"]]]));

    await renderScreen();

    expect(
      screen.getAllByTestId(/^saved-analyses-item-/).map((row) => row.dataset.testid),
    ).toEqual(["saved-analyses-item-a2", "saved-analyses-item-a1"]);
    expect(screen.getByTestId("saved-analyses-count")).toHaveTextContent(
      "Analyses: 2",
    );
  });

  // The cards' caption (CTA-144): the list view is a table, its length the Moves column.
  it("says on a card how long the mainline is, how many side lines and where the reader stopped", async () => {
    await saveAnalysis(
      save(
        "a1",
        [
          [[], ["e4", "e5", "Nf3"]],
          [["e4"], ["c5", "Nf3"]],
        ],
        ["e4", "c5"],
      ),
    );

    await renderScreen();
    await userEvent.click(screen.getByTestId("saved-analyses-view-compact"));

    const row = screen.getByTestId("saved-analyses-item-a1");
    expect(row).toHaveTextContent("2 moves");
    expect(row).toHaveTextContent("1 variation");
    expect(row).toHaveTextContent("at ply 2");
  });

  it("counts a side line once on a card, no matter how many moves it runs to", async () => {
    await saveAnalysis(
      save("a1", [
        [[], ["e4", "e5", "Nf3"]],
        [["e4"], ["c5", "Nc3", "a6", "Bc4", "e6", "Qf3"]],
      ]),
    );

    await renderScreen();
    await userEvent.click(screen.getByTestId("saved-analyses-view-compact"));

    expect(screen.getByTestId("saved-analyses-item-a1")).toHaveTextContent(
      "1 variation",
    );
  });

  it("says nothing on a card about variations for a board with only one line", async () => {
    await saveAnalysis(save("a1", [[[], ["e4", "e5"]]]));

    await renderScreen();
    await userEvent.click(screen.getByTestId("saved-analyses-view-compact"));

    const row = screen.getByTestId("saved-analyses-item-a1");
    expect(row).toHaveTextContent("1 move");
    expect(row).not.toHaveTextContent("variation");
    // Ply 0 is not a place the reader stopped at, it is where a board opens.
    expect(row).not.toHaveTextContent("at ply");
  });

  it("names a board that is nobody's game for what it is", async () => {
    await saveAnalysis(save("a1", [[[], ["e4"]]]));

    await renderScreen();

    expect(screen.getByTestId("saved-analyses-item-a1")).toHaveTextContent(
      "Analysis board",
    );
  });

  it("names one begun from a real game by its players", async () => {
    const tree = grow([[[], ["e4", "e5"]]]);
    await saveAnalysis(
      savedAnalysisOf(
        "a1",
        { ...tree, headers: { White: "Carlsen", Black: "Nakamura" } },
        [],
        DEFAULT_ANALYSIS_SETTINGS,
        "white",
        new Date("2026-09-07T10:00:00.000Z"),
      ),
    );

    await renderScreen();

    expect(screen.getByTestId("saved-analyses-item-a1")).toHaveTextContent(
      "Carlsen – Nakamura",
    );
  });

  it("says so in Hebrew too, without a key falling through", async () => {
    await saveAnalysis(save("a1", [[[], ["e4"]]]));
    await i18n.changeLanguage("he");

    await renderScreen();

    expect(screen.getByTestId("saved-analyses-item-a1")).toHaveTextContent(
      "לוח ניתוח",
    );
  });
});

describe("Saved analyses — where a row goes", () => {
  beforeEach(async () => {
    await saveAnalysis(save("a1", [[[], ["e4", "e5", "Nf3"]]], ["e4", "e5"]));
  });

  it("opens it on the Analysis Board, by its id — its one destination", async () => {
    await renderScreen();

    // Unfiled: the workspace at the top level, the cards' newest-first order the default.
    expect(screen.getByTestId("saved-analyses-open-a1")).toHaveAttribute(
      "href",
      "/tools/analysis?analysis=a1&folder=",
    );
    // No hand-off to Play with Engine, and no delete of its own.
    expect(screen.queryByTestId("saved-analyses-loadpgn-a1")).toBeNull();
    expect(screen.queryByTestId("saved-analyses-play-a1")).toBeNull();
    expect(screen.queryByTestId("saved-analyses-remove-a1")).toBeNull();
  });

  it("deletes the picks in bulk, after asking, and the list follows", async () => {
    const user = userEvent.setup();
    await renderScreen();

    await user.click(
      within(screen.getByTestId("saved-analyses-select-a1")).getByRole("checkbox"),
    );
    await user.click(screen.getByTestId("saved-analyses-delete"));
    expect(screen.getByTestId("saved-analyses-delete-title")).toHaveTextContent(
      "Delete 1 analysis?",
    );
    await user.click(screen.getByTestId("saved-analyses-delete-confirm"));

    await waitFor(() =>
      expect(screen.queryByTestId("saved-analyses-item-a1")).not.toBeInTheDocument(),
    );
    expect(screen.getByTestId("saved-analyses-empty")).toBeInTheDocument();
  });

  it("offers a New button to the plain board view, with no query params", async () => {
    await renderScreen();

    // The board left the sidebar (CTA-58) — this button is how it is reached.
    expect(screen.getByTestId("saved-analyses-new")).toHaveAttribute(
      "href",
      "/tools/analysis",
    );
  });
});

describe("Saved analyses — a record that will not read", () => {
  it("still lists it — nothing to open, but it can be picked (to delete or export)", async () => {
    await saveAnalysis({ ...save("a1", [[[], ["e4"]]]), pgn: "1. Zz9" });

    await renderScreen();

    const row = screen.getByTestId("saved-analyses-item-a1");
    expect(row).toHaveTextContent("This analysis could not be read.");
    expect(screen.queryByTestId("saved-analyses-open-a1")).not.toBeInTheDocument();
    expect(screen.getByTestId("saved-analyses-select-a1")).toBeInTheDocument();
  });
});

describe("Saved analyses — the board view", () => {
  const showBoards = async (size: "compact" | "comfortable" = "compact") =>
    userEvent.click(screen.getByTestId(`saved-analyses-view-${size}`));

  it("opens on the list, and switches to boards when asked", async () => {
    await saveAnalysis(save("a1", [[[], ["e4"]]]));

    await renderScreen();
    expect(screen.getByTestId("saved-analyses-body")).toBeInTheDocument();

    await showBoards();

    expect(screen.getByTestId("saved-analyses-grid")).toHaveStyle({
      gridTemplateColumns: cardGridColumns("compact"),
    });
    expect(screen.getByTestId("board-saved-analyses-preview-a1")).toBeInTheDocument();
  });

  it("previews the position the reader was standing on", async () => {
    await saveAnalysis(save("a1", [[[], ["e4", "e5", "Nf3"]]], ["e4"]));

    await renderScreen();
    await showBoards();

    const tree = grow([[[], ["e4", "e5", "Nf3"]]]);
    expect(
      screen.getByTestId("board-saved-analyses-preview-a1"),
    ).toHaveAttribute(
      "data-position",
      fenAtNode(tree, nodeAtSanPath(tree, ["e4"])),
    );
  });

  it("faces the way the board was left", async () => {
    await saveAnalysis(save("a1", [[[], ["e4"]]], [], "black"));

    await renderScreen();
    await showBoards();

    expect(screen.getByTestId("board-saved-analyses-preview-a1")).toHaveAttribute(
      "data-orientation",
      "black",
    );
  });

  it("names the opening the mainline reached, and only when the book knows it", async () => {
    await saveAnalysis(save("a1", [[[], ["e4", "e5"]]]));
    await saveAnalysis(save("a2", [[[], ["d4", "d5"]]]));

    await renderScreen();
    await showBoards();
    await settleBook();

    expect(screen.getByTestId("saved-analyses-opening-a1")).toHaveTextContent(
      "King's Pawn Game · C20",
    );
    expect(
      screen.queryByTestId("saved-analyses-opening-a2"),
    ).not.toBeInTheDocument();
  });

  it("shows the message in the square for a record with no position to draw", async () => {
    await saveAnalysis({ ...save("a1", [[[], ["e4"]]]), pgn: "1. Zz9" });

    await renderScreen();
    await showBoards();

    expect(
      screen.queryByTestId("board-saved-analyses-preview-a1"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("saved-analyses-item-a1")).toHaveTextContent(
      "This analysis could not be read.",
    );
  });
});

describe("Saved analyses — the panel", () => {
  it("says where the analyses are kept", async () => {
    await renderScreen();

    expect(screen.getByTestId("saved-analyses-storage-note")).toHaveTextContent(
      "this browser only",
    );
  });
});

describe("Saved analyses — named, and filed in folders (CTA-73)", () => {
  it("names a row by the record's name", async () => {
    await saveAnalysis({ ...save("a1", [[[], ["e4"]]]), name: "My Scotch" });
    await renderScreen();
    expect(screen.getByTestId("saved-analyses-item-a1")).toHaveTextContent("My Scotch");
  });

  it("lists the folders first, and opens one from ?folder= with its breadcrumb", async () => {
    const folder = (await createAnalysisFolder("Openings", null))!;
    await saveAnalysis({ ...save("inside", [[[], ["e4"]]]), folderId: folder.id });
    await saveAnalysis(save("outside", [[[], ["d4"]]]));

    const { unmount } = await renderScreen();
    expect(screen.getByTestId(`saved-analyses-folder-${folder.id}`)).toHaveTextContent(
      "1 analysis",
    );
    expect(screen.getByTestId("saved-analyses-item-outside")).toBeInTheDocument();
    expect(screen.queryByTestId("saved-analyses-item-inside")).toBeNull();
    unmount();

    await renderScreen(`/tools/analysis/saved?folder=${folder.id}`);
    expect(screen.getByTestId("saved-analyses-breadcrumb")).toHaveTextContent("Openings");
    expect(screen.getByTestId("saved-analyses-item-inside")).toBeInTheDocument();
    expect(screen.queryByTestId("saved-analyses-item-outside")).toBeNull();
  });

  it("creates a folder where the reader stands", async () => {
    const user = userEvent.setup();
    await saveAnalysis(save("a1", [[[], ["e4"]]]));
    await renderScreen();

    await user.click(screen.getByTestId("saved-analyses-new-folder"));
    await user.type(screen.getByTestId("analysis-folder-name-input"), "Sicilian");
    await user.click(screen.getByTestId("analysis-folder-name-save"));
    await waitFor(() => expect(analysisFoldersSnapshot()).toHaveLength(1));
    const [folder] = analysisFoldersSnapshot() ?? [];
    expect(folder).toMatchObject({ name: "Sicilian", parentId: null });
    expect(screen.getByTestId(`saved-analyses-folder-${folder.id}`)).toBeInTheDocument();
  });

  it("has a checkbox on every card too, and keeps the picks across a view switch", async () => {
    const user = userEvent.setup();
    await saveAnalysis(save("a1", [[[], ["e4"]]]));
    await renderScreen();

    await user.click(
      within(screen.getByTestId("saved-analyses-select-a1")).getByRole("checkbox"),
    );
    await user.click(screen.getByTestId("saved-analyses-view-compact"));
    expect(
      within(screen.getByTestId("saved-analyses-select-a1")).getByRole("checkbox"),
    ).toBeChecked();
    expect(screen.getByTestId("saved-analyses-selected-count")).toHaveTextContent("1 selected");
  });

  it("links every analysis to its settings", async () => {
    await saveAnalysis(save("a1", [[[], ["e4"]]]));
    await renderScreen();
    expect(screen.getByRole("link", { name: "Settings of Analysis board" })).toHaveAttribute(
      "href",
      "/tools/analysis/saved/a1/settings",
    );
  });

  it("has no per-folder delete icon — a folder goes through pick and bulk delete, with everything under it (CTA-147)", async () => {
    const user = userEvent.setup();
    const folder = (await createAnalysisFolder("Old", null))!;
    const sub = (await createAnalysisFolder("Deep", folder.id))!;
    await saveAnalysis({ ...save("a1", [[[], ["e4"]]]), folderId: folder.id });
    await saveAnalysis({ ...save("a2", [[[], ["d4"]]]), folderId: sub.id });
    await renderScreen();

    // The folder rows' actions are download / rename / move — no delete.
    expect(screen.queryByTestId(`saved-analyses-folder-delete-${folder.id}`)).toBeNull();
    expect(screen.getByTestId(`saved-analyses-folder-download-${folder.id}`)).toBeInTheDocument();

    // The folders open in place, their analyses beside them.
    await user.click(screen.getByTestId(`saved-analyses-folder-${folder.id}`));
    await user.click(screen.getByTestId(`saved-analyses-folder-${sub.id}`));
    // The folder's box picks its whole subtree: the chip counts the two analyses under it.
    await user.click(within(screen.getByTestId(`saved-analyses-folder-select-${folder.id}`)).getByRole("checkbox"));
    expect(screen.getByTestId("saved-analyses-selected-count")).toHaveTextContent("2 selected");
    // Both analysis rows under it show picked.
    expect(within(screen.getByTestId("saved-analyses-select-a1")).getByRole("checkbox")).toBeChecked();
    expect(within(screen.getByTestId("saved-analyses-select-a2")).getByRole("checkbox")).toBeChecked();

    // The bulk delete's confirm says the folder goes with all that is in it.
    await user.click(screen.getByTestId("saved-analyses-delete"));
    expect(screen.getByTestId("saved-analyses-delete-title")).toHaveTextContent("Delete 2 analyses?");
    // Both folders are picked: the parent by its box, the sub-folder because everything under it is picked with it.
    expect(screen.getByTestId("saved-analyses-delete-dialog-message")).toHaveTextContent(
      "The 2 picked folders go too, with every analysis and sub-folder in them.",
    );
    await user.click(screen.getByTestId("saved-analyses-delete-confirm"));
    await waitFor(() => expect(analysisFoldersSnapshot()).toEqual([]));
    expect(findSavedAnalysis("a1")).toBeUndefined();
    expect(findSavedAnalysis("a2")).toBeUndefined();
    expect(screen.getByTestId("saved-analyses-empty")).toBeInTheDocument();
  });

  it("picks a folder from its card too, in the card views (CTA-147)", async () => {
    const user = userEvent.setup();
    const folder = (await createAnalysisFolder("Old", null))!;
    await saveAnalysis({ ...save("a1", [[[], ["e4"]]]), folderId: folder.id });
    await renderScreen();

    await user.click(screen.getByTestId("saved-analyses-view-compact"));
    const box = within(screen.getByTestId(`saved-analyses-folder-select-${folder.id}`)).getByRole("checkbox");
    expect(box).not.toBeChecked();
    await user.click(box);
    expect(screen.getByTestId("saved-analyses-selected-count")).toHaveTextContent("1 selected");
    // Drilling in, the analysis inside shows picked — the folder's pick covers it.
    await user.click(screen.getByTestId(`saved-analyses-folder-open-${folder.id}`));
    expect(within(screen.getByTestId("saved-analyses-select-a1")).getByRole("checkbox")).toBeChecked();
    // Unticking the folder's box (back out, then its box again) takes the whole subtree back out.
    await user.click(screen.getByRole("button", { name: "All analyses" }));
    await user.click(within(screen.getByTestId(`saved-analyses-folder-select-${folder.id}`)).getByRole("checkbox"));
    expect(screen.queryByTestId("saved-analyses-selected-count")).toBeNull();
  });

  it("shows a folder indeterminate while some of what is under it is picked (CTA-147)", async () => {
    const user = userEvent.setup();
    const folder = (await createAnalysisFolder("Open", null))!;
    await saveAnalysis({ ...save("a1", [[[], ["e4"]]]), folderId: folder.id });
    await saveAnalysis({ ...save("a2", [[[], ["d4"]]]), folderId: folder.id });
    await renderScreen();

    // The folder open in place (a click on its row): its analyses beside it.
    await user.click(screen.getByTestId(`saved-analyses-folder-${folder.id}`));
    await user.click(within(screen.getByTestId("saved-analyses-select-a1")).getByRole("checkbox"));
    const box = within(screen.getByTestId(`saved-analyses-folder-select-${folder.id}`)).getByRole("checkbox");
    expect(box).toHaveAttribute("data-indeterminate", "true");
    // Ticking it now picks the rest of the subtree.
    await user.click(box);
    expect(within(screen.getByTestId("saved-analyses-select-a2")).getByRole("checkbox")).toBeChecked();
    expect(screen.getByTestId("saved-analyses-selected-count")).toHaveTextContent("2 selected");
  });

  it("unticking an analysis inside a picked folder demotes the folder, which stays out of the delete (CTA-147)", async () => {
    const user = userEvent.setup();
    const folder = (await createAnalysisFolder("Old", null))!;
    await saveAnalysis({ ...save("a1", [[[], ["e4"]]]), folderId: folder.id });
    await saveAnalysis({ ...save("a2", [[[], ["d4"]]]), folderId: folder.id });
    await renderScreen();

    await user.click(screen.getByTestId(`saved-analyses-folder-${folder.id}`));
    await user.click(within(screen.getByTestId(`saved-analyses-folder-select-${folder.id}`)).getByRole("checkbox"));
    // Untick one: the folder is no longer picked — only a1 goes, and the folder stays.
    await user.click(within(screen.getByTestId("saved-analyses-select-a1")).getByRole("checkbox"));
    const box = within(screen.getByTestId(`saved-analyses-folder-select-${folder.id}`)).getByRole("checkbox");
    expect(box).toHaveAttribute("data-indeterminate", "true");
    await user.click(screen.getByTestId("saved-analyses-delete"));
    await user.click(screen.getByTestId("saved-analyses-delete-confirm"));
    await waitFor(() => expect(findSavedAnalysis("a2")).toBeUndefined());
    expect(findSavedAnalysis("a1")?.folderId).toBe(folder.id);
    expect(analysisFoldersSnapshot()).toHaveLength(1);
  });

  it("deleting picked folders, while standing inside one, steps out to the surviving parent (CTA-147)", async () => {
    const user = userEvent.setup();
    const folder = (await createAnalysisFolder("Old", null))!;
    const sub = (await createAnalysisFolder("Deep", folder.id))!;
    await saveAnalysis({ ...save("a1", [[[], ["e4"]]]), folderId: sub.id });
    await renderScreen();

    // Pick the parent from the top level, then walk into the sub-folder — the picks persist across folders.
    await user.click(within(screen.getByTestId(`saved-analyses-folder-select-${folder.id}`)).getByRole("checkbox"));
    await user.click(screen.getByTestId(`saved-analyses-folder-open-${folder.id}`));
    expect(where.current?.search).toBe(`?folder=${folder.id}`);
    await user.click(screen.getByTestId(`saved-analyses-folder-open-${sub.id}`));
    expect(where.current?.search).toBe(`?folder=${sub.id}`);

    // It and everything under it go; the reader steps out to the top level.
    await user.click(screen.getByTestId("saved-analyses-delete"));
    await user.click(screen.getByTestId("saved-analyses-delete-confirm"));
    await waitFor(() => expect(analysisFoldersSnapshot()).toEqual([]));
    expect(where.current?.search).toBe("");
  });

  it("select-all covers the folders shown as well as the records (CTA-147)", async () => {
    const user = userEvent.setup();
    const folder = (await createAnalysisFolder("F", null))!;
    await saveAnalysis({ ...save("in", [[[], ["e4"]]]), folderId: folder.id });
    await saveAnalysis(save("out", [[[], ["d4"]]]));
    await renderScreen();

    // The folder is closed — its analysis is unshown, yet select-all takes the whole subtree with the folder.
    await user.click(within(screen.getByTestId("saved-analyses-select-all")).getByRole("checkbox"));
    expect(screen.getByTestId("saved-analyses-selected-count")).toHaveTextContent("2 selected");
    expect(within(screen.getByTestId(`saved-analyses-folder-select-${folder.id}`)).getByRole("checkbox")).toBeChecked();
    // Unticking it removes just what it covered.
    await user.click(within(screen.getByTestId("saved-analyses-select-all")).getByRole("checkbox"));
    expect(screen.queryByTestId("saved-analyses-selected-count")).toBeNull();
    expect(within(screen.getByTestId(`saved-analyses-folder-select-${folder.id}`)).getByRole("checkbox")).not.toBeChecked();
  });

  it("keeps picks across folders, select-all adding the rows on screen", async () => {
    const user = userEvent.setup();
    const folder = (await createAnalysisFolder("F", null))!;
    await saveAnalysis({ ...save("in", [[[], ["e4"]]]), folderId: folder.id });
    await saveAnalysis(save("out", [[[], ["d4"]]]));
    await renderScreen();

    const box = (testId: string) => within(screen.getByTestId(testId)).getByRole("checkbox");
    await user.click(box("saved-analyses-select-out"));
    await user.click(screen.getByTestId(`saved-analyses-folder-open-${folder.id}`));
    await user.click(box("saved-analyses-select-all"));
    expect(screen.getByTestId("saved-analyses-selected-count")).toHaveTextContent("2 selected");
  });
});

describe("Saved analyses — the games table (CTA-144)", () => {
  /** An imported game, as the several-games popup (CTA-141) or the Library's Analyse files one. */
  const game = (id: string, tags: Record<string, string>, moves: string, updatedAt: string): SavedAnalysis => ({
    ...save(id, [[[], ["e4"]]]),
    name: "",
    pgn: `${Object.entries(tags)
      .map(([key, value]) => `[${key} "${value}"]`)
      .join("\n")}\n\n${moves}`,
    updatedAt,
  });
  const CARLSEN = game(
    "g1",
    {
      Event: "Tata Steel",
      Date: "2024.01.??",
      Round: "3.1",
      White: "Carlsen, Magnus",
      Black: "Giri, Anish",
      Result: "1-0",
      WhiteElo: "2830",
      BlackElo: "2749",
      ECO: "C65",
      Opening: "Ruy Lopez",
    },
    "1. e4 e5 2. Nf3 Nc6 3. Bb5 Nf6 1-0",
    "2026-09-01T10:00:00.000Z",
  );
  const ANAND = game(
    "g2",
    { Event: "Candidates", Date: "2014.03.13", Round: "1", White: "Anand, Viswanathan", Black: "Aronian, Levon", Result: "1/2-1/2", ECO: "D37" },
    "1. d4 d5 2. c4 e6 1/2-1/2",
    "2026-09-02T10:00:00.000Z",
  );

  /** A column's sort button — the table's own: the panel's editor has buttons of the same names. */
  const header = (name: string) =>
    within(screen.getByTestId("saved-analyses-table-frame-table")).getByRole("button", { name });

  const rowIds = () =>
    within(screen.getByTestId("saved-analyses-table-frame-table"))
      .getAllByRole("row")
      .slice(1)
      .map((row) => row.getAttribute("data-testid")?.replace(/^saved-analyses-item-/, ""));

  it("shows each analysis' game fields off its tags, newest updated first, a board's placeholders as empty cells", async () => {
    await saveAnalysis(CARLSEN);
    await saveAnalysis(ANAND);
    await saveAnalysis({ ...save("own", [[[], ["d4"]]], [], "white", new Date("2026-09-03T10:00:00.000Z")), description: "Try 1.d4 again" });
    await renderScreen();

    expect(screen.getByRole("table", { name: "Saved analyses in this folder" })).toBeInTheDocument();
    expect(rowIds()).toEqual(["own", "g2", "g1"]);
    const carlsen = screen.getByTestId("saved-analyses-item-g1");
    for (const text of ["Carlsen, Magnus", "2830", "Giri, Anish", "2749", "1-0", "2024.01", "Tata Steel", "C65", "Ruy Lopez", "3.1"]) {
      expect(within(carlsen).getByText(text)).toBeInTheDocument();
    }
    // Named by its players, and its name the link to the board.
    expect(within(carlsen).getByRole("link", { name: "Carlsen, Magnus – Giri, Anish" })).toHaveAttribute(
      "href",
      "/tools/analysis?analysis=g1&folder=",
    );
    // A board's own analysis: no "Analysis" player, no "Analysis Board" event, no "*" result; its notes under its name.
    const own = screen.getByTestId("saved-analyses-item-own");
    expect(own).not.toHaveTextContent("Analysis Board");
    expect(own).not.toHaveTextContent("*");
    expect(within(own).queryByText("Analysis")).toBeNull();
    expect(within(own).getByRole("link", { name: /^Analysis board/ })).toBeInTheDocument();
    expect(screen.getByTestId("saved-analyses-table-description-own")).toHaveTextContent("Try 1.d4 again");
  });

  it("links an analysis to the workspace — its folder and the table's sort — and an Unfiled one to the top level (CTA-145)", async () => {
    const user = userEvent.setup();
    const folder = (await createAnalysisFolder("Tutorial", null))!;
    await saveAnalysis({ ...CARLSEN, folderId: folder.id });
    await saveAnalysis({ ...ANAND, folderId: folder.id });
    await saveAnalysis(save("loose", [[[], ["d4"]]], [], "white", new Date("2026-09-03T10:00:00.000Z")));
    await renderScreen(`/tools/analysis/saved?folder=${folder.id}`);

    const NAMES: Record<string, string> = { g1: "Carlsen, Magnus – Giri, Anish", g2: "Anand, Viswanathan – Aronian, Levon" };
    const link = (id: string) =>
      within(screen.getByTestId(`saved-analyses-item-${id}`)).getByRole("link", { name: NAMES[id] }).getAttribute("href");
    // The default order: the folder alone.
    expect(link("g1")).toBe(`/tools/analysis?analysis=g1&folder=${folder.id}`);
    // The reader's sort rides along, with its direction when it is not the column's own.
    await user.click(header("White"));
    expect(link("g1")).toBe(`/tools/analysis?analysis=g1&folder=${folder.id}&sort=white`);
    await user.click(header("White"));
    expect(link("g2")).toBe(`/tools/analysis?analysis=g2&folder=${folder.id}&sort=white&dir=desc`);
  });

  it("links an Unfiled analysis to the workspace at the top level — an empty folder", async () => {
    await saveAnalysis(save("loose", [[[], ["d4"]]], [], "white", new Date("2026-09-03T10:00:00.000Z")));
    await renderScreen();
    expect(within(screen.getByTestId("saved-analyses-item-loose")).getByRole("link", { name: /^Analysis board/ })).toHaveAttribute(
      "href",
      "/tools/analysis?analysis=loose&folder=",
    );
  });

  it("fills the opening from the book where the tags name none, and sorts by it", async () => {
    const user = userEvent.setup();
    await saveAnalysis(CARLSEN);
    await saveAnalysis(save("own", [[[], ["e4", "e5"]]], [], "white", new Date("2026-09-03T10:00:00.000Z")));
    await renderScreen();
    await settleBook();

    const own = screen.getByTestId("saved-analyses-item-own");
    expect(within(own).getByText("King's Pawn Game")).toBeInTheDocument();
    expect(within(own).getByText("C20")).toBeInTheDocument();
    await user.click(header("ECO"));
    expect(rowIds()).toEqual(["own", "g1"]);
    await user.click(header("ECO"));
    expect(rowIds()).toEqual(["g1", "own"]);
  });

  it("sorts by any header both ways, missing values last, the sort kept in the URL", async () => {
    const user = userEvent.setup();
    await saveAnalysis(CARLSEN);
    await saveAnalysis(ANAND);
    await saveAnalysis(save("own", [[[], ["d4"]]], [], "white", new Date("2026-09-03T10:00:00.000Z")));
    await renderScreen();

    await user.click(header("White"));
    expect(rowIds()).toEqual(["g2", "g1", "own"]);
    expect(where.current?.search).toBe("?sort=white");
    await user.click(header("White"));
    expect(rowIds()).toEqual(["g1", "g2", "own"]);
    expect(where.current?.search).toBe("?sort=white&dir=desc");
    // A number opens high first.
    await user.click(header("Moves"));
    expect(rowIds()).toEqual(["g1", "g2", "own"]);
  });

  it("opens with the sort and the words a link carries", async () => {
    await saveAnalysis(CARLSEN);
    await saveAnalysis(ANAND);
    await renderScreen("/tools/analysis/saved?sort=white&q=candidates");
    expect(rowIds()).toEqual(["g2"]);
    expect(screen.getByRole("searchbox", { name: "Filter analyses" })).toHaveValue("candidates");
  });

  it("filters the folder by words, says when nothing matches, and clears from there", async () => {
    const user = userEvent.setup();
    await saveAnalysis(CARLSEN);
    await saveAnalysis(ANAND);
    await renderScreen();

    const words = screen.getByRole("searchbox", { name: "Filter analyses" });
    await user.type(words, "ruy carlsen");
    expect(rowIds()).toEqual(["g1"]);
    await user.clear(words);
    await user.type(words, "najdorf");
    expect(screen.getByTestId("saved-analyses-table-no-match")).toHaveTextContent("No analysis matches the filter.");
    expect(screen.queryByTestId("saved-analyses-table-empty")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Clear the filter" }));
    expect(rowIds()).toEqual(["g2", "g1"]);
    expect(words).toHaveValue("");
  });

  it("select-all takes the rows the filter leaves, and the picks outlast the filter and the view", async () => {
    const user = userEvent.setup();
    await saveAnalysis(CARLSEN);
    await saveAnalysis(ANAND);
    await renderScreen();

    await user.type(screen.getByRole("searchbox", { name: "Filter analyses" }), "tata");
    await user.click(screen.getByRole("checkbox", { name: "Select all analyses" }));
    expect(screen.getByTestId("saved-analyses-selected-count")).toHaveTextContent("1 selected");
    await user.click(screen.getByRole("button", { name: "Clear the words" }));
    expect(screen.getByRole("checkbox", { name: "Select Carlsen, Magnus – Giri, Anish" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Select Anand, Viswanathan – Aronian, Levon" })).not.toBeChecked();
    await user.click(screen.getByTestId("saved-analyses-view-compact"));
    expect(within(screen.getByTestId("saved-analyses-select-g1")).getByRole("checkbox")).toBeChecked();
  });

  it("goes back to the first page on a new sort, and sorts and filters the whole folder, not the page", async () => {
    const user = userEvent.setup();
    const record = save("x", [[[], ["e4"]]]);
    const total = SAVED_ANALYSES_PAGE + 12;
    await addAnalyses(Array.from({ length: total }, (_, index) => ({ ...record, id: `r${index}`, name: `R${index}` })));
    await renderScreen();

    await user.click(within(screen.getByTestId("saved-analyses-table-pager")).getByRole("button", { name: "Go to next page" }));
    expect(screen.queryByTestId("saved-analyses-item-r0")).toBeNull();
    await user.click(header("Name"));
    await user.click(header("Name"));
    // Z to A over the whole folder, from its first page: R61 heads it, though it was last.
    expect(rowIds()[0]).toBe(`r${total - 1}`);
    expect(where.current?.search).not.toContain("page=");
    await user.type(screen.getByRole("searchbox", { name: "Filter analyses" }), `R${total - 1}`);
    expect(rowIds()).toEqual([`r${total - 1}`]);
  });

  it("puts the folders in the table first, opening one in place, its analyses under it", async () => {
    const user = userEvent.setup();
    const folder = (await createAnalysisFolder("Tata Steel 2024", null))!;
    await saveAnalysis({ ...CARLSEN, folderId: folder.id });
    await saveAnalysis(ANAND);
    await renderScreen();

    expect(rowIds()).toEqual([`saved-analyses-folder-${folder.id}`, "g2"]);
    expect(screen.getByTestId(`saved-analyses-folder-${folder.id}`)).toHaveTextContent("1 analysis");
    await user.click(within(screen.getByTestId("saved-analyses-table-frame-table")).getByRole("button", { name: "Open Tata Steel 2024" }));
    expect(rowIds()).toEqual([`saved-analyses-folder-${folder.id}`, "g1", "g2"]);
    // A folder has no pick; select-all takes the analyses shown.
    await user.click(screen.getByRole("checkbox", { name: "Select all analyses" }));
    expect(screen.getByTestId("saved-analyses-selected-count")).toHaveTextContent("2 selected");
    // Its name goes into it, the sort kept.
    await user.click(header("White"));
    await user.click(screen.getByRole("link", { name: "Open folder Tata Steel 2024" }));
    expect(where.current?.search).toBe(`?sort=white&folder=${folder.id}`);
    expect(rowIds()).toEqual(["g1"]);
  });

  it("finds an analysis in a closed folder by its words, opening the way to it", async () => {
    const user = userEvent.setup();
    const openings = (await createAnalysisFolder("Openings", null))!;
    const candidates = (await createAnalysisFolder("Candidates", openings.id))!;
    await saveAnalysis({ ...ANAND, folderId: candidates.id });
    await saveAnalysis(CARLSEN);
    await renderScreen();

    expect(rowIds()).toEqual([`saved-analyses-folder-${openings.id}`, "g1"]);
    await user.type(screen.getByRole("searchbox", { name: "Filter analyses" }), "aronian");
    expect(rowIds()).toEqual([`saved-analyses-folder-${openings.id}`, `saved-analyses-folder-${candidates.id}`, "g2"]);
  });

  it("leaves the card views as they were — no table, no words box", async () => {
    await saveAnalysis(CARLSEN);
    await renderScreen();
    await userEvent.click(screen.getByTestId("saved-analyses-view-compact"));
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByRole("searchbox", { name: "Filter analyses" })).toBeNull();
    expect(screen.getByTestId("board-saved-analyses-preview-g1")).toBeInTheDocument();
  });

  it("passes axe with the table filtered to nothing", async () => {
    const user = userEvent.setup();
    await saveAnalysis(CARLSEN);
    await renderScreen();
    await user.type(screen.getByRole("searchbox", { name: "Filter analyses" }), "najdorf");
    await expectNoAxeViolations(screen.getByTestId("saved-analyses-screen"));
  });
});

describe("Saved analyses — a folder of thousands (CTA-77)", () => {
  it("shows a page at a time, and keeps counting and picking the whole folder", async () => {
    const user = userEvent.setup();
    const record = save("x", [[[], ["e4"]]]);
    const total = SAVED_ANALYSES_PAGE + 12;
    await addAnalyses(
      Array.from({ length: total }, (_, index) => ({ ...record, id: `r${index}`, name: `R${index}` })),
    );
    await renderScreen();

    expect(screen.getByTestId("saved-analyses-count")).toHaveTextContent(`Analyses: ${total}`);
    expect(screen.getAllByTestId(/^saved-analyses-item-/)).toHaveLength(SAVED_ANALYSES_PAGE);
    expect(screen.getByTestId("saved-analyses-item-r0")).toBeInTheDocument();

    // The design system's pager (CTA-113): 25 / 50 / 100 / 250 a page, 50 by default.
    await user.click(within(screen.getByTestId("saved-analyses-table-pager")).getByRole("button", { name: "Go to next page" }));
    expect(screen.getAllByTestId(/^saved-analyses-item-/)).toHaveLength(12);
    expect(screen.getByTestId(`saved-analyses-item-r${total - 1}`)).toBeInTheDocument();

    // Select-all takes the whole folder, not the page.
    await user.click(within(screen.getByTestId("saved-analyses-select-all")).getByRole("checkbox"));
    expect(screen.getByTestId("saved-analyses-selected-count")).toHaveTextContent(`${total} selected`);
  });

  it("offers the design system's page sizes, and goes back to the first page on a new size (CTA-113)", async () => {
    const user = userEvent.setup();
    const record = save("x", [[[], ["e4"]]]);
    await addAnalyses(Array.from({ length: 30 }, (_, index) => ({ ...record, id: `r${index}`, name: `R${index}` })));
    await renderScreen();

    expect(screen.getAllByTestId(/^saved-analyses-item-/)).toHaveLength(30);
    await user.click(within(screen.getByTestId("saved-analyses-table-pager")).getByRole("combobox"));
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(["25", "50", "100", "250"]);
    await user.click(screen.getByRole("option", { name: "25" }));
    expect(screen.getAllByTestId(/^saved-analyses-item-/)).toHaveLength(25);
  });

  it("has no pager for a folder that fits one page", async () => {
    await saveAnalysis(save("a1", [[[], ["e4"]]]));
    await renderScreen();
    expect(screen.queryByTestId("saved-analyses-table-pager")).toBeNull();
  });

  it("pages the cards the same way, under their own pager", async () => {
    const user = userEvent.setup();
    const record = save("x", [[[], ["e4"]]]);
    await addAnalyses(Array.from({ length: SAVED_ANALYSES_PAGE + 3 }, (_, index) => ({ ...record, id: `r${index}`, name: `R${index}` })));
    await renderScreen();
    await user.click(screen.getByTestId("saved-analyses-view-compact"));
    expect(screen.getAllByTestId(/^saved-analyses-item-/)).toHaveLength(SAVED_ANALYSES_PAGE);
    await user.click(within(screen.getByTestId("saved-analyses-pagination")).getByRole("button", { name: "Go to next page" }));
    expect(screen.getAllByTestId(/^saved-analyses-item-/)).toHaveLength(3);
  });
});

describe("the new-analysis form (CTA-87)", () => {
  const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  // The editor's e2→e4 places a piece, it does not make a move: White still to move.
  const AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1";

  /** Drag a piece in the form's editor, the way the provider reports it. */
  const editorDrag = (pieceType: string, from: string, to: string | null) =>
    act(() => {
      (editorBoard.options!.onPieceDrop as (args: unknown) => boolean)({
        piece: { pieceType, isSparePiece: false, position: from },
        sourceSquare: from,
        targetSquare: to,
      });
    });

  const startHref = () => screen.getByTestId("new-analysis-start").getAttribute("href") ?? "";

  it("hosts the shared editor, and Start opens the plain board for the standard start", async () => {
    await renderScreen();
    expect(screen.getByTestId("new-analysis-editor")).toBeInTheDocument();
    expect(screen.getByTestId("board-editor")).toHaveAttribute("data-position", START);
    const start = screen.getByTestId("new-analysis-start");
    expect(start).toBeEnabled();
    expect(startHref()).toBe("/tools/analysis");
    // What the panel said before the form came is kept, under Start.
    expect(screen.getByTestId("saved-analyses-storage-note")).toBeInTheDocument();
  });

  it("sends an edited position along as ?fen=", async () => {
    await renderScreen();
    editorDrag("wP", "e2", "e4");
    expect(startHref()).toBe(`/tools/analysis?fen=${encodeURIComponent(AFTER_E4)}`);
  });

  it("switches Start off, and says why, while the position cannot be analyzed", async () => {
    await renderScreen();
    editorDrag("wK", "e1", null); // dragged off the board: the king is gone

    const start = screen.getByTestId("new-analysis-start");
    expect(start).toBeDisabled();
    expect(start).not.toHaveAttribute("href");
    expect(screen.getByTestId("new-analysis-illegal")).toHaveTextContent("White has no king.");

    // Back to the standard start, and Start is back.
    fireEvent.click(screen.getByTestId("new-analysis-new"));
    expect(screen.queryByTestId("new-analysis-illegal")).toBeNull();
    expect(screen.getByTestId("new-analysis-start")).toBeEnabled();
    expect(startHref()).toBe("/tools/analysis");
  });

  /*
    Load a game (CTA-96): the Load route's pipeline (`useAnalysisLoad`) placed
    by hand — the quick loads (a FEN field and a `.pgn` pick) in the editor's
    controls row, the paste box in its own section below, and the editor's
    resets (New, Clear, Flip) up in the form's header. A whole game (several
    merged in the popup exactly as on the board's own Load tab, CTA-101) is
    handed to the Analysis Board as location state, or several kept as a
    Library collection; a PGN that is really a position — a
    single move, or none — and a FEN set the editor up, which Start then
    carries.
  */
  describe("loads a PGN as a whole game (CTA-96)", () => {
    const ONE_GAME = '[Event "Solo"]\n\n1. e4 e5 (1... c5 {sicilian}) 2. Nf3 *\n';
    const TWO_GAMES = '[Event "One"]\n\n1. e4 e5 *\n\n[Event "Two"]\n\n1. d4 d5 *\n';
    // The position after a real 1. e4 — Black to answer it, so a load of it
    // turns the editor's board.
    const AFTER_MOVE_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
    const KINGS = "4k3/8/8/8/8/8/8/4K3 w - - 0 1";
    const EMPTY = "8/8/8/8/8/8/8/8 w - - 0 1";

    const pasteAndLoad = async (text: string) => {
      fireEvent.change(screen.getByTestId("new-analysis-paste"), {
        target: { value: text },
      });
      fireEvent.click(screen.getByTestId("new-analysis-load-text"));
      await act(async () => {
        await Promise.resolve();
      });
    };

    const pickAndLoad = async (text: string) => {
      fireEvent.change(screen.getByTestId("new-analysis-pgn-input"), {
        target: {
          files: [new File([text], "game.pgn", { type: "application/x-chess-pgn" })],
        },
      });
      await act(async () => {
        await Promise.resolve();
      });
    };

    const applyFen = async (fen: string) => {
      fireEvent.change(screen.getByTestId("new-analysis-fen-input"), {
        target: { value: fen },
      });
      fireEvent.keyDown(screen.getByTestId("new-analysis-fen-input"), { key: "Enter" });
      await act(async () => {
        await Promise.resolve();
      });
    };

    const editorPosition = () =>
      screen.getByTestId("board-editor").getAttribute("data-position");

    const editorOrientation = () =>
      screen.getByTestId("board-editor").getAttribute("data-orientation");

    it("keeps the resets in the header, and the quick loads in the editor's row", async () => {
      await renderScreen();

      // New, Clear, Flip — beside the title, not under the board.
      expect(screen.getByTestId("new-analysis-new")).toBeInTheDocument();
      expect(screen.getByTestId("new-analysis-clear")).toBeInTheDocument();
      expect(screen.getByTestId("new-analysis-flip")).toBeInTheDocument();
      expect(screen.queryByTestId("new-analysis-editor-reset-start")).toBeNull();

      // The quick loads sit in the editor's controls row, side by side: the
      // FEN field at the left, the `.pgn` pick beside it. The editor offers no
      // tabs and its fields are always shown; the section below is the paste
      // box alone — no file button, no help line.
      const editor = within(screen.getByTestId("new-analysis-editor"));
      expect(editor.getByTestId("new-analysis-fen-input")).toBeInTheDocument();
      expect(editor.getByTestId("new-analysis-pgn")).toBeInTheDocument();
      expect(screen.queryByTestId("new-analysis-editor-tab-position")).toBeNull();
      expect(screen.queryByTestId("new-analysis-editor-tab-fen")).toBeNull();
      expect(screen.queryByTestId("new-analysis-editor-tab-pgn")).toBeNull();
      expect(screen.getByTestId("new-analysis-editor-position-fields")).toBeInTheDocument();
      expect(screen.getByTestId("new-analysis-paste")).toBeInTheDocument();
      expect(screen.queryByTestId("analysis-load-pick")).toBeNull();
      expect(screen.queryByText(/opens as a new analysis/)).toBeNull();
    });

    it("the header's New, Clear and Flip do what the editor's row once did", async () => {
      await renderScreen();
      editorDrag("wP", "e2", "e4");

      fireEvent.click(screen.getByTestId("new-analysis-flip"));
      expect(editorOrientation()).toBe("black");

      fireEvent.click(screen.getByTestId("new-analysis-clear"));
      expect(editorPosition()).toBe(EMPTY);

      fireEvent.click(screen.getByTestId("new-analysis-new"));
      expect(editorPosition()).toBe(START);
      expect(startHref()).toBe("/tools/analysis");
    });

    it.each([{ how: "paste" as const }, { how: "file" as const }])(
      "opens one game on the Analysis Board as a new unsaved analysis, facing White ($how)",
      async ({ how }) => {
        await renderScreen();
        if (how === "paste") {
          await pasteAndLoad(ONE_GAME);
        } else {
          await pickAndLoad(ONE_GAME);
        }

        expect(where.current?.pathname).toBe("/tools/analysis");
        // The whole game handed over as location state: a game does not turn the board.
        const handOff = analysisHandOffOf(where.current?.state);
        expect(handOff?.orientation).toBe("white");
        // The side line and its comment ride along — not just the final position.
        expect(nodeAtSanPath(handOff!.tree, ["e4", "c5"])).not.toBeNull();
        expect(treeToPgn(handOff!.tree)).toContain("sicilian");
      },
    );

    it("a PGN of a single move sets the editor up from the position after it", async () => {
      await renderScreen();
      await pasteAndLoad("1. e4 *");

      // Not a game: the editor takes the position after the move — turned to
      // the side that has to answer it — and Start carries it. Nothing
      // navigated, and there is no "loaded" line to say.
      expect(editorPosition()).toBe(AFTER_MOVE_E4);
      expect(editorOrientation()).toBe("black");
      expect(startHref()).toBe(`/tools/analysis?fen=${encodeURIComponent(AFTER_MOVE_E4)}`);
      expect(where.current?.pathname).toBe("/tools/analysis/saved");
      expect(screen.queryByTestId("new-analysis-done")).toBeNull();
    });

    it("a PGN of a position and no moves sets the editor up from it", async () => {
      await renderScreen();
      await pasteAndLoad(`[SetUp "1"]\n[FEN "${KINGS}"]\n*`);

      expect(editorPosition()).toBe(KINGS);
      expect(startHref()).toBe(`/tools/analysis?fen=${encodeURIComponent(KINGS)}`);
      expect(where.current?.pathname).toBe("/tools/analysis/saved");
    });

    it("the FEN field sets the editor up too, and a bad one says so and goes nowhere", async () => {
      await renderScreen();
      await applyFen("not a fen");

      expect(screen.getByTestId("new-analysis-fen-problem")).toBeInTheDocument();
      expect(editorPosition()).toBe(START);
      expect(where.current?.pathname).toBe("/tools/analysis/saved");

      await applyFen(AFTER_MOVE_E4);

      expect(editorPosition()).toBe(AFTER_MOVE_E4);
      expect(screen.queryByTestId("new-analysis-fen-problem")).toBeNull();
      expect(startHref()).toBe(`/tools/analysis?fen=${encodeURIComponent(AFTER_MOVE_E4)}`);
    });

    it("opens the popup for several games, and a merge hands one counted tree to the board", async () => {
      await renderScreen();
      await pasteAndLoad(TWO_GAMES);

      expect(screen.getByTestId("new-analysis-choice")).toHaveTextContent("This PGN holds 2 games");
      expect(screen.queryByTestId("new-analysis-choice-split")).toBeNull();
      expect(where.current?.pathname).toBe("/tools/analysis/saved"); // nothing navigated yet

      fireEvent.click(screen.getByTestId("new-analysis-choice-merge"));
      await act(async () => {
        await Promise.resolve();
      });

      expect(where.current?.pathname).toBe("/tools/analysis");
      const handOff = analysisHandOffOf(where.current?.state);
      // Facing White: a game does not turn the board.
      expect(handOff?.orientation).toBe("white");
      // One merged tree: the first game's line is the mainline, the second a
      // side line — each tagged with its one game where they part.
      const e4 = findNode(handOff!.tree, nodeAtSanPath(handOff!.tree, ["e4"]));
      const d4 = findNode(handOff!.tree, nodeAtSanPath(handOff!.tree, ["d4"]));
      expect(e4?.comments).toEqual(["[%games 1]"]);
      expect(d4?.comments).toEqual(["[%games 1]"]);
      expect(nodeAtSanPath(handOff!.tree, ["d4", "d5"])).not.toBeNull();
    });

    it("keeps several games as a Library collection named after the file, and goes to its table", async () => {
      await resetLibraryCollectionStore();
      await renderScreen();
      await pickAndLoad(TWO_GAMES);
      fireEvent.click(screen.getByTestId("new-analysis-choice-collection"));

      // The index pass loads the opening book: slow on a busy machine.
      await waitFor(() => expect(where.current?.pathname).toMatch(/^\/library\/u/), {
        timeout: 10_000,
      });
      const [collection] = await loadUploadedCollections();
      // The games' events differ, so the file's name says what it is.
      expect(collection).toMatchObject({ name: "Game", count: 2, folderId: null });
      expect(where.current?.pathname).toBe(`/library/${collection.id}`);
      expect(savedAnalysesSnapshot() ?? []).toEqual([]);
    });

    it("names a pasted collection whose games share no event \"Pasted collection\"", async () => {
      await resetLibraryCollectionStore();
      await renderScreen();
      await pasteAndLoad(TWO_GAMES);
      fireEvent.click(screen.getByTestId("new-analysis-choice-collection"));

      // The index pass loads the opening book: slow on a busy machine.
      await waitFor(() => expect(where.current?.pathname).toMatch(/^\/library\/u/), {
        timeout: 10_000,
      });
      const [collection] = await loadUploadedCollections();
      expect(collection.name).toBe("Pasted collection");
    });

    it("saves several games to a new Saved analyses folder named after the file, and opens it (CTA-141)", async () => {
      await renderScreen();
      await pickAndLoad(TWO_GAMES);
      fireEvent.click(screen.getByRole("button", { name: "Save to Saved analyses" }));
      const dialog = screen.getByRole("dialog", { name: "Save to Saved analyses" });
      expect(within(dialog).getByRole("textbox", { name: "Folder name" })).toHaveValue("Game");
      fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

      await waitFor(() => expect(where.current?.search).toMatch(/^\?folder=/));
      const [folder] = analysisFoldersSnapshot() ?? [];
      expect(folder).toMatchObject({ name: "Game", parentId: null });
      expect(where.current).toMatchObject({
        pathname: "/tools/analysis/saved",
        search: `?folder=${encodeURIComponent(folder.id)}`,
      });
      expect((savedAnalysesSnapshot() ?? []).map((row) => [row.name, row.folderId])).toEqual([
        ["One", folder.id],
        ["Two", folder.id],
      ]);
      await waitFor(() => expect(screen.queryByTestId("new-analysis-choice")).toBeNull());
    });

    it("cancelling the popup keeps nothing and stays", async () => {
      await renderScreen();
      await pasteAndLoad(TWO_GAMES);
      fireEvent.click(screen.getByTestId("new-analysis-choice-cancel"));

      await waitFor(() => expect(screen.queryByTestId("new-analysis-choice")).toBeNull());
      expect(where.current?.pathname).toBe("/tools/analysis/saved");
      expect(savedAnalysesSnapshot() ?? []).toEqual([]);
    });

    it("says so, and goes nowhere, for a PGN that will not read", async () => {
      await renderScreen();
      await pasteAndLoad("this is not a pgn");

      expect(screen.getByTestId("new-analysis-problem")).toHaveTextContent(
        "could not be read as PGN",
      );
      expect(where.current?.pathname).toBe("/tools/analysis/saved");
      expect(savedAnalysesSnapshot() ?? []).toEqual([]);
    });
  });
});

describe("Saved analyses — accessible (CTA-113)", () => {
  it("passes axe in the list, with a folder, an analysis and the form beside them", async () => {
    await createAnalysisFolder("Openings", null);
    await saveAnalysis(save("a1", [[[], ["e4", "e5"]]]));
    await renderScreen();
    await settleBook();
    expect(screen.getByRole("heading", { level: 1, name: "Saved analyses" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: i18n.t("savedAnalyses.newAnalysis.title") })).toBeInTheDocument();
    await expectNoAxeViolations(screen.getByTestId("saved-analyses-screen"));
  });

  it("passes axe as cards, and empty", async () => {
    await saveAnalysis(save("a1", [[[], ["e4"]]]));
    const { unmount } = await renderScreen();
    await userEvent.click(screen.getByTestId("saved-analyses-view-compact"));
    await settleBook();
    await expectNoAxeViolations(screen.getByTestId("saved-analyses-screen"));
    unmount();
  });

  it("is worked from the keyboard: the view, a pick, a row's name its link to the board", async () => {
    const user = userEvent.setup();
    await saveAnalysis({ ...save("a1", [[[], ["e4"]]]), name: "Najdorf" });
    await renderScreen();
    // The view toggle is one tab stop; the arrows walk it.
    screen.getByTestId("saved-analyses-view-list").focus();
    await user.keyboard("{ArrowRight}{Enter}");
    expect(screen.getByTestId("saved-analyses-grid")).toBeInTheDocument();
    screen.getByTestId("saved-analyses-view-compact").focus();
    await user.keyboard("{ArrowLeft}{Enter}");
    const open = screen.getByRole("link", { name: "Najdorf" });
    expect(open).toHaveAttribute("href", "/tools/analysis?analysis=a1&folder=");
    // The row's pick comes just before its name; its gear after the row's cells.
    open.focus();
    await user.tab({ shift: true });
    expect(screen.getByRole("checkbox", { name: "Select Najdorf" })).toHaveFocus();
    await user.keyboard(" ");
    expect(screen.getByTestId("saved-analyses-selected-count")).toHaveTextContent("1 selected");
  });
});

describe("Saved analyses — Analyse (CTA-177)", () => {
  const dialog = () => screen.getByRole("dialog", { name: "New job" });
  const start = () => within(dialog()).getByRole("button", { name: "Start computer analysis" });
  /** The jobs as read — `[]` before the first read. */
  const jobs = () => jobsSnapshot() ?? [];
  const mine = (folderId: string | null = null): SavedAnalysis => ({ ...save("a1", [[[], ["e4", "e5", "Nf3"]]]), name: "Mine", folderId });

  it("a row's Analyse opens New Job on the record, with the defaults on the reader's engine; Start queues its PGN, name and folder", async () => {
    const user = userEvent.setup();
    const folder = (await createAnalysisFolder("Openings", null))!;
    await saveAnalysis(mine(folder.id));
    await renderScreen(`/tools/analysis/saved?folder=${folder.id}`);

    await user.click(screen.getByRole("button", { name: "Analyse Mine with the computer" }));
    expect(within(dialog()).getByTestId("saved-analyses-new-job-game")).toHaveTextContent("Game: Mine");
    expect(within(dialog()).getByRole("slider", { name: "Depth" })).toHaveAttribute(
      "aria-valuenow",
      String(DEFAULT_COMPUTER_ANALYSIS_OPTIONS.depth),
    );
    // No engine runs on the list: the default build's Threads reads pinned from its descriptor.
    expect(within(dialog()).getByRole("slider", { name: "Threads" })).toBeDisabled();
    await user.click(start());

    await waitFor(() => expect(jobs()).toHaveLength(1));
    const [job] = jobs();
    expect(job.source).toEqual({ analysisId: "a1", name: "Mine", folderId: folder.id, pgn: findSavedAnalysis("a1")?.pgn });
    expect(job.options).toEqual(expect.objectContaining({ engine: DEFAULT_ENGINE_ID, outputs: ["light"], depth: DEFAULT_COMPUTER_ANALYSIS_OPTIONS.depth }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(await screen.findByTestId("saved-analyses-new-job-notice-message")).toHaveTextContent("Computer analysis of Mine queued.");
    expect(screen.getByRole("link", { name: "Open in Jobs" })).toHaveAttribute("href", `/jobs?job=${job.id}`);
  });

  it("a card's Analyse opens it too", async () => {
    const user = userEvent.setup();
    await saveAnalysis(mine());
    await renderScreen();
    await user.click(screen.getByTestId("saved-analyses-view-compact"));
    await user.click(within(screen.getByTestId("saved-analyses-item-a1")).getByRole("button", { name: "Analyse Mine with the computer" }));
    expect(within(dialog()).getByTestId("saved-analyses-new-job-game")).toHaveTextContent("Game: Mine");
    await expectNoAxeViolations(dialog());
  });

  it("a record with a job asks first, and Check existing opens the job on the Jobs screen", async () => {
    const user = userEvent.setup();
    const saved = mine();
    await saveAnalysis(saved);
    const id = await enqueueComputerAnalysis({
      source: { analysisId: "a1", name: "Mine", folderId: null, pgn: saved.pgn },
      options: DEFAULT_COMPUTER_ANALYSIS_OPTIONS,
    });
    await renderScreen();
    await user.click(screen.getByRole("button", { name: "Analyse Mine with the computer" }));
    expect(within(dialog()).getByTestId("saved-analyses-new-job-existing")).toHaveTextContent("Mine already has a computer analysis — the job: Queued.");
    await user.click(within(dialog()).getByRole("button", { name: "Check existing" }));
    expect(where.current).toEqual(expect.objectContaining({ pathname: "/jobs", search: `?job=${id}` }));
  });

  it("says a refusal inside the dialog, which stays open", async () => {
    const user = userEvent.setup();
    const saved = mine();
    await saveAnalysis(saved);
    // The store full of jobs that have not ended.
    for (let index = 0; index < MAX_JOBS; index += 1) {
      await enqueueComputerAnalysis({ source: { analysisId: null, name: "Other", folderId: null, pgn: saved.pgn }, options: DEFAULT_COMPUTER_ANALYSIS_OPTIONS });
    }
    await renderScreen();
    await user.click(screen.getByRole("button", { name: "Analyse Mine with the computer" }));
    await user.click(start());
    expect(await within(dialog()).findByTestId("saved-analyses-new-job-problem")).toHaveTextContent("Too many jobs are waiting.");
    expect(jobs()).toHaveLength(MAX_JOBS);
  });

  it("a record that will not read cannot be analysed", async () => {
    await saveAnalysis({ ...mine(), pgn: "1. e4 e5 2. Qxx9 *" });
    await renderScreen();
    expect(screen.getByRole("button", { name: "Analyse Mine with the computer" })).toBeDisabled();
  });
});
