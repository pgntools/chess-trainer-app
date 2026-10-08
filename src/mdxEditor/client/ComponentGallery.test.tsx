import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

import { expectNoAxeViolations } from "../../test/axe";
import { DEFAULT_ANALYSIS_SETTINGS } from "../../lib/analysisSettings";
import { batchAnalysesOf } from "../../lib/savedAnalyses";
import { addAnalyses } from "../../lib/savedAnalysisStore";
import { readRepertoireText, savedRepertoireOf } from "../../lib/savedRepertoires";
import { saveRepertoire } from "../../lib/savedRepertoireStore";
import ComponentGalleryMain from "./ComponentGalleryMain";

/*
  The MDX editor's Components gallery (`/dev/mdx-editor/components`,
  CTA-140): every component an article embeds, picked from a tree, opened on
  a shipped sample — its settings a form over its code, the code to copy,
  the component rendered as an article renders it; the source switched to a
  pasted PGN, a Blog file or the Library. It writes nothing: `fetch` (the
  storage service) is never called.
*/

vi.mock("react-chessboard", async () => {
  const { reactChessboardMock } = await import("../../views/board/boardTestHarness");
  return reactChessboardMock();
});

const fetchSpy = vi.fn(async () => {
  throw new TypeError("Failed to fetch");
});
beforeEach(() => vi.stubGlobal("fetch", fetchSpy));
afterEach(() => {
  vi.unstubAllGlobals();
  fetchSpy.mockClear();
});

const mount = () =>
  render(
    <MemoryRouter initialEntries={["/dev/mdx-editor/components"]}>
      <ComponentGalleryMain />
    </MemoryRouter>,
  );

const code = () => screen.getByRole("textbox", { name: "The code" });
const tree = () => screen.getByRole("tree", { name: "Components" });
const preview = () => screen.getByRole("region", { name: /^Preview/ });
const pick = async (user: ReturnType<typeof userEvent.setup>, name: string) => user.click(within(tree()).getByRole("treeitem", { name }));

describe("the Components gallery (CTA-140)", () => {
  it("opens on the first board, its sample read from the Blog's file — the code, the form and the preview", async () => {
    mount();
    expect(screen.getByRole("heading", { level: 1, name: "Components gallery" })).toBeInTheDocument();
    // Its folders, open: each a branch of the tree.
    const folders = within(tree()).getAllByRole("treeitem", { expanded: true });
    expect(folders).toHaveLength(5);
    ["Boards", "Tournament tables", "Images", "Other", "Future components"].forEach((title, index) => expect(folders[index]).toHaveTextContent(new RegExp(`^${title}\\d`)));
    expect(within(tree()).getByRole("treeitem", { name: "A game, its moves beside it" })).toHaveAttribute("aria-current", "page");
    expect(code()).toHaveValue('import game from "./writing-an-article/inline-pgn/rubinstein-capablanca-1911.pgn?raw"\n\n<InlinePgnGame pgn={game} />');
    expect(screen.getByTestId("mdx-component-gallery-note")).toHaveTextContent("from the Blog's root, src/views/blog/articles/");
    // The sample, compiled with its import, rendered as an article renders it.
    await waitFor(() => expect(within(preview()).getByTestId("mdx-component-gallery-preview")).not.toHaveAttribute("aria-busy"), { timeout: 10_000 });
    expect(within(preview()).queryByTestId("mdx-component-gallery-preview-error")).not.toBeInTheDocument();
    expect(await within(preview()).findByRole("group", { name: /^The game, from The start to 42\. Rh6\+/ })).toBeInTheDocument();
    await expectNoAxeViolations();
  });

  it("writes the code from the form, and reads the form from the code typed", async () => {
    const user = userEvent.setup();
    mount();
    await user.click(screen.getByRole("switch", { name: "Side lines" }));
    expect(code()).toHaveValue('import game from "./writing-an-article/inline-pgn/rubinstein-capablanca-1911.pgn?raw"\n\n<InlinePgnGame pgn={game} variations={false} />');
    fireEvent.change(code(), { target: { value: 'import game from "./writing-an-article/inline-pgn/rubinstein-capablanca-1911.pgn?raw"\n\n<InlinePgnGame pgn={game} caption="Hello" />' } });
    expect(screen.getByRole("textbox", { name: "Caption" })).toHaveValue("Hello");
    expect(screen.getByRole("switch", { name: "Side lines" })).toBeChecked();
  });

  it("opens the two-column games — beside the board and under it — on the same sample, their settings those of <InlinePgnGame>", async () => {
    const user = userEvent.setup();
    mount();
    await pick(user, "A game, its moves in two columns beside it");
    expect(code()).toHaveValue('import game from "./writing-an-article/inline-pgn/rubinstein-capablanca-1911.pgn?raw"\n\n<InlinePgnGame2colH pgn={game} />');
    expect(screen.getByRole("switch", { name: "Side lines" })).toBeChecked();
    await pick(user, "A game, its moves in two columns under it");
    expect(code()).toHaveValue('import game from "./writing-an-article/inline-pgn/rubinstein-capablanca-1911.pgn?raw"\n\n<InlinePgnGame2colV pgn={game} />');
    expect(screen.getByRole("switch", { name: "Side lines" })).toBeChecked();
  });

  it("picks an entry from the tree by the keyboard, and opens it on its own sample", async () => {
    const user = userEvent.setup();
    mount();
    within(tree()).getByRole("treeitem", { name: "A game, its moves beside it" }).focus();
    // Down through the Boards — past the two two-column variants — to the stored game.
    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}{Enter}");
    expect(within(tree()).getByRole("treeitem", { name: "A stored game" })).toHaveAttribute("aria-current", "page");
    expect(code()).toHaveValue('<StoredGameEmbed src="/library/capablanca/2" />');
    expect(screen.getByTestId("mdx-component-gallery-reads")).toHaveTextContent("Built-in example — Capablanca, game 2 — /library/capablanca/2 (the default)");
    expect(screen.getByRole("button", { name: "Add / update game…" })).toBeInTheDocument();
    await pick(user, "Match");
    expect(code()).toHaveValue('import games from "./tournaments/clutchlegends26.pgn?raw"\n\n<MatchTable pgn={games} />');
  });

  it("adds or updates the PGN in a dialog: a built-in example, an upload, a paste, an address — and says when one does not fit", async () => {
    const user = userEvent.setup();
    mount();
    await pick(user, "Swiss standings");
    expect(screen.getByTestId("mdx-component-gallery-reads")).toHaveTextContent("Built-in example — tournaments/20th-werner-obermeyer-swiss-5r.pgn (the default)");
    const open = async () => {
      await user.click(screen.getByRole("button", { name: "Add / update PGN…" }));
      return screen.findByRole("dialog", { name: "Add / update PGN — <SwissStandingsTable>" });
    };

    // A built-in example: the default chosen, another picked from the list.
    let dialog = await open();
    expect(within(dialog).getByRole("radio", { name: "A built-in example" })).toBeChecked();
    await user.click(within(dialog).getByRole("combobox", { name: "The example" }));
    await user.click(await screen.findByRole("option", { name: "tournaments/chned26.pgn" }));
    await user.click(within(dialog).getByRole("button", { name: "Use it" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(code()).toHaveValue('import games from "./tournaments/chned26.pgn?raw"\n\n<SwissStandingsTable pgn={games} density="dense" rowsPerPage="25" />');
    // A knockout's games, not a Swiss's: said, the table still shown.
    expect(await screen.findByTestId("mdx-component-gallery-other-kind")).toHaveTextContent("The games look like a knockout");

    // Pasted: written into the code.
    dialog = await open();
    await user.click(within(dialog).getByRole("radio", { name: "Paste a PGN" }));
    expect(within(dialog).getByRole("button", { name: "Use it" })).toBeDisabled();
    fireEvent.change(within(dialog).getByRole("textbox", { name: "The PGN" }), {
      target: { value: '[Event "M"]\n[White "A"]\n[Black "B"]\n[Round "1"]\n[Result "1-0"]\n\n1. e4 1-0\n\n[Event "M"]\n[White "B"]\n[Black "A"]\n[Round "2"]\n[Result "0-1"]\n\n1. d4 0-1' },
    });
    await user.click(within(dialog).getByRole("button", { name: "Use it" }));
    expect(screen.getByTestId("mdx-component-gallery-reads")).toHaveTextContent("Pasted — 2 games");
    expect((code() as HTMLTextAreaElement).value).toMatch(/^export const games = `\[Event "M"\][\s\S]*`\n\n<SwissStandingsTable pgn=\{games\} density="dense" rowsPerPage="25" \/>$/);
    expect(await screen.findByTestId("mdx-component-gallery-other-kind")).toHaveTextContent("try Match, <MatchTable>");

    // Uploaded: read here, written into the code too.
    dialog = await open();
    // It opens on what is in use.
    expect(within(dialog).getByRole("radio", { name: "Paste a PGN" })).toBeChecked();
    await user.click(within(dialog).getByRole("radio", { name: "Upload a PGN file" }));
    await user.upload(within(dialog).getByTestId("mdx-component-gallery-upload-input"), new File(['[Event "Club"]\n[White "X"]\n[Black "Y"]\n[Result "*"]\n\n1. c4 *'], "club.pgn"));
    expect(await within(dialog).findByTestId("mdx-component-gallery-uploaded")).toHaveTextContent("club.pgn — 1 game, 1 KB.");
    await user.click(within(dialog).getByRole("button", { name: "Use it" }));
    expect(screen.getByTestId("mdx-component-gallery-reads")).toHaveTextContent("Uploaded — club.pgn, 1 game");
    expect(code()).toHaveValue('export const games = `[Event "Club"]\n[White "X"]\n[Black "Y"]\n[Result "*"]\n\n1. c4 *`\n\n<SwissStandingsTable pgn={games} density="dense" rowsPerPage="25" />');

    // A table reads one game of the Library no more than a PGN's one game: it does not fit, and cannot be used.
    dialog = await open();
    await user.click(within(dialog).getByRole("radio", { name: /^An address in the app/ }));
    const addressField = within(dialog).getByRole("combobox", { name: "The address" });
    await user.type(addressField, "/library/capablanca/3");
    await user.click(within(dialog).getByRole("button", { name: "Look it up" }));
    expect(await within(dialog).findByTestId("mdx-component-gallery-found")).toHaveTextContent(/^Found Capablanca, Jose – /);
    expect(within(dialog).getByTestId("mdx-component-gallery-misfit")).toHaveTextContent("<SwissStandingsTable> does not read one Library game: it reads a PGN or a whole Library collection, /library/<collection>.");
    expect(within(dialog).getByRole("button", { name: "Use it" })).toBeDisabled();
    await expectNoAxeViolations(dialog);

    // One component, any source: the same table over a Library collection, copied off the address bar.
    await user.clear(addressField);
    await user.type(addressField, "http://localhost:5214/chess-trainer-app/library/candidates2026");
    await user.click(within(dialog).getByRole("button", { name: "Look it up" }));
    // Its manifest marks it a round robin (CTA-142), which the lookup names.
    expect(await within(dialog).findByTestId("mdx-component-gallery-found")).toHaveTextContent("Found FIDE Candidates 2026 — 56 games, a round robin.");
    await user.click(within(dialog).getByRole("button", { name: "Use it" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(code()).toHaveValue('<SwissStandingsTable src="/library/candidates2026" density="dense" rowsPerPage="25" />');
    expect(screen.getByTestId("mdx-component-gallery-reads")).toHaveTextContent("The Library — FIDE Candidates 2026 — 56 games");
    // A shipped collection is everyone's: no browser-only note.
    expect(screen.queryByTestId("mdx-component-gallery-browser-only")).not.toBeInTheDocument();
    expect(await screen.findByTestId("mdx-component-gallery-other-kind")).toHaveTextContent("The games look like a round robin");
  });

  it("reads the reader's own records by their address — and says they are in this browser only", async () => {
    const user = userEvent.setup();
    const reading = readRepertoireText(['[Event "My Caro"]', "", "1. e4 c6 2. d4 d5 *"].join("\n"));
    if (!reading.ok) throw new Error("fixture does not read");
    await saveRepertoire(savedRepertoireOf("caro", reading.games[0], "", reading.name));
    mount();
    await user.click(screen.getByRole("button", { name: "Add / update PGN…" }));
    const dialog = await screen.findByRole("dialog", { name: "Add / update PGN — <InlinePgnGame>" });
    await user.click(within(dialog).getByRole("radio", { name: /^An address in the app/ }));
    await user.type(within(dialog).getByRole("combobox", { name: "The address" }), "/repertoires/nope{Enter}");
    expect(await within(dialog).findByText("This browser has no repertoire nope.")).toBeInTheDocument();
    await user.clear(within(dialog).getByRole("combobox", { name: "The address" }));
    await user.type(within(dialog).getByRole("combobox", { name: "The address" }), "/repertoires/caro{Enter}");
    expect(await within(dialog).findByTestId("mdx-component-gallery-found")).toHaveTextContent("Found My Caro.");
    expect(within(dialog).getByTestId("mdx-component-gallery-browser-only")).toHaveTextContent("not in this browser");
    await user.keyboard("{Enter}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(code()).toHaveValue('<InlinePgnGame src="/repertoires/caro" />');
    expect(screen.getByTestId("mdx-component-gallery-reads")).toHaveTextContent("A repertoire — My Caro");
    expect(screen.getByTestId("mdx-component-gallery-browser-only")).toBeInTheDocument();
    expect(await within(preview()).findByRole("group", { name: "The game, from The start to 2... d5" }, { timeout: 10_000 })).toBeInTheDocument();
  });

  it("pastes an address's PGN inline — tags, comments and shapes as kept — in place of its address", async () => {
    const user = userEvent.setup();
    // A lichess study's chapter: its comments two in a row, the text then the shapes.
    const pgn = '[Event "Queen vs Rook"]\n[FEN "8/8/8/4k3/3r4/3K4/6Q1/8 w - - 1 1"]\n[SetUp "1"]\n\n{ A rule of thumb. } { [%csl Gd4] }\n1. Ke3 { From the tablebase. } { [%cal Bg2e4] } 1... Rd5 2. Qg6 *';
    await addAnalyses(batchAnalysesOf(() => "study", [{ name: "Rules of thumb", pgn }], null, DEFAULT_ANALYSIS_SETTINGS));
    mount();
    await user.click(screen.getByRole("button", { name: "Add / update PGN…" }));
    const dialog = await screen.findByRole("dialog", { name: "Add / update PGN — <InlinePgnGame>" });
    await user.click(within(dialog).getByRole("radio", { name: /^An address in the app/ }));
    await user.type(within(dialog).getByRole("combobox", { name: "The address" }), "/tools/analysis?analysis=study&folder=f1{Enter}");
    expect(await within(dialog).findByTestId("mdx-component-gallery-found")).toHaveTextContent("Found Rules of thumb.");
    expect(within(dialog).getByTestId("mdx-component-gallery-browser-only")).toBeInTheDocument();
    // Pasted inline, the article carries the PGN: not in this browser only.
    await user.click(within(dialog).getByRole("checkbox", { name: /^Paste inline/ }));
    expect(within(dialog).queryByTestId("mdx-component-gallery-browser-only")).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Use it" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const written = (code() as HTMLTextAreaElement).value;
    expect(written).toMatch(/^export const game = `\[Event "Queen vs Rook"\][\s\S]*`\n\n<InlinePgnGame pgn=\{game\} \/>$/);
    expect(written).toContain("{ A rule of thumb. } { [%csl Gd4] }");
    expect(written).toContain("{ From the tablebase. } { [%cal Bg2e4] }");
    expect(screen.getByTestId("mdx-component-gallery-reads")).toHaveTextContent("Pasted from a saved analysis — Rules of thumb, 1 game");
    expect(screen.queryByTestId("mdx-component-gallery-browser-only")).not.toBeInTheDocument();
    expect(await within(preview()).findByRole("group", { name: /^The game, from The start to 2\. Qg6/ }, { timeout: 10_000 })).toBeInTheDocument();
    // It opens again as the paste it is.
    await user.click(screen.getByRole("button", { name: "Add / update PGN…" }));
    expect(within(await screen.findByRole("dialog")).getByRole("radio", { name: "Paste a PGN" })).toBeChecked();
  });

  it("finds a record by the first letters of its name — grouped by kind, Hebrew names too — and a pick is found without a look-up (CTA-150)", async () => {
    const user = userEvent.setup();
    const caro = readRepertoireText(['[Event "My Caro"]', "", "1. e4 c6 2. d4 d5 *"].join("\n"));
    const hebrew = readRepertoireText(['[Event "ספרדית"]', "", "1. e4 e5 2. Nf3 Nc6 *"].join("\n"));
    if (!caro.ok || !hebrew.ok) throw new Error("fixture does not read");
    await saveRepertoire(savedRepertoireOf("caro", caro.games[0], "", caro.name));
    await saveRepertoire(savedRepertoireOf("ruy", hebrew.games[0], "", hebrew.name));
    mount();
    await user.click(screen.getByRole("button", { name: "Add / update PGN…" }));
    const dialog = await screen.findByRole("dialog", { name: "Add / update PGN — <InlinePgnGame>" });
    await user.click(within(dialog).getByRole("radio", { name: /^An address in the app/ }));
    const field = within(dialog).getByRole("combobox", { name: "The address" });
    // The records are read when the address is chosen; a name's letters narrow them, in any case.
    await user.type(field, "caro");
    const listbox = await screen.findByRole("listbox");
    await within(listbox).findByRole("option", { name: "My Caro" });
    expect(within(listbox).getAllByRole("option").map((option) => option.textContent)).toEqual(["My Caro"]);
    expect(listbox.querySelector(".MuiAutocomplete-groupLabel")).toHaveTextContent("Repertoires");
    await user.clear(field);
    await user.type(field, "ספר");
    await user.click(await screen.findByRole("option", { name: "ספרדית" }));
    // Picking fills the canonical path and looks it up — "Use it" needs no further step.
    expect(field).toHaveValue("/repertoires/ruy");
    expect(await within(dialog).findByTestId("mdx-component-gallery-found")).toHaveTextContent("Found ספרדית.");
    await user.click(within(dialog).getByRole("button", { name: "Use it" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(code()).toHaveValue('<InlinePgnGame src="/repertoires/ruy" />');
  });

  describe("a heavy PGN — over 100 games", () => {
    /** A match of `count` games between two players — heavy past 100. */
    const matchPgn = (count: number) =>
      Array.from(
        { length: count },
        (_, index) =>
          `[Event "Big Match"]\n[Date "2026.01.${String((index % 28) + 1).padStart(2, "0")}"]\n[Round "${index + 1}"]\n[White "${index % 2 === 0 ? "Alpha, A" : "Beta, B"}"]\n[Black "${index % 2 === 0 ? "Beta, B" : "Alpha, A"}"]\n[Result "${index % 3 === 0 ? "1-0" : "1/2-1/2"}"]\n\n1. e4 ${index === 0 ? "{ a note } " : ""}e5 ${index === 1 ? "(1... c5) " : ""}${index % 3 === 0 ? "1-0" : "1/2-1/2"}`,
      ).join("\n\n");
    const heavy = matchPgn(120);

    /** The storage service as `fetch` sees it: two folders, every write recorded, `tournaments/taken.pgn` there already. */
    const stubService = () => {
      const writes: { path: string; content: string; overwrite: boolean }[] = [];
      const reply = (status: number, body: unknown) => ({ ok: status < 300, status, json: async () => body }) as Response;
      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string, init?: RequestInit) => {
          const { pathname } = new URL(url);
          if (pathname === "/folders") return reply(200, { folders: [{ path: "", files: [] }, { path: "tournaments", title: "Tournaments", files: ["chned26.pgn"] }] });
          if (pathname === "/files" && init?.method === "PUT") {
            const body = JSON.parse(String(init.body)) as { path: string; content: string; overwrite: boolean };
            writes.push(body);
            return body.path === "tournaments/taken.pgn" ? reply(409, { error: "exists" }) : reply(201, { written: body.path, created: true, foldersCreated: [] });
          }
          return reply(404, {});
        }),
      );
      return writes;
    };

    /** The Swiss entry's Add / update PGN, a heavy file uploaded: the heavy dialog, opened at once. */
    const uploadHeavy = async (user: ReturnType<typeof userEvent.setup>) => {
      mount();
      await pick(user, "Swiss standings");
      await user.click(screen.getByRole("button", { name: "Add / update PGN…" }));
      const source = await screen.findByRole("dialog", { name: "Add / update PGN — <SwissStandingsTable>" });
      await user.click(within(source).getByRole("radio", { name: "Upload a PGN file" }));
      await user.upload(within(source).getByTestId("mdx-component-gallery-upload-input"), new File([heavy], "Big Match.pgn"));
      return screen.findByRole("dialog", { name: "A heavy PGN — Big Match.pgn" });
    };

    it("shows what it holds and the tournament it looks like, then saves it to disk — never over another file", async () => {
      const user = userEvent.setup();
      const writes = stubService();
      const dialog = await uploadHeavy(user);
      const stats = within(dialog).getByTestId("mdx-component-gallery-heavy-stats");
      expect(stats).toHaveTextContent(/Games120, \d+ KB/);
      expect(stats).toHaveTextContent("EventsBig Match");
      expect(stats).toHaveTextContent("Dates2026.01.01 – 2026.01.28");
      expect(stats).toHaveTextContent("Players2");
      expect(stats).toHaveTextContent("Rounds120");
      expect(stats).toHaveTextContent("ResultsWhite won 40, Black won 0, drawn 80");
      expect(stats).toHaveTextContent("Annotatedcomments in 1 game, side lines in 1 game");
      expect(within(dialog).getByTestId("mdx-component-gallery-heavy-guess")).toHaveTextContent("Looks like a match");
      expect(within(dialog).getByTestId("mdx-component-gallery-heavy-guess")).toHaveTextContent("Shown best by Match, <MatchTable>.");
      await expectNoAxeViolations(dialog);

      // Save to disk: chosen first, in the sample's folder, under the upload's name.
      expect(within(dialog).getByRole("radio", { name: /^Save to disk/ })).toBeChecked();
      expect(await within(dialog).findByRole("combobox", { name: "The folder" })).toHaveTextContent("tournaments");
      const name = within(dialog).getByRole("textbox", { name: "The file name" });
      expect(name).toHaveValue("Big-Match.pgn");
      await user.clear(name);
      await user.type(name, "taken.pgn");
      await user.click(within(dialog).getByRole("button", { name: "Save to disk" }));
      expect(await within(dialog).findByText("tournaments/taken.pgn is there already — give the file another name.")).toBeInTheDocument();
      await user.clear(name);
      await user.type(name, "big-match.pgn");
      await user.click(within(dialog).getByRole("button", { name: "Save to disk" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(writes.at(-1)).toEqual({ path: "tournaments/big-match.pgn", content: heavy, overwrite: false });
      expect(code()).toHaveValue('import games from "./tournaments/big-match.pgn?raw"\n\n<SwissStandingsTable pgn={games} density="dense" rowsPerPage="25" />');
      expect(screen.getByTestId("mdx-component-gallery-reads")).toHaveTextContent("Uploaded — Big Match.pgn, written to tournaments/big-match.pgn — 120 games");
      expect(await screen.findByTestId("mdx-component-gallery-other-kind")).toHaveTextContent("The games look like a match");

      // Reopened: the file it went to, saved again without writing.
      await user.click(screen.getByRole("button", { name: "Add / update PGN…" }));
      const source = await screen.findByRole("dialog", { name: "Add / update PGN — <SwissStandingsTable>" });
      expect(within(source).getByTestId("mdx-component-gallery-heavy")).toHaveTextContent("written to tournaments/big-match.pgn");
      await user.click(within(source).getByRole("button", { name: "Choose how to use it…" }));
      const again = await screen.findByRole("dialog", { name: "A heavy PGN — Big Match.pgn" });
      expect(await within(again).findByRole("textbox", { name: "The file name" })).toHaveValue("big-match.pgn");
      await user.click(within(again).getByRole("button", { name: "Save to disk" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(writes).toHaveLength(2);
    });

    it("saves it as a Library collection, then reads it by its address — in the same table", async () => {
      const user = userEvent.setup();
      stubService();
      const dialog = await uploadHeavy(user);
      await user.click(within(dialog).getByRole("radio", { name: "Save as a Library collection, then read it by its address" }));
      expect(within(dialog).getByRole("textbox", { name: "The collection's name" })).toHaveValue("Big Match");
      await user.click(within(dialog).getByRole("button", { name: "Save as a collection" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument(), { timeout: 20_000 });
      expect(within(tree()).getByRole("treeitem", { name: "Swiss standings" })).toHaveAttribute("aria-current", "page");
      expect(screen.getByTestId("mdx-component-gallery-reads")).toHaveTextContent(/^Saved as a Library collection — Big Match, \/library\/u[\w-]+ — 120 games$/);
      expect((code() as HTMLTextAreaElement).value).toMatch(/^<SwissStandingsTable src="\/library\/u[\w-]+" density="dense" rowsPerPage="25" \/>$/);
      // An upload is this browser's only, and its games look like a match.
      expect(screen.getByTestId("mdx-component-gallery-browser-only")).toBeInTheDocument();
      expect(await screen.findByTestId("mdx-component-gallery-other-kind")).toHaveTextContent("The games look like a match");
    }, 40_000);

    it("pastes it anyway, written into the code — warned first", async () => {
      const user = userEvent.setup();
      mount();
      await pick(user, "Match");
      await user.click(screen.getByRole("button", { name: "Add / update PGN…" }));
      const source = await screen.findByRole("dialog", { name: "Add / update PGN — <MatchTable>" });
      await user.click(within(source).getByRole("radio", { name: "Paste a PGN" }));
      fireEvent.change(within(source).getByRole("textbox", { name: "The PGN" }), { target: { value: heavy } });
      expect(within(source).getByTestId("mdx-component-gallery-heavy")).toHaveTextContent(/^A heavy PGN120 games/);
      await user.click(within(source).getByRole("button", { name: "Choose how to use it…" }));
      const dialog = await screen.findByRole("dialog", { name: "A heavy PGN" });
      expect(within(dialog).getByTestId("mdx-component-gallery-heavy-guess")).toHaveTextContent("Shown best by Match, <MatchTable> — this one.");
      await user.click(within(dialog).getByRole("radio", { name: "Paste anyway — written into the code" }));
      expect(within(dialog).getByTestId("mdx-component-gallery-heavy-inline-warning")).toHaveTextContent("it may freeze");
      await user.click(within(dialog).getByRole("button", { name: "Paste anyway" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect((code() as HTMLTextAreaElement).value).toMatch(/^export const games = `\[Event "Big Match"\][\s\S]*`\n\n<MatchTable pgn=\{games\} \/>$/);
      expect(screen.getByTestId("mdx-component-gallery-reads")).toHaveTextContent("Pasted, 120 games");
      // Asked for the folders (Save to disk is offered first), but nothing written.
      expect(fetchSpy.mock.calls.filter((call) => (call as unknown[])[1] !== undefined)).toEqual([]);
    });

    it("takes a light PGN to the same choices on request", async () => {
      const user = userEvent.setup();
      mount();
      await pick(user, "Match");
      await user.click(screen.getByRole("button", { name: "Add / update PGN…" }));
      const source = await screen.findByRole("dialog", { name: "Add / update PGN — <MatchTable>" });
      await user.click(within(source).getByRole("radio", { name: "Paste a PGN" }));
      fireEvent.change(within(source).getByRole("textbox", { name: "The PGN" }), { target: { value: matchPgn(4) } });
      await user.click(within(source).getByRole("button", { name: "More options…" }));
      const dialog = await screen.findByRole("dialog", { name: "The PGN" });
      expect(within(dialog).getByRole("radio", { name: "Paste it — written into the code" })).toBeChecked();
      expect(within(dialog).getByRole("radio", { name: /^Save to disk/ })).toBeInTheDocument();
      await user.click(within(dialog).getByRole("button", { name: "Back" }));
      expect(screen.getByRole("dialog", { name: "Add / update PGN — <MatchTable>" })).toBeInTheDocument();
    });
  });

  it("finds an address for a component that reads the Library, Enter looking it up", async () => {
    const user = userEvent.setup();
    mount();
    await pick(user, "A Library collection");
    await user.click(screen.getByRole("button", { name: "Add / update game…" }));
    const dialog = await screen.findByRole("dialog", { name: "Add / update game — <CollectionCard>" });
    // No PGN for a component that reads the Library alone.
    expect(within(dialog).queryByRole("radio", { name: "Paste a PGN" })).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole("radio", { name: /^An address in the app/ }));
    await user.type(within(dialog).getByRole("combobox", { name: "The address" }), "/somewhere{Enter}");
    expect(within(dialog).getByRole("combobox", { name: "The address" })).toHaveAccessibleDescription(/^An address is a screen's/);
    await user.clear(within(dialog).getByRole("combobox", { name: "The address" }));
    await user.type(within(dialog).getByRole("combobox", { name: "The address" }), "/library/tal{Enter}");
    expect(await within(dialog).findByTestId("mdx-component-gallery-found")).toHaveTextContent(/^Found Tal — /);
    await user.keyboard("{Enter}");
    await waitFor(() => expect(code()).toHaveValue('<CollectionCard _id="/library/tal" />'));
    expect(screen.getByTestId("mdx-component-gallery-reads")).toHaveTextContent(/^The Library — Tal — /);
  });

  it("copies the code, and writes nothing", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    mount();
    await pick(user, "The app's screens");
    expect(code()).toHaveValue("<NavCards />");
    expect(screen.getByTestId("mdx-component-gallery-settings-none")).toHaveTextContent("<NavCards> has no settings");
    await user.click(screen.getByRole("button", { name: "Copy the code" }));
    expect(writeText).toHaveBeenCalledWith("<NavCards />");
    expect(screen.getByTestId("mdx-component-gallery-copied")).toHaveTextContent("Copied — paste it into an article.");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("opens an image on one beside the Blog's articles, and previews a file of the reader's without writing it", async () => {
    const user = userEvent.setup();
    Object.defineProperty(URL, "createObjectURL", { value: vi.fn(() => "blob:photo"), configurable: true });
    Object.defineProperty(URL, "revokeObjectURL", { value: vi.fn(), configurable: true });
    mount();
    await pick(user, "An image");
    expect(code()).toHaveValue('import photo from "./writing-an-article/sample-image.png"\n\n<ArticleImage src={photo} alt="A chessboard after 1. e4 e5 2. Nf3 Nc6 3. Bb5, beside the words Analysis Board" />');
    await user.click(screen.getByRole("switch", { name: "Rounded corners" }));
    expect((code() as HTMLTextAreaElement).value).toMatch(/ rounded \/>$/);

    await user.click(screen.getByRole("radio", { name: /^A file of your own/ }));
    await user.upload(screen.getByTestId("mdx-component-gallery-image-upload-input"), new File(["png"], "My photo.png", { type: "image/png" }));
    await waitFor(() => expect(code()).toHaveValue('import photo from "./My-photo.png"\n\n<ArticleImage src={photo} alt="…" />'));
    expect(screen.getByTestId("mdx-component-gallery-note")).toHaveTextContent("My-photo.png is shown from this browser alone — the gallery writes it nowhere.");
    expect(await within(preview()).findByRole("img", { name: "…" })).toHaveAttribute("src", "blob:photo");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows a component not built yet as a sketch and its code", async () => {
    const user = userEvent.setup();
    mount();
    await pick(user, "A puzzle — not built");
    expect(screen.getByTestId("mdx-component-gallery-mock")).toHaveTextContent("Not built yet");
    expect(code()).toHaveValue('import game from "./writing-an-article/inline-pgn/rubinstein-capablanca-1911.pgn?raw"\n\n<PuzzleBoard pgn={game} hideNextMoves />');
    expect(within(preview()).getByTestId("mdx-component-gallery-sketch")).toHaveTextContent("A puzzle — how it would look");
    await expectNoAxeViolations();
  });
});
